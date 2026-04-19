import { GoogleDriveService } from '../../services/GoogleDriveService';
import * as AuthSession from 'expo-auth-session';
import * as GoogleProvider from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { useBackupStore } from '../../store/useBackupStore';
import SQLiteEngine from '../../database/SQLiteEngine';

// Mock dependencies
jest.mock('expo-auth-session');
jest.mock('expo-auth-session/providers/google');
jest.mock('expo-secure-store');
jest.mock('expo-file-system');
jest.mock('../../store/useBackupStore');
jest.mock('../../database/SQLiteEngine');

describe('GoogleDriveService', () => {
  let mockSetCloudAuthStatus: jest.Mock;
  let mockSetCloudUser: jest.Mock;
  let mockSetBackupStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch globally to avoid network calls
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ files: [] }),
    });
    // Mock _ensureValidToken to return a dummy token
    (GoogleDriveService as any)._ensureValidToken = jest.fn().mockResolvedValue('dummy-token');
    // Mock FileSystem.downloadAsync to avoid network calls
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
      status: 200,
      headers: {},
      uri: '',
    });
    // Mock FileSystem.readAsStringAsync for SQLite header validation
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('U1FMaXRlIGZvcm1hdCAzAA==');
    // Mock useBackupStore.getState
    mockSetCloudAuthStatus = jest.fn();
    mockSetCloudUser = jest.fn();
    mockSetBackupStatus = jest.fn();
    (useBackupStore.getState as jest.Mock).mockReturnValue({
      setCloudAuthStatus: mockSetCloudAuthStatus,
      setCloudUser: mockSetCloudUser,
      setBackupStatus: mockSetBackupStatus,
    });
  });

  describe('skeleton', () => {
    it('should export the service object', () => {
      expect(GoogleDriveService).toBeDefined();
      expect(typeof GoogleDriveService).toBe('object');
    });

    it('should have authenticate method', () => {
      expect(GoogleDriveService.authenticate).toBeDefined();
      expect(typeof GoogleDriveService.authenticate).toBe('function');
    });

    it('should have logout method', () => {
      expect(GoogleDriveService.logout).toBeDefined();
      expect(typeof GoogleDriveService.logout).toBe('function');
    });

    it('should have ensureBackupFolder method', () => {
      expect(GoogleDriveService.ensureBackupFolder).toBeDefined();
      expect(typeof GoogleDriveService.ensureBackupFolder).toBe('function');
    });

    it('should have uploadBackup method', () => {
      expect(GoogleDriveService.uploadBackup).toBeDefined();
      expect(typeof GoogleDriveService.uploadBackup).toBe('function');
    });

    it('should have listBackups method', () => {
      expect(GoogleDriveService.listBackups).toBeDefined();
      expect(typeof GoogleDriveService.listBackups).toBe('function');
    });

    it('should have downloadBackup method', () => {
      expect(GoogleDriveService.downloadBackup).toBeDefined();
      expect(typeof GoogleDriveService.downloadBackup).toBe('function');
    });

    it('should have deleteBackup method', () => {
      expect(GoogleDriveService.deleteBackup).toBeDefined();
      expect(typeof GoogleDriveService.deleteBackup).toBe('function');
    });
  });

  describe('method signatures', () => {
    it('authenticate should return Promise<AuthResult>', async () => {
      // We can't test TypeScript types at runtime, but we can ensure it returns a Promise
      const result = GoogleDriveService.authenticate();
      expect(result).toBeInstanceOf(Promise);
      // The skeleton should return something (even undefined) but we can await
      // and expect the shape to match AuthResult interface (success, error?, user?)
      const resolved = await result;
      expect(resolved).toHaveProperty('success');
      expect(typeof resolved.success).toBe('boolean');
      // Additional properties optional
    });

    it('logout should return Promise<void>', async () => {
      const result = GoogleDriveService.logout();
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBeUndefined();
    });

    it('ensureBackupFolder should return Promise<string>', async () => {
      // Mock token and Drive API response
      const mockToken = 'dummy-token';
      const mockFolderId = 'folder-123';
      (GoogleDriveService as any)._ensureValidToken = jest.fn().mockResolvedValue(mockToken);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: mockFolderId }] }),
      });
      const result = GoogleDriveService.ensureBackupFolder();
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBe(mockFolderId);
    });

    it('uploadBackup should return Promise<BackupResult>', async () => {
      const result = GoogleDriveService.uploadBackup('/path/to/file.db');
      expect(result).toBeInstanceOf(Promise);
      const resolved = await result;
      expect(resolved).toHaveProperty('success');
      expect(typeof resolved.success).toBe('boolean');
    });

    it('listBackups should return Promise<BackupItem[]>', async () => {
      const result = GoogleDriveService.listBackups();
      expect(result).toBeInstanceOf(Promise);
      const resolved = await result;
      expect(Array.isArray(resolved)).toBe(true);
    });

    it('downloadBackup should return Promise<void>', async () => {
      const result = GoogleDriveService.downloadBackup('file-id', '/local/path');
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBeUndefined();
    });

    it('deleteBackup should return Promise<void>', async () => {
      const result = GoogleDriveService.deleteBackup('file-id');
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('authentication', () => {
    let mockPromptAsync: jest.Mock;
    let mockSetItemAsync: jest.Mock;
    let mockMakeRedirectUri: jest.Mock;
    let mockSetCloudAuthStatus: jest.Mock;
    let mockSetCloudUser: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockPromptAsync = jest.fn();
      mockSetItemAsync = jest.fn();
      mockMakeRedirectUri = jest.fn().mockReturnValue('com.huntherwallet.app:/oauthredirect');
      mockSetCloudAuthStatus = jest.fn();
      mockSetCloudUser = jest.fn();
      (GoogleProvider.AuthRequest as jest.Mock) = jest.fn().mockImplementation(() => ({
        promptAsync: mockPromptAsync,
      }));
      (AuthSession.makeRedirectUri as jest.Mock) = mockMakeRedirectUri;
      (SecureStore.setItemAsync as jest.Mock) = mockSetItemAsync;
      (useBackupStore.getState as jest.Mock) = jest.fn(() => ({
        setCloudAuthStatus: mockSetCloudAuthStatus,
        setCloudUser: mockSetCloudUser,
      }));
    });

    it('should successfully authenticate and store refresh token', async () => {
      // Mock successful OAuth response
      const mockTokenResponse = {
        type: 'success',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        issuedAt: Date.now(),
        expiresIn: 3600,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
        authentication: null,
      };
      const mockUserInfo = { email: 'user@example.com', name: 'Test User' };

      mockPromptAsync.mockResolvedValue(mockTokenResponse);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUserInfo),
      });
      mockSetItemAsync.mockResolvedValue(undefined);

      const result = await GoogleDriveService.authenticate();

      expect(GoogleProvider.AuthRequest).toHaveBeenCalledWith({
        clientId: expect.any(String),
        scopes: ['https://www.googleapis.com/auth/drive.file'],
        redirectUri: 'com.huntherwallet.app:/oauthredirect',
      });
      expect(mockPromptAsync).toHaveBeenCalled();
      expect(mockSetItemAsync).toHaveBeenCalledWith(
        'google_drive_refresh_token',
        'refresh-token-456'
      );
      expect(mockSetCloudAuthStatus).toHaveBeenCalledWith('authenticated');
      expect(mockSetCloudUser).toHaveBeenCalledWith(mockUserInfo);
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUserInfo);
      expect(result.error).toBeUndefined();
    });

    it('should handle authentication failure', async () => {
      const mockTokenResponse = {
        type: 'error',
        errorCode: 'access_denied',
        errorDescription: 'User denied access',
      };
      mockPromptAsync.mockResolvedValue(mockTokenResponse);

      const result = await GoogleDriveService.authenticate();

      expect(GoogleProvider.AuthRequest).toHaveBeenCalled();
      expect(mockPromptAsync).toHaveBeenCalled();
      expect(mockSetItemAsync).not.toHaveBeenCalled();
      expect(mockSetCloudAuthStatus).toHaveBeenCalledWith('error');
      expect(mockSetCloudUser).toHaveBeenCalledWith(null);
      expect(result.success).toBe(false);
      expect(result.error).toBe('error');
      expect(result.user).toBeUndefined();
    });
  });

  describe('token refresh interceptor', () => {
    let mockSetCloudAuthStatus: jest.Mock;
    let mockSetCloudUser: jest.Mock;
    let mockGetItemAsync: jest.Mock;
    let mockSetItemAsync: jest.Mock;
    let mockFetch: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockSetCloudAuthStatus = jest.fn();
      mockSetCloudUser = jest.fn();
      mockGetItemAsync = jest.fn();
      mockSetItemAsync = jest.fn();
      mockFetch = jest.fn();
      (useBackupStore.getState as jest.Mock).mockReturnValue({
        setCloudAuthStatus: mockSetCloudAuthStatus,
        setCloudUser: mockSetCloudUser,
      });
      (SecureStore.getItemAsync as jest.Mock) = mockGetItemAsync;
      (SecureStore.setItemAsync as jest.Mock) = mockSetItemAsync;
      global.fetch = mockFetch;
      // Reset module variables
      (GoogleDriveService as any)._accessToken = null;
      (GoogleDriveService as any)._tokenExpiry = null;
    });

    it('should have private _ensureValidToken method', () => {
      expect((GoogleDriveService as any)._ensureValidToken).toBeDefined();
      expect(typeof (GoogleDriveService as any)._ensureValidToken).toBe('function');
    });

    it('should return cached token if valid', async () => {
      // Set cached token
      const cachedToken = 'cached-token-123';
      const expiry = Date.now() + 120000; // 2 minutes in future
      (GoogleDriveService as any)._accessToken = cachedToken;
      (GoogleDriveService as any)._tokenExpiry = expiry;

      const token = await (GoogleDriveService as any)._ensureValidToken();
      expect(token).toBe(cachedToken);
      expect(mockGetItemAsync).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should refresh token when expired', async () => {
      // Set expired token
      const expiredToken = 'expired-token';
      const expiry = Date.now() - 1000;
      (GoogleDriveService as any)._accessToken = expiredToken;
      (GoogleDriveService as any)._tokenExpiry = expiry;

      const refreshToken = 'refresh-token-456';
      const newAccessToken = 'new-access-token-789';
      const newExpiresIn = 3600;
      mockGetItemAsync.mockResolvedValue(refreshToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: newAccessToken,
          expires_in: newExpiresIn,
          // No new refresh token
        }),
      });

      const token = await (GoogleDriveService as any)._ensureValidToken();
      expect(token).toBe(newAccessToken);
      expect(mockGetItemAsync).toHaveBeenCalledWith('google_drive_refresh_token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
      // Should have updated module variables
      expect((GoogleDriveService as any)._accessToken).toBe(newAccessToken);
      expect((GoogleDriveService as any)._tokenExpiry).toBeGreaterThan(Date.now());
      // Should not store new refresh token
      expect(mockSetItemAsync).not.toHaveBeenCalled();
    });

    it('should store new refresh token if provided', async () => {
      (GoogleDriveService as any)._accessToken = null;
      const refreshToken = 'old-refresh-token';
      const newRefreshToken = 'new-refresh-token';
      const newAccessToken = 'new-access-token';
      mockGetItemAsync.mockResolvedValue(refreshToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: newAccessToken,
          expires_in: 3600,
          refresh_token: newRefreshToken,
        }),
      });

      await (GoogleDriveService as any)._ensureValidToken();
      expect(mockSetItemAsync).toHaveBeenCalledWith('google_drive_refresh_token', newRefreshToken);
    });

    it('should throw and clear auth state if refresh token missing', async () => {
      (GoogleDriveService as any)._accessToken = null;
      mockGetItemAsync.mockResolvedValue(null);

      await expect((GoogleDriveService as any)._ensureValidToken()).rejects.toThrow('No refresh token available');
      expect(mockSetCloudAuthStatus).toHaveBeenCalledWith('error');
      expect(mockSetCloudUser).toHaveBeenCalledWith(null);
    });

    it('should throw and clear auth state if refresh fails', async () => {
      (GoogleDriveService as any)._accessToken = null;
      mockGetItemAsync.mockResolvedValue('refresh-token');
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Invalid client',
      });

      await expect((GoogleDriveService as any)._ensureValidToken()).rejects.toThrow('Token refresh failed');
      expect(mockSetCloudAuthStatus).toHaveBeenCalledWith('error');
      expect(mockSetCloudUser).toHaveBeenCalledWith(null);
    });
  });

  describe('ensureBackupFolder', () => {
    let mockEnsureValidToken: jest.Mock;
    let mockFetch: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockEnsureValidToken = jest.fn().mockResolvedValue('valid-access-token');
      (GoogleDriveService as any)._ensureValidToken = mockEnsureValidToken;
      mockFetch = jest.fn();
      global.fetch = mockFetch;
    });

    it('should query Drive for existing folder and return its ID', async () => {
      // Mock Drive API response with existing folder
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          files: [{
            id: 'folder123',
            name: 'Respaldo_HuntherWallet',
            mimeType: 'application/vnd.google-apps.folder'
          }]
        })
      });

      const folderId = await GoogleDriveService.ensureBackupFolder();
      expect(mockEnsureValidToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files?q=name%3D%22Respaldo_HuntherWallet%22%20and%20mimeType%3D\'application%2Fvnd.google-apps.folder\'%20and%20trashed%3Dfalse',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-access-token'
          })
        })
      );
      expect(folderId).toBe('folder123');
    });

    it('should create folder if not found', async () => {
      // First call returns empty files list
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] })
      });
      // Second call returns created folder
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'new-folder456',
          name: 'Respaldo_HuntherWallet',
          mimeType: 'application/vnd.google-apps.folder'
        })
      });

      const folderId = await GoogleDriveService.ensureBackupFolder();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      // First call is query, second is create
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        'https://www.googleapis.com/drive/v3/files',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-access-token',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            name: 'Respaldo_HuntherWallet',
            mimeType: 'application/vnd.google-apps.folder'
          })
        })
      );
      expect(folderId).toBe('new-folder456');
    });
  });

  describe('listBackups', () => {
    let mockEnsureValidToken: jest.Mock;
    let mockEnsureBackupFolder: jest.Mock;
    let mockFetch: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockEnsureValidToken = jest.fn().mockResolvedValue('valid-access-token');
      mockEnsureBackupFolder = jest.fn().mockResolvedValue('folder-123');
      (GoogleDriveService as any)._ensureValidToken = mockEnsureValidToken;
      (GoogleDriveService as any).ensureBackupFolder = mockEnsureBackupFolder;
      mockFetch = jest.fn();
      global.fetch = mockFetch;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should query Drive for .db files in backup folder and return mapped BackupItem[]', async () => {
      // Mock Drive API response with two backup files
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          files: [
            {
              id: 'file1',
              name: 'backup_2025-04-11_1430.db',
              modifiedTime: '2025-04-11T14:30:00.000Z',
              size: '1024000',
            },
            {
              id: 'file2',
              name: 'backup_2025-04-10_0930.db',
              modifiedTime: '2025-04-10T09:30:00.000Z',
              size: '2048000',
            },
          ],
        }),
      });

      const backups = await GoogleDriveService.listBackups();

      expect(mockEnsureValidToken).toHaveBeenCalled();
      expect(mockEnsureBackupFolder).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files?q=parents%20in%20%22folder-123%22%20and%20name%20contains%20\'.db\'%20and%20trashed%3Dfalse&orderBy=modifiedTime%20desc&fields=files(id,name,modifiedTime,size)',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-access-token',
          }),
        })
      );
      expect(backups).toHaveLength(2);
      expect(backups[0]).toEqual({
        id: 'file1',
        name: 'backup_2025-04-11_1430.db',
        modifiedTime: '2025-04-11T14:30:00.000Z',
        size: 1024000,
      });
      expect(backups[1]).toEqual({
        id: 'file2',
        name: 'backup_2025-04-10_0930.db',
        modifiedTime: '2025-04-10T09:30:00.000Z',
        size: 2048000,
      });
    });

    it('should return empty array when no backups found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });

      const backups = await GoogleDriveService.listBackups();

      expect(backups).toEqual([]);
    });

    it('should handle Drive API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
      });

      await expect(GoogleDriveService.listBackups()).rejects.toThrow('Drive API error');
    });
  });

  describe('downloadBackup', () => {
    let mockEnsureValidToken: jest.Mock;
    let mockDownloadAsync: jest.Mock;
    let mockValidateSQLiteHeader: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockEnsureValidToken = jest.fn().mockResolvedValue('valid-access-token');
      mockDownloadAsync = jest.fn();
      mockValidateSQLiteHeader = jest.fn().mockResolvedValue(true);
      (GoogleDriveService as any)._ensureValidToken = mockEnsureValidToken;
      (FileSystem.downloadAsync as jest.Mock) = mockDownloadAsync;
      // Mock private validation function
      (GoogleDriveService as any)._validateSQLiteHeader = mockValidateSQLiteHeader;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should download file and validate header', async () => {
      const remoteId = 'file-123';
      const localPath = '/path/to/download.db';
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${remoteId}?alt=media`;

      mockDownloadAsync.mockResolvedValueOnce({
        status: 200,
        headers: {},
        uri: localPath,
      });

      await GoogleDriveService.downloadBackup(remoteId, localPath);

      expect(mockEnsureValidToken).toHaveBeenCalled();
      expect(mockDownloadAsync).toHaveBeenCalledWith(
        downloadUrl,
        localPath,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-access-token',
          }),
        })
      );
      expect(mockValidateSQLiteHeader).toHaveBeenCalledWith(localPath);
    });

    it('should throw validation error if header invalid', async () => {
      const remoteId = 'file-123';
      const localPath = '/path/to/download.db';
      mockDownloadAsync.mockResolvedValueOnce({ status: 200, uri: localPath });
      mockValidateSQLiteHeader.mockResolvedValueOnce(false);

      await expect(GoogleDriveService.downloadBackup(remoteId, localPath)).rejects.toThrow('Invalid SQLite header');
    });

    it('should handle Drive API error', async () => {
      const remoteId = 'file-123';
      const localPath = '/path/to/download.db';
      mockDownloadAsync.mockResolvedValueOnce({
        status: 403,
        headers: {},
        uri: localPath,
      });

      await expect(GoogleDriveService.downloadBackup(remoteId, localPath)).rejects.toThrow('Download failed with status 403');
    });

    it('should handle download failure', async () => {
      const remoteId = 'file-123';
      const localPath = '/path/to/download.db';
      mockDownloadAsync.mockRejectedValueOnce(new Error('Network error'));

      await expect(GoogleDriveService.downloadBackup(remoteId, localPath)).rejects.toThrow('Network error');
    });
  });

  describe('generateBackupName', () => {
    it('should be defined', () => {
      expect(GoogleDriveService.generateBackupName).toBeDefined();
      expect(typeof GoogleDriveService.generateBackupName).toBe('function');
    });

    it('should return backup_YYYY‑MM‑DD_HHmm.db format', () => {
      // Mock system time to a fixed date (UTC)
      const mockDate = new Date('2025-04-11T14:30:00Z');
      jest.useFakeTimers().setSystemTime(mockDate);

      const name = GoogleDriveService.generateBackupName();
      // Compute expected name based on local date components (timezone dependent)
      const expectedYear = mockDate.getFullYear();
      const expectedMonth = String(mockDate.getMonth() + 1).padStart(2, '0');
      const expectedDay = String(mockDate.getDate()).padStart(2, '0');
      const expectedHours = String(mockDate.getHours()).padStart(2, '0');
      const expectedMinutes = String(mockDate.getMinutes()).padStart(2, '0');
      const expectedName = `backup_${expectedYear}-${expectedMonth}-${expectedDay}_${expectedHours}${expectedMinutes}.db`;
      expect(name).toBe(expectedName);
      
      jest.useRealTimers();
    });

    it('should pad single-digit month, day, hour, minute', () => {
      // Mock system time to a fixed date (UTC)
      const mockDate = new Date('2025-01-01T05:07:00Z');
      jest.useFakeTimers().setSystemTime(mockDate);

      const name = GoogleDriveService.generateBackupName();
      // Compute expected name based on local date components (timezone dependent)
      const expectedYear = mockDate.getFullYear();
      const expectedMonth = String(mockDate.getMonth() + 1).padStart(2, '0');
      const expectedDay = String(mockDate.getDate()).padStart(2, '0');
      const expectedHours = String(mockDate.getHours()).padStart(2, '0');
      const expectedMinutes = String(mockDate.getMinutes()).padStart(2, '0');
      const expectedName = `backup_${expectedYear}-${expectedMonth}-${expectedDay}_${expectedHours}${expectedMinutes}.db`;
      expect(name).toBe(expectedName);
      
      jest.useRealTimers();
    });
  });

  describe('uploadBackup', () => {
    let mockUploadAsync: jest.Mock;
    let mockEnsureValidToken: jest.Mock;
    let mockEnsureBackupFolder: jest.Mock;

    beforeEach(() => {
      mockUploadAsync = jest.fn();
      mockEnsureValidToken = jest.fn().mockResolvedValue('valid-access-token');
      mockEnsureBackupFolder = jest.fn().mockResolvedValue('folder-123');
      (GoogleDriveService as any)._ensureValidToken = mockEnsureValidToken;
      (GoogleDriveService as any).ensureBackupFolder = mockEnsureBackupFolder;
      (FileSystem.uploadAsync as jest.Mock) = mockUploadAsync;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(GoogleDriveService.uploadBackup).toBeDefined();
      expect(typeof GoogleDriveService.uploadBackup).toBe('function');
    });

    it('should upload file using FileSystem.uploadAsync with resumable option', async () => {
      const localPath = '/path/to/backup.db';
      const remoteName = 'backup_2025-04-11_1430.db';
      const folderId = 'folder-123';
      const remoteFileId = 'file-456';
      const uploadResponse = {
        status: 200,
        headers: {},
        body: JSON.stringify({ id: remoteFileId }),
      };

      mockUploadAsync.mockResolvedValue(uploadResponse);

      const result = await GoogleDriveService.uploadBackup(localPath, remoteName);

      expect(mockEnsureValidToken).toHaveBeenCalled();
      expect(mockEnsureBackupFolder).toHaveBeenCalled();
      expect(mockUploadAsync).toHaveBeenCalledWith(
        `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`,
        localPath,
        {
          headers: {
            Authorization: 'Bearer valid-access-token',
            'Content-Type': 'application/json',
          },
          httpMethod: 'POST',
          uploadType: 'resumable',
          fieldName: 'metadata',
          parameters: {
            name: remoteName,
            parents: [folderId],
          },
        }
      );
      expect(result.success).toBe(true);
      expect(result.remoteId).toBe(remoteFileId);
      expect(result.error).toBeUndefined();
    });

    it('should generate backup name if remoteName not provided', async () => {
      const localPath = '/path/to/backup.db';
      const generatedName = 'backup_2025-04-11_1430.db';
      const folderId = 'folder-123';
      const remoteFileId = 'file-456';
      const uploadResponse = {
        status: 200,
        headers: {},
        body: JSON.stringify({ id: remoteFileId }),
      };

      jest.spyOn(GoogleDriveService, 'generateBackupName').mockReturnValue(generatedName);
      mockUploadAsync.mockResolvedValue(uploadResponse);

      const result = await GoogleDriveService.uploadBackup(localPath);

      expect(GoogleDriveService.generateBackupName).toHaveBeenCalled();
      expect(mockUploadAsync).toHaveBeenCalledWith(
        expect.any(String),
        localPath,
        expect.objectContaining({
          parameters: expect.objectContaining({
            name: generatedName,
          }),
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle upload failure', async () => {
      const localPath = '/path/to/backup.db';
      mockUploadAsync.mockRejectedValue(new Error('Network error'));

      const result = await GoogleDriveService.uploadBackup(localPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(result.remoteId).toBeUndefined();
    });

    it('should handle Drive API error response', async () => {
      const localPath = '/path/to/backup.db';
      const uploadResponse = {
        status: 403,
        headers: {},
        body: JSON.stringify({ error: { message: 'Insufficient permissions' } }),
      };
      mockUploadAsync.mockResolvedValue(uploadResponse);

      const result = await GoogleDriveService.uploadBackup(localPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('403');
    });
  });

  describe('performCloudBackup', () => {
    let mockVacuumInto: jest.Mock;
    let mockUploadBackup: jest.Mock;
    let mockDeleteAsync: jest.Mock;
    let mockSetBackupStatus: jest.Mock;
    let mockGenerateBackupName: jest.Mock;

    beforeEach(() => {
      mockVacuumInto = jest.fn();
      mockUploadBackup = jest.fn();
      mockDeleteAsync = jest.fn();
      mockSetBackupStatus = jest.fn();
      mockGenerateBackupName = jest.fn().mockReturnValue('backup_123.db');

      (SQLiteEngine as any).vacuumInto = mockVacuumInto;
      (GoogleDriveService as any).uploadBackup = mockUploadBackup;
      (GoogleDriveService.generateBackupName as jest.Mock) = mockGenerateBackupName;
      (FileSystem.deleteAsync as jest.Mock) = mockDeleteAsync;
      (FileSystem as any).cacheDirectory = '';
      (useBackupStore.getState as jest.Mock).mockReturnValue({
        setBackupStatus: mockSetBackupStatus,
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(GoogleDriveService.performCloudBackup).toBeDefined();
      expect(typeof GoogleDriveService.performCloudBackup).toBe('function');
    });

    it('should create snapshot, upload, and clean up', async () => {
      const tempPath = 'backup_123.db';
      const remoteId = 'remote-456';
      mockVacuumInto.mockImplementation((path) => {
        // Simulate file creation
        return Promise.resolve();
      });
      mockUploadBackup.mockResolvedValue({ success: true, remoteId });
      mockDeleteAsync.mockResolvedValue(undefined);

      const result = await GoogleDriveService.performCloudBackup();

      expect(mockSetBackupStatus).toHaveBeenCalledWith('backing-up');
      expect(mockVacuumInto).toHaveBeenCalledWith(tempPath);
      expect(mockUploadBackup).toHaveBeenCalledWith(tempPath);
      expect(mockDeleteAsync).toHaveBeenCalledWith(tempPath);
      expect(mockSetBackupStatus).toHaveBeenCalledWith('success');
      expect(result.success).toBe(true);
      expect(result.remoteId).toBe(remoteId);
    });

    it('should handle vacuum failure', async () => {
      mockVacuumInto.mockRejectedValue(new Error('DB error'));
      
      const result = await GoogleDriveService.performCloudBackup();

      expect(mockSetBackupStatus).toHaveBeenCalledWith('backing-up');
      expect(mockSetBackupStatus).toHaveBeenCalledWith('error', expect.stringContaining('DB error'));
      expect(mockUploadBackup).not.toHaveBeenCalled();
      expect(mockDeleteAsync).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('DB error');
    });

    it('should handle upload failure and clean up temp file', async () => {
      const tempPath = 'backup_123.db';
      mockVacuumInto.mockResolvedValue(undefined);
      mockUploadBackup.mockResolvedValue({ success: false, error: 'Upload failed' });
      mockDeleteAsync.mockResolvedValue(undefined);

      const result = await GoogleDriveService.performCloudBackup();

      expect(mockVacuumInto).toHaveBeenCalledWith(tempPath);
      expect(mockUploadBackup).toHaveBeenCalledWith(tempPath);
      expect(mockDeleteAsync).toHaveBeenCalledWith(tempPath);
      expect(mockSetBackupStatus).toHaveBeenCalledWith('error', 'Upload failed');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should delete temp file even if upload succeeds', async () => {
      const tempPath = 'backup_123.db';
      mockVacuumInto.mockResolvedValue(undefined);
      mockUploadBackup.mockResolvedValue({ success: true, remoteId: 'id' });
      mockDeleteAsync.mockResolvedValue(undefined);

      await GoogleDriveService.performCloudBackup();

      expect(mockDeleteAsync).toHaveBeenCalledWith(tempPath);
    });
  });

  describe('safety copy and restore', () => {
    let mockCopyAsync: jest.Mock;
    let mockMoveAsync: jest.Mock;
    let mockGetInfoAsync: jest.Mock;
    let mockClose: jest.Mock;
    let mockInitialize: jest.Mock;
    let mockGetUserVersion: jest.Mock;
    let mockDocumentDirectory: string;

    beforeEach(() => {
      jest.clearAllMocks();
      mockCopyAsync = jest.fn();
      mockMoveAsync = jest.fn();
      mockGetInfoAsync = jest.fn();
      mockClose = jest.fn();
      mockInitialize = jest.fn();
      mockGetUserVersion = jest.fn();
      mockDocumentDirectory = '/test/documents/';
      (FileSystem.copyAsync as jest.Mock) = mockCopyAsync;
      (FileSystem.moveAsync as jest.Mock) = mockMoveAsync;
      (FileSystem.getInfoAsync as jest.Mock) = mockGetInfoAsync;
      (FileSystem as any).documentDirectory = mockDocumentDirectory;
      (SQLiteEngine as any).close = mockClose;
      (SQLiteEngine as any).initialize = mockInitialize;
      (SQLiteEngine as any).getUserVersion = mockGetUserVersion;
    });

    describe('_createSafetyCopy', () => {
      it('should copy current database to .bak extension', async () => {
        const currentDbPath = '/test/documents/SQLite/hunther_wallet.db';
        const backupPath = currentDbPath + '.bak';
        mockCopyAsync.mockResolvedValue(undefined);

        await (GoogleDriveService as any)._createSafetyCopy(currentDbPath);

        expect(mockCopyAsync).toHaveBeenCalledWith({
          from: currentDbPath,
          to: backupPath,
        });
      });

      it('should propagate copy errors', async () => {
        const currentDbPath = '/test/documents/SQLite/hunther_wallet.db';
        const error = new Error('Copy failed');
        mockCopyAsync.mockRejectedValue(error);

        await expect((GoogleDriveService as any)._createSafetyCopy(currentDbPath)).rejects.toThrow('Copy failed');
      });
    });

    describe('_replaceDatabase', () => {
      const currentDbPath = '/test/documents/SQLite/hunther_wallet.db';
      const backupPath = currentDbPath + '.bak';
      const downloadedPath = '/cache/downloaded.db';

      beforeEach(() => {
        mockClose.mockResolvedValue(undefined);
        mockCopyAsync.mockResolvedValue(undefined);
        mockMoveAsync.mockResolvedValue(undefined);
        mockInitialize.mockResolvedValue(undefined);
        mockGetInfoAsync.mockResolvedValue({ exists: true });
      });

      it('should close DB, create safety copy, replace, and re-initialize', async () => {
        await (GoogleDriveService as any)._replaceDatabase(downloadedPath);

        expect(mockClose).toHaveBeenCalled();
        expect(mockCopyAsync).toHaveBeenCalledWith({
          from: currentDbPath,
          to: backupPath,
        });
        expect(mockMoveAsync).toHaveBeenCalledWith({
          from: downloadedPath,
          to: currentDbPath,
        });
        expect(mockInitialize).toHaveBeenCalled();
        expect(mockGetInfoAsync).not.toHaveBeenCalled(); // rollback not triggered
      });

      it('should rollback on move error and re-initialize with backup', async () => {
        const moveError = new Error('Move failed');
        // First move (replace) fails, second move (restore) succeeds
        mockMoveAsync
          .mockRejectedValueOnce(moveError) // first call: replace
          .mockResolvedValueOnce(undefined); // second call: restore
        mockGetInfoAsync.mockResolvedValue({ exists: true });

        await expect((GoogleDriveService as any)._replaceDatabase(downloadedPath)).rejects.toThrow('Move failed');

        expect(mockClose).toHaveBeenCalled();
        expect(mockCopyAsync).toHaveBeenCalled(); // safety copy created
        expect(mockMoveAsync).toHaveBeenCalledTimes(2); // move attempted + restore
        // Rollback: restore from backup
        expect(mockGetInfoAsync).toHaveBeenCalledWith(backupPath);
        expect(mockMoveAsync).toHaveBeenNthCalledWith(2, {
          from: backupPath,
          to: currentDbPath,
        });
        expect(mockInitialize).toHaveBeenCalled(); // re-initialize with old DB
      });

      it('should not rollback if backup does not exist', async () => {
        const moveError = new Error('Move failed');
        mockMoveAsync.mockRejectedValue(moveError);
        mockGetInfoAsync.mockResolvedValue({ exists: false });

        await expect((GoogleDriveService as any)._replaceDatabase(downloadedPath)).rejects.toThrow('Move failed');

        expect(mockGetInfoAsync).toHaveBeenCalledWith(backupPath);
        expect(mockMoveAsync).not.toHaveBeenCalledWith({
          from: backupPath,
          to: currentDbPath,
        });
        expect(mockInitialize).toHaveBeenCalled(); // still re-initialize
      });
    });

    describe('restoreCloudBackup', () => {
      let mockDownloadBackup: jest.Mock;
      let mockReplaceDatabase: jest.Mock;
      let mockDeleteAsync: jest.Mock;
      let mockCacheDirectory: string;

      beforeEach(() => {
        jest.clearAllMocks();
        mockDownloadBackup = jest.fn();
        mockReplaceDatabase = jest.fn();
        mockDeleteAsync = jest.fn();
        mockCacheDirectory = '/test/cache/';
        (GoogleDriveService as any).downloadBackup = mockDownloadBackup;
        (GoogleDriveService as any)._replaceDatabase = mockReplaceDatabase;
        (FileSystem.deleteAsync as jest.Mock) = mockDeleteAsync;
        (FileSystem as any).cacheDirectory = mockCacheDirectory;
        mockGetUserVersion.mockResolvedValue(1);
      });

      it('should download, replace, and clean up temp file', async () => {
        const backupId = 'backup-123';
        const tempPath = '/test/cache/restore_1234567890.db';
        // Mock Date.now to produce consistent temp file name
        const mockNow = 1234567890;
        jest.spyOn(Date, 'now').mockReturnValue(mockNow);

        mockDownloadBackup.mockResolvedValue(undefined);
        mockReplaceDatabase.mockResolvedValue(undefined);
        mockDeleteAsync.mockResolvedValue(undefined);

        const result = await GoogleDriveService.restoreCloudBackup(backupId);

        expect(mockDownloadBackup).toHaveBeenCalledWith(backupId, tempPath);
        expect(mockReplaceDatabase).toHaveBeenCalledWith(tempPath);
        expect(mockDeleteAsync).toHaveBeenCalledWith(tempPath);
        expect(mockSetBackupStatus).toHaveBeenCalledTimes(2);
        expect(mockSetBackupStatus).toHaveBeenNthCalledWith(1, 'restoring');
        expect(mockSetBackupStatus).toHaveBeenNthCalledWith(2, 'success');
        expect(result.success).toBe(true);
        expect(result.restoredVersion).toBe(1);
        expect(result.error).toBeUndefined();
        Date.now.mockRestore();
      });

      it('should handle download failure', async () => {
        const backupId = 'backup-123';
        const error = new Error('Download failed');
        const mockNow = 1234567890;
        jest.spyOn(Date, 'now').mockReturnValue(mockNow);
        const tempPath = '/test/cache/restore_1234567890.db';
        mockDownloadBackup.mockRejectedValue(error);
        mockDeleteAsync.mockResolvedValue(undefined);

        const result = await GoogleDriveService.restoreCloudBackup(backupId);

        expect(mockDownloadBackup).toHaveBeenCalledWith(backupId, tempPath);
        expect(mockReplaceDatabase).not.toHaveBeenCalled();
        expect(mockDeleteAsync).toHaveBeenCalledWith(tempPath); // finally block cleans up
        expect(mockSetBackupStatus).toHaveBeenCalledTimes(2);
        expect(mockSetBackupStatus).toHaveBeenNthCalledWith(1, 'restoring');
        expect(mockSetBackupStatus).toHaveBeenNthCalledWith(2, 'error', 'Download failed');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Download failed');
        Date.now.mockRestore();
      });

      it('should handle replace failure', async () => {
        const backupId = 'backup-123';
        const error = new Error('Replace failed');
        mockDownloadBackup.mockResolvedValue(undefined);
        mockReplaceDatabase.mockRejectedValue(error);
        mockDeleteAsync.mockResolvedValue(undefined);

        const result = await GoogleDriveService.restoreCloudBackup(backupId);

        expect(mockDownloadBackup).toHaveBeenCalled();
        expect(mockReplaceDatabase).toHaveBeenCalled();
        expect(mockDeleteAsync).toHaveBeenCalled(); // still clean up temp file
        expect(mockSetBackupStatus).toHaveBeenCalledTimes(2);
        expect(mockSetBackupStatus).toHaveBeenNthCalledWith(1, 'restoring');
        expect(mockSetBackupStatus).toHaveBeenNthCalledWith(2, 'error', 'Replace failed');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Replace failed');
      });

      it('should still attempt to clean up temp file on error', async () => {
        const backupId = 'backup-123';
        const mockNow = 1234567890;
        jest.spyOn(Date, 'now').mockReturnValue(mockNow);
        const tempPath = '/test/cache/restore_1234567890.db';
        mockDownloadBackup.mockRejectedValue(new Error('Download failed'));
        mockDeleteAsync.mockResolvedValue(undefined);

        await GoogleDriveService.restoreCloudBackup(backupId);

        expect(mockDownloadBackup).toHaveBeenCalledWith(backupId, tempPath);
        expect(mockDeleteAsync).toHaveBeenCalledWith(tempPath); // still called in finally
        expect(mockSetBackupStatus).toHaveBeenCalledTimes(2);
        expect(mockSetBackupStatus).toHaveBeenNthCalledWith(1, 'restoring');
        expect(mockSetBackupStatus).toHaveBeenNthCalledWith(2, 'error', 'Download failed');
        Date.now.mockRestore();
      });
    });
  });
});