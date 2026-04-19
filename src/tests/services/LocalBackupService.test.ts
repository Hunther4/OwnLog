import { LocalBackupService } from '../../services/LocalBackupService';
import SQLiteEngine from '../../database/SQLiteEngine';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

jest.mock('expo-file-system');
jest.mock('expo-sharing');
jest.mock('../../database/SQLiteEngine', () => ({
  checkpoint: jest.fn(),
  vacuum: jest.fn(),
  getInstance: jest.fn().mockReturnValue({
    checkpoint: jest.fn(),
    vacuum: jest.fn(),
  }),
}));

const MockSQLiteEngine = SQLiteEngine as jest.Mocked<typeof SQLiteEngine>;

describe('LocalBackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute checkpoint and share file during export', async () => {
    (FileSystem.copyAsync as jest.Mock).mockResolvedValue({});
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue({});

    const result = await LocalBackupService.exportDatabase();

    expect(MockSQLiteEngine.checkpoint).toHaveBeenCalled();
    expect(FileSystem.copyAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('should return error if sharing is not available', async () => {
    (FileSystem.copyAsync as jest.Mock).mockResolvedValue({});
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    const result = await LocalBackupService.exportDatabase();

    expect(result.success).toBe(false);
    expect(result.message).toContain('Sharing is not available');
  });

  it('should call vacuum during database optimization', async () => {
    (MockSQLiteEngine.vacuum as jest.Mock).mockResolvedValue(undefined);

    const result = await LocalBackupService.optimizeDatabase();

    expect(MockSQLiteEngine.vacuum).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
