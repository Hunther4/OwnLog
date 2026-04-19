## Exploration: Phase 8: Cloud Ecosystem

### Current State
The codebase already has the foundational infrastructure for local backups and database operations:
- `SQLiteEngine` implements `close()`, `vacuum()`, and `vacuumInto(destinationPath)` methods, providing atomic snapshot capabilities.
- `LocalBackupService` offers local export via `expo-sharing` and database optimization via `VACUUM`.
- `useBackupStore` (Zustand) manages authentication state, backup status, and last backup date.
- Dependencies `expo-auth-session` and `expo-secure-store` are already installed (package.json).
- No cloud integration or Google Drive API usage exists yet.

### Affected Areas
- `src/database/SQLiteEngine.ts` — Already contains the required methods; may need minor adjustments for atomic restore (e.g., ensuring `close()` truly releases locks).
- `src/services/GoogleDriveService.ts` — Must be created from scratch to handle OAuth2 flow, folder management, and file upload/download.
- `src/store/useBackupStore.ts` — Already provides the necessary state; may need extensions for cloud‑backup metadata (e.g., list of remote backups).
- `app/(tabs)/settings/backup.tsx` — New screen required for authentication, backup triggers, restore selection, and cache management.
- `app/_layout.tsx` — Will need to integrate a periodic backup scheduler (e.g., weekly check).
- Android configuration (`app.json`/`app.config.js`) — Must be updated with the OAuth2 Android client ID and custom redirect scheme.

### Approaches
The blueprint already defines a clear, phased approach. The only design decisions that could have alternatives are:

1. **OAuth2 Library**: `expo-auth-session` (chosen) vs. `expo-google-sign-in`.  
   - *Pros*: `expo-auth-session` is already installed, follows the Expo‑first philosophy, and supports token refresh out‑of‑the‑box.  
   - *Cons*: Requires manual configuration of redirect URIs in Google Cloud Console.  
   - *Effort*: Low (configuration only).

2. **File Upload Strategy**: Direct Google Drive REST API vs. `expo-file-system`’s `uploadAsync`.  
   - *Pros*: `uploadAsync` handles native streaming, supports resumable uploads, and avoids loading the entire .db file into memory.  
   - *Cons*: Slightly more boilerplate to integrate with Drive’s multipart upload.  
   - *Effort*: Medium (need to implement chunking for files >10 MB).

3. **Background Sync Mechanism**: `expo-background-fetch` (chosen) vs. `expo-task-manager`.  
   - *Pros*: `expo-background-fetch` is the standard Expo solution for periodic tasks; works on both Android and iOS.  
   - *Cons*: On Android it relies on `WorkManager` and is subject to Doze‑mode restrictions (best‑effort).  
   - *Effort*: Low (simple registration and callback).

### Recommendation
Follow the blueprint’s sub‑phases exactly. The chosen stack (`expo-auth-session`, `expo-file-system` streaming, `expo-background-fetch`) aligns with the project’s Expo‑first philosophy and already‑installed dependencies. The only missing piece is the Android client‑ID configuration, which must be added to `app.json`.

### Risks
- **OAuth2 Configuration**: Incorrect Android client ID (missing SHA‑1 fingerprint) will cause “Developer Error” during login. Must verify the fingerprint matches the keystore used for building.
- **Large File Uploads**: Uploading SQLite files larger than 10 MB over slow connections may time out. Implement resumable uploads and chunking.
- **Atomic Restore**: If the replace operation fails mid‑way, the app could be left without a working database. The blueprint’s safety copy (`.bak`) and integrity check mitigate this.
- **Background Sync Limitations**: Android Doze mode may delay or skip background fetch tasks. Set expectations that backups are “best‑effort” and provide a manual trigger.

### Ready for Proposal
Yes. The exploration confirms the existing infrastructure supports the cloud‑backup feature, and the blueprint provides a detailed, technically sound implementation path. The orchestrator should proceed to `sdd-propose phase-8-cloud-ecosystem` to formalize the change proposal.