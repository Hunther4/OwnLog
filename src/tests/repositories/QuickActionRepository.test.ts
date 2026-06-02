import { QuickActionRepository } from '../../repositories/QuickActionRepository';
import SQLiteEngine from '../../database/SQLiteEngine';

jest.mock('../../database/SQLiteEngine', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    executeInTransaction: jest.fn(),
  },
}));

describe('QuickActionRepository', () => {
  let mockDb: { runAsync: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = { runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 5 }) };
    (SQLiteEngine.executeInTransaction as jest.Mock).mockImplementation(
      async (callback: (db: any) => any) => callback(mockDb)
    );
  });

  describe('getAll', () => {
    it('should return all quick actions (no soft delete filter)', async () => {
      (SQLiteEngine.getAll as jest.Mock).mockResolvedValue([
        { id: 1, label: 'Café', amount: 2000, category_name: 'Comida' },
        { id: 2, label: 'Taxi', amount: 5000, category_name: 'Transporte' },
      ]);

      const actions = await QuickActionRepository.getAll();
      expect(actions).toHaveLength(2);
      expect(actions[0].label).toBe('Café');
    });

    it('should return empty array when no quick actions', async () => {
      (SQLiteEngine.getAll as jest.Mock).mockResolvedValue([]);

      const actions = await QuickActionRepository.getAll();
      expect(actions).toEqual([]);
    });
  });

  describe('add', () => {
    it('should insert a quick action', async () => {
      const action = {
        label: 'Almuerzo',
        amount: 8000,
        category_name: 'Comida',
      };

      const id = await QuickActionRepository.add(action);
      expect(id).toBe(5);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO quick_actions'),
        [action.label, action.amount, action.category_name]
      );
    });
  });

  describe('update', () => {
    it('should update only whitelisted fields', async () => {
      await QuickActionRepository.update(2, {
        label: 'Nuevo',
        amount: 9999,
        category_name: 'Otro',
      });

      const sql = mockDb.runAsync.mock.calls[0][0];
      expect(sql).toContain('label = ?');
      expect(sql).toContain('amount = ?');
      expect(sql).toContain('category_name = ?');
    });

    it('should ignore non-whitelisted keys', async () => {
      await QuickActionRepository.update(2, {
        label: 'ok',
        hack: 'evil' as any,
      });

      const sql = mockDb.runAsync.mock.calls[0][0];
      expect(sql).toContain('label = ?');
      expect(sql).not.toContain('hack');
    });

    it('should do nothing if no valid keys', async () => {
      await QuickActionRepository.update(2, { injected: true } as any);
      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should perform a HARD delete (not soft delete)', async () => {
      await QuickActionRepository.delete(3);

      expect(SQLiteEngine.executeInTransaction).toHaveBeenCalledTimes(1);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM quick_actions'),
        [3]
      );
    });
  });
});
