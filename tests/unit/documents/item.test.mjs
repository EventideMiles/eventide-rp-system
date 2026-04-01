// @ts-nocheck
/**
 * @fileoverview Tests for EventideRpSystemItem - Main item document class
 *
 * Tests the core item document functionality including data preparation,
 * roll data generation, capability checks, and utility methods.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock the dependencies first
const mockLogger = {
  methodEntry: vi.fn(),
  methodExit: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};

const mockGetSetting = vi.fn();

// Mock the module imports
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: mockLogger
}));

vi.mock('../../../module/services/_module.mjs', () => ({
  getSetting: mockGetSetting
}));

// Mock the mixins module - each mixin returns the class unchanged
vi.mock('../../../module/documents/mixins/_module.mjs', () => ({
  ItemRollsMixin: (BaseClass) => BaseClass,
  ItemPopupsMixin: (BaseClass) => BaseClass,
  ItemUtilitiesMixin: (BaseClass) => BaseClass,
  ItemActionCardMixin: (BaseClass) => BaseClass,
  ItemActionCardExecutionMixin: (BaseClass) => BaseClass
}));

// Mock the global Item class from Foundry VTT
global.Item = class MockItem {
  constructor(data = {}, _options = {}) {
    this.id = data._id || 'test-item-id';
    this.name = data.name || 'Test Item';
    this.type = data.type || 'gear';
    this.system = data.system || {};
    this.actor = data.actor || null;
    this.effects = data.effects || { size: 0, contents: [] };
    this.parent = data.parent || null;
  }

  prepareData() {
    // Mock implementation
  }

  getRollData() {
    return { ...this.system };
  }
};

// Import the item class after mocking dependencies
const { EventideRpSystemItem } = await import('../../../module/documents/item.mjs');

describe('EventideRpSystemItem', () => {
  let item;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSetting.mockReturnValue(false); // testingMode off by default
  });

  describe('prepareData()', () => {
    test('should exist as a method', () => {
      item = new EventideRpSystemItem();
      
      expect(typeof item.prepareData).toBe('function');
    });

    test('should call super.prepareData()', () => {
      item = new EventideRpSystemItem();
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { quantity: 1 };

      // Should not throw when called
      expect(() => item.prepareData()).not.toThrow();
    });

    test('should log debug message when testingMode is enabled', () => {
      mockGetSetting.mockReturnValue(true); // testingMode on
      
      item = new EventideRpSystemItem();
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { quantity: 1 };

      item.prepareData();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Prepared data for item',
        expect.objectContaining({
          itemName: 'Test Item',
          itemType: 'gear',
          hasSystem: true
        }),
        'ITEM_DATA'
      );
    });

    test('should not log when testingMode is disabled', () => {
      mockGetSetting.mockReturnValue(false);
      
      item = new EventideRpSystemItem();
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { quantity: 1 };

      item.prepareData();

      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('getRollData()', () => {
    test('should exist as a method', () => {
      item = new EventideRpSystemItem();
      
      expect(typeof item.getRollData).toBe('function');
    });

    test('should return system data when no parent actor', () => {
      item = new EventideRpSystemItem();
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { quantity: 1, weight: 5 };
      item.actor = null;

      const rollData = item.getRollData();

      expect(rollData).toEqual({ quantity: 1, weight: 5 });
    });

    test('should include actor roll data when parent actor exists', () => {
      item = new EventideRpSystemItem();
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { quantity: 1 };
      item.actor = {
        getRollData: vi.fn().mockReturnValue({ 
          abilities: { acro: { total: 5 } },
          level: 3
        })
      };

      const rollData = item.getRollData();

      expect(rollData.quantity).toBe(1);
      expect(rollData.actor).toEqual({ 
        abilities: { acro: { total: 5 } },
        level: 3
      });
    });

    test('should return fallback data on error', () => {
      item = new EventideRpSystemItem();
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { quantity: 1 };
      
      // Create a circular reference to cause an error in spread
      item.actor = {
        getRollData: vi.fn().mockImplementation(() => {
          throw new Error('Actor error');
        })
      };

      const rollData = item.getRollData();

      expect(rollData).toEqual({ quantity: 1 });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should log debug message when testingMode is enabled and no actor', () => {
      mockGetSetting.mockReturnValue(true);
      
      item = new EventideRpSystemItem();
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { quantity: 1 };
      item.actor = null;

      item.getRollData();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No parent actor found for item roll data',
        { itemName: 'Test Item' },
        'ITEM_DATA'
      );
    });
  });

  describe('getItemSummary()', () => {
    test('should exist as a method', () => {
      item = new EventideRpSystemItem();
      
      expect(typeof item.getItemSummary).toBe('function');
    });

    test('should call getSummary and return its result', () => {
      item = new EventideRpSystemItem();
      item.name = 'Test Item';
      item.type = 'gear';
      
      // Mock the getSummary method from utilities mixin
      item.getSummary = vi.fn().mockReturnValue({
        name: 'Test Item',
        type: 'gear',
        quantity: 1
      });

      const result = item.getItemSummary();

      expect(item.getSummary).toHaveBeenCalled();
      expect(result).toEqual({
        name: 'Test Item',
        type: 'gear',
        quantity: 1
      });
    });
  });

  describe('hasCapability()', () => {
    test('should exist as a method', () => {
      item = new EventideRpSystemItem();
      
      expect(typeof item.hasCapability).toBe('function');
    });

    test('should return result of canRoll for "roll" capability', () => {
      item = new EventideRpSystemItem();
      item.canRoll = vi.fn().mockReturnValue(true);

      const result = item.hasCapability('roll');

      expect(item.canRoll).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should return result of hasPopupSupport for "popup" capability', () => {
      item = new EventideRpSystemItem();
      item.hasPopupSupport = vi.fn().mockReturnValue(true);

      const result = item.hasCapability('popup');

      expect(item.hasPopupSupport).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should return result of hasQuantity for "quantity" capability', () => {
      item = new EventideRpSystemItem();
      item.hasQuantity = vi.fn().mockReturnValue(true);

      const result = item.hasCapability('quantity');

      expect(item.hasQuantity).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should return true for "effects" capability when item has effects', () => {
      item = new EventideRpSystemItem();
      item.effects = { size: 2 };

      const result = item.hasCapability('effects');

      expect(result).toBe(true);
    });

    test('should return false for "effects" capability when item has no effects', () => {
      item = new EventideRpSystemItem();
      item.effects = { size: 0 };

      const result = item.hasCapability('effects');

      expect(result).toBe(false);
    });

    test('should return false and log warning for unknown capability', () => {
      item = new EventideRpSystemItem();

      const result = item.hasCapability('unknownCapability');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unknown capability check: unknownCapability',
        null,
        'ITEM'
      );
    });
  });

  describe('getDisplayIcon()', () => {
    test('should exist as a method', () => {
      item = new EventideRpSystemItem();
      
      expect(typeof item.getDisplayIcon).toBe('function');
    });

    test('should return correct icon for gear type', () => {
      item = new EventideRpSystemItem();
      item.type = 'gear';

      const icon = item.getDisplayIcon();

      expect(icon).toBe('fa-solid fa-shield');
    });

    test('should return correct icon for combatPower type', () => {
      item = new EventideRpSystemItem();
      item.type = 'combatPower';

      const icon = item.getDisplayIcon();

      expect(icon).toBe('fa-solid fa-bolt');
    });

    test('should return correct icon for feature type', () => {
      item = new EventideRpSystemItem();
      item.type = 'feature';

      const icon = item.getDisplayIcon();

      expect(icon).toBe('fa-solid fa-star');
    });

    test('should return correct icon for status type', () => {
      item = new EventideRpSystemItem();
      item.type = 'status';

      const icon = item.getDisplayIcon();

      expect(icon).toBe('fa-solid fa-circle-info');
    });

    test('should return correct icon for transformation type', () => {
      item = new EventideRpSystemItem();
      item.type = 'transformation';

      const icon = item.getDisplayIcon();

      expect(icon).toBe('fa-solid fa-exchange-alt');
    });

    test('should return default icon for unknown type', () => {
      item = new EventideRpSystemItem();
      item.type = 'unknownType';

      const icon = item.getDisplayIcon();

      expect(icon).toBe('fa-solid fa-question');
    });
  });

  describe('getSortPriority()', () => {
    test('should exist as a method', () => {
      item = new EventideRpSystemItem();
      
      expect(typeof item.getSortPriority).toBe('function');
    });

    test('should return priority 1 for combatPower type', () => {
      item = new EventideRpSystemItem();
      item.type = 'combatPower';

      expect(item.getSortPriority()).toBe(1);
    });

    test('should return priority 2 for gear type', () => {
      item = new EventideRpSystemItem();
      item.type = 'gear';

      expect(item.getSortPriority()).toBe(2);
    });

    test('should return priority 3 for feature type', () => {
      item = new EventideRpSystemItem();
      item.type = 'feature';

      expect(item.getSortPriority()).toBe(3);
    });

    test('should return priority 4 for transformation type', () => {
      item = new EventideRpSystemItem();
      item.type = 'transformation';

      expect(item.getSortPriority()).toBe(4);
    });

    test('should return priority 5 for status type', () => {
      item = new EventideRpSystemItem();
      item.type = 'status';

      expect(item.getSortPriority()).toBe(5);
    });

    test('should return default priority 999 for unknown type', () => {
      item = new EventideRpSystemItem();
      item.type = 'unknownType';

      expect(item.getSortPriority()).toBe(999);
    });
  });
});
