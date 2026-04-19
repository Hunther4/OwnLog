module.exports = {
  rootDir: './',
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo|expo-.*|@sentry/react-native)'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@sentry/react-native$': '<rootDir>/src/tests/__mocks__/sentry.js',
  },
  testEnvironment: 'node',
  haste: {
    defaultPlatform: 'android',
    platforms: ['android', 'ios', 'native'],
  },
};
