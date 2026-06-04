/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/testing'],
  setupFilesAfterEnv: ['<rootDir>/testing/jest.setup.ts'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|expo(nent)?|expo-.*|expo-modules-core|@expo(nent)?/.*|react-native-paper|react-native-svg|react-native-reanimated/.*)',
  ],
};
