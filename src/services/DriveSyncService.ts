import * as FileSystem from 'expo-file-system';
import { AuthService } from './AuthService';

/**
 * DriveSyncService
 * Handles the transport of the SQLite database between the local device 
 * and the user's Google Drive appDataFolder.
 */
export class DriveSyncService {
  private static readonly BACKUP_FILE_NAME = 'hunther_wallet.db';
  private static readonly DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

  /**
   * Uploads the local database to Google Drive.
   * Uses a two-step process: Metadata update/creation followed by a binary upload.
   */
  static async uploadBackup(): Promise<{ success: boolean; message: string }> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        return { success: false, message: 'User not authenticated. Please login first.' };
      }

      // Using (FileSystem as any) to bypass LSP type errors while maintaining standard Expo API usage
      const dbPath = (FileSystem as any).documentDirectory + this.BACKUP_FILE_NAME;
      const fileInfo = await FileSystem.getInfoAsync(dbPath);
      
      if (!fileInfo.exists) {
        return { success: false, message: 'Local database file not found.' };
      }

      // 2. Search for existing backup in appDataFolder
      const fileId = await this.findBackupFileId(token);
      
      let uploadUrl: string;
      if (fileId) {
        // UPDATE existing file metadata first to ensure name/properties are correct
        await this.updateFileMetadata(token, fileId);
        uploadUrl = `${this.DRIVE_API_BASE}/upload/drive/v3/files/${fileId}?uploadType=media`;
      } else {
        // CREATE new file metadata first
        const newFileId = await this.createFileMetadata(token);
        uploadUrl = `${this.DRIVE_API_BASE}/upload/drive/v3/files/${newFileId}?uploadType=media`;
      }

      // 3. Binary Upload using FileSystem.uploadAsync (efficient for binary data)
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, dbPath, {
        httpMethod: 'PATCH', // PATCH is used for media updates in Drive API
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
      });

      if (uploadResult.status === 200) {
        return { success: true, message: 'Backup uploaded successfully to Google Drive.' };
      } else {
        throw new Error(`Upload failed with status ${uploadResult.status}`);
      }

    } catch (error) {
      console.error('[DriveSyncService] uploadBackup error:', error);
      return { success: false, message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Downloads the database from Google Drive to a temporary local file.
   */
  static async downloadBackup(): Promise<{ success: boolean; tempPath: string | null, message: string }> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        return { success: false, tempPath: null, message: 'User not authenticated.' };
      }

      // 1. Find the backup file ID
      const fileId = await this.findBackupFileId(token);
      if (!fileId) {
        return { success: false, tempPath: null, message: 'No backup found in Google Drive.' };
      }

      // 2. Define temporary path for the download
      const tempPath = (FileSystem as any).cacheDirectory + 'hunther_wallet_temp.db';

      // 3. Download binary content
      const downloadResult = await FileSystem.downloadAsync(
        `${this.DRIVE_API_BASE}/files/${fileId}?alt=media`,
        tempPath,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (downloadResult.status === 200) {
        return { success: true, tempPath: downloadResult.uri, message: 'Backup downloaded successfully.' };
      } else {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

    } catch (error) {
      console.error('[DriveSyncService] downloadBackup error:', error);
      return { success: false, tempPath: null, message: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Searches for the backup file in the appDataFolder.
   */
  private static async findBackupFileId(token: string): Promise<string | null> {
    const response = await fetch(
      `${this.DRIVE_API_BASE}/files?q=name='${this.BACKUP_FILE_NAME}' and 'appDataFolder' in parents&spaces=appDataFolder&fields=files(id)`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error('Failed to search for backup file');
    
    const data = await response.json();
    return data.files.length > 0 ? data.files[0].id : null;
  }

  /**
   * Creates a new file entry in Drive metadata.
   */
  private static async createFileMetadata(token: string): Promise<string> {
    const response = await fetch(
      `${this.DRIVE_API_BASE}/files`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: this.BACKUP_FILE_NAME,
          parents: ['appDataFolder'],
        }),
      }
    );

    if (!response.ok) throw new Error('Failed to create file metadata');
    const data = await response.json();
    return data.id;
  }

  /**
   * Updates an existing file entry in Drive metadata.
   */
  private static async updateFileMetadata(token: string, fileId: string): Promise<void> {
    const response = await fetch(
      `${this.DRIVE_API_BASE}/files/${fileId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: this.BACKUP_FILE_NAME,
        }),
      }
    );

    if (!response.ok) throw new Error('Failed to update file metadata');
  }
}
