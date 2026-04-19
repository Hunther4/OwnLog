import SQLiteEngine from '../../database/SQLiteEngine';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn().mockResolvedValue({}),
    getFirstAsync: jest.fn().mockResolvedValue({ user_version: 1 }),
    runAsync: jest.fn().mockResolvedValue({}),
  }),
}));

describe('SQLiteEngine', () => {
  beforeEach(() => {
    (SQLiteEngine as any).db = {
      execAsync: jest.fn().mockResolvedValue({}),
      runAsync: jest.fn().mockResolvedValue({}),
      getFirstAsync: jest.fn().mockResolvedValue({ user_version: 1 }),
    };
  });

  it('should be a singleton', () => {
    const instance1 = SQLiteEngine;
    const instance2 = SQLiteEngine;
    expect(instance1).toBe(instance2);
  });

  it('should implement transaction queue functionality', async () => {
    const engine = SQLiteEngine;
    await engine.initialize();

    const mockCallback = jest.fn().mockResolvedValue('success');

    // Simulate concurrent calls
    const promise1 = engine.executeInTransaction(mockCallback);
    const promise2 = engine.executeInTransaction(mockCallback);

    await Promise.all([promise1, promise2]);

    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  it('should rollback on failure', async () => {
    const engine = SQLiteEngine;
    await engine.initialize();
    const mockCallback = jest.fn().mockRejectedValue(new Error('Fail'));

    await expect(engine.executeInTransaction(mockCallback)).rejects.toThrow('Fail');
    // Should have called ROLLBACK
    expect((engine as any).db.execAsync).toHaveBeenCalledWith('ROLLBACK');
  });

  it('should get user version', async () => {
    const engine = SQLiteEngine;
    await engine.initialize();
    const version = await engine.getUserVersion();
    expect(version).toBe(1);
  });

  it('should throw if database not initialized', async () => {
    const engine = SQLiteEngine;
    // Ensure db is null (simulate not initialized)
    (engine as any).db = null;
    await expect(engine.getUserVersion()).rejects.toThrow('Database not initialized. Call initialize() first.');
  });

  it('should return different user version', async () => {
    const engine = SQLiteEngine;
    await engine.initialize();
    // Override mock for this test
    (engine as any).db.getFirstAsync.mockResolvedValueOnce({ user_version: 5 });
    const version = await engine.getUserVersion();
    expect(version).toBe(5);
  });
});
