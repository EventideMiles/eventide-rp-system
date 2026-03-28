// @ts-nocheck
/**
 * @fileoverview Limited unit tests for range-sliders.mjs
 *
 * This module is primarily DOM manipulation, so tests focus on module exports.
 */

// Mock dependencies before importing
vi.mock('../../../module/services/_module.mjs', () => ({
  Logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import {
  initRangeSliders,
  enhanceExistingRangeSliders,
  cleanupRangeSliders,
} from '../../../module/helpers/range-sliders.mjs';

// Setup mocks that are not provided by test setup
global.Hooks = {
  on: vi.fn(),
  off: vi.fn(),
};

describe('range-sliders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Exports', () => {
    test('should export required functions', () => {
      expect(typeof initRangeSliders).toBe('function');
      expect(typeof enhanceExistingRangeSliders).toBe('function');
      expect(typeof cleanupRangeSliders).toBe('function');
    });

    test('module exports should have the correct function names', () => {
      // Verify the function names for clarity in error messages
      expect(initRangeSliders.name).toBe('initRangeSliders');
      expect(enhanceExistingRangeSliders.name).toBe('enhanceExistingRangeSliders');
      expect(cleanupRangeSliders.name).toBe('cleanupRangeSliders');
    });
  });
});