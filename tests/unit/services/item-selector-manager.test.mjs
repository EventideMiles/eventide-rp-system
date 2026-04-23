// @ts-nocheck
/**
 * @fileoverview Tests for ItemSelectorManager Service
 *
 * Unit tests for ItemSelectorManager service which provides centralized
 * management for item selector combo boxes in item sheets.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock dependencies before import - vi.mock is hoisted to top
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../../module/ui/components/item-selector-combo-box.mjs', () => ({
  ItemSelectorComboBox: vi.fn().mockImplementation((config) => ({
    destroy: vi.fn(),
    config
  }))
}));

vi.mock('../../../module/helpers/item-source-collector.mjs', () => ({
  ItemSourceCollector: {
    getActionItemTypes: vi.fn(() => ['feature', 'combatPower']),
    getEffectItemTypes: vi.fn(() => ['status', 'feature'])
  }
}));

// Import the service after setting up mocks
import { ItemSelectorManager } from '../../../module/services/item-selector-manager.mjs';

// Import the mocks to get spy references for assertions
import { Logger } from '../../../module/services/logger.mjs';
import { ItemSelectorComboBox } from '../../../module/ui/components/item-selector-combo-box.mjs';
import { ItemSourceCollector } from '../../../module/helpers/item-source-collector.mjs';

describe('ItemSelectorManager', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up mock game and ui globals
    global.game = { 
      i18n: { 
        localize: vi.fn((key) => `Localized: ${key}`) 
      } 
    };
    global.ui = { notifications: { error: vi.fn() } };
  });

  // ==========================================
  // Static Properties Tests
  // ==========================================

  describe('SELECTOR_CONFIGS', () => {
    describe('action-item config', () => {
      test('should have correct handlerName', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['action-item'];
        expect(config.handlerName).toBe('_onActionItemSelected');
      });

      test('should have correct placeholderKey', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['action-item'];
        expect(config.placeholderKey).toBe('EVENTIDE_RP_SYSTEM.Forms.ActionItemSelector.Placeholder');
      });

      test('should have correct selectorType', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['action-item'];
        expect(config.selectorType).toBe('action-item');
      });

      test('should not have itemTypeFilter', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['action-item'];
        expect(config.itemTypeFilter).toBeUndefined();
      });

      test('should have itemTypes as a function', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['action-item'];
        expect(typeof config.itemTypes).toBe('function');
      });
    });

    describe('effects config', () => {
      test('should have correct handlerName', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['effects'];
        expect(config.handlerName).toBe('_onEffectSelected');
      });

      test('should have correct placeholderKey', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['effects'];
        expect(config.placeholderKey).toBe('EVENTIDE_RP_SYSTEM.Forms.EffectsSelector.Placeholder');
      });

      test('should have correct selectorType', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['effects'];
        expect(config.selectorType).toBe('effects');
      });

      test('should not have itemTypeFilter', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['effects'];
        expect(config.itemTypeFilter).toBeUndefined();
      });
    });

    describe('transformations config', () => {
      test('should have correct handlerName', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['transformations'];
        expect(config.handlerName).toBe('_onTransformationSelected');
      });

      test('should have itemTypes as array', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['transformations'];
        expect(config.itemTypes).toEqual(['transformation']);
      });
    });

    describe('combat-powers config', () => {
      test('should have correct handlerName', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['combat-powers'];
        expect(config.handlerName).toBe('_onCombatPowerSelected');
      });

      test('should have itemTypeFilter set to transformation', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['combat-powers'];
        expect(config.itemTypeFilter).toBe('transformation');
      });

      test('should have itemTypes as array', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['combat-powers'];
        expect(config.itemTypes).toEqual(['combatPower']);
      });
    });

    describe('action-cards config', () => {
      test('should have correct handlerName', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['action-cards'];
        expect(config.handlerName).toBe('_onActionCardSelected');
      });

      test('should have itemTypeFilter set to transformation', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['action-cards'];
        expect(config.itemTypeFilter).toBe('transformation');
      });

      test('should have itemTypes as array', () => {
        const config = ItemSelectorManager.SELECTOR_CONFIGS['action-cards'];
        expect(config.itemTypes).toEqual(['actionCard']);
      });
    });
  });

  // ==========================================
  // _toCamelCase() Tests
  // ==========================================

  describe('_toCamelCase()', () => {
    test('should convert kebab-case to camelCase', () => {
      expect(ItemSelectorManager._toCamelCase('action-item')).toBe('actionItem');
    });

    test('should handle single word', () => {
      expect(ItemSelectorManager._toCamelCase('effects')).toBe('effects');
    });

    test('should handle multiple hyphens', () => {
      expect(ItemSelectorManager._toCamelCase('combat-powers-list')).toBe('combatPowersList');
    });

    test('should handle empty string', () => {
      expect(ItemSelectorManager._toCamelCase('')).toBe('');
    });

    test('should handle already camelCase', () => {
      expect(ItemSelectorManager._toCamelCase('alreadyCamel')).toBe('alreadyCamel');
    });

    test('should handle hyphen at end', () => {
      expect(ItemSelectorManager._toCamelCase('test-')).toBe('test-');
    });
  });

  // ==========================================
  // getSelectorConfig() Tests
  // ==========================================

  describe('getSelectorConfig()', () => {
    test('should return config for valid selector type', () => {
      const config = ItemSelectorManager.getSelectorConfig('action-item');
      expect(config).toBeDefined();
      expect(config.handlerName).toBe('_onActionItemSelected');
    });

    test('should return config for effects selector type', () => {
      const config = ItemSelectorManager.getSelectorConfig('effects');
      expect(config).toBeDefined();
      expect(config.handlerName).toBe('_onEffectSelected');
    });

    test('should return undefined for invalid selector type', () => {
      const config = ItemSelectorManager.getSelectorConfig('invalid-type');
      expect(config).toBeUndefined();
    });

    test('should return undefined for empty string', () => {
      const config = ItemSelectorManager.getSelectorConfig('');
      expect(config).toBeUndefined();
    });
  });

  // ==========================================
  // getAvailableSelectorTypes() Tests
  // ==========================================

  describe('getAvailableSelectorTypes()', () => {
    test('should return array of selector type keys', () => {
      const types = ItemSelectorManager.getAvailableSelectorTypes();
      expect(Array.isArray(types)).toBe(true);
    });

    test('should include action-item type', () => {
      const types = ItemSelectorManager.getAvailableSelectorTypes();
      expect(types).toContain('action-item');
    });

    test('should include effects type', () => {
      const types = ItemSelectorManager.getAvailableSelectorTypes();
      expect(types).toContain('effects');
    });

    test('should include transformations type', () => {
      const types = ItemSelectorManager.getAvailableSelectorTypes();
      expect(types).toContain('transformations');
    });

    test('should include combat-powers type', () => {
      const types = ItemSelectorManager.getAvailableSelectorTypes();
      expect(types).toContain('combat-powers');
    });

    test('should include action-cards type', () => {
      const types = ItemSelectorManager.getAvailableSelectorTypes();
      expect(types).toContain('action-cards');
    });

    test('should return exactly 5 selector types', () => {
      const types = ItemSelectorManager.getAvailableSelectorTypes();
      expect(types).toHaveLength(5);
    });
  });

  // ==========================================
  // createHandler() Tests
  // ==========================================

  describe('createHandler()', () => {
    test('should return a function', () => {
      const sheet = {};
      const handler = ItemSelectorManager.createHandler(sheet, '_onTest');
      expect(typeof handler).toBe('function');
    });

    test('should call sheet handler method when invoked', async () => {
      const sheet = {
        _onTest: vi.fn()
      };
      const handler = ItemSelectorManager.createHandler(sheet, '_onTest');
      const droppedItem = { id: 'test-id', name: 'Test Item' };
      
      await handler(droppedItem);
      
      expect(sheet._onTest).toHaveBeenCalledWith(droppedItem);
    });

    test('should handle async handler methods', async () => {
      const sheet = {
        _onTest: vi.fn().mockResolvedValue('result')
      };
      const handler = ItemSelectorManager.createHandler(sheet, '_onTest');
      
      await handler({ id: 'test' });
      
      expect(sheet._onTest).toHaveBeenCalled();
    });

    test('should log warning when handler method not found', async () => {
      const sheet = {};
      const handler = ItemSelectorManager.createHandler(sheet, '_onMissing');
      
      await handler({ id: 'test' });
      
      expect(Logger.warn).toHaveBeenCalledWith(
        'Handler method not found: _onMissing',
        expect.objectContaining({ sheet, handlerName: '_onMissing' }),
        'ItemSelectorManager'
      );
    });

    test('should catch and log errors from handler', async () => {
      const sheet = {
        _onTest: vi.fn().mockImplementation(() => {
          throw new Error('Test error');
        })
      };
      const handler = ItemSelectorManager.createHandler(sheet, '_onTest');
      
      await handler({ id: 'test' });
      
      expect(Logger.error).toHaveBeenCalledWith(
        'Error in selector handler: _onTest',
        expect.any(Error),
        'ItemSelectorManager'
      );
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });
  });

  // ==========================================
  // initializeSelectors() Tests
  // ==========================================

  describe('initializeSelectors()', () => {
    let mockSheet;
    let mockContainer;
    let mockElement;

    beforeEach(() => {
      // Create mock container
      mockContainer = {};

      // Create mock element with querySelector
      mockElement = {
        querySelector: vi.fn()
      };

      // Create mock sheet
      mockSheet = {
        item: { type: 'transformation' },
        element: mockElement,
        _setPrivate: vi.fn()
      };
      
      // Reset mock implementation for each test
      ItemSelectorComboBox.mockImplementation((config) => ({
        destroy: vi.fn(),
        config
      }));
    });

    test('should return empty object for empty selectorTypes array', () => {
      const result = ItemSelectorManager.initializeSelectors(mockSheet, []);
      expect(result).toEqual({});
    });

    test('should skip unknown selector types', () => {
      const result = ItemSelectorManager.initializeSelectors(mockSheet, ['unknown-type']);
      
      expect(Logger.warn).toHaveBeenCalledWith(
        'Unknown selector type: unknown-type',
        null,
        'ItemSelectorManager'
      );
      expect(result).toEqual({});
    });

    test('should skip selector when container not found', () => {
      mockElement.querySelector.mockReturnValue(null);
      
      const result = ItemSelectorManager.initializeSelectors(mockSheet, ['action-item']);
      
      expect(Logger.debug).toHaveBeenCalledWith(
        'Container not found for selector: action-item',
        null,
        'ItemSelectorManager'
      );
      expect(result).toEqual({});
    });

    test('should skip selector when itemTypeFilter does not match', () => {
      mockSheet.item.type = 'feature'; // Not 'transformation'
      mockElement.querySelector.mockReturnValue(mockContainer);
      
      const result = ItemSelectorManager.initializeSelectors(mockSheet, ['combat-powers']);
      
      // combat-powers has itemTypeFilter: 'transformation', so it should be skipped
      expect(result).toEqual({});
    });

    test('should initialize selector when itemTypeFilter matches', () => {
      mockSheet.item.type = 'transformation';
      mockElement.querySelector.mockReturnValue(mockContainer);
      
      const result = ItemSelectorManager.initializeSelectors(mockSheet, ['combat-powers']);
      
      expect(ItemSelectorComboBox).toHaveBeenCalled();
      expect(result['combat-powers']).toBeDefined();
    });

    test('should initialize selector without itemTypeFilter', () => {
      mockElement.querySelector.mockReturnValue(mockContainer);
      
      const result = ItemSelectorManager.initializeSelectors(mockSheet, ['action-item']);
      
      expect(ItemSelectorComboBox).toHaveBeenCalled();
      expect(result['action-item']).toBeDefined();
    });

    test('should call itemTypes function when it is a function', () => {
      mockElement.querySelector.mockReturnValue(mockContainer);
      
      ItemSelectorManager.initializeSelectors(mockSheet, ['action-item']);
      
      expect(ItemSourceCollector.getActionItemTypes).toHaveBeenCalled();
    });

    test('should use itemTypes array directly when not a function', () => {
      mockElement.querySelector.mockReturnValue(mockContainer);
      
      ItemSelectorManager.initializeSelectors(mockSheet, ['transformations']);
      
      // transformations has itemTypes as array ['transformation']
      expect(ItemSelectorComboBox).toHaveBeenCalledWith(
        expect.objectContaining({
          itemTypes: ['transformation']
        })
      );
    });

    test('should call _setPrivate when available', () => {
      mockElement.querySelector.mockReturnValue(mockContainer);
      
      ItemSelectorManager.initializeSelectors(mockSheet, ['action-item']);
      
      expect(mockSheet._setPrivate).toHaveBeenCalledWith('#actionItemSelector', expect.anything());
    });

    test('should not call _setPrivate when not a function', () => {
      mockSheet._setPrivate = 'not a function';
      mockElement.querySelector.mockReturnValue(mockContainer);
      
      // Should not throw
      const result = ItemSelectorManager.initializeSelectors(mockSheet, ['action-item']);
      
      expect(result['action-item']).toBeDefined();
    });

    test('should initialize multiple selectors', () => {
      mockElement.querySelector.mockReturnValue(mockContainer);
      
      const result = ItemSelectorManager.initializeSelectors(mockSheet, ['action-item', 'effects']);
      
      expect(ItemSelectorComboBox).toHaveBeenCalledTimes(2);
      expect(result['action-item']).toBeDefined();
      expect(result['effects']).toBeDefined();
    });

    test('should log error on initialization failure', () => {
      // Make ItemSelectorComboBox throw an error
      ItemSelectorComboBox.mockImplementationOnce(() => {
        throw new Error('Init error');
      });
      
      mockElement.querySelector.mockReturnValue(mockContainer);
      
      const result = ItemSelectorManager.initializeSelectors(mockSheet, ['action-item']);
      
      expect(Logger.error).toHaveBeenCalledWith(
        'Failed to initialize item selectors',
        expect.any(Error),
        'ItemSelectorManager'
      );
      expect(result).toEqual({});
    });
  });

  // ==========================================
  // cleanupSelectors() Tests
  // ==========================================

  describe('cleanupSelectors()', () => {
    let mockSheet;
    let mockSelector;

    beforeEach(() => {
      mockSheet = {
        _setPrivate: vi.fn()
      };
      mockSelector = {
        destroy: vi.fn()
      };
    });

    test('should call destroy on each selector', () => {
      const selectors = {
        'action-item': mockSelector,
        'effects': mockSelector
      };
      
      ItemSelectorManager.cleanupSelectors(mockSheet, selectors);
      
      expect(mockSelector.destroy).toHaveBeenCalledTimes(2);
    });

    test('should call _setPrivate to clear private fields', () => {
      const selectors = {
        'action-item': mockSelector
      };
      
      ItemSelectorManager.cleanupSelectors(mockSheet, selectors);
      
      expect(mockSheet._setPrivate).toHaveBeenCalledWith('#actionItemSelector', null);
    });

    test('should handle empty selectors object', () => {
      ItemSelectorManager.cleanupSelectors(mockSheet, {});
      
      expect(Logger.debug).toHaveBeenCalledWith(
        'Cleaned up item selectors',
        { count: 0 },
        'ItemSelectorManager'
      );
    });

    test('should handle selector without destroy method', () => {
      const selectors = {
        'action-item': {} // No destroy method
      };
      
      // Should not throw
      ItemSelectorManager.cleanupSelectors(mockSheet, selectors);
    });

    test('should handle null selector', () => {
      const selectors = {
        'action-item': null
      };
      
      // Should not throw
      ItemSelectorManager.cleanupSelectors(mockSheet, selectors);
    });

    test('should handle sheet without _setPrivate method', () => {
      const sheetWithoutMethod = {};
      const selectors = {
        'action-item': mockSelector
      };
      
      // Should not throw
      ItemSelectorManager.cleanupSelectors(sheetWithoutMethod, selectors);
      
      expect(mockSelector.destroy).toHaveBeenCalled();
    });

    test('should log warning on cleanup error', () => {
      const errorSelector = {
        destroy: vi.fn().mockImplementation(() => {
          throw new Error('Cleanup error');
        })
      };
      
      ItemSelectorManager.cleanupSelectors(mockSheet, { 'action-item': errorSelector });
      
      expect(Logger.warn).toHaveBeenCalledWith(
        'Error cleaning up item selectors',
        expect.any(Error),
        'ItemSelectorManager'
      );
    });

    test('should convert selector type to camelCase for private field', () => {
      const selectors = {
        'combat-powers': mockSelector
      };
      
      ItemSelectorManager.cleanupSelectors(mockSheet, selectors);
      
      expect(mockSheet._setPrivate).toHaveBeenCalledWith('#combatPowersSelector', null);
    });
  });
});