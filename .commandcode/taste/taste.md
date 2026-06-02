# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# workflow
- Double-check work twice before committing code or completing a phase. Confidence: 0.75
- Fix all identifiable issues thoroughly, not just the most critical ones. Confidence: 0.70
- When asked to audit/review, deliver the report first — do not fix issues without explicit confirmation. This applies to agent-produced reports too (e.g., lite audit, red-team). Confidence: 0.85
- Prioritize build-blocking issues; for non-blocking issues, apply the minimum viable fix. Confidence: 0.70

# architecture
- For data sharing/collaboration features: prefer file-based export/import (JSON) over server-based sync. Confidence: 0.75

# code-style
- When adding new React Native components (Modal, KeyboardAvoidingView, Platform, etc.) to a file, always verify the corresponding imports are added to the react-native import statement. Confidence: 0.70
- Avoid using `require()` with deep `node_modules` paths (e.g., `require('../node_modules/@expo/vector-icons/...')`) in production code; these break in release builds. Use the Expo Font API's built-in asset resolution instead. Confidence: 0.80
- Never reference theme palette variables or any component-scoped variables inside `StyleSheet.create()` at module scope. `StyleSheet.create()` executes during module evaluation — variables like `palette` only exist inside the component function. Use inline styles instead for theme-dependent values. Confidence: 0.75

# react-native
- Never call native module APIs (e.g., `TaskManager.defineTask`, `SplashScreen.preventAutoHideAsync`) at module top-level scope. These can fail in release builds because the native bridge may not be ready during module evaluation. Always wrap them in `useEffect`, a deferred callback, or a component lifecycle. Confidence: 0.75

# expo-file-system
- For `expo-file-system` v19+: import legacy API members (`documentDirectory`, `cacheDirectory`, `EncodingType`, `writeAsStringAsync`, `copyAsync`, `readAsStringAsync`, `deleteAsync`, `getInfoAsync`, `readDirectoryAsync`) from `expo-file-system/legacy`, not from `expo-file-system` directly. The main export uses the new class-based API (`File`, `Directory`, `Paths`) which is incompatible with existing code. Confidence: 0.70

# communication
- Communicate in Spanish. Confidence: 0.70

# workflow
- When the user mentions a named sub-agent or agent they created, invoke it via the explore tool for the task at hand. The user expects delegation to their named agents. Confidence: 0.70
- When the explore tool (lite agent) returns empty/truncated output (e.g., just "DONE" with no analysis), re-run it with a more specific and focused prompt rather than assuming it failed due to timeout — a prompt structure change often resolves the issue. Confidence: 0.70

# performance
- Keep dynamic imports for rarely-used features (e.g., export/import, "Share Data" buttons) instead of converting them to static imports. Loading them only on demand avoids bloating the initial bundle for features 99% of users never access. Confidence: 0.70

