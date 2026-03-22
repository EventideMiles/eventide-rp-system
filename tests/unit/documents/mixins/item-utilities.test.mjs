// @ts-nocheck
/**
 * @fileoverview Tests for ItemUtilitiesMixin - General utility functionality for items
 *
 * Tests quantity management, data serialization, validation, and display name formatting.
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

const mockErrorHandler = {
  handleDocumentOperation: vi.fn(async (promise, _operation, _context) => {
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
  ERROR_TYPES: {
    UI: 'ui',
    VALIDATION: 'validation',
    DATA: 'data',
    FOUNDRY_API: 'foundry-api'
  }
};

// Mock the module imports - must match the actual import paths in the source
vi.mock('../../../../module/services/logger.mjs', () => ({
  Logger: mockLogger
}));

vi.mock('../../../../module/utils/error-handler.mjs', () => ({
  ErrorHandler: mockErrorHandler
}));

// Import the mixin after mocking dependencies
const { ItemUtilitiesMixin } = await import('../../../../module/documents/mixins/item-utilities.mjs');

// Create a test class that uses the mixin
class TestItemClass {
  constructor(options = {}) {
    this.type = options.type || 'gear';
    this.name = options.name || 'Test Item';
    this.id = options.id || 'test-id';
    this.system = options.system || {};
    this.effects = options.effects || { size: 0, contents: [] };
    this.actor = options.actor || null;
    this._rollData = options._rollData || null;
  }

  getRollData() {
    return this._rollData || {};
  }

  canRoll() {
    return false;
  }

  getRollType() {
    return 'none';
  }

  getRollAbility() {
    return null;
  }

  hasPopupSupport() {
    return false;
  }

  getPopupType() {
    return null;
  }

  async update(data) {
    // Simulate Foundry's update method
    if (data['system.quantity'] !== undefined) {
      this.system.quantity = data['system.quantity'];
    }
    return this;
  }
}

const MixedClass = ItemUtilitiesMixin(TestItemClass);

describe('ItemUtilitiesMixin', () => {
  let item;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create fresh item instance
    item = new MixedClass();
  });

  describe('toPlainObject()', () => {
    test('should convert item to plain object with basic properties', () => {
      item.name = 'Sword';
      item.type = 'gear';
      item.id = 'item-123';
      item.system = { quantity: 5, weight: 3 };

      const result = item.toPlainObject();

      expect(result.name).toBe('Sword');
      expect(result.type).toBe('gear');
      expect(result.id).toBe('item-123');
      expect(result.system).toEqual({ quantity: 5, weight: 3 });
    });

    test('should use system.toPlainObject when available', () => {
      item.system = {
        quantity: 10,
        toPlainObject: vi.fn(() => ({ quantity: 10, custom: 'data' }))
      };

      const result = item.toPlainObject();

      expect(item.system.toPlainObject).toHaveBeenCalled();
      expect(result.system).toEqual({ quantity: 10, custom: 'data' });
    });

    test('should include effects when present', () => {
      item.effects = {
        size: 2,
        contents: [{ id: 'effect-1' }, { id: 'effect-2' }]
      };

      const result = item.toPlainObject();

      expect(result.effects).toHaveLength(2);
      expect(result.effects).toEqual([{ id: 'effect-1' }, { id: 'effect-2' }]);
    });

    test('should return empty effects array when no effects', () => {
      item.effects = { size: 0, contents: [] };

      const result = item.toPlainObject();

      expect(result.effects).toEqual([]);
    });

    test('should return fallback object on error', () => {
      // Create an item that will throw on spread
      item = new MixedClass();
      // Make system.toPlainObject throw to trigger the catch block
      item.system = {
        get toPlainObject() {
          throw new Error('Test error');
        }
      };

      const result = item.toPlainObject();

      expect(result.name).toBe('Test Item');
      expect(result.type).toBe('gear');
      expect(result.system).toEqual({});
      expect(result.effects).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('addQuantity()', () => {
    test('should add to quantity successfully', async () => {
      item.type = 'gear';
      item.system = { quantity: 5 };

      const result = await item.addQuantity(3);

      expect(result.system.quantity).toBe(8);
      expect(mockErrorHandler.handleDocumentOperation).toHaveBeenCalled();
    });

    test('should subtract from quantity successfully', async () => {
      item.type = 'gear';
      item.system = { quantity: 10 };

      const result = await item.addQuantity(-3);

      expect(result.system.quantity).toBe(7);
    });

    test('should not allow negative quantities', async () => {
      item.type = 'gear';
      item.system = { quantity: 2 };

      const result = await item.addQuantity(-5);

      expect(result.system.quantity).toBe(0);
    });

    test('should throw error for non-number value', async () => {
      await expect(item.addQuantity('five')).rejects.toThrow('Invalid quantity value');
    });

    test('should throw error for NaN value', async () => {
      await expect(item.addQuantity(NaN)).rejects.toThrow('Invalid quantity value');
    });

    test('should throw error for Infinity value', async () => {
      await expect(item.addQuantity(Infinity)).rejects.toThrow('Invalid quantity value');
    });

    test('should return this if item does not support quantity', async () => {
      item.type = 'combatPower';
      item.system = {};

      const result = await item.addQuantity(5);

      expect(result).toBe(item);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Attempted to modify quantity on item that doesn\'t support it',
        expect.any(Object),
        'ITEM_UTILITIES'
      );
    });

    test('should return this on update error', async () => {
      item.type = 'gear';
      item.system = { quantity: 5 };
      
      mockErrorHandler.handleDocumentOperation.mockResolvedValueOnce([null, new Error('Update failed')]);

      const result = await item.addQuantity(3);

      expect(result).toBe(item);
    });

    test('should handle missing quantity gracefully', async () => {
      item.type = 'gear';
      item.system = {};

      const result = await item.addQuantity(5);

      expect(result.system.quantity).toBe(5);
    });
  });

  describe('setQuantity()', () => {
    test('should set quantity to specific value', async () => {
      item.type = 'gear';
      item.system = { quantity: 5 };

      const result = await item.setQuantity(10);

      expect(result.system.quantity).toBe(10);
    });

    test('should throw error for negative quantity', async () => {
      await expect(item.setQuantity(-1)).rejects.toThrow('Invalid quantity value');
    });

    test('should throw error for non-number value', async () => {
      await expect(item.setQuantity('ten')).rejects.toThrow('Invalid quantity value');
    });

    test('should throw error for NaN value', async () => {
      await expect(item.setQuantity(NaN)).rejects.toThrow('Invalid quantity value');
    });

    test('should set quantity to zero', async () => {
      item.type = 'gear';
      item.system = { quantity: 10 };

      const result = await item.setQuantity(0);

      expect(result.system.quantity).toBe(0);
    });

    test('should use addQuantity internally', async () => {
      item.type = 'gear';
      item.system = { quantity: 5 };
      
      const addQuantitySpy = vi.spyOn(item, 'addQuantity');

      await item.setQuantity(10);

      expect(addQuantitySpy).toHaveBeenCalledWith(5);
    });
  });

  describe('hasQuantity()', () => {
    test('should return true for gear type', () => {
      item.type = 'gear';

      expect(item.hasQuantity()).toBe(true);
    });

    test('should return false for combatPower type', () => {
      item.type = 'combatPower';

      expect(item.hasQuantity()).toBe(false);
    });

    test('should return false for feature type', () => {
      item.type = 'feature';

      expect(item.hasQuantity()).toBe(false);
    });

    test('should return false for status type', () => {
      item.type = 'status';

      expect(item.hasQuantity()).toBe(false);
    });

    test('should return false for transformation type', () => {
      item.type = 'transformation';

      expect(item.hasQuantity()).toBe(false);
    });

    test('should return false for unknown types', () => {
      item.type = 'unknownType';

      expect(item.hasQuantity()).toBe(false);
    });
  });

  describe('getQuantity()', () => {
    test('should return quantity when item supports it', () => {
      item.type = 'gear';
      item.system = { quantity: 15 };

      expect(item.getQuantity()).toBe(15);
    });

    test('should return 0 when quantity is not set', () => {
      item.type = 'gear';
      item.system = {};

      expect(item.getQuantity()).toBe(0);
    });

    test('should return 0 when item does not support quantity', () => {
      item.type = 'combatPower';
      item.system = { quantity: 10 };

      expect(item.getQuantity()).toBe(0);
    });

    test('should return 0 when system is undefined', () => {
      item.type = 'gear';
      item.system = undefined;

      expect(item.getQuantity()).toBe(0);
    });
  });

  describe('hasQuantityRemaining()', () => {
    test('should return true when quantity > 0', () => {
      item.type = 'gear';
      item.system = { quantity: 5 };

      expect(item.hasQuantityRemaining()).toBe(true);
    });

    test('should return false when quantity is 0', () => {
      item.type = 'gear';
      item.system = { quantity: 0 };

      expect(item.hasQuantityRemaining()).toBe(false);
    });

    test('should return false when quantity is not set', () => {
      item.type = 'gear';
      item.system = {};

      expect(item.hasQuantityRemaining()).toBe(false);
    });

    test('should return false when item does not support quantity', () => {
      item.type = 'combatPower';
      item.system = { quantity: 10 };

      expect(item.hasQuantityRemaining()).toBe(false);
    });
  });

  describe('getSummary()', () => {
    test('should return complete summary for item with all properties', () => {
      item.id = 'item-123';
      item.name = 'Test Item';
      item.type = 'gear';
      item.actor = { id: 'actor-1', name: 'Test Actor' };
      item.system = { quantity: 10, weight: 5 };
      item.effects = { size: 2, contents: [{}, {}] };
      item.canRoll = () => true;
      item.getRollType = () => 'ability';
      item.getRollAbility = () => 'acro';
      item.hasPopupSupport = () => true;
      item.getPopupType = () => 'combat';

      const result = item.getSummary();

      expect(result.id).toBe('item-123');
      expect(result.name).toBe('Test Item');
      expect(result.type).toBe('gear');
      expect(result.hasActor).toBe(true);
      expect(result.actorName).toBe('Test Actor');
      expect(result.hasQuantity).toBe(true);
      expect(result.quantity).toBe(10);
      expect(result.canRoll).toBe(true);
      expect(result.rollType).toBe('ability');
      expect(result.rollAbility).toBe('acro');
      expect(result.hasPopupSupport).toBe(true);
      expect(result.popupType).toBe('combat');
      expect(result.hasSystemData).toBe(true);
      expect(result.systemDataKeys).toContain('quantity');
      expect(result.systemDataKeys).toContain('weight');
      expect(result.effectCount).toBe(2);
    });

    test('should return summary without actor', () => {
      item.actor = null;

      const result = item.getSummary();

      expect(result.hasActor).toBe(false);
      expect(result.actorName).toBeNull();
    });

    test('should return summary without roll support', () => {
      item.canRoll = () => false;

      const result = item.getSummary();

      expect(result.canRoll).toBe(false);
      expect(result.rollType).toBe('none');
      expect(result.rollAbility).toBeNull();
    });

    test('should return summary without popup support', () => {
      item.hasPopupSupport = () => false;

      const result = item.getSummary();

      expect(result.hasPopupSupport).toBe(false);
      expect(result.popupType).toBeNull();
    });

    test('should return fallback summary on error', () => {
      // Create an item where effects access throws to trigger catch block
      item.effects = {
        get size() {
          throw new Error('Test error');
        }
      };

      const result = item.getSummary();

      expect(result.name).toBe('Test Item');
      expect(result.type).toBe('gear');
      expect(result.hasError).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('validateData()', () => {
    test('should return valid for proper item data', () => {
      item.name = 'Valid Item';
      item.type = 'gear';
      item.system = { quantity: 5 };

      const result = item.validateData();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail when name is missing', () => {
      item.name = '';
      item.type = 'gear';
      item.system = {};

      const result = item.validateData();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item must have a valid name');
    });

    test('should fail when name is whitespace only', () => {
      item.name = '   ';
      item.type = 'gear';
      item.system = {};

      const result = item.validateData();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item must have a valid name');
    });

    test('should fail when name is not a string', () => {
      item.name = null;
      item.type = 'gear';
      item.system = {};

      const result = item.validateData();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item must have a valid name');
    });

    test('should fail when type is missing', () => {
      item.name = 'Test Item';
      item.type = null;
      item.system = {};

      const result = item.validateData();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item must have a valid type');
    });

    test('should fail when type is not a string', () => {
      item.name = 'Test Item';
      item.type = 123;
      item.system = {};

      const result = item.validateData();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item must have a valid type');
    });

    test('should fail when system is missing', () => {
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = null;

      const result = item.validateData();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item must have valid system data');
    });

    test('should fail when system is not an object', () => {
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = 'invalid';

      const result = item.validateData();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item must have valid system data');
    });

    test('should add error for negative quantity', () => {
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { quantity: -5 };

      const result = item.validateData();

      expect(result.errors).toContain('Quantity must be a non-negative number');
    });

    test('should add error for non-number quantity', () => {
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { quantity: 'five' };

      const result = item.validateData();

      expect(result.errors).toContain('Quantity must be a non-negative number');
    });

    test('should add error for invalid roll type', () => {
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { roll: { type: 'invalid' } };

      const result = item.validateData();

      expect(result.errors).toContain('Invalid roll type: invalid');
    });

    test('should accept valid roll types', () => {
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { roll: { type: 'roll' } };

      const result = item.validateData();

      expect(result.isValid).toBe(true);
    });

    test('should accept flat roll type', () => {
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { roll: { type: 'flat' } };

      const result = item.validateData();

      expect(result.isValid).toBe(true);
    });

    test('should accept none roll type', () => {
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { roll: { type: 'none' } };

      const result = item.validateData();

      expect(result.isValid).toBe(true);
    });

    test('should add error for non-number roll bonus', () => {
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { roll: { type: 'roll', bonus: 'five' } };

      const result = item.validateData();

      expect(result.errors).toContain('Roll bonus must be a number');
    });

    test('should accept number roll bonus', () => {
      item.name = 'Test Item';
      item.type = 'gear';
      item.system = { roll: { type: 'roll', bonus: 5 } };

      const result = item.validateData();

      expect(result.isValid).toBe(true);
    });
  });

  describe('isValid()', () => {
    test('should return true for valid item', () => {
      item.name = 'Valid Item';
      item.type = 'gear';
      item.system = { quantity: 5 };

      expect(item.isValid()).toBe(true);
    });

    test('should return false for invalid item', () => {
      item.name = '';
      item.type = 'gear';
      item.system = {};

      expect(item.isValid()).toBe(false);
    });

    test('should use validateData internally', () => {
      const validateSpy = vi.spyOn(item, 'validateData');

      item.isValid();

      expect(validateSpy).toHaveBeenCalled();
    });
  });

  describe('getDisplayName()', () => {
    test('should return name when item does not support quantity', () => {
      item.name = 'Power Strike';
      item.type = 'combatPower';

      const result = item.getDisplayName();

      expect(result).toBe('Power Strike');
    });

    test('should include quantity for items that support it', () => {
      item.name = 'Sword';
      item.type = 'gear';
      item.system = { quantity: 5 };

      const result = item.getDisplayName();

      expect(result).toBe('Sword (5)');
    });

    test('should show zero quantity', () => {
      item.name = 'Arrow';
      item.type = 'gear';
      item.system = { quantity: 0 };

      const result = item.getDisplayName();

      expect(result).toBe('Arrow (0)');
    });

    test('should include roll type when canRoll is true', () => {
      item.name = 'Magic Sword';
      item.type = 'gear';
      item.system = { quantity: 1 };
      item.canRoll = () => true;
      item.getRollType = () => 'ability';

      const result = item.getDisplayName();

      expect(result).toBe('Magic Sword (1) [ABILITY]');
    });

    test('should not include roll type when it is none', () => {
      item.name = 'Sword';
      item.type = 'gear';
      item.system = { quantity: 1 };
      item.canRoll = () => true;
      item.getRollType = () => 'none';

      const result = item.getDisplayName();

      expect(result).toBe('Sword (1)');
    });

    test('should not include roll type when canRoll is false', () => {
      item.name = 'Sword';
      item.type = 'gear';
      item.system = { quantity: 1 };
      item.canRoll = () => false;
      item.getRollType = () => 'ability';

      const result = item.getDisplayName();

      expect(result).toBe('Sword (1)');
    });

    test('should handle missing name gracefully', () => {
      item.name = null;
      item.type = 'gear';
      item.system = { quantity: 0 };

      const result = item.getDisplayName();

      expect(result).toBe('Unknown Item (0)');
    });

    test('should handle missing name for non-quantity items', () => {
      item.name = null;
      item.type = 'combatPower';

      const result = item.getDisplayName();

      expect(result).toBe('Unknown Item');
    });

    test('should include both quantity and roll type', () => {
      item.name = 'Enchanted Arrow';
      item.type = 'gear';
      item.system = { quantity: 20 };
      item.canRoll = () => true;
      item.getRollType = () => 'ability';

      const result = item.getDisplayName();

      expect(result).toBe('Enchanted Arrow (20) [ABILITY]');
    });
  });
});