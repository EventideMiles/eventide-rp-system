// @ts-nocheck
/**
 * @fileoverview Logger Tests
 *
 * Unit tests for the Logger service which provides centralized
 * logging with different levels and testing mode support.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

import { Logger } from '../../../module/services/logger.mjs';

describe('Logger', () => {
  let originalConsoleInfo;
  let originalConsoleWarn;
  let originalConsoleError;
  let consoleInfoSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let originalErps;

  beforeEach(() => {
    // Store original console methods
    originalConsoleInfo = console.info;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;

    // Create spies
    consoleInfoSpy = vi.fn();
    consoleWarnSpy = vi.fn();
    consoleErrorSpy = vi.fn();

    // Replace console methods
    console.info = consoleInfoSpy;
    console.warn = consoleWarnSpy;
    console.error = consoleErrorSpy;

    // Store original erps and mock testing mode
    originalErps = globalThis.erps;
    globalThis.erps = {
      settings: {
        getSetting: vi.fn((key) => {
          if (key === 'testingMode') return true;
          return undefined;
        })
      }
    };
  });

  afterEach(() => {
    // Restore original console methods
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;

    // Restore original erps
    globalThis.erps = originalErps;

    // Clear all mocks
    vi.clearAllMocks();
  });

  // =================================
  // Static Properties Tests
  // =================================
  describe('Static Properties', () => {
    test('should have LOG_LEVELS defined', () => {
      expect(Logger.LOG_LEVELS).toBeDefined();
    });

    test('should have correct log level values', () => {
      expect(Logger.LOG_LEVELS.DEBUG).toBe(0);
      expect(Logger.LOG_LEVELS.INFO).toBe(1);
      expect(Logger.LOG_LEVELS.WARN).toBe(2);
      expect(Logger.LOG_LEVELS.ERROR).toBe(3);
    });

    test('should have frozen LOG_LEVELS object', () => {
      expect(Object.isFrozen(Logger.LOG_LEVELS)).toBe(true);
    });
  });

  // =================================
  // debug() Tests
  // =================================
  describe('debug()', () => {
    test('should log debug message without data', () => {
      Logger.debug('Test debug message');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('ERPS');
      expect(call[0]).toContain('DEBUG');
      expect(call[0]).toContain('Test debug message');
    });

    test('should log debug message with data', () => {
      const testData = { key: 'value', count: 42 };
      Logger.debug('Test debug message', testData);

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('Test debug message');
      expect(call[1]).toEqual(testData);
    });

    test('should log debug message with context', () => {
      Logger.debug('Test debug message', null, 'TestContext');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('[TestContext]');
    });

    test('should log debug message with data and context', () => {
      const testData = { foo: 'bar' };
      Logger.debug('Test message', testData, 'MyContext');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('MyContext');
      expect(call[1]).toEqual(testData);
    });

    test('should not log when data is undefined', () => {
      Logger.debug('Test message', undefined);

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      // Should only have one argument (the message)
      expect(call.length).toBe(1);
    });
  });

  // =================================
  // info() Tests
  // =================================
  describe('info()', () => {
    test('should log info message without data', () => {
      Logger.info('Test info message');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('ERPS');
      expect(call[0]).toContain('INFO');
      expect(call[0]).toContain('Test info message');
    });

    test('should log info message with data', () => {
      const testData = { status: 'success' };
      Logger.info('Test info message', testData);

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('Test info message');
      expect(call[1]).toEqual(testData);
    });

    test('should log info message with context', () => {
      Logger.info('Test info message', null, 'InfoContext');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('[InfoContext]');
    });

    test('should log info message with data and context', () => {
      const testData = { count: 5 };
      Logger.info('Processing', testData, 'Processor');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('Processor');
      expect(call[1]).toEqual(testData);
    });
  });

  // =================================
  // warn() Tests
  // =================================
  describe('warn()', () => {
    test('should log warn message without data', () => {
      Logger.warn('Test warning message');

      expect(consoleWarnSpy).toHaveBeenCalled();
      const call = consoleWarnSpy.mock.calls[0];
      expect(call[0]).toContain('ERPS');
      expect(call[0]).toContain('WARN');
      expect(call[0]).toContain('Test warning message');
    });

    test('should log warn message with data', () => {
      const testData = { issue: 'deprecated' };
      Logger.warn('Test warning message', testData);

      expect(consoleWarnSpy).toHaveBeenCalled();
      const call = consoleWarnSpy.mock.calls[0];
      expect(call[0]).toContain('Test warning message');
      expect(call[1]).toEqual(testData);
    });

    test('should log warn message with context', () => {
      Logger.warn('Test warning message', null, 'WarnContext');

      expect(consoleWarnSpy).toHaveBeenCalled();
      const call = consoleWarnSpy.mock.calls[0];
      expect(call[0]).toContain('[WarnContext]');
    });

    test('should log warn message with data and context', () => {
      const testData = { threshold: 100 };
      Logger.warn('Threshold exceeded', testData, 'Performance');

      expect(consoleWarnSpy).toHaveBeenCalled();
      const call = consoleWarnSpy.mock.calls[0];
      expect(call[0]).toContain('Performance');
      expect(call[1]).toEqual(testData);
    });
  });

  // =================================
  // error() Tests
  // =================================
  describe('error()', () => {
    test('should log error message without error object', () => {
      Logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0];
      expect(call[0]).toContain('ERPS');
      expect(call[0]).toContain('ERROR');
      expect(call[0]).toContain('Test error message');
    });

    test('should log error message with Error object', () => {
      const testError = new Error('Test error');
      Logger.error('An error occurred', testError);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0];
      expect(call[0]).toContain('An error occurred');
      expect(call[1]).toBe(testError);
    });

    test('should log error message with non-Error data', () => {
      const errorData = { code: 'ERR001', details: 'Something went wrong' };
      Logger.error('Error occurred', errorData);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0];
      expect(call[0]).toContain('Error occurred');
      expect(call[1]).toEqual(errorData);
    });

    test('should log error message with context', () => {
      Logger.error('Test error message', null, 'ErrorContext');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0];
      expect(call[0]).toContain('[ErrorContext]');
    });

    test('should log error message with Error and context', () => {
      const testError = new Error('Critical failure');
      Logger.error('Critical error', testError, 'CriticalSystem');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0];
      expect(call[0]).toContain('CriticalSystem');
      expect(call[1]).toBe(testError);
    });

    test('should handle null error parameter', () => {
      Logger.error('Error with null', null);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0];
      expect(call.length).toBe(1);
    });

    test('should handle undefined error parameter', () => {
      Logger.error('Error with undefined', undefined);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0];
      expect(call.length).toBe(1);
    });
  });

  // =================================
  // methodEntry() Tests
  // =================================
  describe('methodEntry()', () => {
    test('should log method entry without params', () => {
      Logger.methodEntry('TestClass', 'testMethod');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('Entering TestClass.testMethod()');
      expect(call[0]).toContain('METHOD_ENTRY');
    });

    test('should log method entry with params', () => {
      const params = { arg1: 'value1', arg2: 42 };
      Logger.methodEntry('TestClass', 'testMethod', params);

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('Entering TestClass.testMethod()');
      expect(call[1]).toEqual(params);
    });
  });

  // =================================
  // methodExit() Tests
  // =================================
  describe('methodExit()', () => {
    test('should log method exit without result', () => {
      Logger.methodExit('TestClass', 'testMethod');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('Exiting TestClass.testMethod()');
      expect(call[0]).toContain('METHOD_EXIT');
    });

    test('should log method exit with result', () => {
      const result = { status: 'success', data: [1, 2, 3] };
      Logger.methodExit('TestClass', 'testMethod', result);

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('Exiting TestClass.testMethod()');
      expect(call[1]).toEqual(result);
    });
  });

  // =================================
  // logIfTesting() Tests (Legacy)
  // =================================
  describe('logIfTesting()', () => {
    test('should log message in testing mode', () => {
      Logger.logIfTesting('Legacy log message');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('ERPS');
      expect(call[0]).toContain('DEBUG');
      expect(call[0]).toContain('Legacy log message');
      expect(call[0]).toContain('[LEGACY]');
    });

    test('should log message with data in testing mode', () => {
      const testData = { legacy: true };
      Logger.logIfTesting('Legacy log message', testData);

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[1]).toEqual(testData);
    });
  });

  // =================================
  // Message Formatting Tests
  // =================================
  describe('Message Formatting', () => {
    test('should format message with system prefix', () => {
      Logger.info('Test message');

      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toMatch(/^ERPS \| INFO/);
    });

    test('should format message with context in brackets', () => {
      Logger.info('Test message', null, 'MyContext');

      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('[MyContext]');
    });

    test('should format message correctly without context', () => {
      Logger.info('Test message');

      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toBe('ERPS | INFO Test message');
    });

    test('should format message correctly with context', () => {
      Logger.info('Test message', null, 'Context');

      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toBe('ERPS | INFO [Context] Test message');
    });
  });

  // =================================
  // Edge Cases Tests
  // =================================
  describe('Edge Cases', () => {
    test('should handle empty message', () => {
      Logger.info('');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('ERPS | INFO');
    });

    test('should handle special characters in message', () => {
      Logger.info('Message with special chars: !@#$%^&*()');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain('special chars');
    });

    test('should handle circular reference in data', () => {
      const circularData = { name: 'test' };
      circularData.self = circularData;

      // Should not throw when logging circular reference
      expect(() => Logger.info('Test', circularData)).not.toThrow();
    });

    test('should handle array data', () => {
      const arrayData = [1, 2, 3, 'four'];
      Logger.info('Array test', arrayData);

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[1]).toEqual(arrayData);
    });

    test('should handle number as data', () => {
      Logger.info('Number test', 42);

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[1]).toBe(42);
    });

    test('should handle string as data', () => {
      Logger.info('String test', 'some string');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[1]).toBe('some string');
    });

    test('should handle boolean as data', () => {
      Logger.info('Boolean test', true);

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[1]).toBe(true);
    });

    test('should handle null data explicitly', () => {
      Logger.info('Null test', null);

      expect(consoleInfoSpy).toHaveBeenCalled();
      // Should only have message argument
      const call = consoleInfoSpy.mock.calls[0];
      expect(call.length).toBe(1);
    });

    test('should handle undefined context', () => {
      Logger.info('Undefined context test', null, undefined);

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      // Should not have context brackets
      expect(call[0]).not.toContain('[undefined]');
    });
  });

  // =================================
  // Log Level Filtering Tests
  // =================================
  describe('Log Level Filtering', () => {
    test('should always log error messages regardless of level', () => {
      Logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should log info messages', () => {
      Logger.info('Info message');

      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    test('should log warn messages', () => {
      Logger.warn('Warn message');

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    test('should log debug messages in test environment', () => {
      Logger.debug('Debug message');

      // In test environment, debug should be logged
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });
});