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

## Environment Variables Setup

**⚠️ CRITICAL: No hardcoded secrets in code. Never commit `.env` to version control.**

### Required Environment Variables

| Variable | Description | How to Obtain |
|----------|-------------|---------------|
| `SENTRY_DSN` | Sentry DSN for error monitoring (optional) | [Sentry Project Settings](https://sentry.io/settings/) → Keys |

### Setup Instructions

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in the values in `.env`:**
   ```env
   SENTRY_DSN=your_sentry_dsn_here
   ```

3. **Verify `.env` is in `.gitignore`:**
   - The file `.gitignore` already excludes `.env`
   - Never commit secrets to the repository

### How It Works

- **`src/utils/config.ts`**: Use `getConfig('SENTRY_DSN')` to read variables (returns `undefined` if not set)
- **Babel Plugin**: `babel-plugin-transform-inline-environment-variables` replaces `process.env.*` at build time
- **Expo**: Variables prefixed with `EXPO_PUBLIC_` are automatically exposed to the bundle
- **Fallback**: Config reads from `Constants.expoConfig.extra` first, then `process.env`

### Example Usage

```typescript
import { getConfig } from '../utils/config';

// Read optional variable (returns undefined if not set)
const sentryDsn = getConfig('SENTRY_DSN');
```

## Git & Commit Policy
- Conventional Commits only.
- No AI attribution (e.g., "Co-authored-by") in commit messages.
