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
jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
    closeAsync: jest.fn(),
    exec: jest.fn(),
  })),
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(),
    closeAsync: jest.fn(),
    transaction: jest.fn(),
    getFirstAsync: jest.fn().mockResolvedValue({ user_version: 0 }),
  })),
}));
