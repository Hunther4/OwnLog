import '@testing-library/jest-native/extend-expect';

// Mock for expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
  Tabs: {
    Screen: () => null,
  },
  Link: () => null,
  Stack: () => null,
}));

// Mock for expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock for expo-crypto
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('mocked-hash'),
  randomUUID: jest.fn().mockReturnValue('mocked-uuid'),
}));

// Mock for @sentry/react-native
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  captureEvent: jest.fn(),
}));

// Mock for expo-sqlite
const mockDb = {
  execAsync: jest.fn().mockResolvedValue({}),
  closeAsync: jest.fn().mockResolvedValue(undefined),
  transaction: jest.fn(),
  getFirstAsync: jest.fn().mockImplementation((_sql: string) => {
    return Promise.resolve({ user_version: 0, journal_mode: 'wal', integrity_check: 'ok' });
  }),
  runAsync: jest.fn().mockResolvedValue({}),
  getAllAsync: jest.fn().mockResolvedValue([]),
};
jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => mockDb),
  openDatabaseAsync: jest.fn(() => Promise.resolve(mockDb)),
}));

// Mock for expo-file-system (legacy and new API)
jest.mock('expo-file-system', () => ({
  cacheDirectory: '/mock/cache/',
  documentDirectory: '/mock/docs/',
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  moveAsync: jest.fn().mockResolvedValue(undefined),
  downloadAsync: jest.fn().mockResolvedValue({ status: 200, headers: {}, uri: '/mock/cache/download.db' }),
  uploadAsync: jest.fn().mockResolvedValue({}),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
  readAsStringAsync: jest.fn().mockResolvedValue('U1FMaXRlIGZvcm1hdCAzAA=='),
  writeAsStringAsync: jest.fn(),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  FileSystemUploadOptions: {},
  FileSystemUploadType: { BINARY_CONTENT: 1, MULTIPART: 2 },
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/mock/cache/',
  documentDirectory: '/mock/docs/',
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  moveAsync: jest.fn().mockResolvedValue(undefined),
  uploadAsync: jest.fn().mockResolvedValue({}),
  downloadAsync: jest.fn().mockResolvedValue({ status: 200, uri: '/mock/cache/download.db' }),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
  readAsStringAsync: jest.fn().mockResolvedValue('U1FMaXRlIGZvcm1hdCAzAA=='),
  writeAsStringAsync: jest.fn(),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));

// Mock for expo-constants (used by config.ts)
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {},
  },
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

// Mock for expo-modules-core (avoids EventEmitter crash in Node)
jest.mock('expo-modules-core', () => ({
  EventEmitter: function () {
    return {
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    };
  },
  NativeModulesProxy: {},
  requireNativeModule: jest.fn(),
  requireNativeViewManager: jest.fn(),
  requireOptionalNativeModule: jest.fn().mockReturnValue(null),
  Platform: {
    OS: 'android',
    Version: 34,
    select: (obj: any) => obj.android,
  },
}));

// Mock for @react-native-async-storage/async-storage (used by zustand persist middleware)
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// Mock for expo-auth-session (used transitively by GoogleDriveService)
jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn(),
  AuthSession: { dismiss: jest.fn() },
  makeRedirectUri: jest.fn().mockReturnValue('com.drack.ownlog:/oauth'),
  ResponseType: { Token: 'token', Code: 'code' },
  Prompt: { SelectAccount: 'select_account' },
  exchangeCodeAsync: jest.fn(),
  revokeAsync: jest.fn(),
  refreshAsync: jest.fn(),
  TokenResponse: jest.fn(),
  useAutoDiscovery: jest.fn(),
}), { virtual: true });

// Mock for expo-auth-session/providers/google
jest.mock('expo-auth-session/providers/google', () => ({
  AuthRequest: jest.fn().mockReturnValue({
    promptAsync: jest.fn().mockResolvedValue({ type: 'success' }),
  }),
  ResponseType: { Token: 'token', Code: 'code' },
}), { virtual: true });

// Mock for react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Mock for expo-background-fetch (removed with cloud backup in v1.2.18)
jest.mock('expo-background-fetch', () => ({
  BackgroundFetchResult: { NewData: 'newData', NoData: 'noData', Failed: 'failed' },
  BackgroundFetchStatus: { Available: 'available', Denied: 'denied', Restricted: 'restricted' },
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  setMinimumIntervalAsync: jest.fn().mockResolvedValue(undefined),
  getStatusAsync: jest.fn().mockResolvedValue('available'),
}), { virtual: true });

// Mock for expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock for expo-font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn().mockResolvedValue(undefined),
  isLoaded: jest.fn().mockReturnValue(true),
}));

// Mock for expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
  setStatusBarStyle: jest.fn(),
}));

// Mock for react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
    ScrollView: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    State: { BEGAN: 'began', ACTIVE: 'active', END: 'end' },
  };
});

// Mock for @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  MaterialIcons: () => null,
  MaterialCommunityIcons: () => null,
  FontAwesome: () => null,
}));

// Mock for expo-task-manager (removed with cloud backup in v1.2.18)
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}), { virtual: true });

// Mock for @react-native-community/datetimepicker
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return () => View;
});
