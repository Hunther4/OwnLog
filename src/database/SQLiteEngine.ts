import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import {
  DATABASE_PRAGMAS,
  CREATE_TABLES_V1,
  CREATE_INDICES_V1,
  MIGRATIONS_V3_TO_V4,
} from './schema';
import { TransactionRow } from '../types/master';
import { log, warn } from '../utils/log';

export type DbState = 'PENDING' | 'READY' | 'FAILED';

class SQLiteEngine {
  private static instance: SQLiteEngine;
  private db: SQLite.SQLiteDatabase | null = null;
  private transactionLock: Promise<void> = Promise.resolve();
  private initPromise: Promise<void> | null = null;
  private _state: DbState = 'PENDING';
  private dbName: string = 'hunther_wallet.db';

  // Batching state
  private writeQueue: {
    sql: string;
    params: any[];
    resolve: (val: any) => void;
    reject: (err: any) => void;
  }[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_WINDOW_MS = 50;

  private constructor() {}

  public static getInstance(): SQLiteEngine {
    if (!SQLiteEngine.instance) {
      SQLiteEngine.instance = new SQLiteEngine();
    }
    return SQLiteEngine.instance;
  }

  public getState(): DbState {
    return this._state;
  }

  /**
   * Initializes the database connection and runs migrations.
   * Ensures WAL mode is enabled and the schema is up to date.
   */
  public async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (this.db) {
        this._state = 'READY';
        return;
      }
      try {
        log('[SQLiteEngine] 🔑 Opening database connection...');
        this.db = await SQLite.openDatabaseAsync(this.dbName);
        log('[SQLiteEngine] ✅ Database opened');

        // Check database integrity before doing anything
        log('[SQLiteEngine] 🔍 Running integrity check...');
        const integrityResults = await this.db.getAllAsync<{ 'integrity_check': string }>(
          'PRAGMA integrity_check'
        );
        const isIntegrityOk =
          integrityResults.length === 1 && integrityResults[0]['integrity_check'] === 'ok';
        if (!isIntegrityOk) {
          const errors = integrityResults
            .map((r) => r['integrity_check'])
            .filter((v) => v !== 'ok')
            .join('; ');
          throw new Error(`Database integrity check failed: ${errors}`);
        }
        log('[SQLiteEngine] ✅ Integrity check passed');

        // CRITICAL: Force Foreign Keys ON explicitly — run BEFORE any schema work
        await this.db.execAsync('PRAGMA foreign_keys = ON;');
        log('[SQLiteEngine] ✅ Foreign keys forced ON');

        log('[SQLiteEngine] 🛠️ Applying PRAGMAs (journal_mode, etc.)...');
        await this.db.execAsync(DATABASE_PRAGMAS);
        log('[SQLiteEngine] ✅ PRAGMAs applied');

        // Verify Foreign Keys are enabled (correct column name: "foreign_keys", not "foreign_keys_enabled")
        const fkResult = await this.db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
        log(`[SQLiteEngine] PRAGMA foreign_keys result:`, fkResult);
        if (fkResult?.foreign_keys !== 1) {
          throw new Error('Foreign keys verification failed: PRAGMA foreign_keys must be ON');
        }
        log('[SQLiteEngine] ✅ Foreign keys verified');

        // CRITICAL #4: Verify WAL mode is active
        const journalMode = await this.db.getFirstAsync<{ journal_mode: string }>(
          'PRAGMA journal_mode'
        );
        if (journalMode?.journal_mode !== 'wal') {
          throw new Error(
            `WAL mode verification failed: expected 'wal', got '${journalMode?.journal_mode}'`
          );
        }
        log('[SQLiteEngine] ✅ WAL mode verified');

        log('[SQLiteEngine] 🔍 Checking user_version...');
        const result = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        const currentVersion = result?.user_version ?? 0;
        log(`[SQLiteEngine] Current version: ${currentVersion}`);

        if (currentVersion === 0) {
          log('[SQLiteEngine] 🏗️ Creating initial schema...');
          await this.executeInTransaction(async (tx) => {
            await tx.execAsync(CREATE_TABLES_V1);
            await tx.execAsync(CREATE_INDICES_V1);
            await tx.execAsync('PRAGMA user_version = 1');
          });
          log('[SQLiteEngine] ✅ Database initialized to version 1');
        }

        if (currentVersion > 0 && currentVersion < 3) {
          log('[SQLiteEngine] 🚀 Migrating to version 3 (Tombstones Support)...');
          // Check if is_deleted columns already exist to avoid duplicate error
          const colCheck = await this.db.getAllAsync<{ name: string }>(
            "SELECT name FROM pragma_table_info('categorias') WHERE name = 'is_deleted'"
          );
          if (colCheck.length === 0) {
            await this.executeInTransaction(async (tx) => {
              await tx.execAsync(`ALTER TABLE categorias ADD COLUMN is_deleted INTEGER DEFAULT 0;`);
              await tx.execAsync(
                `ALTER TABLE transacciones ADD COLUMN is_deleted INTEGER DEFAULT 0;`
              );
              await tx.execAsync(
                `ALTER TABLE balance_adjustments ADD COLUMN is_deleted INTEGER DEFAULT 0;`
              );
              await tx.execAsync('PRAGMA user_version = 3');
            });
            log('[SQLiteEngine] ✅ Migrated to version 3');
          } else {
            log('[SQLiteEngine] ℹ️ is_deleted columns already exist, skipping migration');
            await this.db.execAsync('PRAGMA user_version = 3');
          }
        }

        if (currentVersion === 3) {
          // v3 → v4: add recurring_transactions table + indices. Idempotent
          // (every statement uses IF NOT EXISTS) so a re-entry is safe.
          log('[SQLiteEngine] 🚀 Migrating to version 4 (Recurring Transactions)...');
          await this.executeInTransaction(async (tx) => {
            for (const stmt of MIGRATIONS_V3_TO_V4) {
              await tx.execAsync(stmt);
            }
          });

          // Post-migration integrity gate (per design.md §4.3). Refuse to
          // accept the new version if SQLite reports corruption.
          const v4Integrity = await this.db.getAllAsync<{ integrity_check: string }>(
            'PRAGMA integrity_check'
          );
          const v4Ok =
            v4Integrity.length === 1 && v4Integrity[0]['integrity_check'] === 'ok';
          if (!v4Ok) {
            const v4Errors = v4Integrity
              .map((r) => r.integrity_check)
              .filter((v) => v !== 'ok')
              .join('; ');
            throw new Error(
              `v3→v4 migration integrity check failed: ${v4Errors}`
            );
          }
          log('[SQLiteEngine] ✅ Migrated to version 4');
        }

        log('[SQLiteEngine] 🛠️ Adding performance indices...');
        await this.db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_transacciones_date_cat ON transacciones(fecha_local, categoria_id);
          CREATE INDEX IF NOT EXISTS idx_transacciones_active ON transacciones(fecha_local, categoria_id) WHERE is_deleted = 0;
        `);
        log('[SQLiteEngine] ✅ Performance indices verified');

        log('[SQLiteEngine] 🛠️ Ensuring supplementary tables exist...');

        await this.executeInTransaction(async (tx) => {
          await tx.execAsync(`
            CREATE TABLE IF NOT EXISTS presupuestos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              categoria_id INTEGER NOT NULL,
              monto_limite INTEGER NOT NULL,
              ciclo TEXT NOT NULL, 
              mes_anio TEXT NOT NULL,
              FOREIGN KEY (categoria_id) REFERENCES categorias(id)
            );
          `);
          await tx.execAsync(
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_presupuestos_cat_month ON presupuestos(categoria_id, mes_anio);`
          );
          await tx.execAsync(`
            CREATE TABLE IF NOT EXISTS quick_actions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              label TEXT NOT NULL,
              amount INTEGER NOT NULL,
              category_name TEXT NOT NULL,
              is_deleted INTEGER DEFAULT 0
            );
          `);
        });
        log('[SQLiteEngine] ✅ Supplementary tables verified');

        // Migrate quick_actions: add is_deleted if column missing (pre-v3 databases)
        const qaColCheck = await this.db.getAllAsync<{ name: string }>(
          "SELECT name FROM pragma_table_info('quick_actions') WHERE name = 'is_deleted'"
        );
        if (qaColCheck.length === 0) {
          await this.db.execAsync('ALTER TABLE quick_actions ADD COLUMN is_deleted INTEGER DEFAULT 0');
          log('[SQLiteEngine] ✅ Added is_deleted column to quick_actions');
        }

        log('[SQLiteEngine] 🌱 Seeding default categories...');
        await this.ensureDefaultCategories();
        log('[SQLiteEngine] ✅ Seeding complete');

        // Final verification: confirm categories were seeded
        const verifyCount = await this.getFirst<{ count: number }>(
          'SELECT COUNT(*) as count FROM categorias'
        );
        log(`[SQLiteEngine] 🔍 Verified ${verifyCount?.count} categories in database`);

        this._state = 'READY';
      } catch (error) {
        this.db = null;
        this.initPromise = null;
        this._state = 'FAILED';
        console.error('[SQLiteEngine] ❌ Critical failure during initialization:', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  private async ensureInitialized(): Promise<void> {
    await this.initialize();
  }

  private async ensureDefaultCategories(): Promise<void> {
    const defaults = [
      { nombre: 'Sueldo', tipo: 'ingreso', emoji: '💰', color: '#4caf50' },
      { nombre: 'Inversiones', tipo: 'ingreso', emoji: '📈', color: '#8bc34a' },
      { nombre: 'Regalos', tipo: 'ingreso', emoji: '🎁', color: '#ffeb3b' },
      { nombre: 'Comida', tipo: 'egreso', emoji: '🍔', color: '#ff5252' },
      { nombre: 'Transporte', tipo: 'egreso', emoji: '🚗', color: '#2196f3' },
      { nombre: 'Supermercado', tipo: 'egreso', emoji: '🛒', color: '#ff9800' },
      { nombre: 'Salud', tipo: 'egreso', emoji: '💊', color: '#e91e63' },
      { nombre: 'Servicios', tipo: 'egreso', emoji: '⚡', color: '#607d8b' },
      { nombre: 'Antojos', tipo: 'egreso', emoji: '🍿', color: '#9c27b0' },
      { nombre: 'Alquiler', tipo: 'egreso', emoji: '🏠', color: '#795548' },
    ];

    // Check if categories already exist (need db to be ready first)
    const catCount = await this.getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM categorias'
    );

    // Guard: ensure db is ready
    if (!this.db) {
      log('[SQLiteEngine] ⚠️ DB not ready for seeding, skipping');
      return;
    }

    // Seed Quick Actions if empty - add any missing ones
    const qDefaults = [
      { label: '🚌 Bus', amount: 700, category_name: 'Transporte' },
      { label: '🍔 Almuerzo', amount: 5000, category_name: 'Comida' },
      { label: '🛒 Súper', amount: 10000, category_name: 'Supermercado' },
      { label: '☕ Café', amount: 2000, category_name: 'Comida' },
    ];
    // Get existing labels
    const existing = await this.getAll<{ label: string }>(
      'SELECT label FROM quick_actions'
    );
    const existingLabels: string[] = [];
    for (const r of existing) {
      existingLabels.push(r.label);
    }

    // Wrap all INSERT statements in a single transaction for atomicity
    await this.executeInTransaction(async (tx) => {
      // Seed categories if table is empty
      if (catCount?.count === 0) {
        log('[SQLiteEngine] 📦 Categories table empty, seeding...');
        for (const cat of defaults) {
          await tx.runAsync(
            `INSERT INTO categorias (nombre, tipo, emoji, color_hex, activa) VALUES (?, ?, ?, ?, ?)`,
            [cat.nombre, cat.tipo, cat.emoji, cat.color, 1]
          );
          log(`[SQLiteEngine] Seeded category: ${cat.nombre}`);
        }
        log('[SQLiteEngine] ✅ All categories seeded');
      } else {
        log(`[SQLiteEngine] ✅ Categories already exist (${catCount?.count})`);
      }

      // Add missing quick actions
      for (const q of qDefaults) {
        if (!existingLabels.includes(q.label)) {
          await tx.runAsync(
            `INSERT INTO quick_actions (label, amount, category_name) VALUES (?, ?, ?)`,
            [q.label, q.amount, q.category_name]
          );
        }
      }
      log('[SQLiteEngine] Synced quick actions');
    });
  }

  public async close(): Promise<void> {
    if (!this.db) return;
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    try {
      await this.flushWrites();
      await this.db.closeAsync();
    } catch (error) {
      console.error('[SQLiteEngine] ⚠️ Error during close:', error);
      // Fall through to reset state regardless
    }
    this.db = null;
    this.initPromise = null;
    this.writeQueue = [];
  }

  public async deleteCategory(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    // Soft delete - mark as deleted AND inactive
    await this.db.runAsync(
      "UPDATE categorias SET is_deleted = 1, activa = 0, updated_at = strftime('%s','now') WHERE id = ?",
      [id]
    );
  }

  public async resetDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    try {
      // 1. Run integrity check before any modifications
      log('[SQLiteEngine] 🔍 Running integrity check before reset...');
      const integrityResults = await this.db.getAllAsync<{ 'integrity_check': string }>(
        'PRAGMA integrity_check'
      );
      const isIntegrityOk =
        integrityResults.length === 1 && integrityResults[0]['integrity_check'] === 'ok';
      if (!isIntegrityOk) {
        throw new Error(`Database integrity check failed before reset: ${JSON.stringify(integrityResults)}`);
      } else {
        log('[SQLiteEngine] ✅ Integrity check passed');
      }

      // 2. Get DB path from the active connection (always correct for the current SDK)
      const dbPath = this.db.databasePath;
      
      // 3. Close database to safely copy the file (avoid locked file issues)
      log('[SQLiteEngine] 🔒 Closing database for backup...');
      await this.db.closeAsync();
      this.db = null;

      // 4. Create .bak backup of the database file
      const backupPath = `${dbPath}.bak`;
      log(`[SQLiteEngine] 📦 Creating backup at ${backupPath}...`);
      await FileSystem.copyAsync({ from: dbPath, to: backupPath });
      log('[SQLiteEngine] ✅ Backup created successfully');

      // 5. Reopen database to perform reset operations
      log('[SQLiteEngine] 🔑 Reopening database for reset...');
      this.db = await SQLite.openDatabaseAsync(this.dbName);

      // 5. Proceed with original reset logic (drop tables, recreate, etc.)
      await this.executeInTransaction(async (tx) => {
        // Disable foreign keys before dropping tables
        await tx.execAsync('PRAGMA foreign_keys = OFF');
        
        // Delete ALL data - use DROP IF EXISTS for tables that may not exist
        await tx.execAsync(`DROP TABLE IF EXISTS transacciones`);
        await tx.execAsync(`DROP TABLE IF EXISTS categorias`);
        await tx.execAsync(`DROP TABLE IF EXISTS app_settings`);
        await tx.execAsync(`DROP TABLE IF EXISTS balance_adjustments`);
        await tx.execAsync(`DROP TABLE IF EXISTS quick_actions`);
        await tx.execAsync(`DROP TABLE IF EXISTS presupuestos`);
        
        // Recreate tables fresh
        await tx.execAsync(CREATE_TABLES_V1);
        await tx.execAsync(CREATE_INDICES_V1);
        await tx.execAsync('PRAGMA user_version = 1');
        
        // Re-enable foreign keys
        await tx.execAsync('PRAGMA foreign_keys = ON');
        
        // Create quick_actions table if not in schema
        await tx.execAsync(`
          CREATE TABLE IF NOT EXISTS quick_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category_name TEXT NOT NULL,
            is_deleted INTEGER DEFAULT 0
          )
        `);
        await tx.execAsync(`
          CREATE TABLE IF NOT EXISTS presupuestos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria_id INTEGER NOT NULL,
            monto_limite INTEGER NOT NULL,
            ciclo TEXT NOT NULL,
            mes_anio TEXT NOT NULL,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id)
          );
        `);
        await tx.execAsync(
          `CREATE UNIQUE INDEX IF NOT EXISTS idx_presupuestos_cat_month ON presupuestos(categoria_id, mes_anio);`
        );
      });
      
      await this.ensureDefaultCategories();
      log('[SQLiteEngine] ✅ Database fully reset - all data cleared');
    } catch (error) {
      console.error('[SQLiteEngine] Failed to reset database:', error);
      // Attempt to recover database connection if it was closed
      if (!this.db && this.dbName) {
        try {
          this.db = await SQLite.openDatabaseAsync(this.dbName);
          log('[SQLiteEngine] ✅ Recovered database connection after reset failure');
        } catch (recoveryError) {
          console.error('[SQLiteEngine] ❌ Failed to recover database connection:', recoveryError);
        }
      }
      throw error;
    }
  }

  public async checkpoint(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  }

  public async vacuum(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync('VACUUM');
  }



  public async getUserVersion(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    return result?.user_version ?? 0;
  }

  public async setBudget(categoryId: number, amount: number, monthYear: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      `INSERT INTO presupuestos (categoria_id, monto_limite, ciclo, mes_anio) 
       VALUES (?, ?, 'mensual', ?) 
       ON CONFLICT(categoria_id, mes_anio) DO UPDATE SET monto_limite = excluded.monto_limite`,
      [categoryId, amount, monthYear]
    );
  }

  public async getBudget(categoryId: number, monthYear: string): Promise<number | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync<{ monto_limite: number }>(
      'SELECT monto_limite FROM presupuestos WHERE categoria_id = ? AND mes_anio = ?',
      [categoryId, monthYear]
    );
    return result?.monto_limite ?? null;
  }


  public async executeInTransaction<T>(
    callback: (tx: SQLite.SQLiteDatabase) => Promise<T>
  ): Promise<T> {
    if (!this.db) throw new Error('Database not initialized');
    const db = this.db;

    const currentOp = (async () => {
      await this.transactionLock;
      try {
        await db.execAsync('BEGIN TRANSACTION');
        const result = await callback(db);
        await db.execAsync('COMMIT');
        return result;
      } catch (error) {
        await db.execAsync('ROLLBACK');
        throw error;
      }
    })();

    this.transactionLock = currentOp.then(
      () => {},
      () => {}
    );

    return currentOp;
  }

  public async executeSql<T = any>(sql: string, params: any[] = []): Promise<T> {
    if (!this.db) throw new Error('Database not initialized');

    // Batching logic: only batch INSERT/UPDATE/DELETE
    const isWrite = /^\s*(INSERT|UPDATE|DELETE)/i.test(sql);
    if (isWrite) {
      return await this.enqueueWrite(sql, params);
    }

    return (await this.db.runAsync(sql, ...params)) as any;
  }

  private async enqueueWrite<T>(sql: string, params: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      this.writeQueue.push({ sql, params, resolve, reject });

      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => this.flushWrites(), this.BATCH_WINDOW_MS);
      }
    });
  }

  private async flushWrites(): Promise<void> {
    const queue = [...this.writeQueue];
    this.writeQueue = [];
    this.batchTimeout = null;

    if (queue.length === 0) return;

    const results: { op: typeof queue[0]; success: boolean; result?: any; error?: any }[] = [];
    let transactionFailed = false;

    try {
      await this.executeInTransaction(async (db) => {
        for (const op of queue) {
          // BUGFIX (silent partial commit): let errors propagate so
          // executeInTransaction ROLLBACKS the whole batch (atomicity).
          // Previously the inner try/catch swallowed the error, the
          // transaction COMMITted the successful ops, and callers that
          // retried the rejected op could create duplicates because the
          // earlier ones were already persisted.
          const result = await db.runAsync(op.sql, ...op.params);
          results.push({ op, success: true, result });
        }
      });
    } catch (error) {
      transactionFailed = true;
      for (const op of queue) {
        op.reject(error);
      }
      return;
    }

    for (const item of results) {
      if (item.success) {
        item.op.resolve(item.result);
      } else {
        item.op.reject(item.error);
      }
    }
  }

  public async getFirst<T>(sql: string, params: any[] = []): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');
    await this.flushWrites();
    return await this.db.getFirstAsync(sql, params);
  }

  public async getAll<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');
    await this.flushWrites();
    return await this.db.getAllAsync(sql, params);
  }

  public async getTransactions(
    filters: { categoryId?: number | null; startDate?: string; endDate?: string; search?: string } = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<TransactionRow[]> {
    if (!this.db) throw new Error('Database not initialized');
    await this.flushWrites();
    let sql = 'SELECT * FROM transacciones';
    const params: any[] = [];
    const where: string[] = ['is_deleted = 0'];

    if (filters.categoryId !== undefined && filters.categoryId !== null) {
      where.push('categoria_id = ?');
      params.push(filters.categoryId);
    }
    if (filters.startDate) {
      where.push('fecha_local >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      where.push('fecha_local <= ?');
      params.push(filters.endDate);
    }
    if (filters.search) {
      // BUGFIX (LIKE injection): escape user-supplied `%` and `_` so they
      // are matched literally instead of acting as wildcards, and pick an
      // ESCAPE clause to make the literal character explicit.
      const escaped = filters.search
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      where.push('descripcion LIKE ? ESCAPE \'\\\\\'');
      params.push(`%${escaped}%`);
    }

    sql += ' WHERE ' + where.join(' AND ');

    sql += ` ORDER BY fecha_local DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return this.getAll<TransactionRow>(sql, params);
  }
}

export default SQLiteEngine.getInstance();
