# Tasks: Phase 9 Secure Rollout & Observability

## Batch 1: Infrastructure & Hardening (The Foundation)

- [x] 1.1 Create `.env.example` with `GOOGLE_CLIENT_ID` and `SENTRY_DSN`, and ensure `.env` is in `.gitignore`.
- [x] 1.2 Create `src/utils/config.ts` to provide type-safe access to `process.env` variables.
- [x] 1.3 Implement `src/services/TelemetryService.ts` wrapper to route logs to `console` (dev) or `Sentry` (prod).
- [x] 1.4 Configure Sentry SDK in `app.json` and initialize it within `app/_layout.tsx`.
- [x] 1.5 Implement `PRAGMA integrity_check` in `src/services/GoogleDriveService.ts` on temporary DB before restoration.
- [x] 1.6 Implement atomic rollback logic in `src/services/GoogleDriveService.ts` using `.bak` file preservation and test query verification.
- [x] 1.7 Complete the logout mechanism to ensure session clearance and correct redirection to the auth/lock state.

## Batch 2: Security Layer - Core Logic (The Engine)

- [x] 2.1 Create `src/services/SecurityService.ts` and implement SHA-256 hashing using `expo-crypto`.
- [x] 2.2 Implement `SecurityService.setupPin(pin)`: Generate random salt, hash PIN, generate sovereign recovery key, and store all in `expo-secure-store`.
- [x] 2.3 Implement `SecurityService.verifyPin(pin)`: Retrieve stored salt, hash input PIN, and compare results.
- [x] 2.4 Implement `SecurityService.resetPinWithRecoveryKey(key, newPin)`: Verify recovery key hash and update the PIN hash/salt.
- [x] 2.5 Implement `SecurityService.isPinConfigured()`: Check for the existence of the PIN hash in `expo-secure-store`.

## Batch 3: Security Layer - UI/UX (The Interface)

- [x] 3.1 Create `app/screens/LockScreen.tsx` featuring a secure numeric keypad for PIN entry.
- [x] 3.2 Create `app/screens/RecoverySetupScreen.tsx` to display the generated recovery key and require user confirmation.
- [x] 3.3 Create `app/screens/RecoveryScreen.tsx` for recovery key input and redirection to new PIN setup.
- [x] 3.4 Modify `app/_layout.tsx` to intercept app boot, check `isPinConfigured()`, and conditionally render `LockScreen`.
- [x] 3.5 Connect `LockScreen` UI to `SecurityService.verifyPin()` and implement the "Forgot PIN" navigation to `RecoveryScreen`.
- [x] 3.6 Connect `RecoveryScreen` and `RecoverySetupScreen` to `SecurityService` for key validation and PIN resetting.

## Batch 4: Rollout & Final Verification (The Finish Line)

- [ ] 4.1 Write unit tests for `SecurityService` verifying that identical PINs with different salts produce different hashes.
- [ ] 4.2 Implement an integration test for `GoogleDriveService` that mocks a corrupted SQLite file to verify the `integrity_check` aborts the restore.
- [ ] 4.3 Execute E2E tests for the "Forgotten PIN" flow: Setup PIN $\rightarrow$ Trigger Recovery $\rightarrow$ Enter Key $\rightarrow$ Reset PIN $\rightarrow$ Access App.
- [ ] 4.4 Setup staged rollout environments (Alpha/Beta) and document the success KPIs (Crash-free rate > 99%, Restore success > 95%).
- [ ] 4.5 Perform a final audit of the implementation against the Phase 9 Specifications to ensure all requirements are met.
