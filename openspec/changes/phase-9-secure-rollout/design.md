# Design: Phase 9 Secure Rollout & Observability

## Technical Approach

This phase implements a multi-layered security and reliability strategy to harden HuntherWallet for production. 

1. **Local Access Control**: Introduces a PIN-based lock screen using SHA-256 hashing and salted storage in `expo-secure-store`. A sovereign Recovery Key provides a non-custodial way to reset the PIN.
2. **Restore Pipeline Hardening**: Enhances the cloud restore process by implementing a "Verify-then-Replace" pattern. It uses `PRAGMA integrity_check` on a temporary database file before touching the active database and employs a `.bak` atomic rollback strategy.
3. **Production Observability**: Integrates Sentry for crash reporting and business event tracking through a `TelemetryService` wrapper that toggles behavior between development and production environments.
4. **Secure Configuration**: Migrates sensitive API keys to environment variables to prevent credential leakage.

## Architecture Decisions

### Decision: Local PIN Storage Strategy

**Choice**: Store salt and SHA-256 hash separately in `expo-secure-store`.
**Alternatives considered**: Storing PIN in plain text (rejected: insecure), using Biometrics only (rejected: needs fallback).
**Rationale**: `expo-secure-store` provides hardware-backed encryption on iOS/Android. Salting prevents rainbow table attacks.

### Decision: Restore Integrity Verification

**Choice**: Move downloaded backup to the SQLite directory $\rightarrow$ open as temporary DB $\rightarrow$ run `PRAGMA integrity_check` $\rightarrow$ delete/promote.
**Alternatives considered**: Checking file magic header only (rejected: doesn't detect corruption), verifying after replacing (rejected: risky).
**Rationale**: `expo-sqlite` requires database files to be in the internal SQLite directory. This approach ensures the DB is structurally sound before replacing the user's active data.

### Decision: Telemetry Abstraction

**Choice**: Create a `TelemetryService` wrapper around `console` and `Sentry`.
**Alternatives considered**: Using Sentry directly in components (rejected: tight coupling, leaks logs in dev).
**Rationale**: Decouples the app from the telemetry provider and allows environment-specific routing of logs (console in dev, Sentry in prod).

## Data Flow

### App Boot & Access Control
```
Boot ──→ Check SecureStore('pin_hash') ──┐
                                        │ (If exists)
                                        ▼
                                  Show LockScreen ──→ Validate PIN ──→ Grant Access ──→ Layout
                                        │                                     ▲
                                        └─→ Forgot PIN? ──→ Recovery Flow ─────┘
```

### PIN Recovery Flow
```
RecoveryScreen ──→ Enter Recovery Key ──→ Hash & Compare with SecureStore ──┐
                                                                         │ (If match)
                                                                         ▼
                                                                  New PIN Setup ──→ Store Hash/Salt ──→ Layout
```

### Hardened Cloud Restore
```
Download Backup ──→ Move to /SQLite/temp_restore.db ──→ openDatabaseAsync('temp_restore.db')
                                                                │
                                                                ▼
                                                     PRAGMA integrity_check ──┐
                                                                             │ (If "ok")
                                                                             ▼
                                                     Backup active DB (.bak) ──→ Move temp to active ──→ Test Query ──→ Success
                                                                             │ (If fail)
                                                                             └─→ Restore from .bak ──→ Alert User
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/services/SecurityService.ts` | Create | PIN hashing, salt generation, and Recovery Key management. |
| `src/services/TelemetryService.ts` | Create | Wrapper for Sentry and console logging. |
| `src/utils/config.ts` | Create | Utility to access environment variables (`process.env`). |
| `src/services/GoogleDriveService.ts` | Modify | Implement `PRAGMA integrity_check` and atomic rollback in `restoreCloudBackup`. |
| `app/_layout.tsx` | Modify | Add logic to intercept boot and show `LockScreen` if PIN is set. |
| `app/screens/LockScreen.tsx` | Create | UI for numeric PIN entry and "Forgot PIN" trigger. |
| `app/screens/RecoveryScreen.tsx` | Create | UI for entering the Sovereign Recovery Key. |
| `app/screens/RecoverySetupScreen.tsx` | Create | UI for displaying the generated Recovery Key and confirmation. |

## Interfaces / Contracts

### SecurityService
```typescript
interface SecurityService {
  setupPin(pin: string): Promise<{ recoveryKey: string }>;
  verifyPin(pin: string): Promise<boolean>;
  resetPinWithRecoveryKey(key: string, newPin: string): Promise<boolean>;
  isPinConfigured(): Promise<boolean>;
}
```

### TelemetryService
```typescript
interface TelemetryService {
  log(message: string, data?: any): void;
  error(error: Error, context?: any): void;
  trackEvent(eventName: string, properties?: any): void;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | PIN Hashing | Verify that same PIN + salt produce same hash; different salt = different hash. |
| Integration | Restore Pipeline | Mock a corrupted SQLite file and verify that `integrity_check` aborts the restore. |
| E2E | Recovery Flow | Set PIN $\rightarrow$ Forget PIN $\rightarrow$ Use Recovery Key $\rightarrow$ Set New PIN $\rightarrow$ Access App. |

## Migration / Rollout

- **Configuration**: Add `.env.example` to repo; users must create their own `.env` with `GOOGLE_CLIENT_ID` and `SENTRY_DSN`.
- **Staged Release**: Alpha (Internal) $\rightarrow$ Beta (Trusted) $\rightarrow$ Production.
- **KPIs**: Monitor `RESTORE_INTEGRITY_FAIL` events in Sentry to identify backup corruption trends.
