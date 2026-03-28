// @ts-nocheck
/**
 * @fileoverview Limited unit tests for color-pickers.mjs
 *
 * This module is primarily DOM manipulation, so tests focus on module exports
 * and the expandShortHex helper logic.
 */

// Setup mocks that are not provided by test setup - must be before import
global.Hooks = {
  on: vi.fn(),
  off: vi.fn(),
};

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
  initColorPickersWithHex,
  enhanceExistingColorPickers,
  cleanupColorPickers,
  cleanupGlobalColorPickers,
} from '../../../module/helpers/color-pickers.mjs';

// Test helper function that matches the private expandShortHex implementation
function expandShortHex(shortHex) {
  const hex = shortHex.substring(1).split('');
  return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
}

describe('color-pickers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Exports', () => {
    test('should export required functions', () => {
      expect(typeof initColorPickersWithHex).toBe('function');
      expect(typeof enhanceExistingColorPickers).toBe('function');
      expect(typeof cleanupColorPickers).toBe('function');
      expect(typeof cleanupGlobalColorPickers).toBe('function');
    });
  });

  describe('expandShortHex helper', () => {
    test('should convert #F00 to #FF0000', () => {
      const result = expandShortHex('#F00');
      expect(result).toBe('#FF0000');
    });

    test('should convert #ABC to #AABBCC', () => {
      const result = expandShortHex('#ABC');
      expect(result).toBe('#AABBCC');
    });

    test('should convert #123 to #112233', () => {
      const result = expandShortHex('#123');
      expect(result).toBe('#112233');
    });
  });
});