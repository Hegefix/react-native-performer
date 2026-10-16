/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // The real react-native entry is Flow and needs the native runtime; tests get host-string stand-ins.
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/__tests__/support/reactNativeMock.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  globals: {
    __DEV__: true,
  },
};
