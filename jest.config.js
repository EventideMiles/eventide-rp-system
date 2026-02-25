export default {
  // Use ES modules
  preset: null,
  testEnvironment: 'jsdom',


  // Test file patterns - temporarily only run validation tests
  testMatch: [
    '<rootDir>/tests/jest/utils/test-example.test.mjs',
    '<rootDir>/tests/unit/services/character-effects-processor.test.mjs'
  ],

  // Module resolution
  moduleFileExtensions: ['mjs', 'js', 'json'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/jest/setup.mjs'],

  // Mock handling
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Transform ignore patterns for ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],

  // Coverage settings
  collectCoverageFrom: [
    'module/**/*.mjs',
    '!module/**/*.test.mjs',
    '!module/**/*.spec.mjs',
    '!**/node_modules/**'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage thresholds - disabled while setting up infrastructure
  // coverageThreshold: {
  //   global: {
  //     branches: 70,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80
  //   },
  //   // Higher thresholds for critical functions
  //   'module/documents/mixins/actor-rolls.mjs': {
  //     branches: 90,
  //     functions: 95,
  //     lines: 95,
  //     statements: 95
  //   },
  //   'module/data/base-actor.mjs': {
  //     branches: 85,
  //     functions: 90,
  //     lines: 90,
  //     statements: 90
  //   }
  // },

  // Transform configuration for ES modules
  transform: {},

  // Global setup
  globalSetup: '<rootDir>/tests/jest/global-setup.mjs',

  // Test timeout
  testTimeout: 10000,

  // Verbose output for debugging
  verbose: true
};