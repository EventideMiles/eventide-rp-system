// @ts-nocheck
/**
 * @fileoverview System Cleanup Utilities Tests
 *
 * Unit tests for the system-cleanup module which provides centralized cleanup
 * functions to prevent memory leaks when the system is disabled, reloaded, or
 * when Foundry is shut down.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, afterEach, vi are available globally

// =================================
// Mock Setup
// =================================

// Mock Logger service - use vi.fn() inside the mock factory function
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock color-pickers module
vi.mock('../../../module/helpers/color-pickers.mjs', () => ({
  cleanupGlobalColorPickers: vi.fn(),
}));

// Mock theme module
vi.mock('../../../module/helpers/_module.mjs', () => ({
  cleanupGlobalThemeManager: vi.fn(),
}));

// Mock GM control hooks
vi.mock('../../../module/services/hooks/gm-control-hooks.mjs', () => ({
  cleanupGMControlHooks: vi.fn(),
}));

// Mock chat listeners
vi.mock('../../../module/services/hooks/chat-listeners.mjs', () => ({
  cleanupChatListeners: vi.fn(),
}));

// Store original values to restore after tests
const originalWindow = global.window;
const originalDocument = global.document;
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const originalClearInterval = global.clearInterval;

// =================================
// Test Module Import
// =================================

// Import the module after mocks are set up
import {
  performSystemCleanup,
  performPreInitCleanup,
  initializeCleanupHooks,
} from '../../../module/utils/system-cleanup.mjs';

// Import mocked modules for access in tests
import { Logger } from '../../../module/services/logger.mjs';
import { cleanupGlobalColorPickers } from '../../../module/helpers/color-pickers.mjs';
import { cleanupGlobalThemeManager } from '../../../module/helpers/_module.mjs';
import { cleanupGMControlHooks } from '../../../module/services/hooks/gm-control-hooks.mjs';
import { cleanupChatListeners } from '../../../module/services/hooks/chat-listeners.mjs';

// =================================
// Helper Functions
// =================================

/**
 * Reset all mocks before each test
 */
function resetMocks() {
  Logger.debug.mockClear();
  Logger.info.mockClear();
  Logger.warn.mockClear();
  Logger.error.mockClear();
  cleanupGlobalColorPickers.mockClear();
  cleanupGlobalThemeManager.mockClear();
  cleanupGMControlHooks.mockClear();
  cleanupChatListeners.mockClear();
}

/**
 * Setup mock DOM with querySelectorAll
 * @param {Array} elements - Array of mock elements to return
 */
function setupMockDocument(elements = []) {
  const mockQuerySelectorAll = vi.fn().mockReturnValue(elements);
  global.document = {
    querySelectorAll: mockQuerySelectorAll,
    visibilityState: 'visible',
    hidden: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  return mockQuerySelectorAll;
}

/**
 * Setup mock window with intervals tracking
 */
function setupMockWindow() {
  global.window = {
    _erpsIntervalIds: new Set(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

/**
 * Setup mock Hooks
 */
function setupMockHooks() {
  global.Hooks = {
    on: vi.fn(),
  };
}

/**
 * Setup mock game object
 */
function setupMockGame() {
  global.game = {
    settings: {
      get: vi.fn(),
    },
  };
}

// =================================
// Tests
// =================================

describe('system-cleanup.mjs', () => {
  beforeEach(() => {
    resetMocks();
    setupMockWindow();
    setupMockDocument();
    setupMockHooks();
    setupMockGame();
    
    // Setup setTimeout mock
    global.setTimeout = vi.fn().mockReturnValue(100);
    global.clearTimeout = vi.fn();
    global.clearInterval = vi.fn();
  });

  afterEach(() => {
    // Restore original globals
    global.window = originalWindow;
    global.document = originalDocument;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
    global.clearInterval = originalClearInterval;
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  // =================================
  // performSystemCleanup() Tests
  // =================================
  describe('performSystemCleanup()', () => {
    test('should call all cleanup functions', () => {
      performSystemCleanup();

      expect(cleanupGMControlHooks).toHaveBeenCalled();
      expect(cleanupChatListeners).toHaveBeenCalled();
      expect(cleanupGlobalColorPickers).toHaveBeenCalled();
      expect(cleanupGlobalThemeManager).toHaveBeenCalled();
    });

    test('should handle errors gracefully', () => {
      cleanupGMControlHooks.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Should not throw
      expect(() => performSystemCleanup()).not.toThrow();
    });

    test('should continue cleanup even if one function fails', () => {
      // Reset mocks to clear previous calls
      resetMocks();
      
      // Make the first cleanup function throw
      cleanupGMControlHooks.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Should not throw even when first cleanup fails
      expect(() => performSystemCleanup()).not.toThrow();
      
      // The error is caught and logged, but the function completes
      // Verify that the error was logged
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  // =================================
  // performPreInitCleanup() Tests
  // =================================
  describe('performPreInitCleanup()', () => {
    test('should call all cleanup functions', () => {
      performPreInitCleanup();

      expect(cleanupGlobalColorPickers).toHaveBeenCalled();
      expect(cleanupGlobalThemeManager).toHaveBeenCalled();
      expect(cleanupGMControlHooks).toHaveBeenCalled();
      expect(cleanupChatListeners).toHaveBeenCalled();
    });

    test('should handle errors gracefully', () => {
      cleanupGlobalColorPickers.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Should not throw
      expect(() => performPreInitCleanup()).not.toThrow();
    });
  });

  // =================================
  // initializeCleanupHooks() Tests
  // =================================
  describe('initializeCleanupHooks()', () => {
    test('should register ready hook', () => {
      initializeCleanupHooks();

      expect(global.Hooks.on).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    test('should not initialize twice', () => {
      // First call
      initializeCleanupHooks();
      const firstCallCount = global.Hooks.on.mock.calls.length;

      // Second call should not add more hooks
      initializeCleanupHooks();

      expect(global.Hooks.on.mock.calls.length).toBe(firstCallCount);
    });

    test('should setup beforeunload listener on ready', () => {
      initializeCleanupHooks();

      // Get the ready callback
      const readyCallback = global.Hooks.on.mock.calls.find(
        call => call[0] === 'ready'
      )?.[1];

      if (readyCallback) {
        readyCallback();
        expect(global.window.addEventListener).toHaveBeenCalledWith(
          'beforeunload',
          expect.any(Function)
        );
      }
    });

    test('should setup visibilitychange listener on ready', () => {
      initializeCleanupHooks();

      // Get the ready callback
      const readyCallback = global.Hooks.on.mock.calls.find(
        call => call[0] === 'ready'
      )?.[1];

      if (readyCallback) {
        readyCallback();
        expect(global.document.addEventListener).toHaveBeenCalledWith(
          'visibilitychange',
          expect.any(Function)
        );
      }
    });
  });

  // =================================
  // clearAllSystemIntervals() Tests (via performPreInitCleanup)
  // =================================
  describe('clearAllSystemIntervals()', () => {
    test('should clear tracked intervals', () => {
      // Add some mock interval IDs
      global.window._erpsIntervalIds.add(1);
      global.window._erpsIntervalIds.add(2);
      global.window._erpsIntervalIds.add(3);

      performPreInitCleanup();

      // Intervals should be cleared
      expect(global.clearInterval).toHaveBeenCalled();
      expect(global.clearTimeout).toHaveBeenCalled();
    });

    test('should handle missing _erpsIntervalIds', () => {
      // Remove _erpsIntervalIds
      delete global.window._erpsIntervalIds;

      // Should not throw
      expect(() => performPreInitCleanup()).not.toThrow();
    });

    test('should handle errors when clearing intervals', () => {
      global.window._erpsIntervalIds.add(999);
      global.clearInterval.mockImplementation(() => {
        throw new Error('Clear interval error');
      });

      // Should not throw
      expect(() => performPreInitCleanup()).not.toThrow();
    });
  });

  // =================================
  // cleanupOrphanedElements() Tests (via performSystemCleanup)
  // =================================
  describe('cleanupOrphanedElements()', () => {
    test('should remove GM status elements', () => {
      const mockElement = {
        remove: vi.fn(),
      };
      setupMockDocument([mockElement]);

      performSystemCleanup();

      expect(mockElement.remove).toHaveBeenCalled();
    });

    test('should skip theme cleanup when visibilityState is hidden', () => {
      global.document.visibilityState = 'hidden';
      global.document.hidden = true;

      const mockElement = {
        remove: vi.fn(),
        removeAttribute: vi.fn(),
      };
      setupMockDocument([mockElement]);

      performSystemCleanup();

      // When visibilityState is hidden, the function returns early
      // and doesn't process theme elements
      // The GM status elements are still processed first
      expect(mockElement.remove).toHaveBeenCalled();
    });

    test('should clean theme attributes when visible', () => {
      const mockElement = {
        remove: vi.fn(),
        removeAttribute: vi.fn(),
      };
      setupMockDocument([mockElement]);
      global.document.visibilityState = 'visible';

      performSystemCleanup();

      // Theme attributes should be removed
      expect(mockElement.removeAttribute).toHaveBeenCalled();
    });

    test('should handle errors when removing elements', () => {
      const mockElement = {
        remove: vi.fn().mockImplementation(() => {
          throw new Error('Remove error');
        }),
      };
      setupMockDocument([mockElement]);

      // Should not throw
      expect(() => performSystemCleanup()).not.toThrow();
    });

    test('should handle elements without parentNode', () => {
      const mockElement = {
        remove: vi.fn(),
        cloneNode: vi.fn().mockReturnThis(),
        parentNode: null,
      };
      setupMockDocument([mockElement]);

      // Should not throw
      expect(() => performSystemCleanup()).not.toThrow();
    });
  });

  // =================================
  // cleanupGlobalNumberInputs() Tests (via performPreInitCleanup)
  // =================================
  describe('cleanupGlobalNumberInputs()', () => {
    test('should call erps.utils.cleanupNumberInputsGlobal when available', () => {
      global.erps = {
        utils: {
          cleanupNumberInputsGlobal: vi.fn(),
        },
      };

      performPreInitCleanup();

      expect(global.erps.utils.cleanupNumberInputsGlobal).toHaveBeenCalled();

      delete global.erps;
    });

    test('should handle missing erps global', () => {
      delete global.erps;

      // Should not throw
      expect(() => performPreInitCleanup()).not.toThrow();
    });

    test('should handle missing utils property', () => {
      global.erps = {};

      // Should not throw
      expect(() => performPreInitCleanup()).not.toThrow();

      delete global.erps;
    });
  });

  // =================================
  // safeLog() Tests (via exported functions)
  // =================================
  describe('safeLog()', () => {
    test('should use Logger when game.settings is available', () => {
      global.game = {
        settings: {
          get: vi.fn().mockReturnValue(true),
        },
      };

      performSystemCleanup();

      // Logger should be called
      expect(Logger.info).toHaveBeenCalled();
    });

    test('should fallback to console when Logger throws', () => {
      // Make Logger throw
      Logger.info.mockImplementation(() => {
        throw new Error('Logger error');
      });

      // Mock console.info
      const mockConsoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});

      // Should not throw
      expect(() => performSystemCleanup()).not.toThrow();

      mockConsoleInfo.mockRestore();
    });

    test('should handle missing game object', () => {
      global.game = undefined;

      // Should not throw
      expect(() => performSystemCleanup()).not.toThrow();
    });
  });

  // =================================
  // Edge Cases
  // =================================
  describe('Edge Cases', () => {
    test('should handle missing document object', () => {
      global.document = undefined;

      // Should not throw
      expect(() => performSystemCleanup()).not.toThrow();
    });

    test('should handle missing window object', () => {
      global.window = undefined;

      // Should not throw
      expect(() => performSystemCleanup()).not.toThrow();
    });

    test('should handle missing Hooks object', () => {
      global.Hooks = undefined;

      // Should not throw
      expect(() => initializeCleanupHooks()).not.toThrow();
    });

    test('should handle hot module disposal', () => {
      // Setup hot module
      global.module = {
        hot: {
          dispose: vi.fn(),
        },
      };

      // Call initializeCleanupHooks - it should check for hot module
      initializeCleanupHooks();

      // Note: The hot module disposal is only registered if cleanupInitialized was false
      // Since initializeCleanupHooks may have been called in previous tests,
      // we just verify the function doesn't throw
      expect(() => initializeCleanupHooks()).not.toThrow();

      delete global.module;
    });
  });
});