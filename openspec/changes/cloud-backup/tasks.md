# Tasks: Cloud Backup & Cache Management

## Phase 1: Configuration & Authentication (Native Auth Flow)

- [x] 1.1 **Google Cloud Console Configuration**  
  Create OAuth2 credentials in Google Cloud Console: Android client ID (SHA‑1 fingerprint), iOS client ID (bundle ID), authorized redirect URIs (`com.huntherwallet.app:/oauthredirect`). Document credentials for `app.json`.

- [x] 1.2 **Add Dependency**  
  Add `expo‑background‑fetch` to `package.json` dependencies and run `npm install`.

- [x] 1.3 **Update App Configuration**  
  Add Android `androidClientId` and iOS `iosClientId` to `app.json` (or `app.config.js`) under `expo.android.config.googleSignIn` and `expo.ios.config.googleSignIn`. Ensure custom URL scheme for redirect is declared.

- [x] 1.4 **Create GoogleDriveService Skeleton**  
  Create `src/services/GoogleDriveService.ts` with TypeScript interfaces (`AuthResult`, `BackupResult`, `RestoreResult`, `BackupItem`) and empty method stubs (`authenticate`, `logout`, `ensureBackupFolder`, `uploadBackup`, `listBackups`, `downloadBackup`, `deleteBackup`).

- [x] 1.5 **Implement OAuth2 Authentication**  
  In `GoogleDriveService.authenticate`, use `expo‑auth‑session/providers/google` with `androidClientId` and `iosClientId`. Store refresh token in `expo‑secure‑store`. Return `AuthResult` with user email/name on success.

- [x] 1.6 **Implement Token Refresh Interceptor**  
  Add token refresh logic before each Drive API call: check expiry, refresh using stored refresh token, update secure store. Handle refresh failures by logging out. (partially implemented - will be fully integrated in Phase 2)

- [x] 1.7 **Extend useBackupStore for Auth State**  
  Add fields `cloudAuthStatus: 'unknown' | 'authenticated' | 'error'`, `cloudUser: {email: string, name?: string} | null`. Add actions `setCloudAuthStatus`, `setCloudUser`. Update store initial state.

- [x] 1.8 **Wire Auth to Store**  
  Modify `GoogleDriveService.authenticate` to dispatch auth status changes to `useBackupStore`. Call `setCloudAuthStatus` and `setCloudUser` on success/failure.

## Phase 2: Export Pipeline (Snapshot & Upload)

- [x] 2.1 **Extend SQLiteEngine with getUserVersion**  
  Add `async getUserVersion(): Promise<number>` method to `src/database/SQLiteEngine.ts` that returns `PRAGMA user_version`.

- [x] 2.2 **Implement ensureBackupFolder**  
  In `GoogleDriveService.ensureBackupFolder`, query Drive for folder `Respaldo_HuntherWallet`. If missing, create it with `mimeType: 'application/vnd.google-apps.folder'`. Cache and return folder ID.

- [x] 2.3 **Implement Backup Naming Helper**  
  Create `generateBackupName(): string` returning `backup_YYYY‑MM‑DD_HHmm.db` using current date/time.

- [x] 2.4 **Implement Upload with Native Streaming**  
  In `GoogleDriveService.uploadBackup`, use `expo‑file‑system.uploadAsync` with `httpMethod: 'POST'`, `uploadType: 'resumable'` for files >10 MB. Set `headers` with `Authorization: Bearer <accessToken>`. Target URL `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`. Include metadata `name`, `parents: [folderId]`.

- [x] 2.5 **Integrate VacuumInto with Upload**  
  Create `performCloudBackup()` helper that calls `SQLiteEngine.vacuumInto(tempPath)`, passes temp path to `uploadBackup`, then deletes temp file via `FileSystem.deleteAsync`. Update `useBackupStore` status during steps.

- [x] 2.6 **Add Manual Backup UI Trigger**  
  In `app/settings/backup.tsx` (to be created), add a "Backup Now" button that calls `performCloudBackup`. Show loading state and success/error alert.

## Phase 3: Restore Pipeline (Download & Validation)

- [x] 3.1 **Implement Backup Listing**  
  In `GoogleDriveService.listBackups`, query Drive for `.db` files in backup folder, sorted by `modifiedTime desc`. Map to `BackupItem[]` (id, name, modifiedTime, size).

- [x] 3.2 **Implement Download with Validation**  
  In `GoogleDriveService.downloadBackup`, use `expo‑file‑system.downloadAsync` to fetch file to local path. After download, read first 16 bytes and verify they match `SQLite format 3\000`. Throw validation error if mismatch.

- [x] 3.3 **Create Safety Copy Mechanism**  
  Write `createSafetyCopy(currentDbPath: string): Promise<void>` that copies the current database to `currentDbPath + '.bak'` using `FileSystem.copyAsync`.

- [x] 3.4 **Implement Atomic Database Replacement**  
  Write `replaceDatabase(downloadedPath: string): Promise<void>` that: closes SQLiteEngine (`SQLiteEngine.close()`), calls safety copy, moves downloaded file over current DB (`FileSystem.moveAsync`), re‑initializes SQLiteEngine (`SQLiteEngine.initialize()`). Rollback on error: revert from `.bak`.

- [x] 3.5 **Add Migration Check on Restore**  
  After replacement, compare `PRAGMA user_version` of restored file with current version. If lower, run existing migration logic (re‑use migration steps from `SQLiteEngine.initialize`). Ensure schema is up‑to‑date before completing restore. (Migration check is performed by calling `SQLiteEngine.initialize()` which already includes migration logic.)

- [x] 3.6 **Implement Full Restore Flow**  
  Create `restoreCloudBackup(backupId: string): Promise<RestoreResult>` that orchestrates download, validation, safety copy, replacement, and migration. Update `useBackupStore` status.

- [x] 3.7 **Add Restore UI**  
  In `app/settings/backup.tsx`, display list of backups with `modifiedTime` and size. Each item has a "Restore" button that triggers confirmation dialog, then calls `restoreCloudBackup`. Show progress and result.

## Phase 4: Background Sync (Periodic Backups)

- [ ] 4.1 **Register Background Task**  
  In `app/_layout.tsx`, add `expo‑background‑fetch.registerTaskAsync` with task name `'CLOUD_BACKUP_SYNC'`. Define minimum interval `60 * 24` (24h). Registration should only happen if user is authenticated (check `useBackupStore.cloudAuthStatus`).

- [ ] 4.2 **Implement Background Task Handler**  
  Create `src/tasks/cloudBackupTask.ts` exporting `async function cloudBackupTask()` that checks Wi‑Fi (`expo‑network.getNetworkStateAsync`), calls `performCloudBackup` if on Wi‑Fi, else skips. Return `BackgroundFetch.BackgroundFetchResult.NewData` or `.NoData`.

- [ ] 4.3 **Wire Handler to Registration**  
  Pass `cloudBackupTask` to `registerTaskAsync`. Ensure task is defined before registration (use `BackgroundFetch.setTaskHandler`).

- [ ] 4.4 **Add Background Sync Settings**  
  Extend `useBackupStore` with `backgroundSyncEnabled: boolean`. Add toggle in `app/settings/backup.tsx` to enable/disable background backups.

- [ ] 4.5 **Test Background Trigger**  
  Use `expo‑background‑fetch.simulateTaskAsync` in development to verify backup runs correctly when conditions are met.

## Phase 5: UI Integration (Screens & Navigation)

- [ ] 5.1 **Create Backup Screen**  
  Create `app/settings/backup.tsx` with sections: authentication status, last backup date, backup list, manual backup button, background sync toggle, disconnect button. Use existing styling patterns.

- [ ] 5.2 **Add Navigation to Settings**  
  In `app/settings.tsx`, add a new "Cloud Backup" section with a button that navigates to `app/settings/backup.tsx`. Use `router.push` from Expo Router.

- [ ] 5.3 **Update Settings Layout**  
  Ensure `app/_layout.tsx` includes the backup screen in the tab stack (if needed) or as a modal. Decide navigation approach: push from settings.

- [ ] 5.4 **Add Status Indicators**  
  In `app/settings.tsx`, show a small badge "Cloud: Connected" or "Not Connected" next to the Cloud Backup button, based on `useBackupStore.cloudAuthStatus`.

- [ ] 5.5 **Implement Disconnect Flow**  
  In `GoogleDriveService.logout`, revoke tokens (call Google OAuth2 revoke endpoint), clear secure store, update `useBackupStore`. Add "Disconnect" button in backup screen.

## Phase 6: Testing & Verification

- [ ] 6.1 **Unit Tests for GoogleDriveService**  
  Write Jest tests mocking `expo‑auth‑session`, `expo‑file‑system`, and Drive API responses. Test `authenticate`, `ensureBackupFolder`, `uploadBackup`, `listBackups`, `downloadBackup`.

- [ ] 6.2 **Unit Tests for SQLiteEngine Extensions**  
  Test `getUserVersion` returns correct version. Test `vacuumInto` creates valid SQLite file (header check). Use an in‑memory test database.

- [ ] 6.3 **Integration Test: Backup Flow**  
  Combine `SQLiteEngine.vacuumInto` + `GoogleDriveService.uploadBackup` using a mock folder ID. Verify end‑to‑end success status.

- [ ] 6.4 **Integration Test: Restore Flow**  
  Download a mock backup file, validate magic bytes, simulate replace and migration steps. Verify data integrity after restore.

- [ ] 6.5 **Manual E2E on Real Device**  
  Test full backup & restore with real Google account on Android/iOS emulator. Verify data survives restore.

- [ ] 6.6 **Manual E2E Background Sync**  
  Enable background fetch, simulate trigger, verify backup occurs only on Wi‑Fi and updates store.

## Phase 7: Deployment & Rollout

- [ ] 7.1 **Update Documentation**  
  Add README section about cloud backup feature, including Google Cloud Console setup steps.

- [ ] 7.2 **Verify Google Cloud Console Configuration**  
  Double‑check OAuth2 client IDs, SHA‑1 fingerprint for release builds, and authorized redirect URIs.

- [ ] 7.3 **Build Test APK/IPA**  
  Create a development build with the new feature and test on physical device.

- [ ] 7.4 **Monitor Error Logging**  
  Ensure errors during OAuth, upload, restore are logged to console or remote logging service.

- [ ] 7.5 **Rollback Plan Activation**  
  Prepare instructions to disable UI screens and remove background‑fetch registration if critical issues arise.

---

## Implementation Order

1. **Start with Phase 1** (Configuration & Authentication) because everything else depends on OAuth2 credentials and the `GoogleDriveService` skeleton.
2. **Proceed to Phase 2** (Export Pipeline) to enable manual backups – this provides immediate user value.
3. **Then Phase 3** (Restore Pipeline) to complete the core backup/restore loop.
4. **Phase 4** (Background Sync) builds on export pipeline and adds automation.
5. **Phase 5** (UI Integration) can be developed in parallel with Phases 2‑4, but final wiring should wait until services are ready.
6. **Phase 6** (Testing) should be performed after each phase, but comprehensive integration tests require all services.
7. **Phase 7** (Deployment) is the final step before release.

## Total Tasks: 42
