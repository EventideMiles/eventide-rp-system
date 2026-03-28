// @ts-nocheck
/**
 * @fileoverview Limited unit tests for tab-container-styling.mjs
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
  initTabContainerStyling,
  updateTabContainerStyling,
  cleanupTabContainerStyling,
} from '../../../module/helpers/tab-container-styling.mjs';

describe('tab-container-styling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Exports', () => {
    test('should export required functions', () => {
      expect(typeof initTabContainerStyling).toBe('function');
      expect(typeof updateTabContainerStyling).toBe('function');
      expect(typeof cleanupTabContainerStyling).toBe('function');
    });

    test('module exports should have the correct function names', () => {
      // Verify the function names for clarity in error messages
      expect(initTabContainerStyling.name).toBe('initTabContainerStyling');
      expect(updateTabContainerStyling.name).toBe('updateTabContainerStyling');
      expect(cleanupTabContainerStyling.name).toBe('cleanupTabContainerStyling');
    });
  });
});