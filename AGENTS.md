# HuntherWallet Coding Standards & AI Instructions

## Core Philosophy
HuntherWallet is a personal financial notebook, offline-first, designed for low-end Android devices. Performance, privacy, and data sovereignty are the absolute priorities.

## Technical Stack
- React Native + Expo (TypeScript)
- Persistencia: expo-sqlite (WAL Mode)
- Estado: Zustand (Optimistic Updates + Rollback)
- UI: NativeWind (Tailwind CSS)
- Security: expo-crypto (SHA-256 with 10k iterations), expo-secure-store

## Strict Rules

### 1. Performance (Low-End Android)
- **No .map() for Lists**: Strictly use `<FlatList>` for any dynamic list.
- **Virtualization**: Never nest a `FlatList` inside a `ScrollView` (prevents virtualization).
- **FlatList Optimization**: Always use `initialNumToRender`, `maxToRenderPerBatch`, and `windowSize`.
- **Renders**: Minimize re-renders in the Dashboard and Transaction screens.

### 2. Database & Integrity
- **WAL Mode**: Always ensure `PRAGMA journal_mode = WAL` is active.
- **Monetary Values**: Use INTEGER for all amounts (1 = 1 peso). NO FLOATS.
- **Integrity**: Use `PRAGMA integrity_check` before any database replacement.
- **Atomic Restore**: Always create a `.bak` copy before replacing the active DB.

### 3. Security & Privacy
- **Offline-First**: No mandatory internet connection for core functionality.
- **Key Stretching**: PINs must be hashed using 10,000 iterations of SHA-256.
- **Sovereign Recovery**: Recovery Keys must be generated locally and not stored on any server.
- **Secrets**: No hardcoded secrets (API keys, Client IDs) in the code. Use environment variables.

### 4. UI/UX & Accessibility
- **Android Inputs**: Use `KeyboardAvoidingView` (behavior="height") + `ScrollView` (flexGrow: 1).
- **Accessibility**: Use `allowFontScaling` on all text components.
- **Responsive Layout**: Use `flexWrap` to prevent layout breakage on large font scales.
- **Touch Targets**: Minimum touch target size of 44x44dp.

## Git & Commit Policy
- Conventional Commits only.
- No AI attribution (e.g., "Co-authored-by") in commit messages.
