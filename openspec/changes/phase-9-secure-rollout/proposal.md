# Proposal: Phase 9 - Secure Rollout & Observability

## Intent

Harden the production readiness of HuntherWallet by addressing technical debt from Phase 8, implementing a critical local security layer (PIN), and establishing observability for production monitoring. This phase ensures the app is secure, stable, and measurable before a wide release.

## Scope

### In Scope
- **Production Hardening**:
  - `PRAGMA integrity_check` implementation during restore.
  - Atomic rollback mechanism for failed restores.
  - Secure configuration management for OAuth credentials (removal of placeholders).
  - Complete logout flow (token revocation and state cleanup).
- **Local Security**:
  - 4-6 digit PIN access system.
  - Secure hashing using `expo-crypto` (SHA-256 with salts).
  - Hashed PIN storage in `expo-secure-store`.
  - Recovery flow: Google OAuth2 verification $\rightarrow$ Local Wipe $\rightarrow$ Cloud Restore.
- **Observability**:
  - Integration of a remote logging/error reporting system (e.g., Sentry).
  - Telemetry for: Backup/Restore status, Integrity failures, OAuth errors, and Sync latency.
- **Rollout Strategy**:
  - Gradual rollout plan (Alpha $\rightarrow$ Beta $\rightarrow$ Production).
  - Definition of success KPIs.

### Out of Scope
- Biometric authentication (FaceID/TouchID).
- Real-time background synchronization.
- Multi-factor authentication (MFA) beyond Google OAuth.

## Capabilities

### New Capabilities
- `local-pin-security`: PIN-based access control, secure hashing, and OAuth-backed recovery.
- `observability-telemetry`: Remote error tracking and business-critical event monitoring.
- `production-rollout`: Staged release management and KPI tracking.

### Modified Capabilities
- `cloud-backup`: Enhancement of the restore pipeline to include strict integrity verification and guaranteed atomic rollback.

## Approach

### 1. Hardening & Debt
- **Restore Integrity**: Wrap the `RestoreCoordinator` logic in a transaction-like block. Execute `PRAGMA integrity_check` on the downloaded DB file *before* renaming the active DB. If it fails, discard the download and notify the user.
- **Atomic Rollback**: Maintain the `hunther.db.bak` file until the new database is not only moved but also successfully opened and queried.
- **Secure Config**: Implement a build-time environment variable system to inject OAuth clientId/secrets, ensuring they are not hardcoded in the source.
- **Logout**: Extend `AuthService` to call Google's token revocation endpoint and clear all `expo-secure-store` entries related to the session.

### 2. Local Protection
- **PIN Service**: Create a `PinService` to handle the hashing and verification. Use `expo-crypto` for SHA-256. Store a random salt alongside the hashed PIN.
- **Recovery**: The "Forgot PIN" flow will trigger a full Google OAuth re-authentication. Upon success, it will wipe the local database and trigger a fresh Cloud Restore, effectively resetting the app to the last cloud state.

### 3. Observability
- **Sentry Integration**: Implement Sentry for Expo to capture crashes and breadcrumbs.
- **Event Registry**: Define a standard `TelemetryEvent` interface to track key lifecycle events (e.g., `RESTORE_INTEGRITY_FAIL`).

### 4. Rollout
- **Stages**: 
  - **Alpha**: Internal testers (100% feature set).
  - **Beta**: Limited external users (Stability focus).
  - **Production**: General availability.
- **KPIs**: Crash-free session rate (>99%), Restore success rate (>95%), OAuth auth latency (<3s).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/services/cloud/RestoreCoordinator.ts` | Modified | Added integrity checks and atomic rollback logic. |
| `src/services/auth/AuthService.ts` | Modified | Secure config management and token revocation. |
| `src/services/security/PinService.ts` | New | PIN hashing, verification, and storage. |
| `src/components/security/PinScreen.tsx` | New | UI for PIN entry and recovery trigger. |
| `src/services/telemetry/TelemetryService.ts` | New | Wrapper for Sentry and custom event tracking. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| PIN loss without recovery access | Low | Strictly enforced OAuth-based recovery flow. |
| Telemetry overhead impacting UI | Low | Use asynchronous event batching and non-blocking calls. |
| Restore failure during rollback | Med | Keep `.bak` file until new DB is fully initialized and verified. |
| Secret leakage via build artifacts | Med | Use environment variables and exclude `.env` from git. |

## Rollback Plan

- **Infrastructure/Config**: Revert to the previous stable git commit and re-deploy.
- **Local Data**: If a restore fails, the app automatically reverts to the `hunther.db.bak` safety copy.
- **Rollout**: Use feature flags to disable new security/telemetry modules if critical bugs are found in Beta.

## Dependencies

- `expo-crypto`: For SHA-256 hashing.
- `expo-secure-store`: For secure persistence of hashed PINs.
- `Sentry`: For remote error reporting.

## Success Criteria

- [ ] Restore process fails safely and rolls back if `PRAGMA integrity_check` fails.
- [ ] PIN access is required on app start; recovery via Google OAuth works as intended.
- [ ] Remote logs capture 100% of unhandled exceptions in Beta.
- [ ] Successful rollout through Alpha and Beta stages with defined KPIs met.
