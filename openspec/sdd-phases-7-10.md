# 📐 SDD: Phases 7 - 10 (Resilience, Cloud, Security & Polish)

## Phase 7: Local Resilience

**Goal**: Provide a way for the user to backup and optimize their data locally.

### Specifications

- **Feature: Local DB Export**
  - Action: Trigger `PRAGMA wal_checkpoint(TRUNCATE)` $\rightarrow$ Copy `.db` file $\rightarrow$ Use `expo-sharing` to save to Downloads.
- **Feature: DB Maintenance**
  - Action: Execute `VACUUM` to reclaim space and defragment the database.

### Design

- **Component**: `BackupSettings` screen with "Export Local Copy" and "Optimize Database" buttons.
- **Service**: `LocalBackupService` to handle file system operations via `expo-file-system`.

---

## Phase 8: Cloud Ecosystem

**Goal**: Automatic and manual synchronization with Google Drive.

### Specifications

- **Feature: Google OAuth2 Auth**
  - Flow: `expo-auth-session` $\rightarrow$ Store Refresh Token in `expo-secure-store`.
- **Feature: Cloud Backup**
  - Logic: `SQLiteEngine.vacuumInto(tempPath)` $\rightarrow$ Upload to Google Drive folder `Respaldo_HuntherWallet`.
- **Feature: Cloud Restore**
  - Logic: Download $\rightarrow$ `PRAGMA integrity_check` $\rightarrow$ Stop Engine $\rightarrow$ Replace File $\rightarrow$ Restart.

### Design

- **Service**: `GoogleDriveService` implementing OAuth2 and Drive API.
- **Store**: `useBackupStore` to manage auth status and sync progress.

---

## Phase 9: Security Layer

**Goal**: Protect financial data from unauthorized access on the device.

### Specifications

- **Feature: PIN Access**
  - Logic: User sets 4-6 digit PIN $\rightarrow$ Hash with 10k iterations of SHA-256 $\rightarrow$ Save in `expo-secure-store`.
- **Feature: App Lock**
  - Flow: App start $\rightarrow$ Check if PIN is set $\rightarrow$ Show PIN screen $\rightarrow$ Grant access.

### Design

- **UI**: `PinScreen` with a custom numeric keypad.
- **Utility**: `SecurityUtils` for hashing and verification.

---

## Phase 10: Polish & Performance

**Goal**: Ensure the app feels "native" and performs perfectly on low-end devices.

### Specifications

- **Feature: List Optimization**
  - Requirement: All `FlatList` must use `initialNumToRender`, `maxToRenderPerBatch`, and `windowSize`.
- **Feature: Accessibility (a11y)**
  - Requirement: Support `allowFontScaling` and use `flexWrap` in Tailwind to avoid layout break.
- **Feature: Final QA**
  - Requirement: Full E2E test on Android 10+ low-end device.

### Design

- **Review**: Audit all screens for performance bottlenecks.
- **Refactor**: Replace any remaining `.map()` in lists with `FlatList`.
