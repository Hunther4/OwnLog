import SQLiteEngine from '../database/SQLiteEngine';
import { setCachedBalance, computeActualBalance } from './balanceChecksum';

export interface SharedData {
  version: 1;
  exportedAt: string;
  categories: { nombre: string; tipo: 'ingreso' | 'egreso'; emoji: string; color_hex: string }[];
  transactions: { monto: number; fecha_local: string; categoria_nombre: string; descripcion: string | null }[];
}

export const exportToJSON = async (): Promise<string> => {
  const { CategoryRepository } = await import('../repositories/CategoryRepository');
  const { TransactionRepository } = await import('../repositories/TransactionRepository');
  const categories = await CategoryRepository.getAll();
  const transactions = await TransactionRepository.getAll({}, 10000, 0);

  const categoryMap: Record<number, string> = {};
  for (const c of categories) {
    categoryMap[c.id] = c.nombre;
  }

  const data: SharedData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: categories.map((c) => ({
      nombre: c.nombre,
      tipo: c.tipo,
      emoji: c.emoji,
      color_hex: c.color_hex,
    })),
    transactions: transactions.map((t) => ({
      monto: t.monto,
      fecha_local: t.fecha_local,
      categoria_nombre: categoryMap[t.categoria_id] || '',
      descripcion: t.descripcion,
    })),
  };

  return JSON.stringify(data, null, 2);
};

function isValidDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T12:00:00Z').getTime());
}

function validateSharedData(raw: any): SharedData {
  if (!raw || typeof raw !== 'object') throw new Error('Formato inválido: no es un objeto JSON');
  if (raw.version !== 1) throw new Error('Formato inválido: versión desconocida');
  if (!Array.isArray(raw.categories)) throw new Error('Formato inválido: categories no es un array');
  if (!Array.isArray(raw.transactions)) throw new Error('Formato inválido: transactions no es un array');
  if (raw.categories.length === 0 && raw.transactions.length === 0) {
    throw new Error('Formato inválido: no hay categorías ni transacciones para importar');
  }
  return raw as SharedData;
}

export const importFromJSON = async (json: string): Promise<{ categories: number; transactions: number }> => {
  const raw = JSON.parse(json);
  const data = validateSharedData(raw);

  const result = await SQLiteEngine.executeInTransaction(async (db) => {
    const existingRows = await db.getAllAsync<{ id: number; nombre: string }>(
      "SELECT id, nombre FROM categorias WHERE is_deleted = 0"
    );
    const nameToId: Record<string, number> = {};
    for (const c of existingRows) {
      nameToId[c.nombre] = c.id;
    }

    let importedCategories = 0;
    for (const c of data.categories) {
      if (!nameToId[c.nombre]) {
        const result = await db.runAsync(
          `INSERT INTO categorias (nombre, tipo, emoji, color_hex, activa, updated_at)
           VALUES (?, ?, ?, ?, 1, strftime('%s','now'))`,
          [c.nombre, c.tipo, c.emoji, c.color_hex]
        );
        nameToId[c.nombre] = result.lastInsertRowId;
        importedCategories++;
      }
    }

    let importedTransactions = 0;
    let skippedTransactions = 0;

    for (const t of data.transactions) {
      const catId = t.categoria_nombre ? nameToId[t.categoria_nombre] : undefined;
      if (!catId) {
        skippedTransactions++;
        continue;
      }
      if (!isValidDateString(t.fecha_local)) {
        skippedTransactions++;
        continue;
      }
      await db.runAsync(
        `INSERT INTO transacciones (monto, fecha_utc, fecha_local, categoria_id, descripcion, updated_at)
         VALUES (?, ?, ?, ?, ?, strftime('%s','now'))`,
        [
          t.monto,
          new Date(t.fecha_local + 'T12:00:00Z').toISOString(),
          t.fecha_local,
          catId,
          t.descripcion,
        ]
      );
      importedTransactions++;
    }

    if (skippedTransactions > 0) {
      console.warn(`[shareService] ${skippedTransactions} transacciones omitidas (categoría no encontrada o fecha inválida)`);
    }

    return { categories: importedCategories, transactions: importedTransactions };
  });

  // Update cached balance after successful import
  try {
    const actualBalance = await computeActualBalance();
    await setCachedBalance(actualBalance);
  } catch (e) {
    console.warn('[shareService] Could not update cached balance after import:', e);
  }

  return result;
};
