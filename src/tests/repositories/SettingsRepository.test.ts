import { SettingsRepository } from '../../repositories/SettingsRepository';
import SQLiteEngine from '../../database/SQLiteEngine';

jest.mock('../../database/SQLiteEngine', () => ({
  __esModule: true,
  default: {
    getFirst: jest.fn(),
    getAll: jest.fn(),
    executeInTransaction: jest.fn(),
  },
}));

describe('SettingsRepository', () => {
  let mockDb: { runAsync: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = { runAsync: jest.fn().mockResolvedValue({}) };
    (SQLiteEngine.executeInTransaction as jest.Mock).mockImplementation(
      async (callback: (db: any) => any) => callback(mockDb)
    );
  });

  describe('getSetting', () => {
    it('should return the value for an existing key', async () => {
      (SQLiteEngine.getFirst as jest.Mock).mockResolvedValue({ value: 'dark' });

      const result = await SettingsRepository.getSetting('theme_mode');
      expect(result).toBe('dark');
    });

    it('should return null for a missing key', async () => {
      (SQLiteEngine.getFirst as jest.Mock).mockResolvedValue(null);

      const result = await SettingsRepository.getSetting('missing_key');
      expect(result).toBeNull();
    });

    it('should return null when value field is null', async () => {
      (SQLiteEngine.getFirst as jest.Mock).mockResolvedValue({ value: null });

      const result = await SettingsRepository.getSetting('some_key');
      expect(result).toBeNull();
    });
  });

  describe('setSetting', () => {
    it('should upsert the key-value pair', async () => {
      await SettingsRepository.setSetting('currency', 'USD');

      expect(SQLiteEngine.executeInTransaction).toHaveBeenCalledTimes(1);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT(key) DO UPDATE'),
        ['currency', 'USD']
      );
    });
  });

  describe('getMany', () => {
    it('should batch-fetch keys and default missing keys to null', async () => {
      (SQLiteEngine.getAll as jest.Mock).mockResolvedValue([
        { key: 'theme_mode', value: 'dark' },
        { key: 'currency', value: 'CLP' },
      ]);

      const result = await SettingsRepository.getMany(['theme_mode', 'currency', 'missing']);
      expect(result).toEqual({
        theme_mode: 'dark',
        currency: 'CLP',
        missing: null,
      });
    });

    it('should return empty object for empty keys array', async () => {
      const result = await SettingsRepository.getMany([]);
      expect(result).toEqual({});
      expect(SQLiteEngine.getAll).not.toHaveBeenCalled();
    });

    it('should return all nulls when no keys found', async () => {
      (SQLiteEngine.getAll as jest.Mock).mockResolvedValue([]);

      const result = await SettingsRepository.getMany(['a', 'b']);
      expect(result).toEqual({ a: null, b: null });
    });
  });
});
