// @ts-nocheck
/**
 * @fileoverview Tests for ErrorHandler utility class
 *
 * Tests centralized error handling utilities including async error handling,
 * document operations, sheet rendering, validation, and safe execution.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorHandler } from '../../../module/utils/error-handler.mjs';

// Mock Logger module
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn()
  }
}));

import { Logger } from '../../../module/services/logger.mjs';

describe('ErrorHandler', () => {
  // Store original globals
  let originalGame;
  let originalUi;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Store original globals
    originalGame = global.game;
    originalUi = global.ui;

    // Setup Foundry VTT mocks
    global.game = {
      i18n: {
        format: vi.fn((key, data) => {
          if (key === 'EVENTIDE_RP_SYSTEM.Errors.DocumentOperation') {
            return `Error during ${data.operation} for ${data.type}`;
          }
          if (key === 'EVENTIDE_RP_SYSTEM.Errors.SheetRender') {
            return `Error rendering ${data.sheet}`;
          }
          if (key === 'EVENTIDE_RP_SYSTEM.Errors.Validation') {
            return `Validation failed: ${data.errors}`;
          }
          if (key === 'EVENTIDE_RP_SYSTEM.Errors.UnexpectedError') {
            return 'An unexpected error occurred';
          }
          return key;
        }),
        localize: vi.fn((key) => {
          if (key.includes('Permission')) return 'Permission denied';
          if (key.includes('Network')) return 'Network error';
          if (key.includes('Validation')) return 'Validation error';
          if (key.includes('Generic')) return `Error: ${key}`;
          return key;
        })
      }
    };

    global.ui = {
      notifications: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn()
      }
    };
  });

  afterEach(() => {
    // Restore original globals
    global.game = originalGame;
    global.ui = originalUi;
  });

  describe('ERROR_TYPES', () => {
    test('should define all error types as frozen object', () => {
      expect(ErrorHandler.ERROR_TYPES).toBeDefined();
      expect(typeof ErrorHandler.ERROR_TYPES).toBe('object');
      expect(Object.isFrozen(ErrorHandler.ERROR_TYPES)).toBe(true);
    });

    test('should have VALIDATION type', () => {
      expect(ErrorHandler.ERROR_TYPES.VALIDATION).toBe('validation');
    });

    test('should have NETWORK type', () => {
      expect(ErrorHandler.ERROR_TYPES.NETWORK).toBe('network');
    });

    test('should have PERMISSION type', () => {
      expect(ErrorHandler.ERROR_TYPES.PERMISSION).toBe('permission');
    });

    test('should have DATA type', () => {
      expect(ErrorHandler.ERROR_TYPES.DATA).toBe('data');
    });

    test('should have UI type', () => {
      expect(ErrorHandler.ERROR_TYPES.UI).toBe('ui');
    });

    test('should have FOUNDRY_API type', () => {
      expect(ErrorHandler.ERROR_TYPES.FOUNDRY_API).toBe('foundry_api');
    });

    test('should have UNKNOWN type', () => {
      expect(ErrorHandler.ERROR_TYPES.UNKNOWN).toBe('unknown');
    });
  });

  describe('handleAsync()', () => {
    test('should return [result, null] for successful promise', async () => {
      // Arrange
      const successPromise = Promise.resolve({ data: 'success' });

      // Act
      const [result, error] = await ErrorHandler.handleAsync(successPromise);

      // Assert
      expect(result).toEqual({ data: 'success' });
      expect(error).toBeNull();
    });

    test('should return [null, error] for failed promise', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Test error'));

      // Act
      const [result, error] = await ErrorHandler.handleAsync(errorPromise);

      // Assert
      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
    });

    test('should log error with context', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Test error'));

      // Act
      await ErrorHandler.handleAsync(errorPromise, { context: 'TestContext' });

      // Assert
      expect(Logger.error).toHaveBeenCalledWith(
        'Error in TestContext',
        expect.any(Error),
        'UNKNOWN'
      );
    });

    test('should use custom error type', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Test error'));

      // Act
      await ErrorHandler.handleAsync(errorPromise, {
        context: 'TestContext',
        errorType: ErrorHandler.ERROR_TYPES.NETWORK
      });

      // Assert
      expect(Logger.error).toHaveBeenCalledWith(
        'Error in TestContext',
        expect.any(Error),
        'NETWORK'
      );
    });

    test('should show notification to user by default', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Test error'));

      // Act
      await ErrorHandler.handleAsync(errorPromise, { context: 'TestContext' });

      // Assert
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should not show notification when showToUser is false', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Test error'));

      // Act
      await ErrorHandler.handleAsync(errorPromise, {
        context: 'TestContext',
        showToUser: false
      });

      // Assert
      expect(global.ui.notifications.error).not.toHaveBeenCalled();
    });

    test('should use custom user message', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Test error'));

      // Act
      await ErrorHandler.handleAsync(errorPromise, {
        context: 'TestContext',
        userMessage: 'Custom error message'
      });

      // Assert
      expect(global.ui.notifications.error).toHaveBeenCalledWith('Custom error message');
    });

    test('should use default context when not provided', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Test error'));

      // Act
      await ErrorHandler.handleAsync(errorPromise);

      // Assert
      expect(Logger.error).toHaveBeenCalledWith(
        'Error in Unknown Operation',
        expect.any(Error),
        'UNKNOWN'
      );
    });

    test('should handle ui being undefined', async () => {
      // Arrange
      global.ui = undefined;
      const errorPromise = Promise.reject(new Error('Test error'));

      // Act & Assert - should not throw
      const [result, error] = await ErrorHandler.handleAsync(errorPromise, { context: 'Test' });
      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
    });

    test('should handle ui.notifications being undefined', async () => {
      // Arrange
      global.ui = {};
      const errorPromise = Promise.reject(new Error('Test error'));

      // Act & Assert - should not throw
      const [result, error] = await ErrorHandler.handleAsync(errorPromise, { context: 'Test' });
      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('handleDocumentOperation()', () => {
    test('should return [result, null] for successful operation', async () => {
      // Arrange
      const successPromise = Promise.resolve({ id: 'actor123' });

      // Act
      const [result, error] = await ErrorHandler.handleDocumentOperation(
        successPromise,
        'create actor',
        'Actor'
      );

      // Assert
      expect(result).toEqual({ id: 'actor123' });
      expect(error).toBeNull();
    });

    test('should return [null, error] for failed operation', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Database error'));

      // Act
      const [result, error] = await ErrorHandler.handleDocumentOperation(
        errorPromise,
        'create actor',
        'Actor'
      );

      // Assert
      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
    });

    test('should use FOUNDRY_API error type', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Database error'));

      // Act
      await ErrorHandler.handleDocumentOperation(errorPromise, 'create actor', 'Actor');

      // Assert
      expect(Logger.error).toHaveBeenCalledWith(
        'Error in Document Operation: create actor',
        expect.any(Error),
        'FOUNDRY_API'
      );
    });

    test('should use default documentType when not provided', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Database error'));

      // Act
      await ErrorHandler.handleDocumentOperation(errorPromise, 'create');

      // Assert
      expect(global.game.i18n.format).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.DocumentOperation',
        expect.objectContaining({
          operation: 'create',
          type: 'document'
        })
      );
    });

    test('should show localized error message to user', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Database error'));

      // Act
      await ErrorHandler.handleDocumentOperation(errorPromise, 'create actor', 'Actor');

      // Assert
      expect(global.ui.notifications.error).toHaveBeenCalledWith('Error during create actor for Actor');
    });
  });

  describe('handleSheetRender()', () => {
    test('should return [result, null] for successful render', async () => {
      // Arrange
      const successPromise = Promise.resolve({ html: '<div></div>' });

      // Act
      const [result, error] = await ErrorHandler.handleSheetRender(
        successPromise,
        'CharacterSheet'
      );

      // Assert
      expect(result).toEqual({ html: '<div></div>' });
      expect(error).toBeNull();
    });

    test('should return [null, error] for failed render', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Template not found'));

      // Act
      const [result, error] = await ErrorHandler.handleSheetRender(
        errorPromise,
        'CharacterSheet'
      );

      // Assert
      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
    });

    test('should use UI error type', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Template not found'));

      // Act
      await ErrorHandler.handleSheetRender(errorPromise, 'CharacterSheet');

      // Assert
      expect(Logger.error).toHaveBeenCalledWith(
        'Error in Sheet Render: CharacterSheet',
        expect.any(Error),
        'UI'
      );
    });

    test('should show localized error message to user', async () => {
      // Arrange
      const errorPromise = Promise.reject(new Error('Template not found'));

      // Act
      await ErrorHandler.handleSheetRender(errorPromise, 'CharacterSheet');

      // Assert
      expect(global.ui.notifications.error).toHaveBeenCalledWith('Error rendering CharacterSheet');
    });
  });

  describe('handleValidation()', () => {
    test('should return true for valid result', () => {
      // Arrange
      const validationResult = { isValid: true, errors: [] };

      // Act
      const result = ErrorHandler.handleValidation(validationResult);

      // Assert
      expect(result).toBe(true);
    });

    test('should return false for invalid result', () => {
      // Arrange
      const validationResult = { isValid: false, errors: ['Field is required'] };

      // Act
      const result = ErrorHandler.handleValidation(validationResult);

      // Assert
      expect(result).toBe(false);
    });

    test('should log warning for invalid result', () => {
      // Arrange
      const validationResult = { isValid: false, errors: ['Field is required', 'Invalid format'] };

      // Act
      ErrorHandler.handleValidation(validationResult, 'CharacterCreation');

      // Assert
      expect(Logger.warn).toHaveBeenCalledWith(
        'CharacterCreation failed: Field is required; Invalid format',
        validationResult,
        'VALIDATION'
      );
    });

    test('should show warning notification for invalid result', () => {
      // Arrange
      const validationResult = { isValid: false, errors: ['Field is required'] };

      // Act
      ErrorHandler.handleValidation(validationResult);

      // Assert
      expect(global.ui.notifications.warn).toHaveBeenCalled();
    });

    test('should use default context when not provided', () => {
      // Arrange
      const validationResult = { isValid: false, errors: ['Error'] };

      // Act
      ErrorHandler.handleValidation(validationResult);

      // Assert
      expect(Logger.warn).toHaveBeenCalledWith(
        'Validation failed: Error',
        validationResult,
        'VALIDATION'
      );
    });

    test('should handle ui being undefined', () => {
      // Arrange
      global.ui = undefined;
      const validationResult = { isValid: false, errors: ['Error'] };

      // Act & Assert - should not throw
      const result = ErrorHandler.handleValidation(validationResult, 'Test');
      expect(result).toBe(false);
    });

    test('should handle ui.notifications being undefined', () => {
      // Arrange
      global.ui = {};
      const validationResult = { isValid: false, errors: ['Error'] };

      // Act & Assert - should not throw
      const result = ErrorHandler.handleValidation(validationResult, 'Test');
      expect(result).toBe(false);
    });
  });

  describe('createValidationError()', () => {
    test('should create validation error object with array of errors', () => {
      // Arrange
      const errors = ['Error 1', 'Error 2', 'Error 3'];

      // Act
      const result = ErrorHandler.createValidationError(errors);

      // Assert
      expect(result).toEqual({
        isValid: false,
        errors: ['Error 1', 'Error 2', 'Error 3']
      });
    });

    test('should convert single error string to array', () => {
      // Arrange
      const errors = 'Single error';

      // Act
      const result = ErrorHandler.createValidationError(errors);

      // Assert
      expect(result).toEqual({
        isValid: false,
        errors: ['Single error']
      });
    });

    test('should handle empty array', () => {
      // Arrange
      const errors = [];

      // Act
      const result = ErrorHandler.createValidationError(errors);

      // Assert
      expect(result).toEqual({
        isValid: false,
        errors: []
      });
    });
  });

  describe('createValidationSuccess()', () => {
    test('should create successful validation result', () => {
      // Act
      const result = ErrorHandler.createValidationSuccess();

      // Assert
      expect(result).toEqual({
        isValid: true,
        errors: []
      });
    });

    test('should return consistent object structure', () => {
      // Act
      const result1 = ErrorHandler.createValidationSuccess();
      const result2 = ErrorHandler.createValidationSuccess();

      // Assert
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(Array.isArray(result1.errors)).toBe(true);
      expect(Array.isArray(result2.errors)).toBe(true);
    });
  });

  describe('safeExecute()', () => {
    test('should return function result on success', () => {
      // Arrange
      const fn = (a, b) => a + b;

      // Act
      const result = ErrorHandler.safeExecute(fn, null, 2, 3);

      // Assert
      expect(result).toBe(5);
    });

    test('should bind function to thisArg', () => {
      // Arrange
      const obj = { multiplier: 2 };
      const fn = function (value) {
        return value * this.multiplier;
      };

      // Act
      const result = ErrorHandler.safeExecute(fn, obj, 5);

      // Assert
      expect(result).toBe(10);
    });

    test('should pass multiple arguments correctly', () => {
      // Arrange
      const fn = (a, b, c) => a + b + c;

      // Act
      const result = ErrorHandler.safeExecute(fn, null, 1, 2, 3);

      // Assert
      expect(result).toBe(6);
    });

    test('should return null and log error on failure', () => {
      // Arrange
      const fn = () => {
        throw new Error('Function error');
      };

      // Act
      const result = ErrorHandler.safeExecute(fn);

      // Assert
      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalledWith(
        'Error in safe execution',
        expect.any(Error),
        'SAFE_EXECUTE'
      );
    });

    test('should show error notification to user on failure', () => {
      // Arrange
      const fn = () => {
        throw new Error('Function error');
      };

      // Act
      ErrorHandler.safeExecute(fn);

      // Assert - localize returns the key as the message
      expect(global.ui.notifications.error).toHaveBeenCalledWith('EVENTIDE_RP_SYSTEM.Errors.UnexpectedError');
    });

    test('should handle ui being undefined', () => {
      // Arrange
      global.ui = undefined;
      const fn = () => {
        throw new Error('Function error');
      };

      // Act & Assert - should not throw
      const result = ErrorHandler.safeExecute(fn);
      expect(result).toBeNull();
    });

    test('should handle ui.notifications being undefined', () => {
      // Arrange
      global.ui = {};
      const fn = () => {
        throw new Error('Function error');
      };

      // Act & Assert - should not throw
      const result = ErrorHandler.safeExecute(fn);
      expect(result).toBeNull();
    });

    test('should work with no arguments', () => {
      // Arrange
      const fn = () => 'result';

      // Act
      const result = ErrorHandler.safeExecute(fn);

      // Assert
      expect(result).toBe('result');
    });

    test('should work with null thisArg', () => {
      // Arrange
      const fn = () => 'result';

      // Act
      const result = ErrorHandler.safeExecute(fn, null);

      // Assert
      expect(result).toBe('result');
    });
  });

  describe('assert()', () => {
    test('should not throw when condition is true', () => {
      // Act & Assert - should not throw
      expect(() => ErrorHandler.assert(true, 'Should not throw')).not.toThrow();
    });

    test('should throw when condition is false', () => {
      // Act & Assert
      expect(() => ErrorHandler.assert(false, 'Condition failed')).toThrow('Condition failed');
    });

    test('should use default error type when not provided', () => {
      // Arrange
      let caughtError;
      try {
        ErrorHandler.assert(false, 'Test message');
      } catch (error) {
        caughtError = error;
      }

      // Assert
      expect(caughtError.type).toBe('validation');
    });

    test('should use custom error type when provided', () => {
      // Arrange
      let caughtError;
      try {
        ErrorHandler.assert(false, 'Test message', ErrorHandler.ERROR_TYPES.NETWORK);
      } catch (error) {
        caughtError = error;
      }

      // Assert
      expect(caughtError.type).toBe('network');
    });

    test('should set error type on thrown error', () => {
      // Arrange
      let caughtError;
      try {
        ErrorHandler.assert(false, 'Test message', ErrorHandler.ERROR_TYPES.PERMISSION);
      } catch (error) {
        caughtError = error;
      }

      // Assert
      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError.message).toBe('Test message');
      expect(caughtError.type).toBe('permission');
    });
  });

  describe('isErrorType()', () => {
    test('should return true when error type matches', () => {
      // Arrange
      const error = new Error('Test');
      error.type = 'validation';

      // Act
      const result = ErrorHandler.isErrorType(error, 'validation');

      // Assert
      expect(result).toBe(true);
    });

    test('should return false when error type does not match', () => {
      // Arrange
      const error = new Error('Test');
      error.type = 'validation';

      // Act
      const result = ErrorHandler.isErrorType(error, 'network');

      // Assert
      expect(result).toBe(false);
    });

    test('should return false when error has no type', () => {
      // Arrange
      const error = new Error('Test');

      // Act
      const result = ErrorHandler.isErrorType(error, 'validation');

      // Assert
      expect(result).toBe(false);
    });

    test('should return falsy when error is null', () => {
      // Act
      const result = ErrorHandler.isErrorType(null, 'validation');

      // Assert - returns null due to short-circuit evaluation
      expect(result).toBeFalsy();
    });

    test('should return falsy when error is undefined', () => {
      // Act
      const result = ErrorHandler.isErrorType(undefined, 'validation');

      // Assert - returns undefined due to short-circuit evaluation
      expect(result).toBeFalsy();
    });

    test('should work with all error types', () => {
      // Arrange
      const errorTypes = Object.values(ErrorHandler.ERROR_TYPES);
      
      errorTypes.forEach(type => {
        // Arrange
        const error = new Error('Test');
        error.type = type;

        // Act & Assert
        expect(ErrorHandler.isErrorType(error, type)).toBe(true);
      });
    });
  });

  describe('#createUserMessage (private method)', () => {
    test('should create permission error message for permission errors', async () => {
      // Arrange
      const error = new Error('User does not have permission');
      const errorPromise = Promise.reject(error);

      // Act
      await ErrorHandler.handleAsync(errorPromise, { context: 'Test' });

      // Assert
      expect(global.game.i18n.localize).toHaveBeenCalledWith(
        expect.stringContaining('Permission')
      );
    });

    test('should create network error message for network errors', async () => {
      // Arrange
      const error = new Error('Network connection failed');
      const errorPromise = Promise.reject(error);

      // Act
      await ErrorHandler.handleAsync(errorPromise, { context: 'Test' });

      // Assert - the localized error message is shown to user via notifications
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should create network error message for fetch errors', async () => {
      // Arrange
      const error = new Error('Failed to fetch data');
      const errorPromise = Promise.reject(error);

      // Act
      await ErrorHandler.handleAsync(errorPromise, { context: 'Test' });

      // Assert
      expect(global.game.i18n.localize).toHaveBeenCalledWith(
        expect.stringContaining('Network')
      );
    });

    test('should create validation error message for ValidationError', async () => {
      // Arrange
      const error = new Error('Invalid data');
      error.name = 'ValidationError';
      const errorPromise = Promise.reject(error);

      // Act
      await ErrorHandler.handleAsync(errorPromise, { context: 'Test' });

      // Assert
      expect(global.game.i18n.format).toHaveBeenCalledWith(
        expect.stringContaining('Validation'),
        expect.any(Object)
      );
    });

    test('should create generic error message for other errors', async () => {
      // Arrange
      const error = new Error('Some random error');
      const errorPromise = Promise.reject(error);

      // Act
      await ErrorHandler.handleAsync(errorPromise, { context: 'TestContext' });

      // Assert
      expect(global.game.i18n.format).toHaveBeenCalledWith(
        expect.stringContaining('Generic'),
        expect.objectContaining({
          context: 'TestContext',
          message: 'Some random error'
        })
      );
    });

    test('should fallback when game is undefined', async () => {
      // Arrange
      global.game = undefined;
      const error = new Error('Test error');
      const errorPromise = Promise.reject(error);

      // Act
      const [result, caughtError] = await ErrorHandler.handleAsync(errorPromise, { context: 'Test' });

      // Assert
      expect(result).toBeNull();
      expect(caughtError).toBeInstanceOf(Error);
      // The fallback message should be shown
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should fallback when game.i18n is undefined', async () => {
      // Arrange
      global.game = {};
      const error = new Error('Test error');
      const errorPromise = Promise.reject(error);

      // Act
      const [result, caughtError] = await ErrorHandler.handleAsync(errorPromise, { context: 'Test' });

      // Assert
      expect(result).toBeNull();
      expect(caughtError).toBeInstanceOf(Error);
    });
  });

  describe('Integration scenarios', () => {
    test('should handle chained async operations', async () => {
      // Arrange
      const successPromise = Promise.resolve({ id: '123' });

      // Act
      const [result1, error1] = await ErrorHandler.handleAsync(successPromise, { context: 'Op1' });
      const [result2, error2] = await ErrorHandler.handleAsync(
        Promise.resolve(result1.id),
        { context: 'Op2' }
      );

      // Assert
      expect(result2).toBe('123');
      expect(error1).toBeNull();
      expect(error2).toBeNull();
    });

    test('should handle validation followed by async operation', async () => {
      // Arrange
      const validationResult = { isValid: true, errors: [] };
      const successPromise = Promise.resolve('success');

      // Act
      const isValid = ErrorHandler.handleValidation(validationResult, 'PreCheck');
      const [result, error] = isValid
        ? await ErrorHandler.handleAsync(successPromise, { context: 'MainOp' })
        : [null, new Error('Validation failed')];

      // Assert
      expect(isValid).toBe(true);
      expect(result).toBe('success');
      expect(error).toBeNull();
    });

    test('should handle safeExecute with async function', async () => {
      // Arrange
      const asyncFn = async () => {
        return Promise.resolve('async result');
      };

      // Act
      const result = ErrorHandler.safeExecute(() => asyncFn());

      // Assert - safeExecute returns the promise, need to await
      expect(result).toBeInstanceOf(Promise);
      const awaitedResult = await result;
      expect(await awaitedResult).toBe('async result');
    });
  });
});