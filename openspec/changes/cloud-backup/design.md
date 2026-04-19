# Design: Cloud Backup & Cache Management

## Technical Approach

The implementation will provide a user-centric backup and restore system leveraging Google Drive via OAuth2, building on existing infrastructure:

- **SQLiteEngine** already provides `close()`, `vacuum()`, and `vacuumInto()` methods for atomic snapshots.
- **LocalBackupService** offers local export and optimization patterns.
- **useBackupStore** (Zustand) already manages authentication state and backup status.

We will extend this foundation with cloud integration using `expo-auth-session` for OAuth2, `expo-file-system` for streaming upload/download, and `expo-background-fetch` for periodic backups. The system will create point‑in‑time snapshots via `VACUUM INTO`, upload them to a dedicated Google Drive folder (`Respaldo_HuntherWallet`), and enable restore with magic‑byte validation and safety copies. Background sync will run weekly on Wi‑Fi, respecting Doze‑mode limitations.

## Architecture Decisions

### Decision: Snapshot Mechanism
**Choice**: `VACUUM INTO 'file_path'`
**Alternatives considered**: Direct file copy of `.db` file.
**Rationale**: Direct copying of a live SQLite database (especially in WAL mode) can lead to corrupted backups if a write occurs during the copy. `VACUUM INTO` is the official SQLite way to create a consistent, compacted copy of the database while it is open.

### Decision: Cloud Storage Scope
**Choice**: `https://www.googleapis.com/auth/drive.file`
**Alternatives considered**: `drive.appdata` or full `drive` scope.
**Rationale**: `drive.file` provides the best balance of security and visibility. It allows the app to access only files it created, reducing the permission footprint while still allowing the user to see their backups in the 'Respaldo_HuntherWallet' folder.

### Decision: Restoration Safety
**Choice**: Magic‑byte validation + pre‑restore backup (`.bak`) + automatic reversion on failure.
**Alternatives considered**: Trusting the API response; atomic replace without safety copy.
**Rationale**: Replacing the primary data store is a high‑risk operation. We will verify the first 16 bytes of the downloaded file against the SQLite header (`SQLite format 3\000`), create a local `.bak` of the current DB before overwriting, and revert to `.bak` if the replacement fails.

### Decision: Token Persistence
**Choice**: `expo‑secure‑store`
**Alternatives considered**: `AsyncStorage`, unencrypted file storage.
**Rationale**: OAuth2 refresh tokens are sensitive credentials and MUST be stored in an encrypted keystore. `expo‑secure‑store` provides platform‑specific encryption (Keychain on iOS, Keystore on Android).

### Decision: OAuth2 Library
**Choice**: `expo‑auth‑session/providers/google`
**Alternatives considered**: `expo‑google‑sign‑in`, manual OAuth2 with `fetch`.
**Rationale**: `expo‑auth‑session` is already installed, follows Expo‑first philosophy, supports token refresh out‑of‑the‑box, and integrates seamlessly with the Expo development client. It also provides the required `androidClientId` configuration for Android.

### Decision: Upload Strategy
**Choice**: `expo‑file‑system`’s `uploadAsync` with resumable upload for files >10 MB.
**Alternatives considered**: Direct Google Drive REST API with `fetch`, base64 encoding.
**Rationale**: `uploadAsync` handles native streaming, avoids loading the entire `.db` file into memory (respecting the memory‑management constraint), supports chunking and resumable uploads, and automatically manages background uploads on iOS.

### Decision: Background Sync Library
**Choice**: `expo‑background‑fetch`
**Alternatives considered**: `expo‑task‑manager`, custom native module.
**Rationale**: `expo‑background‑fetch` is the standard Expo solution for periodic tasks, works on both Android and iOS, and integrates with platform‑specific scheduling (WorkManager on Android, BackgroundTasks on iOS). It is already installed as a transitive dependency of Expo.

### Decision: Folder Naming Convention
**Choice**: `Respaldo_HuntherWallet` (Spanish for “HuntherWallet Backup”)
**Alternatives considered**: `.hunther_wallet_backups`, `HuntherWallet/Backups`.
**Rationale**: A human‑readable, language‑appropriate folder name that clearly identifies the app and purpose, while being discoverable in the user’s Drive root.

### Decision: Backup File Naming
**Choice**: `backup_YYYY‑MM‑DD_HHmm.db` (e.g., `backup_2025‑04‑11_1430.db`)
**Alternatives considered**: Unix timestamp, UUID, user‑defined labels.
**Rationale**: ISO‑8601‑like date/time format provides immediate visual sorting and human readability, making it easy for users to identify the most recent backup.

### Decision: Version Migration Handling
**Choice**: Compare `PRAGMA user_version` of restored file with current version; run migrations if needed before activation.
**Alternatives considered**: Block restore of older versions, require manual migration via app update.
**Rationale**: Users may restore a backup created with an older app version. Automatically applying migrations ensures the restored database matches the current schema, preserving data integrity without extra user steps.

### Decision: Dependency Addition
**Choice**: Add `expo‑background‑fetch` to `package.json` dependencies.
**Alternatives considered**: Rely on transitive dependency from `expo`, implement custom WorkManager module.
**Rationale**: Although `expo‑background‑fetch` may be included transitively, explicitly listing it ensures version pinning and clear dependency documentation for future maintainers.

## Data Flow

### Backup Flow (Manual)
```
UI (Backup Now) → useBackupStore (set status) → GoogleDriveService.authenticateIfNeeded()
                   ↓
            SQLiteEngine.vacuumInto(tempPath)
                   ↓
       GoogleDriveService.ensureBackupFolder()
                   ↓
   GoogleDriveService.upload(tempPath, remoteName)
                   ↓
          FileSystem.deleteAsync(tempPath)
                   ↓
   useBackupStore (update lastBackupDate, status)
```

### Restore Flow
```
UI (Select Backup) → GoogleDriveService.listBackups()
                         ↓
          GoogleDriveService.download(remoteId, localPath)
                         ↓
          Validation (SQLite header magic bytes)
                         ↓
                  SQLiteEngine.close()
                         ↓
          FileSystem.copyAsync(currentDb → currentDb.bak)
                         ↓
      FileSystem.moveAsync(downloadedPath → currentDb)
                         ↓
               SQLiteEngine.initialize()
                         ↓
       Optional: run migrations if user_version mismatch
                         ↓
   useBackupStore (notify success / revert on failure)
```

### Background Sync Flow
```
expo‑background‑fetch trigger → Check Wi‑Fi & authentication
                                   ↓
                    If conditions met, run Backup Flow
                                   ↓
                    Update lastBackupDate in store
                                   ↓
                Return BackgroundFetchResult.NewData
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/database/SQLiteEngine.ts` | Extend | Already has `close()`, `vacuum()`, `vacuumInto()`; add `getUserVersion()` helper for migration checks. |
| `src/services/GoogleDriveService.ts` | Create | OAuth2 flow (expo‑auth‑session), folder management, streaming upload/download via expo‑file‑system, backup listing. |
| `src/store/useBackupStore.ts` | Extend | Already exists; add fields for backup list, cloud authentication status, and background sync settings. |
| `app/settings.tsx` | Modify | Add Cloud Backup section with link to backup screen, status indicator, and manual trigger buttons. |
| `app/settings/backup.tsx` | Create | Dedicated screen for cloud backup management: authentication, backup list, restore selection, and cache cleanup. |
| `app/_layout.tsx` | Modify | Register background‑fetch task for weekly backups (only when authenticated). |
| `app.json` (or `app.config.js`) | Modify | Add Android OAuth client‑ID (`androidClientId`) and iOS bundle identifier configuration. |
| `package.json` | Modify | Add explicit dependency on `expo‑background‑fetch`. |

## Interfaces / Contracts

### GoogleDriveService
```typescript
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
  authenticate(): Promise<AuthResult>,

  /** Revokes tokens and clears secure storage. */
  logout(): Promise<void>,

  /** Ensures the Respaldo_HuntherWallet folder exists; returns its Drive ID. */
  ensureBackupFolder(): Promise<string>,

  /** Uploads a local file to the backup folder with date‑based naming. */
  uploadBackup(localPath: string, remoteName?: string): Promise<BackupResult>,

  /** Lists all `.db` files in the backup folder, sorted by date descending. */
  listBackups(): Promise<BackupItem[]>,

  /** Downloads a backup by its Drive ID to a local temporary path. */
  downloadBackup(remoteId: string, localPath: string): Promise<void>,

  /** Deletes a remote backup file (e.g., for cleanup of old backups). */
  deleteBackup(remoteId: string): Promise<void>,
};
```

### SQLiteEngine Extensions
```typescript
// Existing methods (already implemented):
//   close(): Promise<void>
//   vacuum(): Promise<void>
//   vacuumInto(destinationPath: string): Promise<void>

// New helper for migration checks:
async getUserVersion(): Promise<number>;

// Optional: method to run migrations on a given database file (for restore).
// This could be part of a separate MigrationService.
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `GoogleDriveService` methods (auth, upload, list) | Mock `expo‑auth‑session` responses, `expo‑file‑system` calls, and Drive API responses using Jest. |
| Unit | `SQLiteEngine` extensions | Verify `getUserVersion()` returns correct version; ensure `vacuumInto` creates a valid SQLite file (header check). |
| Integration | Backup flow with mocked Drive | Combine `SQLiteEngine.vacuumInto` + `GoogleDriveService.uploadBackup` using a mock folder ID; verify end‑to‑end success status. |
| Integration | Restore flow with validation | Download mock backup file, validate magic bytes, simulate replace and migration steps. |
| Manual E2E | Full backup & restore on real device | Test with real Google account on Android/iOS emulator; verify data integrity after restore. |
| Manual E2E | Background sync | Enable background fetch, simulate trigger, verify backup occurs only on Wi‑Fi and updates store. |

## Migration / Rollout

No data migration required. The feature is additive. Rollout steps:

1. **Dependency addition**: Add `expo‑background‑fetch` to `package.json`; run `npm install`.
2. **Google Cloud Console configuration**:
   - Create OAuth2 client IDs for Android (with SHA‑1 fingerprint) and iOS (bundle ID).
   - Add authorized redirect URIs (e.g., `com.huntherwallet.app:/oauthredirect`).
3. **App configuration**: Update `app.json` with Android `androidClientId` and iOS `iosClientId`.
4. **First‑run flow**: On first successful authentication, the app will create the `Respaldo_HuntherWallet` folder in the user's Drive.
5. **Background sync registration**: The backup scheduler will be registered when the app starts (only if user is authenticated).
6. **UI integration**: The Cloud Backup section will appear in Settings once the feature is complete.

Rollback plan: If critical issues arise, disable the UI screens and remove background‑fetch registration; existing backups remain in Drive and can be restored manually after fixes.

## Open Questions

- [ ] Should we implement versioning for the backup files or only keep the N most recent? (Default: Keep last 3, delete older).
- [ ] How to handle very large databases on slow connections? (Implementation will use `expo‑file‑system`’s upload capabilities).
- [ ] Should we add a progress indicator for upload/download? (Recommended for files >10 MB).
- [ ] Should we allow the user to choose a custom backup folder name? (Adds complexity; keep fixed for v1.)
- [ ] How to handle token refresh failures? (Auto‑logout and prompt re‑authentication.)
- [ ] Should we encrypt backup files before upload? (Out of scope for v1; rely on Drive security.)

## Google Cloud Console Configuration Steps

1. **Create a project** (or use existing) in Google Cloud Console.
2. **Enable Google Drive API** for the project.
3. **Create OAuth2 credentials**:
   - **Android**: Provide package name (`com.huntherwallet.app`) and SHA‑1 fingerprint from your keystore (debug or release). 
   - **iOS**: Provide bundle identifier (`com.huntherwallet.app`) and register the custom URL scheme.
4. **Add authorized redirect URIs**:
   - Android: `com.huntherwallet.app:/oauthredirect`
   - iOS: `com.huntherwallet.app:/oauthredirect`
   - Web (optional): `https://auth.expo.io/@your‑username/your‑app‑slug`
5. **Copy client IDs** into `app.json` under `expo.android.config.googleSignIn.androidClientId` and `expo.ios.config.googleSignIn.iosClientId` (or equivalent for `expo‑auth‑session`).
6. **Test** using the Expo development client before building a standalone APK/IPA.
