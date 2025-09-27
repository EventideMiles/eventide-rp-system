// @ts-nocheck
/**
 * Jest global setup - runs once before all tests
 */
export default function globalSetup() {
  // Set test environment flag
  process.env.NODE_ENV = 'test';

  // Set testing mode flag for Eventide RP System
  process.env.ERPS_TESTING_MODE = 'true';

  // Suppress console logs during testing (can be overridden per test)
  if (!process.env.JEST_VERBOSE) {
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
  }
}