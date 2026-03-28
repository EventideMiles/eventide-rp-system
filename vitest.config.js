/**
 * Vitest configuration for Eventide RP System
 * Migrated from Jest to Vitest with @rayners/foundry-test-utils
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Test environment - jsdom for FoundryVTT compatibility
  test: {
    environment: 'jsdom',

    // Enable globals (describe, it, expect, etc.)
    globals: true,

    // Setup files
    setupFiles: [
      '@rayners/foundry-test-utils/dist/helpers/setup.js',
      './tests/setup.mjs'
    ],

    // Global setup - runs once before all tests
    globalSetup: './tests/global-setup.mjs',

    // Test file patterns - organized by test type
    include: [
      'tests/unit/**/*.test.mjs',
      'tests/unit/**/*.spec.mjs',
      'tests/integration/**/*.test.mjs',
      'tests/integration/**/*.spec.mjs',
      'tests/e2e/**/*.test.mjs',
      'tests/e2e/**/*.spec.mjs'
    ],

    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'build/**'
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Collect coverage from these files
      include: ['module/**/*.mjs'],
      exclude: [
        'module/**/*.test.mjs',
        'module/**/*.spec.mjs',
        'node_modules/**',
        // Barrel files - only re-export modules, no testable logic
        'module/**/_module.mjs',
        // UI sheet mixins - heavy DOM interaction, Foundry Application dependencies
        'module/ui/mixins/**/*.mjs',
        // Theme helpers - visual styling, low regression risk
        'module/helpers/theme/**/*.mjs',
        // Foundry hooks - lifecycle callbacks, hard to test in isolation
        'module/services/hooks/**/*.mjs',
        // Settings registration - configuration code, low test value
        'module/services/settings/**/*.mjs',
        // UI components - DOM-heavy, require full Foundry UI context
        'module/ui/components/**/*.mjs',
        // template helper files - no logic to test
        'module/helpers/templates.mjs'
      ],
      // Coverage thresholds - reasonable initial thresholds
      thresholds: {
        global: {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50
        },
        // Higher thresholds for critical files
        'module/documents/mixins/actor-rolls.mjs': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        },
        'module/data/base-actor.mjs': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },

    // Test timeout
    testTimeout: 10000,

    // Verbose output for debugging
    reporters: ['verbose'],

    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,

    // Pool options for better performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    }
  }
});
