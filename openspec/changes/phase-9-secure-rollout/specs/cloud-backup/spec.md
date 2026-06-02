# Delta for Cloud Backup

## MODIFIED Requirements

### Requirement: Restore Pipeline Integrity & Atomicity

The system MUST execute `PRAGMA integrity_check` on the downloaded database file BEFORE replacing the active database. If the check returns any result other than "ok", the restoration MUST be aborted, the downloaded file discarded, and the user alerted.
The restoration process MUST be atomic: the current active database MUST be renamed to `hunther.db.bak` and ONLY replaced by the restored file once the restored file's integrity is verified. The `.bak` file MUST be preserved until the new database is successfully opened and a test query is executed.
(Previously: Basic integrity check mentioned without strict failure/rollback flow)

#### Scenario: Restore Corrupted Backup

- GIVEN a downloaded backup file that is corrupt
- WHEN the system executes `PRAGMA integrity_check`
- THEN the check fails
- AND the system discards the file
- AND the system alerts the user "Backup file is corrupt and cannot be restored"
- AND the active `hunther.db` remains untouched

#### Scenario: Failed Database Initialization after Restore

- GIVEN a backup that passes integrity check but fails to open (e.g. internal SQLite error)
- WHEN the system moves the file to `hunther.db` and attempts to open it
- THEN the open operation fails
- AND the system automatically restores `hunther.db.bak` to `hunther.db`
- AND the system alerts the user "Restore failed; reverted to previous state"
