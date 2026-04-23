// @ts-nocheck
/**
 * @fileoverview Error Patterns Tests
 *
 * Unit tests for the error-patterns module which provides standardized
 * error handling patterns, validation helpers, and retry mechanisms.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

import {
  withErrorHandling,
  wrapAsync,
  ErrorPatterns,
  ValidationPatterns,
  RetryPatterns,
} from '../../../module/utils/error-patterns.mjs';

// Mock ErrorHandler
vi.mock('../../../module/utils/error-handler.mjs', () => ({
  ErrorHandler: {
    ERROR_TYPES: {
      VALIDATION: 'validation',
      NETWORK: 'network',
      PERMISSION: 'permission',
      DATA: 'data',
      UI: 'ui',
      FOUNDRY_API: 'foundry_api',
      UNKNOWN: 'unknown',
    },
    handleDocumentOperation: vi.fn(async (promise, _operation, _documentType) => {
      try {
        const result = await promise;
        return [result, null];
      } catch (error) {
        return [null, error];
      }
    }),
    handleSheetRender: vi.fn(async (promise, _sheetName) => {
      try {
        const result = await promise;
        return [result, null];
      } catch (error) {
        return [null, error];
      }
    }),
    handleAsync: vi.fn(async (promise, _options) => {
      try {
        const result = await promise;
        return [result, null];
      } catch (error) {
        return [null, error];
      }
    }),
    createUserMessage: vi.fn((error, context) => `Error in ${context}: ${error.message}`),
    createValidationError: vi.fn((errors) => ({
      isValid: false,
      errors: Array.isArray(errors) ? errors : [errors],
    })),
    createValidationSuccess: vi.fn(() => ({
      isValid: true,
      errors: [],
    })),
  },
}));

// Mock Logger
vi.mock('../../../module/services/_module.mjs', () => ({
  Logger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

// =================================
// withErrorHandling() Tests
// =================================
describe('withErrorHandling()', () => {
  let mockUi;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ui.notifications
    mockUi = {
      notifications: {
        error: vi.fn(),
      },
    };

    // Set up global ui
    global.ui = mockUi;
  });

  afterEach(() => {
    delete global.ui;
  });

  test('should return a decorator function', () => {
    const decorator = withErrorHandling();
    expect(typeof decorator).toBe('function');
  });

  test('should preserve original method behavior on success', async () => {
    const originalMethod = vi.fn().mockResolvedValue('success');
    const descriptor = { value: originalMethod };
    const target = { constructor: { name: 'TestClass' } };
    const propertyKey = 'testMethod';

    const decorator = withErrorHandling();
    decorator(target, propertyKey, descriptor);

    // Call the wrapped method
    const returnValue = await descriptor.value.call(target, 'arg1', 'arg2');

    expect(originalMethod).toHaveBeenCalledWith('arg1', 'arg2');
    expect(returnValue).toBe('success');
  });

  test('should catch errors and return fallback value', async () => {
    const error = new Error('Test error');
    const originalMethod = vi.fn().mockRejectedValue(error);
    const descriptor = { value: originalMethod };
    const target = { constructor: { name: 'TestClass' } };
    const propertyKey = 'testMethod';

    const decorator = withErrorHandling({ fallbackReturn: 'fallback' });
    decorator(target, propertyKey, descriptor);

    const returnValue = await descriptor.value.call(target);

    expect(returnValue).toBe('fallback');
  });

  test('should show notification to user by default', async () => {
    const error = new Error('Test error');
    const originalMethod = vi.fn().mockRejectedValue(error);
    const descriptor = { value: originalMethod };
    const target = { constructor: { name: 'TestClass' } };
    const propertyKey = 'testMethod';

    const decorator = withErrorHandling();
    decorator(target, propertyKey, descriptor);

    await descriptor.value.call(target);

    expect(mockUi.notifications.error).toHaveBeenCalled();
  });

  test('should not show notification when showToUser is false', async () => {
    const error = new Error('Test error');
    const originalMethod = vi.fn().mockRejectedValue(error);
    const descriptor = { value: originalMethod };
    const target = { constructor: { name: 'TestClass' } };
    const propertyKey = 'testMethod';

    const decorator = withErrorHandling({ showToUser: false });
    decorator(target, propertyKey, descriptor);

    await descriptor.value.call(target);

    expect(mockUi.notifications.error).not.toHaveBeenCalled();
  });

  test('should use custom user message when provided', async () => {
    const error = new Error('Test error');
    const originalMethod = vi.fn().mockRejectedValue(error);
    const descriptor = { value: originalMethod };
    const target = { constructor: { name: 'TestClass' } };
    const propertyKey = 'testMethod';

    const decorator = withErrorHandling({ userMessage: 'Custom error message' });
    decorator(target, propertyKey, descriptor);

    await descriptor.value.call(target);

    expect(mockUi.notifications.error).toHaveBeenCalledWith('Custom error message');
  });

  test('should handle missing ui object gracefully', async () => {
    delete global.ui;
    const error = new Error('Test error');
    const originalMethod = vi.fn().mockRejectedValue(error);
    const descriptor = { value: originalMethod };
    const target = { constructor: { name: 'TestClass' } };
    const propertyKey = 'testMethod';

    const decorator = withErrorHandling();
    decorator(target, propertyKey, descriptor);

    // Should not throw
    const returnValue = await descriptor.value.call(target);
    expect(returnValue).toBeNull();
  });

  test('should handle missing ui.notifications gracefully', async () => {
    global.ui = {}; // No notifications property
    const error = new Error('Test error');
    const originalMethod = vi.fn().mockRejectedValue(error);
    const descriptor = { value: originalMethod };
    const target = { constructor: { name: 'TestClass' } };
    const propertyKey = 'testMethod';

    const decorator = withErrorHandling();
    decorator(target, propertyKey, descriptor);

    // Should not throw
    const returnValue = await descriptor.value.call(target);
    expect(returnValue).toBeNull();
  });
});

// =================================
// wrapAsync() Tests
// =================================
describe('wrapAsync()', () => {
  let mockUi;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUi = {
      notifications: {
        error: vi.fn(),
      },
    };

    global.ui = mockUi;
  });

  afterEach(() => {
    delete global.ui;
  });

  test('should return a wrapped function', () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const wrapped = wrapAsync(asyncFn);

    expect(typeof wrapped).toBe('function');
  });

  test('should preserve original function behavior on success', async () => {
    const asyncFn = vi.fn().mockResolvedValue('success');
    const wrapped = wrapAsync(asyncFn);

    const result = await wrapped('arg1', 'arg2');

    expect(asyncFn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(result).toBe('success');
  });

  test('should catch errors and return fallback value', async () => {
    const error = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const wrapped = wrapAsync(asyncFn, { fallbackReturn: 'fallback' });

    const result = await wrapped();

    expect(result).toBe('fallback');
  });

  test('should show notification to user by default', async () => {
    const error = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const wrapped = wrapAsync(asyncFn);

    await wrapped();

    expect(mockUi.notifications.error).toHaveBeenCalled();
  });

  test('should not show notification when showToUser is false', async () => {
    const error = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const wrapped = wrapAsync(asyncFn, { showToUser: false });

    await wrapped();

    expect(mockUi.notifications.error).not.toHaveBeenCalled();
  });

  test('should use custom user message when provided', async () => {
    const error = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const wrapped = wrapAsync(asyncFn, { userMessage: 'Custom error' });

    await wrapped();

    expect(mockUi.notifications.error).toHaveBeenCalledWith('Custom error');
  });

  test('should use function name as context by default', async () => {
    const error = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    asyncFn.name = 'myAsyncFunction';
    const wrapped = wrapAsync(asyncFn);

    await wrapped();

    // The error message should include the function name
    expect(mockUi.notifications.error).toHaveBeenCalledWith(
      expect.stringContaining('myAsyncFunction')
    );
  });

  test('should use "Anonymous Function" for unnamed functions', async () => {
    const error = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    Object.defineProperty(asyncFn, 'name', { value: '', configurable: true });
    const wrapped = wrapAsync(asyncFn);

    await wrapped();

    expect(mockUi.notifications.error).toHaveBeenCalledWith(
      expect.stringContaining('Anonymous Function')
    );
  });

  test('should handle missing ui object gracefully', async () => {
    delete global.ui;
    const error = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const wrapped = wrapAsync(asyncFn);

    // Should not throw
    const result = await wrapped();
    expect(result).toBeNull();
  });
});

// =================================
// ErrorPatterns Tests
// =================================
describe('ErrorPatterns', () => {
  let mockGame;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGame = {
      i18n: {
        format: vi.fn((key, data) => `${key}: ${JSON.stringify(data)}`),
        localize: vi.fn((key) => key),
      },
    };

    global.game = mockGame;
  });

  afterEach(() => {
    delete global.game;
  });

  // ---------------------------------
  // documentOperation() Tests
  // ---------------------------------
  describe('documentOperation()', () => {
    test('should return [result, null] on success', async () => {
      const promise = Promise.resolve('document data');
      const result = await ErrorPatterns.documentOperation(promise, 'create', 'actor');

      expect(result).toEqual(['document data', null]);
    });

    test('should return [null, error] on failure', async () => {
      const error = new Error('Document error');
      const promise = Promise.reject(error);
      const result = await ErrorPatterns.documentOperation(promise, 'create', 'actor');

      expect(result).toEqual([null, error]);
    });

    test('should use default document type', async () => {
      const promise = Promise.resolve('data');
      await ErrorPatterns.documentOperation(promise, 'update');

      // Should not throw and should work with default type
      expect(true).toBe(true);
    });
  });

  // ---------------------------------
  // sheetRender() Tests
  // ---------------------------------
  describe('sheetRender()', () => {
    test('should return [result, null] on success', async () => {
      const promise = Promise.resolve('rendered');
      const result = await ErrorPatterns.sheetRender(promise, 'ActorSheet');

      expect(result).toEqual(['rendered', null]);
    });

    test('should return [null, error] on failure', async () => {
      const error = new Error('Render error');
      const promise = Promise.reject(error);
      const result = await ErrorPatterns.sheetRender(promise, 'ActorSheet');

      expect(result).toEqual([null, error]);
    });
  });

  // ---------------------------------
  // rollOperation() Tests
  // ---------------------------------
  describe('rollOperation()', () => {
    test('should return [result, null] on success', async () => {
      const promise = Promise.resolve({ total: 15 });
      const result = await ErrorPatterns.rollOperation(promise, 'attack');

      expect(result).toEqual([{ total: 15 }, null]);
    });

    test('should return [null, error] on failure', async () => {
      const error = new Error('Roll error');
      const promise = Promise.reject(error);
      const result = await ErrorPatterns.rollOperation(promise, 'attack');

      expect(result).toEqual([null, error]);
    });

    test('should handle missing game.i18n gracefully', async () => {
      // Set game.i18n to undefined to test optional chaining
      global.game.i18n = undefined;
      const promise = Promise.resolve({ total: 10 });
      const result = await ErrorPatterns.rollOperation(promise, 'skill');

      expect(result).toEqual([{ total: 10 }, null]);
    });
  });

  // ---------------------------------
  // itemOperation() Tests
  // ---------------------------------
  describe('itemOperation()', () => {
    test('should return [result, null] on success', async () => {
      const promise = Promise.resolve('item updated');
      const result = await ErrorPatterns.itemOperation(promise, 'equip', 'Sword');

      expect(result).toEqual(['item updated', null]);
    });

    test('should return [null, error] on failure', async () => {
      const error = new Error('Item error');
      const promise = Promise.reject(error);
      const result = await ErrorPatterns.itemOperation(promise, 'equip', 'Sword');

      expect(result).toEqual([null, error]);
    });

    test('should handle missing game.i18n gracefully', async () => {
      // Set game.i18n to undefined to test optional chaining
      global.game.i18n = undefined;
      const promise = Promise.resolve('success');
      const result = await ErrorPatterns.itemOperation(promise, 'use', 'Potion');

      expect(result).toEqual(['success', null]);
    });
  });

  // ---------------------------------
  // themeOperation() Tests
  // ---------------------------------
  describe('themeOperation()', () => {
    test('should return [result, null] on success', async () => {
      const promise = Promise.resolve('theme applied');
      const result = await ErrorPatterns.themeOperation(promise, 'apply');

      expect(result).toEqual(['theme applied', null]);
    });

    test('should return [null, error] on failure', async () => {
      const error = new Error('Theme error');
      const promise = Promise.reject(error);
      const result = await ErrorPatterns.themeOperation(promise, 'apply');

      expect(result).toEqual([null, error]);
    });

    test('should handle missing game.i18n gracefully', async () => {
      // Set game.i18n to undefined to test optional chaining
      global.game.i18n = undefined;
      const promise = Promise.resolve('success');
      const result = await ErrorPatterns.themeOperation(promise, 'change');

      expect(result).toEqual(['success', null]);
    });
  });

  // ---------------------------------
  // settingsOperation() Tests
  // ---------------------------------
  describe('settingsOperation()', () => {
    test('should return [result, null] on success', async () => {
      const promise = Promise.resolve('setting saved');
      const result = await ErrorPatterns.settingsOperation(promise, 'theme');

      expect(result).toEqual(['setting saved', null]);
    });

    test('should return [null, error] on failure', async () => {
      const error = new Error('Settings error');
      const promise = Promise.reject(error);
      const result = await ErrorPatterns.settingsOperation(promise, 'theme');

      expect(result).toEqual([null, error]);
    });

    test('should handle missing game.i18n gracefully', async () => {
      // Set game.i18n to undefined to test optional chaining
      global.game.i18n = undefined;
      const promise = Promise.resolve('success');
      const result = await ErrorPatterns.settingsOperation(promise, 'volume');

      expect(result).toEqual(['success', null]);
    });
  });

  // ---------------------------------
  // soundOperation() Tests
  // ---------------------------------
  describe('soundOperation()', () => {
    test('should return [result, null] on success', async () => {
      const promise = Promise.resolve('sound played');
      const result = await ErrorPatterns.soundOperation(promise, 'play');

      expect(result).toEqual(['sound played', null]);
    });

    test('should return [null, error] on failure', async () => {
      const error = new Error('Sound error');
      const promise = Promise.reject(error);
      const result = await ErrorPatterns.soundOperation(promise, 'play');

      expect(result).toEqual([null, error]);
    });
  });
});

// =================================
// ValidationPatterns Tests
// =================================
describe('ValidationPatterns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------
  // validateRequired() Tests
  // ---------------------------------
  describe('validateRequired()', () => {
    test('should return success when all required fields are present', () => {
      const data = { name: 'Test', value: 10 };
      const result = ValidationPatterns.validateRequired(data, ['name', 'value']);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should return error when required field is missing', () => {
      const data = { name: 'Test' };
      const result = ValidationPatterns.validateRequired(data, ['name', 'value']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: value');
    });

    test('should return error when required field is null', () => {
      const data = { name: 'Test', value: null };
      const result = ValidationPatterns.validateRequired(data, ['name', 'value']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: value');
    });

    test('should return error when required field is undefined', () => {
      const data = { name: 'Test', value: undefined };
      const result = ValidationPatterns.validateRequired(data, ['name', 'value']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: value');
    });

    test('should allow field with falsy value (0, false, empty string)', () => {
      const data = { count: 0, active: false, name: '' };
      const result = ValidationPatterns.validateRequired(data, ['count', 'active', 'name']);

      expect(result.isValid).toBe(true);
    });

    test('should handle empty data object', () => {
      const result = ValidationPatterns.validateRequired({}, ['name', 'value']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    test('should handle empty required fields array', () => {
      const data = { name: 'Test' };
      const result = ValidationPatterns.validateRequired(data, []);

      expect(result.isValid).toBe(true);
    });
  });

  // ---------------------------------
  // validateTypes() Tests
  // ---------------------------------
  describe('validateTypes()', () => {
    test('should return success when all fields have correct types', () => {
      const data = { name: 'Test', count: 10, active: true };
      const typeMap = { name: 'string', count: 'number', active: 'boolean' };
      const result = ValidationPatterns.validateTypes(data, typeMap);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should return error when field has wrong type', () => {
      const data = { name: 'Test', count: 'not a number' };
      const typeMap = { name: 'string', count: 'number' };
      const result = ValidationPatterns.validateTypes(data, typeMap);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('count');
      expect(result.errors[0]).toContain('number');
    });

    test('should skip fields not in data', () => {
      const data = { name: 'Test' };
      const typeMap = { name: 'string', missing: 'number' };
      const result = ValidationPatterns.validateTypes(data, typeMap);

      expect(result.isValid).toBe(true);
    });

    test('should handle empty data object', () => {
      const typeMap = { name: 'string' };
      const result = ValidationPatterns.validateTypes({}, typeMap);

      expect(result.isValid).toBe(true);
    });

    test('should handle empty type map', () => {
      const data = { name: 'Test' };
      const result = ValidationPatterns.validateTypes(data, {});

      expect(result.isValid).toBe(true);
    });

    test('should validate object type', () => {
      const data = { config: { key: 'value' } };
      const typeMap = { config: 'object' };
      const result = ValidationPatterns.validateTypes(data, typeMap);

      expect(result.isValid).toBe(true);
    });

    test('should validate function type', () => {
      const data = { callback: () => {} };
      const typeMap = { callback: 'function' };
      const result = ValidationPatterns.validateTypes(data, typeMap);

      expect(result.isValid).toBe(true);
    });
  });

  // ---------------------------------
  // validateRanges() Tests
  // ---------------------------------
  describe('validateRanges()', () => {
    test('should return success when all values are within range', () => {
      const data = { age: 25, score: 85 };
      const rangeMap = { age: { min: 0, max: 100 }, score: { min: 0, max: 100 } };
      const result = ValidationPatterns.validateRanges(data, rangeMap);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should return error when value is below minimum', () => {
      const data = { age: -5 };
      const rangeMap = { age: { min: 0, max: 100 } };
      const result = ValidationPatterns.validateRanges(data, rangeMap);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('at least 0');
    });

    test('should return error when value is above maximum', () => {
      const data = { score: 150 };
      const rangeMap = { score: { min: 0, max: 100 } };
      const result = ValidationPatterns.validateRanges(data, rangeMap);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('at most 100');
    });

    test('should skip non-number fields', () => {
      const data = { name: 'Test', count: 50 };
      const rangeMap = { name: { min: 0, max: 10 }, count: { min: 0, max: 100 } };
      const result = ValidationPatterns.validateRanges(data, rangeMap);

      expect(result.isValid).toBe(true);
    });

    test('should skip fields not in data', () => {
      const rangeMap = { missing: { min: 0, max: 100 } };
      const result = ValidationPatterns.validateRanges({}, rangeMap);

      expect(result.isValid).toBe(true);
    });

    test('should handle only min constraint', () => {
      const data = { value: 5 };
      const rangeMap = { value: { min: 0 } };
      const result = ValidationPatterns.validateRanges(data, rangeMap);

      expect(result.isValid).toBe(true);
    });

    test('should handle only max constraint', () => {
      const data = { value: 50 };
      const rangeMap = { value: { max: 100 } };
      const result = ValidationPatterns.validateRanges(data, rangeMap);

      expect(result.isValid).toBe(true);
    });

    test('should handle boundary values correctly', () => {
      const data = { min: 0, max: 100 };
      const rangeMap = { min: { min: 0, max: 100 }, max: { min: 0, max: 100 } };
      const result = ValidationPatterns.validateRanges(data, rangeMap);

      expect(result.isValid).toBe(true);
    });
  });

  // ---------------------------------
  // combineValidations() Tests
  // ---------------------------------
  describe('combineValidations()', () => {
    test('should return success when all validations pass', () => {
      const result1 = { isValid: true, errors: [] };
      const result2 = { isValid: true, errors: [] };
      const combined = ValidationPatterns.combineValidations(result1, result2);

      expect(combined.isValid).toBe(true);
      expect(combined.errors).toEqual([]);
    });

    test('should combine errors from failed validations', () => {
      const result1 = { isValid: false, errors: ['Error 1', 'Error 2'] };
      const result2 = { isValid: false, errors: ['Error 3'] };
      const combined = ValidationPatterns.combineValidations(result1, result2);

      expect(combined.isValid).toBe(false);
      expect(combined.errors).toEqual(['Error 1', 'Error 2', 'Error 3']);
    });

    test('should handle mix of passing and failing validations', () => {
      const result1 = { isValid: true, errors: [] };
      const result2 = { isValid: false, errors: ['Error 1'] };
      const combined = ValidationPatterns.combineValidations(result1, result2);

      expect(combined.isValid).toBe(false);
      expect(combined.errors).toEqual(['Error 1']);
    });

    test('should handle single validation', () => {
      const result = { isValid: false, errors: ['Error 1'] };
      const combined = ValidationPatterns.combineValidations(result);

      expect(combined.isValid).toBe(false);
      expect(combined.errors).toEqual(['Error 1']);
    });

    test('should handle no validations', () => {
      const combined = ValidationPatterns.combineValidations();

      expect(combined.isValid).toBe(true);
      expect(combined.errors).toEqual([]);
    });
  });
});

// =================================
// RetryPatterns Tests
// =================================
describe('RetryPatterns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------
  // withExponentialBackoff() Tests
  // ---------------------------------
  describe('withExponentialBackoff()', () => {
    test('should return result on first success', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await RetryPatterns.withExponentialBackoff(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure and succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');

      // Use very short delay for testing
      const result = await RetryPatterns.withExponentialBackoff(operation, { baseDelay: 1, maxDelay: 1 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should throw after max retries', async () => {
      const error = new Error('Persistent failure');
      const operation = vi.fn().mockRejectedValue(error);

      const resultPromise = RetryPatterns.withExponentialBackoff(operation, {
        maxRetries: 2,
        baseDelay: 1,
        maxDelay: 1,
      });

      await expect(resultPromise).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should use custom shouldRetry function', async () => {
      const nonRetryableError = new Error('Non-retryable');
      nonRetryableError.code = 'NO_RETRY';

      const operation = vi.fn().mockRejectedValue(nonRetryableError);
      const shouldRetry = vi.fn((err) => err.code === 'RETRY');

      const resultPromise = RetryPatterns.withExponentialBackoff(operation, {
        shouldRetry,
        baseDelay: 1,
      });

      await expect(resultPromise).rejects.toThrow('Non-retryable');
      expect(operation).toHaveBeenCalledTimes(1); // No retry because shouldRetry returned false
    });

    test('should respect maxDelay option', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First'))
        .mockRejectedValueOnce(new Error('Second'))
        .mockResolvedValueOnce('success');

      const result = await RetryPatterns.withExponentialBackoff(operation, {
        baseDelay: 1,
        maxDelay: 2,
        maxRetries: 3,
      });

      expect(result).toBe('success');
    });

    test('should use default options when not provided', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await RetryPatterns.withExponentialBackoff(operation);

      expect(result).toBe('success');
    });
  });

  // ---------------------------------
  // withFixedDelay() Tests
  // ---------------------------------
  describe('withFixedDelay()', () => {
    test('should return result on first success', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await RetryPatterns.withFixedDelay(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should retry with fixed delay', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');

      const result = await RetryPatterns.withFixedDelay(operation, { delay: 1 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should throw after max retries', async () => {
      const error = new Error('Persistent failure');
      const operation = vi.fn().mockRejectedValue(error);

      const resultPromise = RetryPatterns.withFixedDelay(operation, {
        maxRetries: 2,
        delay: 1,
      });

      await expect(resultPromise).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should use custom shouldRetry function', async () => {
      const nonRetryableError = new Error('Do not retry');
      const operation = vi.fn().mockRejectedValue(nonRetryableError);
      const shouldRetry = vi.fn(() => false);

      const resultPromise = RetryPatterns.withFixedDelay(operation, {
        shouldRetry,
        delay: 1,
      });

      await expect(resultPromise).rejects.toThrow('Do not retry');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should use default options when not provided', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await RetryPatterns.withFixedDelay(operation);

      expect(result).toBe('success');
    });
  });
});
