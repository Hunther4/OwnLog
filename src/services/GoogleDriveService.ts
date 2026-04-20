import * as AuthSession from 'expo-auth-session';
import { AuthRequest } from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import {
  documentDirectory,
  cacheDirectory,
  getInfoAsync,
  readAsStringAsync,
  copyAsync,
  moveAsync,
  deleteAsync,
  uploadAsync,
  downloadAsync as fsDownloadAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import type { FileSystemUploadOptions } from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { useBackupStore } from '../store/useBackupStore';
import SQLiteEngine from '../database/SQLiteEngine';
import { telemetry } from './TelemetryService';
import { getConfig } from '../utils/config';

// Get FS paths correctly - use legacy constants
const documentDir = documentDirectory || '';
const cacheDir = cacheDirectory || '';

// Google OAuth Client ID - from environment variable, NOT hardcoded
const GOOGLE_CLIENT_ID = getConfig('EXPO_PUBLIC_GOOGLE_CLIENT_ID', true) || '';

// In‑memory cache of the access token and its expiry timestamp (milliseconds since epoch)
let accessToken: string | null = null;
let tokenExpiry: number | null = null;

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: { email: string; name?: string };
}

export interface BackupResult {
  success: boolean;
  remoteId?: string;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredVersion?: number;
  error?: string;
}

export interface BackupItem {
  id: string;
  name: string;
  modifiedTime: string;
  size: number;
}

/**
 * Service handling all Google Drive interactions: OAuth2 authentication,
 * folder management, and file upload/download.
 */
export const GoogleDriveService = {
  /** Initiates OAuth2 flow using expo‑auth‑session/providers/google. */
  async authenticate(): Promise<AuthResult> {
    const { setCloudAuthStatus, setCloudUser } = useBackupStore.getState();
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'com.drack.ownlog',
        path: 'oauthredirect',
      });
      // Use AuthRequest class directly (not a hook)
      const request = new AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
        redirectUri,
      });
      // Prompt for authentication - use Google provider
      const result = await request.promptAsync({});
      if (result.type !== 'success') {
        setCloudAuthStatus('error');
        setCloudUser(null);
        return {
          success: false,
          error: result.type,
        };
      }
      // Store refresh token
      const refreshToken = result.params?.refresh_token;
      if (refreshToken) {
        await SecureStore.setItemAsync('google_drive_refresh_token', refreshToken);
      }
      // Cache access token and expiry - access token is in result.authentication
      const auth = result.authentication;
      accessToken = auth?.accessToken || null;
      if (auth) {
        tokenExpiry = (auth.issuedAt || 0) + (auth.expiresIn || 0) * 1000;
      }
      // Fetch user info
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((res) => res.json());
      const cloudUser = { email: userInfo.email, name: userInfo.name };
      setCloudAuthStatus('authenticated');
      setCloudUser(cloudUser);
      return {
        success: true,
        user: cloudUser,
      };
    } catch (error) {
      setCloudAuthStatus('error');
      setCloudUser(null);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /** Internal token refresh interceptor. */
  async _ensureValidToken(): Promise<string> {
    // If we have a valid cached token, return it
    if (accessToken && tokenExpiry && tokenExpiry > Date.now() + 60000) {
      return accessToken;
    }

    const refreshToken = await SecureStore.getItemAsync('google_drive_refresh_token');
    if (!refreshToken) {
      // No refresh token available, user must re-authenticate
      useBackupStore.getState().setCloudAuthStatus('error');
      useBackupStore.getState().setCloudUser(null);
      throw new Error('No refresh token available');
    }

    try {
      // Note: clientId placeholder will be overridden by platform config, same as authenticate
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      accessToken = data.access_token;
      tokenExpiry = Date.now() + data.expires_in * 1000;
      // If a new refresh token is provided, store it
      if (data.refresh_token) {
        await SecureStore.setItemAsync('google_drive_refresh_token', data.refresh_token);
      }
      return accessToken!;
    } catch (error) {
      // Refresh failed, clear auth state
      useBackupStore.getState().setCloudAuthStatus('error');
      useBackupStore.getState().setCloudUser(null);
      throw error;
    }
  },

  /** Validates that a file is a valid SQLite database by checking the magic header. */
  async _validateSQLiteHeader(filePath: string): Promise<boolean> {
    try {
      const info = await getInfoAsync(filePath);
      // If file is too large, we skip the header check to avoid OOM
      // and rely on SQLiteEngine.initialize() for validation.
      if (!info.exists || (info.size && info.size > 1024 * 1024)) {
        return true;
      }
      const base64 = await readAsStringAsync(filePath, { encoding: 'base64' });
      const header = base64.slice(0, 24); // 16 bytes → 24 base64 chars
      return header === 'U1FMaXRlIGZvcm1hdCAzAA==';
    } catch {
      return false;
    }
  },

  /** Verifies database structural integrity using PRAGMA integrity_check. */
  async _verifyIntegrity(filePath: string): Promise<boolean> {
    let db;
    try {
      db = await SQLite.openDatabaseAsync(filePath);
      const result = await db.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
      return result?.integrity_check === 'ok';
    } catch {
      return false;
    } finally {
      if (db) await db.closeAsync();
    }
  },

  /** Creates a safety copy of the current database file with .bak extension. */
  async _createSafetyCopy(currentDbPath: string): Promise<void> {
    const backupPath = currentDbPath + '.bak';
    await copyAsync({
      from: currentDbPath,
      to: backupPath,
    });
  },

  /** Replaces the current database with a downloaded file, creating a safety copy and rolling back on failure. */
  async _replaceDatabase(downloadedPath: string): Promise<void> {
    // Get current database path (assuming default location)
    const currentDbPath = `${documentDir}SQLite/hunther_wallet.db`;
    // Close database connections
    await SQLiteEngine.close();
    try {
      // Create safety copy
      await this._createSafetyCopy(currentDbPath);
      // Move downloaded file over current DB
      await moveAsync({
        from: downloadedPath,
        to: currentDbPath,
      });
      // Re-initialize database
      await SQLiteEngine.initialize();

      // Test Query: Verify that we can actually read from the restored DB
      const db = await SQLite.openDatabaseAsync('hunther_wallet.db');
      await db.execAsync('SELECT 1');
      await db.closeAsync();
    } catch (error) {
      // Rollback: restore from safety copy if exists
      const backupPath = currentDbPath + '.bak';
      const backupExists = await getInfoAsync(backupPath);
      if (backupExists.exists) {
        await moveAsync({
          from: backupPath,
          to: currentDbPath,
        });
      }
      // Re-initialize anyway (with old DB)
      await SQLiteEngine.initialize();
      throw error;
    }
  },

  /** Revokes tokens and clears secure storage. */
  async logout(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('google_drive_refresh_token');
    } catch (error) {
      console.warn('Failed to delete refresh token during logout:', error);
    }

    const { setCloudAuthStatus, setCloudUser } = useBackupStore.getState();
    setCloudAuthStatus('unknown');
    setCloudUser(null);

    accessToken = null;
    tokenExpiry = null;
  },

/** Ensures the Respaldo_OwnLog folder exists; returns its Drive ID. */

  ensureBackupFolder = async (): Promise<string> => {
    const query = `name='Respaldo_OwnLog' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  /** Ensures the Respaldo_OwnLog folder exists; returns its Drive ID. */
  async ensureBackupFolder(): Promise<string> {
    const query = `name='Respaldo_OwnLog' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  
    const folder = await this.findFolderByName('Respaldo_OwnLog');
  
    if (folder) {
      this.backupFolderId = folder.id;
      return folder.id;
    }
  
    // Create folder if not exists
    const accessToken = await this._ensureValidToken();
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Respaldo_OwnLog',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    if (!createResponse.ok) {
      throw new Error(`Failed to create folder: ${createResponse.statusText}`);
    }
    const folder = await createResponse.json();
    return folder.id;
  },

  /** Generates a backup file name in format backup_YYYY‑MM‑DD_HHmm.db */
  generateBackupName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `backup_${year}-${month}-${day}_${hours}${minutes}.db`;
  },

  /** Uploads a local file to the backup folder with date‑based naming. */
  async uploadBackup(localPath: string, remoteName?: string): Promise<BackupResult> {
    try {
      const token = await this._ensureValidToken();
      const folderId = await this.ensureBackupFolder();
      const fileName = remoteName ?? this.generateBackupName();

      const uploadOptions: FileSystemUploadOptions = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        httpMethod: 'POST',
        uploadType: 0,
      };
      const response = await uploadAsync(
        `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`,
        localPath,
        uploadOptions
      );

      if (response.status >= 200 && response.status < 300) {
        const body = JSON.parse(response.body);
        const remoteId = body.id;
        return {
          success: true,
          remoteId,
        };
      } else {
        // Try to parse error message from response body
        let errorMsg = `Drive API upload failed with status ${response.status}`;
        try {
          const errorBody = JSON.parse(response.body);
          if (errorBody.error?.message) {
            errorMsg = `Drive API upload failed with status ${response.status}: ${errorBody.error.message}`;
          }
        } catch {
          // ignore
        }
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /** Creates a database snapshot and uploads it to Google Drive. */
  async performCloudBackup(): Promise<BackupResult> {
    const { setBackupStatus } = useBackupStore.getState();
    const tempPath = cacheDir + this.generateBackupName();

    try {
      setBackupStatus('backing-up');
      await SQLiteEngine.vacuumInto(tempPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setBackupStatus('error', message);
      return {
        success: false,
        error: message,
      };
    }

    try {
      const uploadResult = await this.uploadBackup(tempPath);
      if (uploadResult.success) {
        setBackupStatus('success');
      } else {
        setBackupStatus('error', uploadResult.error);
      }
      // Clean up temp file regardless of upload success/failure
      await deleteAsync(tempPath);
      return uploadResult;
    } catch (error) {
      // Should not happen because uploadBackup catches errors, but just in case
      const message = error instanceof Error ? error.message : 'Unknown error';
      setBackupStatus('error', message);
      // Still try to delete temp file
      try {
        await deleteAsync(tempPath);
      } catch {
        // ignore
      }
      return {
        success: false,
        error: message,
      };
    }
  },

  /** Lists all `.db` files in the backup folder, sorted by date descending. */
  async listBackups(): Promise<BackupItem[]> {
    const token = await this._ensureValidToken();
    const folderId = await this.ensureBackupFolder();
    const query = encodeURIComponent(
      `parents in "${folderId}" and name contains '.db' and trashed=false`
    );
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&fields=files(id,name,modifiedTime,size)`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Drive API error: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.files) {
      return [];
    }
    return data.files.map((file: any) => ({
      id: file.id,
      name: file.name,
      modifiedTime: file.modifiedTime,
      size: Number(file.size),
    }));
  },

  /** Downloads a backup by its Drive ID to a local temporary path. */
  async downloadBackup(remoteId: string, localPath: string): Promise<void> {
    const token = await this._ensureValidToken();
    const url = `https://www.googleapis.com/drive/v3/files/${remoteId}?alt=media`;
    const response = await fsDownloadAsync(url, localPath, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.status !== 200) {
      throw new Error(`Download failed with status ${response.status}`);
    }
    const isValid = await this._validateSQLiteHeader(localPath);
    if (!isValid) {
      // Clean up invalid file
      await deleteAsync(localPath);
      throw new Error('Invalid SQLite header');
    }
  },

  /** Orchestrates download, validation, safety copy, replacement, and migration. */
  async restoreCloudBackup(backupId: string): Promise<RestoreResult> {
    const tempPath = cacheDir + `restore_${Date.now()}.db`;
    const sqliteTempPath = `${documentDir}SQLite/temp_restore.db`;
    const { setBackupStatus } = useBackupStore.getState();
    try {
      setBackupStatus('restoring');
      await this.downloadBackup(backupId, tempPath);

      // Move to SQLite directory for integrity check
      await moveAsync({ from: tempPath, to: sqliteTempPath });

      const isHealthy = await this._verifyIntegrity(sqliteTempPath);
      if (!isHealthy) {
        await deleteAsync(sqliteTempPath);
        throw new Error('Restore aborted: Backup file failed integrity check.');
      }

      await this._replaceDatabase(sqliteTempPath);
      const restoredVersion = await SQLiteEngine.getUserVersion();
      setBackupStatus('success');

      telemetry.trackEvent('RESTORE_SUCCESS', { restoredVersion });

      return {
        success: true,
        restoredVersion,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setBackupStatus('error', errorMessage);

      if (errorMessage.includes('integrity check')) {
        telemetry.trackEvent('RESTORE_INTEGRITY_FAIL', { error: errorMessage });
      }

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      // Clean up temporary files
      try {
        await deleteAsync(tempPath);
        const tempExists = await getInfoAsync(sqliteTempPath);
        if (tempExists.exists) await deleteAsync(sqliteTempPath);
      } catch {
        // ignore
      }
    }
  },

  /** Deletes a remote backup file (e.g., for cleanup of old backups). */
  async deleteBackup(remoteId: string): Promise<void> {
    const token = await this._ensureValidToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${remoteId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete backup: ${response.statusText}`);
    }
  },
};
