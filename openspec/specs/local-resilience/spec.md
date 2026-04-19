# Local Resilience Specification

## Purpose

Ensure that the user has absolute control and ownership of their data by providing mechanisms for manual local backup (export) and database optimization (vacuuming) without requiring cloud connectivity.

## Requirements

### Requirement: Consistent Database Export

The system MUST allow the user to export a complete, consistent copy of the SQLite database to the device's public storage.

#### Scenario: Manual Export to Downloads

- **GIVEN** the application is running and the database is open
- **WHEN** the user triggers the "Export Local Copy" action
- **THEN** the system must:
  1. Execute `PRAGMA wal_checkpoint(TRUNCATE)` to ensure all WAL journal data is committed to the main `.db` file.
  2. Use `expo-file-system` to create a temporary copy of `hunther_wallet.db`.
  3. Use `expo-sharing` to open the native share dialog, allowing the user to save the file to their Downloads or Cloud storage of choice.
  4. Clean up the temporary copy after the share dialog is closed.

### Requirement: Database Optimization (Vacuum)

The system SHALL provide a tool to reclaim unused disk space and defragment the database file to maintain performance on low-end devices.

#### Scenario: Disk Optimization

- **GIVEN** a database that has had many transactions deleted or updated
- **WHEN** the user triggers the "Optimize Database" action
- **THEN** the system must:
  1. Execute the `VACUUM` command via `SQLiteEngine`.
  2. Provide visual feedback (loading indicator) during the process.
  3. Notify the user upon successful completion.

### Requirement: Non-Blocking Execution

Both export and vacuum operations MUST NOT freeze the main UI thread.

#### Scenario: Background Processing

- **GIVEN** a large database (e.g., > 10MB)
- **WHEN** a vacuum or export is running
- **THEN** the UI must remain responsive, showing a loading state or progress indicator to the user.

## Technical Constraints

- **WAL Mode**: Since the app uses WAL mode, a simple file copy is insufficient. `wal_checkpoint(TRUNCATE)` is mandatory to avoid corrupted exports.
- **File Permissions**: Must use `expo-file-system`'s cache directory for temporary files to comply with Android/iOS sandbox restrictions.
- **UI**: All triggers must reside within the Settings screen.
