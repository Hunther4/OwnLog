import { GoogleDriveService } from '../GoogleDriveService';
import * as FileSystem from 'expo-file-system';
import SQLiteEngine from '../../database/SQLiteEngine';
import { telemetry } from '../TelemetryService';

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/path/',
  getInfoAsync: jest.fn(),
  copyAsync: jest.fn(),
  moveAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('../../database/SQLiteEngine', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    close: jest.fn(),
    getUserVersion: jest.fn(),
    openDatabaseAsync: jest.fn(),
  },
}));

jest.mock('../TelemetryService', () => ({
  telemetry: {
    trackEvent: jest.fn(),
  },
}));

describe('GoogleDriveService Restore Pipeline', () => {
  const mockDbPath = '/mock/path/SQLite/hunther_wallet.db';
  const mockTempPath = '/mock/path/SQLite/temp_restore.db';
  const mockBakPath = '/mock/path/SQLite/hunther_wallet.db.bak';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('_verifyIntegrity', () => {
    it('should return true if PRAGMA integrity_check returns "ok"', async () => {
      const mockDb = {
        execAsync: jest.fn().mockResolvedValue([{ value: 'ok' }]),
        closeAsync: jest.fn().mockResolvedValue(undefined),
      };
      (SQLiteEngine.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);

      const result = await (GoogleDriveService as any)._verifyIntegrity(mockTempPath);
      expect(result).toBe(true);
      expect(mockDb.execAsync).toHaveBeenCalledWith('PRAGMA integrity_check');
    });

    it('should return false if PRAGMA integrity_check does not return "ok"', async () => {
      const mockDb = {
        execAsync: jest.fn().mockResolvedValue([{ value: 'error: corrupted' }]),
        closeAsync: jest.fn().mockResolvedValue(undefined),
      };
      (SQLiteEngine.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);

      const result = await (GoogleDriveService as any)._verifyIntegrity(mockTempPath);
      expect(result).toBe(false);
    });
  });

  describe('_replaceDatabase', () => {
    it('should replace DB and not roll back if success', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      (SQLiteEngine.initialize as jest.Mock).mockResolvedValue(undefined);

      await (GoogleDriveService as any)._replaceDatabase(mockTempPath);

      expect(FileSystem.copyAsync).toHaveBeenCalledWith({
        from: mockDbPath,
        to: mockBakPath,
      });
      expect(FileSystem.moveAsync).toHaveBeenCalledWith({
        from: mockTempPath,
        to: mockDbPath,
      });
    });

    it('should roll back to .bak if replacement fails', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      (FileSystem.moveAsync as jest.Mock).mockRejectedValueOnce(new Error('Move failed'));
      (SQLiteEngine.initialize as jest.Mock).mockResolvedValue(undefined);

      await expect((GoogleDriveService as any)._replaceDatabase(mockTempPath))
        .rejects.toThrow('Move failed');

      expect(FileSystem.moveAsync).toHaveBeenCalledWith({
        from: mockBakPath,
        to: mockDbPath,
      });
    });
  });

  describe('restoreCloudBackup', () => {
    it('should track RESTORE_SUCCESS on successful restoration', async () => {
      (GoogleDriveService.downloadBackup as jest.Mock) = jest.fn().mockResolvedValue(undefined);
      (GoogleDriveService['_verifyIntegrity'] as jest.Mock) = jest.fn().mockResolvedValue(true);
      (GoogleDriveService['_replaceDatabase'] as jest.Mock) = jest.fn().mockResolvedValue(undefined);
      (SQLiteEngine.getUserVersion as jest.Mock).mockResolvedValue(1);

      await GoogleDriveService.restoreCloudBackup('backup-id');
      expect(telemetry.trackEvent).toHaveBeenCalledWith('RESTORE_SUCCESS', expect.any(Object));
    });

    it('should track RESTORE_INTEGRITY_FAIL if integrity check fails', async () => {
      (GoogleDriveService.downloadBackup as jest.Mock) = jest.fn().mockResolvedValue(undefined);
      (GoogleDriveService['_verifyIntegrity'] as jest.Mock) = jest.fn().mockResolvedValue(false);

      const result = await GoogleDriveService.restoreCloudBackup('backup-id');
      expect(result.success).toBe(false);
      expect(telemetry.trackEvent).toHaveBeenCalledWith('RESTORE_INTEGRITY_FAIL', expect.any(Object));
    });
  });
});
