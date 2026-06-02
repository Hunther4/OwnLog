# Delta for Cloud Backup

## ADDED Requirements

### Requirement: Google Drive Authentication

The system SHALL authenticate users via OAuth2 with scope `https://www.googleapis.com/auth/drive.file`.  
The system MUST store refresh tokens in `expo‑secure‑store`.  
The system MUST refresh access tokens automatically.  
Authentication MUST NOT produce "Developer Error" on Android.

#### Scenario: Successful authentication

- GIVEN no stored credentials
- WHEN user taps "Connect Google Account"
- THEN system opens OAuth2 consent screen
- AND stores refresh token securely
- AND UI shows "Connected"

#### Scenario: Authentication failure

- GIVEN OAuth2 client ID misconfigured
- WHEN user attempts to connect
- THEN system shows user‑friendly error message
- AND app does not crash

### Requirement: Database Snapshot Backup

The system SHALL create consistent SQLite snapshots using `SQLiteEngine.vacuumInto()`.  
Backup files MUST be named `backup_YYYY‑MM‑DD_HHmm.db` in folder `Respaldo_HuntherWallet`.  
Uploads larger than 10 MB MUST use resumable upload.  
The system MUST NOT load .db files into memory as strings/Base64.

#### Scenario: Manual backup

- GIVEN user authenticated
- WHEN user taps "Backup Now"
- THEN system creates snapshot via `vacuumInto()`
- AND uploads to Drive
- AND cleans up temporary file
- AND UI shows success

#### Scenario: Large file backup

- GIVEN database >10 MB
- WHEN backup runs
- THEN system uses resumable upload with chunking
- AND upload completes without crash

### Requirement: Database Restore

The system SHALL restore backups with integrity checks and safety copies.  
Downloaded files MUST be validated via SQLite header magic bytes.  
If restored `user_version` < current, migrations MUST run before activation.  
A `.bak` safety copy MUST be created before replacement.  
If replacement fails, system MUST revert to `.bak` automatically.

#### Scenario: Restore valid backup

- GIVEN a backup exists in Drive
- WHEN user selects backup and confirms
- THEN system downloads, validates header, creates `.bak`
- AND closes DB connections, replaces file, re‑opens connections
- AND UI shows success

#### Scenario: Restore older version

- GIVEN backup has lower `user_version`
- WHEN restore reaches migration step
- THEN system runs migrations on restored file before replacement
- AND final schema matches current app version

#### Scenario: Restore failure

- GIVEN replacement fails (disk full, corruption)
- WHEN system detects failure
- THEN system reverts to `.bak` copy
- AND notifies user
- AND app continues with original DB

### Requirement: Background Sync

The system SHALL attempt automatic backups every 24 h via `expo‑background‑fetch`.  
Backups MUST only run on Wi‑Fi.  
Failed background backups MUST be logged without disrupting user.

#### Scenario: Background backup succeeds

- GIVEN user authenticated, background backups enabled
- WHEN background‑fetch triggers on Wi‑Fi
- THEN system creates and uploads snapshot
- AND updates `lastBackupDate`

#### Scenario: Background backup skipped

- GIVEN device on cellular or no network
- WHEN background‑fetch triggers
- THEN backup is skipped
- AND task returns `NoData`

### Requirement: Backup Management UI

The system SHALL provide UI showing authentication status, backup list, and manual triggers.  
UI MUST display last backup date.  
UI MUST allow disconnecting Google account (removing tokens).

#### Scenario: View backup screen

- GIVEN user navigates to Settings → Cloud Backup
- THEN screen shows linked status, last backup date, backup list (if any)

#### Scenario: Disconnect account

- GIVEN user authenticated
- WHEN user taps "Disconnect"
- THEN system removes OAuth tokens
- AND UI shows "Not Connected"
- AND user can reconnect later

## REMOVED Requirements

None.