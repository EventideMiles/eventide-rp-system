// @ts-nocheck
/**
 * @fileoverview Limited unit tests for number-inputs.mjs
 *
 * This module is primarily DOM manipulation, so tests focus on module exports
 * and the debounce helper logic.
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
  initNumberInputs,
  enhanceExistingNumberInputs,
  cleanupNumberInputs,
  cleanupNumberInputsGlobal,
} from '../../../module/helpers/number-inputs.mjs';

// Test helper function that matches the private debounce implementation
function createDebounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    globalThis.clearTimeout(timeout);
    timeout = globalThis.setTimeout(() => func.apply(context, args), wait);
  };
}

describe('number-inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Module Exports', () => {
    test('should export required functions', () => {
      expect(typeof initNumberInputs).toBe('function');
      expect(typeof enhanceExistingNumberInputs).toBe('function');
      expect(typeof cleanupNumberInputs).toBe('function');
      expect(typeof cleanupNumberInputsGlobal).toBe('function');
    });
  });

  describe('debounce helper', () => {
    test('should debounce function calls correctly', () => {
      // Arrange
      const mockFn = vi.fn();
      const debouncedFn = createDebounce(mockFn, 100);

      // Act - Call multiple times rapidly
      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      // Assert - Should not have been called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Act - Advance time past debounce delay
      vi.advanceTimersByTime(100);

      // Assert - Should have been called once with last arguments
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('third');
    });

    test('should call function after delay', () => {
      // Arrange
      const mockFn = vi.fn();
      const debouncedFn = createDebounce(mockFn, 50);

      // Act
      debouncedFn('test');

      // Assert - Not called immediately
      expect(mockFn).not.toHaveBeenCalled();

      // Act - Advance time
      vi.advanceTimersByTime(50);

      // Assert - Called after delay
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    test('should cancel previous pending calls', () => {
      // Arrange
      const mockFn = vi.fn();
      const debouncedFn = createDebounce(mockFn, 100);

      // Act
      debouncedFn('first');
      vi.advanceTimersByTime(50); // Advance but not past delay
      debouncedFn('second'); // Cancel first call, start new timer

      // Assert
      expect(mockFn).not.toHaveBeenCalled();

      // Act - Advance past original delay (first call cancelled)
      vi.advanceTimersByTime(50);
      expect(mockFn).not.toHaveBeenCalled();

      // Act - Advance past new delay
      vi.advanceTimersByTime(50);

      // Assert - Only latest call executes
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('second');
    });
  });
});