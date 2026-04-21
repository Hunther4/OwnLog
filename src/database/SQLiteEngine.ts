import * as SQLite from 'expo-sqlite';
import { DATABASE_PRAGMAS, CREATE_TABLES_V1, CREATE_INDICES_V1 } from './schema';
import { TransactionType, TransactionRow } from '../types/master';

export type DbState = 'PENDING' | 'READY' | 'FAILED';

class SQLiteEngine {
  private static instance: SQLiteEngine;
  private db: SQLite.SQLiteDatabase | null = null;
  private transactionLock: Promise<void> = Promise.resolve();
  private initPromise: Promise<void> | null = null;
  private _state: DbState = 'PENDING';

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
        console.log('[SQLiteEngine] 🔑 Opening database connection...');
        this.db = await SQLite.openDatabaseAsync('hunther_wallet.db');
        console.log('[SQLiteEngine] ✅ Database opened');

        console.log('[SQLiteEngine] 🛠️ Applying PRAGMAs...');
        await this.db.execAsync(DATABASE_PRAGMAS);
        console.log('[SQLiteEngine] ✅ PRAGMAs applied');

        // CRITICAL #4: Verify WAL mode is active
        const journalMode = await this.db.getFirstAsync<{ journal_mode: string }>(
          'PRAGMA journal_mode'
        );
        if (journalMode?.journal_mode !== 'wal') {
          throw new Error(
            `WAL mode verification failed: expected 'wal', got '${journalMode?.journal_mode}'`
          );
        }
        console.log('[SQLiteEngine] ✅ WAL mode verified');

        console.log('[SQLiteEngine] 🔍 Checking user_version...');
        const result = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        const currentVersion = result?.user_version ?? 0;
        console.log(`[SQLiteEngine] Current version: ${currentVersion}`);

        if (currentVersion === 0) {
          console.log('[SQLiteEngine] 🏗️ Creating initial schema...');
          await this.executeInTransaction(async (tx) => {
            await tx.execAsync(CREATE_TABLES_V1);
            await tx.execAsync(CREATE_INDICES_V1);
            await tx.execAsync('PRAGMA user_version = 1');
          });
          console.log('[SQLiteEngine] ✅ Database initialized to version 1');
        }

        if (currentVersion > 0 && currentVersion < 3) {
          console.log('[SQLiteEngine] 🚀 Migrating to version 3 (Tombstones Support)...');
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
            console.log('[SQLiteEngine] ✅ Migrated to version 3');
          } else {
            console.log('[SQLiteEngine] ℹ️ is_deleted columns already exist, skipping migration');
            await this.db.execAsync('PRAGMA user_version = 3');
          }
        }

        console.log('[SQLiteEngine] 🛠️ Adding performance indices...');
        // V2.1: Index re-ordering for B-Tree selectivity (Date first)
        await this.db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_transacciones_date_cat ON transacciones(fecha_local, categoria_id);
          CREATE INDEX IF NOT EXISTS idx_transacciones_date ON transacciones(fecha_local);
        `);
        console.log('[SQLiteEngine] ✅ Performance indices verified');

        console.log('[SQLiteEngine] 🛠️ Ensuring supplementary tables exist...');

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
              category_name TEXT NOT NULL
            );
          `);
        });
        console.log('[SQLiteEngine] ✅ Supplementary tables verified');

        console.log('[SQLiteEngine] 🌱 Seeding default categories...');
        await this.ensureDefaultCategories();
        console.log('[SQLiteEngine] ✅ Seeding complete');

        // Final verification: confirm categories were seeded
        const verifyCount = await this.getFirst<{ count: number }>(
          'SELECT COUNT(*) as count FROM categorias'
        );
        console.log(`[SQLiteEngine] 🔍 Verified ${verifyCount?.count} categories in database`);

        this._state = 'READY';
      } catch (error) {
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

    // Only seed if table is empty
    if (catCount?.count === 0) {
      console.log('[SQLiteEngine] 📦 Categories table empty, seeding...');

      // Guard: ensure db is ready
      if (!this.db) {
        console.log('[SQLiteEngine] ⚠️ DB not ready for seeding, skipping');
        return;
      }

      // Use direct execution to bypass batching during initialization
      // WARNING: This must use direct db.execAsync to ensure writes complete
      for (const cat of defaults) {
        await this.db!.runAsync(
          `INSERT INTO categorias (nombre, tipo, emoji, color_hex, activa) VALUES (?, ?, ?, ?, ?)`,
          [cat.nombre, cat.tipo, cat.emoji, cat.color, 1]
        );
        console.log(`[SQLiteEngine] Seeded category: ${cat.nombre}`);
      }
      console.log('[SQLiteEngine] ✅ All categories seeded');
    } else {
      console.log(`[SQLiteEngine] ✅ Categories already exist (${catCount?.count})`);
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
    const existingLabels = existing.map((r) => r.label);
    // Add missing ones
    for (const q of qDefaults) {
      if (!existingLabels.includes(q.label)) {
        await this.db!.runAsync(
          `INSERT INTO quick_actions (label, amount, category_name) VALUES (?, ?, ?)`,
          [q.label, q.amount, q.category_name]
        );
      }
    }
    console.log('[SQLiteEngine] Synced quick actions');
  }

  public async close(): Promise<void> {
    if (!this.db) return;
    this.db = null;
    this.initPromise = null;
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
      // Disable foreign keys before dropping tables
      await this.db.execAsync('PRAGMA foreign_keys = OFF');
      
      // Delete ALL data - use DROP IF EXISTS for tables that may not exist
      await this.db.execAsync(`DROP TABLE IF EXISTS transacciones`);
      await this.db.execAsync(`DROP TABLE IF EXISTS categorias`);
      await this.db.execAsync(`DROP TABLE IF EXISTS app_settings`);
      await this.db.execAsync(`DROP TABLE IF EXISTS balance_adjustments`);
      await this.db.execAsync(`DROP TABLE IF EXISTS quick_actions`);
      
      // Recreate tables fresh
      await this.db.execAsync(CREATE_TABLES_V1);
      await this.db.execAsync(CREATE_INDICES_V1);
      await this.db.execAsync('PRAGMA user_version = 1');
      
      // Re-enable foreign keys
      await this.db.execAsync('PRAGMA foreign_keys = ON');
      
      // Create quick_actions table if not in schema
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS quick_actions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT NOT NULL,
          amount INTEGER NOT NULL,
          category_name TEXT NOT NULL,
          is_deleted INTEGER DEFAULT 0
        )
      `);
      
      await this.ensureDefaultCategories();
      console.log('[SQLiteEngine] ✅ Database fully reset - all data cleared');
    } catch (error) {
      console.error('[SQLiteEngine] Failed to reset database:', error);
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

  public async vacuumInto(destinationPath: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    // Just do VACUUM to reclaim space (backup is complex in expo-sqlite)
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
      `INSERT INTO presupuestos (categoria_id, monto_limite, mes_anio) 
       VALUES (?, ?, ?) 
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

  public async getSpendingForCategoryInMonth(
    categoryId: number,
    monthYear: string
  ): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const firstDay = `${monthYear}-01`;
    const lastDay = new Date(
      parseInt(monthYear.split('-')[0]),
      parseInt(monthYear.split('-')[1]),
      0
    )
      .toISOString()
      .split('T')[0];

    const result = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(monto) as total FROM transacciones WHERE categoria_id = ? AND fecha_local >= ? AND fecha_local <= ? AND is_deleted = 0`,
      [categoryId, firstDay, lastDay]
    );
    return result?.total ?? 0;
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

    try {
      await this.executeInTransaction(async (db) => {
        for (const op of queue) {
          try {
            const result = await db.runAsync(op.sql, ...op.params);
            op.resolve(result);
          } catch (e) {
            op.reject(e);
          }
        }
      });
    } catch (error) {
      queue.forEach((op) => op.reject(error));
    }
  }

  public async getFirst<T>(sql: string, params: any[] = []): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getFirstAsync(sql, params);
  }

  public getFirstSync<T>(sql: string, params: any[] = []): T | null {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getFirstSync(sql, params);
  }

  public async getAll<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync(sql, params);
  }

  public getAllSync<T>(sql: string, params: any[] = []): T[] {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAllSync(sql, params);
  }

  public async getSpendingByCategory(): Promise<{ category_name: string; total: number }[]> {
    if (!this.db) throw new Error('Database not initialized');
    const sql = `
      SELECT c.nombre as category_name, SUM(t.monto) as total 
      FROM transacciones t 
      JOIN categorias c ON t.categoria_id = c.id 
      WHERE c.tipo = 'egreso' AND t.is_deleted = 0
      GROUP BY c.id 
      ORDER BY total DESC
    `;
    return this.getAll<{ category_name: string; total: number }>(sql);
  }

  public async getTransactions(
    filters: { categoryId?: number | null; startDate?: string; endDate?: string } = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<TransactionRow[]> {
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

    sql += ' WHERE ' + where.join(' AND ');

    sql += ` ORDER BY fecha_local DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return this.getAll<TransactionRow>(sql, params);
  }

  public async getCategoryTotals(): Promise<
    { category: string; total: number; tipo: TransactionType }[]
  > {
    const sql = `
      SELECT c.nombre as category, SUM(t.monto) as total, c.tipo
      FROM transacciones t 
      JOIN categorias c ON t.categoria_id = c.id 
      WHERE t.is_deleted = 0
      GROUP BY c.id 
      ORDER BY total DESC
    `;
    return this.getAll<{ category: string; total: number; tipo: TransactionType }>(sql);
  }

  public async getMonthlyTrend(): Promise<{ month: string; total: number }[]> {
    // Los montos ya tienen signo correcto en la BD
    const sql = `
      SELECT 
        strftime('%Y-%m', fecha_local) as month, 
        SUM(t.monto) as total 
      FROM transacciones t 
      JOIN categorias c ON t.categoria_id = c.id 
      WHERE t.is_deleted = 0
      GROUP BY month 
      ORDER BY month DESC 
      LIMIT 6
    `;
    return this.getAll<{ month: string; total: number }>(sql);
  }
}

export default SQLiteEngine.getInstance();
