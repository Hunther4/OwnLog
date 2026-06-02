# 📐 SDD: Phase 8 - Cloud Ecosystem

## Goal
Implement a reliable, secure, and transparent backup and restore system using Google Drive, ensuring that user data is synchronized across devices or recoverable after a factory reset.

## 🛠️ Pre-requisites (Infrastructure)
Before implementation, the following must be configured in the Google Cloud Console:
- **Project Creation**: A dedicated project for HuntherWallet.
- **OAuth Consent Screen**: Configured as "External" with the necessary app branding.
- **API Enablement**: Google Drive API must be enabled.
- **Credentials**: OAuth 2.0 Client IDs for Android and iOS (including SHA-1 fingerprints).

## Architecture Overview
The Cloud Ecosystem will be implemented as a set of decoupled services that interact with the `SQLiteEngine` and `SecureStore`.

### Core Components
- **`GoogleDriveService`**: Handles the raw API calls to Google Drive (Files API).
- **`AuthService`**: Manages OAuth2 flow, token acquisition, and refresh logic.
- **`BackupCoordinator`**: Orchestrates the process of creating a database snapshot and uploading it.
- **`RestoreCoordinator`**: Orchestrates the download, verification, and replacement of the local database.

---

## 🛠️ Sub-Phase Breakdown

### Sub-Phase 8.1: Identity & Access (Auth Flow)
**Goal**: Establish a secure connection between the app and the user's Google Account.

- **Specifications**:
  - Use `expo-auth-session` for the OAuth2 flow.
  - **Scopes**: `https://www.googleapis.com/auth/drive.file` (Access only to files created by the app).
  - **Token Management**:
    - Store `accessToken` and `refreshToken` in `expo-secure-store`.
    - Implement an interceptor/wrapper to handle `401 Unauthorized` by automatically using the `refreshToken` to get a new `accessToken`.
- **UI**: `CloudSettings` screen with "Connect Google Account" / "Disconnect" buttons.

### Sub-Phase 8.2: The Backup Pipeline (Upload)
**Goal**: Create a consistent snapshot of the database and upload it to a dedicated app folder.

- **Specifications**:
  - **Snapshot Logic**: Use `SQLiteEngine.vacuumInto(tempPath)`. This creates a consistent, defragmented copy of the DB without locking the main database for long periods.
  - **Storage Path**: Files should be stored in a folder named `Respaldo_HuntherWallet`.
  - **Naming Convention**: `backup_{YYYY-MM-DD_HHmm}.db`.
  - **Data Volume**: For files > 10MB, use the Google Drive resumable upload protocol to avoid timeouts.
- **Process**: `Trigger` $\rightarrow$ `vacuumInto()` $\rightarrow$ `GoogleDriveService.upload(file)` $\rightarrow$ `Delete temp file`.

### Sub-Phase 8.3: The Restore Pipeline (Download)
**Goal**: Safely replace the local database with a cloud version.

- **Specifications**:
  - **File Selection**: Provide a list of available backups from Google Drive, sorted by date.
  - **Integrity Check**: Before replacing, run `PRAGMA integrity_check` on the downloaded file.
  - **Version Compatibility**: 
    - Read `PRAGMA user_version` from the restored DB.
    - If `restoredVersion < currentAppVersion`, trigger the migration system (`SQLiteEngine.initialize`) to update the restored DB schema to the current version before replacing the live DB.
  - **Replacement Logic**:
    1. Close all active DB connections.
    2. Rename current `hunther.db` to `hunther.db.bak` (Safety copy).
    3. Move downloaded file to `hunther.db`.
    4. Re-open DB connections.
- **UI**: Confirmation dialog warning the user that local data since the last backup will be lost.

### Sub-Phase 8.4: Orchestration & Automation (Sync)
**Goal**: Reduce user friction by automating the backup process.

- **Specifications**:
  - **Trigger-based Backups**: Perform a cloud backup after significant events (e.g., manual export, major settings change).
  - **Scheduled Backups**: Use `expo-background-fetch` or similar to attempt a backup once every 24 hours (if connected to Wi-Fi).
  - **Conflict Resolution**: If a restore is needed, compare the `last_modified` date of the local DB vs the cloud DB to warn the user.

---

## ⚠️ Technical Constraints & Risks
- **OAuth2 Complexity**: Google's OAuth2 can be tricky on Android/iOS. Must ensure redirect URIs are correctly configured in the Google Cloud Console.
- **Large DB Files**: For users with massive data, uploads might fail. Must implement chunked uploads if file size exceeds 10MB.
- **Atomic Restore**: The restore process MUST be atomic. If it fails midway, the app must be able to revert to the `.bak` file.

## 🏁 Acceptance Criteria
- [ ] User can link/unlink their Google account.
- [ ] Database snapshot is uploaded to Google Drive.
- [ ] User can restore a previous state from a list of cloud backups.
- [ ] The app recovers gracefully if the cloud backup is corrupted or outdated (migration triggered).

