# Exploration: Phase 9 - Rollout & Monitoring

## Current State
The Cloud Ecosystem (Phase 8) is technically implemented. The system can authenticate with Google Drive, create snapshots using `VACUUM INTO`, upload them as `.db` files, list them, and restore them by replacing the local database file.

### Critical Paths
1. **Authentication Flow**: `authenticate()` $\rightarrow$ `SecureStore` $\rightarrow$ `_ensureValidToken()`.
2. **Backup Flow**: `vacuumInto()` $\rightarrow$ `uploadBackup()` $\rightarrow$ `deleteAsync()` (temp file).
3. **Restore Flow**: `downloadBackup()` $\rightarrow$ `_validateSQLiteHeader()` $\rightarrow$ `_replaceDatabase()` (Close $\rightarrow$ Backup $\rightarrow$ Move $\rightarrow$ Init).

## Identified Gaps & Monitoring Needs

### 1. Telemetry & Logging
- **Current**: Only `console.log` and `console.error`. No remote visibility.
- **Need**: Integration of a remote error reporting service (e.g., Sentry or Firebase Crashlytics) to capture crashes and API errors in production.
- **Proposed Telemetry Points**:
    - **Auth**: Rate of authentication failures vs. successes, reasons for token refresh failure.
    - **Backup**: Success/Failure rate of `vacuumInto` and `uploadBackup`, average upload duration, average backup size.
    - **Restore**: Success/Failure rate of `downloadBackup` and `_replaceDatabase`, number of rollbacks triggered.
    - **Performance**: Latency of Google Drive API calls.

### 2. Technical Gaps
- **Integrity Check**: The SDD specifies `PRAGMA integrity_check` during restore, but it is NOT implemented. Currently, only a magic header check is performed.
- **Environment Config**: `clientId` is hardcoded as `'placeholder'`. This will fail in production and requires a strategy for managing different IDs (Dev vs. Prod).
- **Logout Logic**: `GoogleDriveService.logout()` is a stub. It does not revoke tokens or fully clear the session.
- **Restore Safety**: While a `.bak` file is created, the system doesn't verify the new DB's integrity *before* replacing the old one beyond the header check.

### 3. Readiness Assessment
- **Test Coverage**: Unit tests exist for services and stores, but E2E verification on diverse Android versions/devices is pending.
- **Config Management**: Non-existent. Hardcoded placeholders are a blocker for rollout.

## Rollout Risks & Mitigations

| Risk | Impact | Mitigation |
|-------|--------|------------|
| **Client ID Mismatch** | High | Implement environment-based configuration (`.env` or config file) for OAuth credentials. |
| **Corrupt Backup Restore** | Critical | Implement `PRAGMA integrity_check` on the downloaded file before replacing the local database. |
| **Data Loss on Rollback Failure** | Critical | Enhance the rollback logic to ensure the `.bak` file is verified before deletion. |
| **Silent Failures** | Medium | Integrate Sentry for real-time error alerting. |

## Recommendation
Before proceeding to the Proposal phase, the following must be addressed:
1. **Integrate a remote logging service.**
2. **Replace placeholders with a proper configuration system.**
3. **Implement the missing `PRAGMA integrity_check` in the restore flow.**
4. **Complete the `logout` functionality.**

## Ready for Proposal
**Yes**, provided the proposal includes the implementation of the monitoring stack and the critical fixes identified above.
