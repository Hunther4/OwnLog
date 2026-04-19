# Proposal: Cloud Backup & Restore Ecosystem

## Intent

Secure cloud backup/restore via Google Drive for data safety and cross‑device recovery.

## Scope

### In Scope
- OAuth2 auth with Google Drive (`expo-auth-session`)
- Atomic DB snapshots (`SQLiteEngine.vacuumInto()`)
- Upload to dedicated folder (`Respaldo_HuntherWallet`)
- Restore with validation & safety copy (`.bak`)
- Background periodic backups (`expo-background-fetch`)
- UI screens for auth, manual backup/restore, cache management

### Out of Scope
- Multiple cloud providers
- Sharing backups
- Versioning beyond last 3 backups
- Real‑time sync of individual transactions

## Capabilities

> This section is the CONTRACT between proposal and specs phases.

### New Capabilities
- `cloud-backup`: End‑to‑end backup/restore flow (OAuth2, snapshot, upload/download, integrity, background sync).

### Modified Capabilities
None

## Approach

Use existing `SQLiteEngine` (`close`, `vacuum`, `vacuumInto`), `expo-auth-session`, `expo-secure-store`.  
Backup: `vacuumInto` → upload via Drive API (resumable >10MB).  
Restore: download → SQLite header validation → close DB → replace file → reopen.  
Background sync: `expo-background-fetch` triggers backup every 24h on Wi‑Fi.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/database/SQLiteEngine.ts` | Modified | Already has methods; minor adjustments for atomic restore. |
| `src/services/GoogleDriveService.ts` | New | OAuth2, folder management, upload/download. |
| `src/store/useBackupStore.ts` | New | Zustand store for auth state, backup history. |
| `app/(tabs)/settings/backup.tsx` | New | UI for auth, backup/restore triggers, cache cleanup. |
| `app/_layout.tsx` | Modified | Initialize background backup scheduler. |
| `app.json` / `app.config.js` | Modified | Add Android OAuth client‑ID, redirect scheme. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| OAuth2 config errors | Medium | Verify SHA‑1 fingerprint matches keystore; test on device. |
| Large file upload timeouts | Medium | Resumable upload with chunking (`expo-file-system`). |
| Atomic restore failure | Low | Safety copy (`.bak`) + magic‑byte validation. |
| Background sync skipped (Doze) | High | Set “best‑effort” expectations; manual trigger + timestamp. |

## Rollback Plan

1. Disable cloud‑backup UI screens.
2. Remove `GoogleDriveService` calls from scheduler/triggers.
3. Keep `SQLiteEngine` extensions (used elsewhere).
4. If `.bak` exists, rename to `hunther_wallet.db` and restart.

## Dependencies

- Google Cloud Console OAuth2 client‑ID for Android/iOS.
- `expo-auth-session`, `expo-file-system`, `expo-background-fetch` (installed).
- `expo-secure-store` (installed).

## Success Criteria

- [ ] User can link/unlink Google account from Settings.
- [ ] Manual “Backup now” creates timestamped snapshot in Drive.
- [ ] Manual “Restore from cloud” replaces local DB preserving integrity.
- [ ] Background backup runs once every 24h on Wi‑Fi.
- [ ] Invalid SQLite file causes graceful restore failure with user notification.