# Tasks: Local Resilience (Phase 7)

## Phase 1: Infrastructure

- [x] 1.1 Update `src/database/SQLiteEngine.ts`: implement `checkpoint()` using `PRAGMA wal_checkpoint(TRUNCATE)` to ensure file consistency.
- [x] 1.2 Create `src/services/LocalBackupService.ts`: implement `exportDatabase()` using `expo-file-system` and `expo-sharing`.
- [x] 1.3 Create `src/services/LocalBackupService.ts`: implement `optimizeDatabase()` using `SQLiteEngine.vacuum()`.

## Phase 2: UI Integration

- [x] 2.1 Modify `app/settings.tsx`: add "Data Management" section.
- [x] 2.2 Implement "Export Local Copy" button with loading state and success/error alerts.
- [x] 2.3 Implement "Optimize Database" button with loading state and success/error alerts.

## Phase 3: Verification

- [ ] 3.1 E2E Test: Verify that `exportDatabase()` generates a valid `.db` file that can be opened by external SQLite browsers.
- [ ] 3.2 E2E Test: Verify that `optimizeDatabase()` actually reduces the file size of the database on a device with fragmented data.
- [ ] 3.3 UX Test: Ensure that `ActivityIndicator` is visible and UI is not blocked during long-running operations.
