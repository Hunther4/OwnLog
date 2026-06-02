import { TransactionRepository } from '../../repositories/TransactionRepository';
import SQLiteEngine from '../../database/SQLiteEngine';

jest.mock('../../database/SQLiteEngine', () => ({
  __esModule: true,
  default: {
    getFirst: jest.fn(),
    getAll: jest.fn(),
    getTransactions: jest.fn(),
    executeInTransaction: jest.fn(),
  },
}));

describe('TransactionRepository', () => {
  let mockDb: { runAsync: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = { runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 42 }) };
    (SQLiteEngine.executeInTransaction as jest.Mock).mockImplementation(
      async (callback: (db: any) => any) => callback(mockDb)
    );
  });

  describe('getTotalBalance', () => {
    it('should return sign-correct sum (income positive, expense negative)', async () => {
      (SQLiteEngine.getFirst as jest.Mock).mockResolvedValue({ total: 500 });

      const balance = await TransactionRepository.getTotalBalance();
      expect(balance).toBe(500);
    });

    it('should return 0 when database returns null', async () => {
      (SQLiteEngine.getFirst as jest.Mock).mockResolvedValue(null);

      const balance = await TransactionRepository.getTotalBalance();
      expect(balance).toBe(0);
    });

    it('should return 0 when total field is null', async () => {
      (SQLiteEngine.getFirst as jest.Mock).mockResolvedValue({ total: null });

      const balance = await TransactionRepository.getTotalBalance();
      expect(balance).toBe(0);
    });
  });

  describe('getMonthlyTotals', () => {
    it('should split income and expense correctly', async () => {
      (SQLiteEngine.getFirst as jest.Mock).mockResolvedValue({
        income: 3000,
        expense: 1500,
      });

      const result = await TransactionRepository.getMonthlyTotals('2026-05');
      expect(result).toEqual({ income: 3000, expense: 1500 });
    });

    it('should return both fields even if one is 0', async () => {
      (SQLiteEngine.getFirst as jest.Mock).mockResolvedValue({
        income: 0,
        expense: 1500,
      });

      const result = await TransactionRepository.getMonthlyTotals('2026-05');
      expect(result).toEqual({ income: 0, expense: 1500 });
    });

    it('should default to 0 when result is null', async () => {
      (SQLiteEngine.getFirst as jest.Mock).mockResolvedValue(null);

      const result = await TransactionRepository.getMonthlyTotals('2026-05');
      expect(result).toEqual({ income: 0, expense: 0 });
    });
  });

  describe('add', () => {
    it('should insert and return lastInsertRowId', async () => {
      const tx = {
        monto: 5000,
        fecha_utc: '2026-05-30T12:00:00.000Z',
        fecha_local: '2026-05-30',
        categoria_id: 1,
        descripcion: 'Supermercado',
      };

      const id = await TransactionRepository.add(tx);
      expect(id).toBe(42);
      expect(SQLiteEngine.executeInTransaction).toHaveBeenCalledTimes(1);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transacciones'),
        [tx.monto, tx.fecha_utc, tx.fecha_local, tx.categoria_id, tx.descripcion]
      );
    });
  });

  describe('delete', () => {
    it('should perform a soft delete', async () => {
      await TransactionRepository.delete(99);

      expect(SQLiteEngine.executeInTransaction).toHaveBeenCalledTimes(1);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE transacciones SET is_deleted = 1'),
        [99]
      );
    });
  });

  describe('update', () => {
    it('should update only whitelisted fields', async () => {
      await TransactionRepository.update(10, {
        monto: 9999,
        descripcion: 'actualizado',
      });

      expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
      const sql = mockDb.runAsync.mock.calls[0][0];
      expect(sql).toContain('monto = ?');
      expect(sql).toContain('descripcion = ?');
    });

    it('should ignore non-whitelisted keys', async () => {
      await TransactionRepository.update(10, {
        monto: 500,
        hack: 'injected' as any,
      });

      const sql = mockDb.runAsync.mock.calls[0][0];
      expect(sql).toContain('monto = ?');
      expect(sql).not.toContain('hack');
    });

    it('should do nothing if no valid keys', async () => {
      await TransactionRepository.update(10, { hack: true } as any);

      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });
  });

  describe('getLastN', () => {
    it('should return last N non-deleted transactions', async () => {
      (SQLiteEngine.getAll as jest.Mock).mockResolvedValue([
        { id: 5, monto: 100, fecha_utc: '...', fecha_local: '...', categoria_id: 1, descripcion: 'a' },
        { id: 4, monto: 200, fecha_utc: '...', fecha_local: '...', categoria_id: 2, descripcion: 'b' },
      ]);

      const result = await TransactionRepository.getLastN(2);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(5);
      expect(result[1].id).toBe(4);
    });
  });

  describe('getSumForMonth', () => {
    it('should compute sum for a given month', async () => {
      (SQLiteEngine.getFirst as jest.Mock).mockResolvedValue({ total: 7500 });

      const sum = await TransactionRepository.getSumForMonth('2026-05');
      expect(sum).toBe(7500);
    });

    it('should filter by category when provided', async () => {
      (SQLiteEngine.getFirst as jest.Mock).mockResolvedValue({ total: 3000 });

      const sum = await TransactionRepository.getSumForMonth('2026-05', 3);
      expect(sum).toBe(3000);
    });

    it('should return 0 when no data', async () => {
      (SQLiteEngine.getFirst as jest.Mock).mockResolvedValue({ total: null });

      const sum = await TransactionRepository.getSumForMonth('2026-05');
      expect(sum).toBe(0);
    });
  });

  describe('getSpendingForCategoryInMonth', () => {
    it('should filter by category and month', async () => {
      (SQLiteEngine.getFirst as jest.Mock).mockResolvedValue({ total: 2500 });

      const result = await TransactionRepository.getSpendingForCategoryInMonth('2026-05', 1);
      expect(result).toBe(2500);
    });
  });

  describe('getAll', () => {
    it('should return mapped transactions with default limit and offset', async () => {
      (SQLiteEngine.getTransactions as jest.Mock).mockResolvedValue([
        { id: 1, monto: 100, fecha_utc: '...', fecha_local: '2026-05-01', categoria_id: 1, descripcion: 'a' },
        { id: 2, monto: 200, fecha_utc: '...', fecha_local: '2026-05-02', categoria_id: 2, descripcion: 'b' },
      ]);

      const result = await TransactionRepository.getAll();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
      expect(SQLiteEngine.getTransactions).toHaveBeenCalledWith({}, 100, 0);
    });

    it('should pass filter, limit, and offset to engine', async () => {
      (SQLiteEngine.getTransactions as jest.Mock).mockResolvedValue([]);

      await TransactionRepository.getAll({ categoryId: 5 }, 50, 25);
      expect(SQLiteEngine.getTransactions).toHaveBeenCalledWith(
        { categoryId: 5 },
        50,
        25
      );
    });

    it('should return empty array when no rows', async () => {
      (SQLiteEngine.getTransactions as jest.Mock).mockResolvedValue([]);

      const result = await TransactionRepository.getAll();
      expect(result).toEqual([]);
    });

    it('should handle null categoryId in filters', async () => {
      (SQLiteEngine.getTransactions as jest.Mock).mockResolvedValue([]);

      await TransactionRepository.getAll({ categoryId: null });
      expect(SQLiteEngine.getTransactions).toHaveBeenCalledWith(
        { categoryId: null },
        100,
        0
      );
    });
  });
});
