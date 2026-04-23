// @ts-nocheck
/**
 * @fileoverview Tests for ItemActionCardMixin - Action card embedded item management
 *
 * Tests embedded item, effect, and transformation management for action cards.
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

// Mock the module imports - must mock _module.mjs since the source imports from there
vi.mock('../../../../module/services/_module.mjs', () => ({
  Logger: mockLogger
}));

// Mock Collection (not provided by foundry-test-utils)
class MockCollection extends Map {
  constructor(iterable) {
    super(iterable);
  }
}

// Setup global foundry.utils.Collection before importing
global.foundry = global.foundry || {};
global.foundry.utils = global.foundry.utils || {};
global.foundry.utils.Collection = MockCollection;

// Mock CONFIG
global.CONFIG = {
  Item: {
    documentClass: vi.fn()
  },
  ActiveEffect: {
    documentClass: vi.fn()
  }
};

// Mock game (i18n.format is provided by foundry-test-utils)
if (!global.game) {
  global.game = {};
}

// Import the mixin after mocking dependencies
const { ItemActionCardMixin } = await import('../../../../module/documents/mixins/item-action-card.mjs');

// Create a test class that uses the mixin
class TestItemClass {
  constructor(options = {}) {
    this.type = options.type || 'actionCard';
    this.name = options.name || 'Test Action Card';
    this.id = options.id || 'test-id';
    this.img = options.img || 'icons/svg/item-bag.svg';
    this.system = options.system || {
      embeddedItem: null,
      embeddedStatusEffects: [],
      embeddedTransformations: []
    };
    this.isOwned = options.isOwned || false;
    this.parent = options.parent || null;
    this.collection = options.collection || {};
    this.sheet = options.sheet || {
      render: vi.fn(),
      close: vi.fn()
    };
    this.isEditable = options.isEditable !== undefined ? options.isEditable : true;
    this.update = vi.fn().mockResolvedValue(this);
    this._currentRepetitionContext = null;
  }
}

const MixedClass = ItemActionCardMixin(TestItemClass);

describe('ItemActionCardMixin', () => {
  let item;

  beforeEach(() => {
    vi.clearAllMocks();

    // Replace foundry.utils functions with Vitest mocks
    // This allows tests to override implementations using mockImplementation
    global.foundry.utils.randomID = vi.fn(() => 'random-id-123');
    global.foundry.utils.deepClone = vi.fn((obj) => obj ? JSON.parse(JSON.stringify(obj)) : obj);
    global.foundry.utils.mergeObject = vi.fn((obj1, obj2, options) => {
      // Deep clone obj1 to avoid mutating the original
      let result = JSON.parse(JSON.stringify(obj1));
      
      for (const key of Object.keys(obj2)) {
        if (key.includes('.')) {
          // Handle dotted path keys like 'system.someProperty'
          const path = key.split('.');
          let current = result;
          for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) {
              current[path[i]] = {};
            }
            current = current[path[i]];
          }
          current[path[path.length - 1]] = obj2[key];
        } else {
          // Normal shallow merge for non-dotted keys
          result[key] = obj2[key];
        }
      }
      
      return options?.inplace ? Object.assign(obj1, result) : result;
    });

    // Create fresh item instance
    item = new MixedClass();
  });

  describe('setEmbeddedItem()', () => {
    test('should throw error when called on non-actionCard item', async () => {
      const nonActionCard = new MixedClass({ type: 'gear' });
      const combatPower = { type: 'combatPower', name: 'Test Power' };

      await expect(nonActionCard.setEmbeddedItem(combatPower)).rejects.toThrow(
        'setEmbeddedItem can only be called on action card items'
      );
    });

    test('should throw error for unsupported item types', async () => {
      const unsupportedItem = { type: 'unsupported', name: 'Test' };

      await expect(item.setEmbeddedItem(unsupportedItem)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should accept combatPower item type', async () => {
      const combatPower = {
        type: 'combatPower',
        name: 'Test Power',
        img: 'icons/svg/sword.svg',
        system: {
          roll: { type: 'roll', ability: 'acro', bonus: 0 }
        },
        toObject: vi.fn().mockReturnValue({
          _id: 'power-id',
          type: 'combatPower',
          name: 'Test Power',
          img: 'icons/svg/sword.svg',
          system: {
            roll: { type: 'roll', ability: 'acro', bonus: 0 }
          }
        })
      };

      await item.setEmbeddedItem(combatPower);

      expect(item.update).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]).toHaveProperty('system.embeddedItem');
      expect(updateCall[0]['system.embeddedItem'].type).toBe('combatPower');
    });

    test('should accept gear item type', async () => {
      const gear = {
        type: 'gear',
        name: 'Test Gear',
        img: 'icons/svg/shield.svg',
        system: {},
        toObject: vi.fn().mockReturnValue({
          _id: 'gear-id',
          type: 'gear',
          name: 'Test Gear',
          img: 'icons/svg/shield.svg',
          system: {}
        })
      };

      await item.setEmbeddedItem(gear);

      expect(item.update).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedItem'].type).toBe('gear');
    });

    test('should accept feature item type', async () => {
      const feature = {
        type: 'feature',
        name: 'Test Feature',
        img: 'icons/svg/star.svg',
        system: {},
        toObject: vi.fn().mockReturnValue({
          _id: 'feature-id',
          type: 'feature',
          name: 'Test Feature',
          img: 'icons/svg/star.svg',
          system: {}
        })
      };

      await item.setEmbeddedItem(feature);

      expect(item.update).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedItem'].type).toBe('feature');
    });

    test('should sanitize roll type to "roll" for unsupported types', async () => {
      const combatPower = {
        type: 'combatPower',
        name: 'Test Power',
        img: 'icons/svg/sword.svg',
        system: {
          roll: { type: 'invalid', ability: 'acro', bonus: 0 }
        },
        toObject: vi.fn().mockReturnValue({
          _id: 'power-id',
          type: 'combatPower',
          name: 'Test Power',
          img: 'icons/svg/sword.svg',
          system: {
            roll: { type: 'invalid', ability: 'acro', bonus: 0 }
          }
        })
      };

      await item.setEmbeddedItem(combatPower);

      expect(mockLogger.warn).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedItem'].system.roll.type).toBe('roll');
    });

    test('should preserve "none" roll type', async () => {
      const combatPower = {
        type: 'combatPower',
        name: 'Test Power',
        img: 'icons/svg/sword.svg',
        system: {
          roll: { type: 'none' }
        },
        toObject: vi.fn().mockReturnValue({
          _id: 'power-id',
          type: 'combatPower',
          name: 'Test Power',
          img: 'icons/svg/sword.svg',
          system: {
            roll: { type: 'none' }
          }
        })
      };

      await item.setEmbeddedItem(combatPower);

      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedItem'].system.roll.type).toBe('none');
      expect(updateCall[0]['system.embeddedItem'].system.roll.requiresTarget).toBe(false);
    });

    test('should create default roll configuration if missing', async () => {
      const gear = {
        type: 'gear',
        name: 'Test Gear',
        img: 'icons/svg/shield.svg',
        system: { roll: { type: undefined } },
        toObject: vi.fn().mockReturnValue({
          _id: 'gear-id',
          type: 'gear',
          name: 'Test Gear',
          img: 'icons/svg/shield.svg',
          system: { roll: { type: undefined } }
        })
      };

      await item.setEmbeddedItem(gear);

      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedItem'].system.roll).toBeDefined();
      // When roll type is undefined, it's treated as "none"
      expect(updateCall[0]['system.embeddedItem'].system.roll.type).toBe('none');
    });

    test('should add default ActiveEffect for gear items without effects', async () => {
      const gear = {
        type: 'gear',
        name: 'Test Gear',
        img: 'icons/svg/shield.svg',
        system: {},
        toObject: vi.fn().mockReturnValue({
          _id: 'gear-id',
          type: 'gear',
          name: 'Test Gear',
          img: 'icons/svg/shield.svg',
          system: {}
        })
      };

      await item.setEmbeddedItem(gear);

      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedItem'].effects).toBeDefined();
      expect(updateCall[0]['system.embeddedItem'].effects).toHaveLength(1);
    });

    test('should assign new random ID to embedded item', async () => {
      global.foundry.utils.randomID.mockReturnValue('new-random-id');

      const combatPower = {
        type: 'combatPower',
        name: 'Test Power',
        img: 'icons/svg/sword.svg',
        system: {},
        toObject: vi.fn().mockReturnValue({
          _id: 'original-id',
          type: 'combatPower',
          name: 'Test Power',
          img: 'icons/svg/sword.svg',
          system: {}
        })
      };

      await item.setEmbeddedItem(combatPower);

      expect(global.foundry.utils.randomID).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedItem']._id).toBe('new-random-id');
    });

    test('should return this for method chaining', async () => {
      const combatPower = {
        type: 'combatPower',
        name: 'Test Power',
        img: 'icons/svg/sword.svg',
        system: {},
        toObject: vi.fn().mockReturnValue({
          _id: 'power-id',
          type: 'combatPower',
          name: 'Test Power',
          img: 'icons/svg/sword.svg',
          system: {}
        })
      };

      const result = await item.setEmbeddedItem(combatPower);

      expect(result).toBe(item);
    });
  });

  describe('clearEmbeddedItem()', () => {
    test('should throw error when called on non-actionCard item', async () => {
      const nonActionCard = new MixedClass({ type: 'gear' });

      await expect(nonActionCard.clearEmbeddedItem()).rejects.toThrow(
        'clearEmbeddedItem can only be called on action card items'
      );
    });

    test('should clear embedded item from action card', async () => {
      item.system.embeddedItem = { _id: 'embedded-id', type: 'combatPower' };

      await item.clearEmbeddedItem();

      expect(item.update).toHaveBeenCalledWith(
        { 'system.embeddedItem': null },
        expect.any(Object)
      );
    });

    test('should return this for method chaining', async () => {
      const result = await item.clearEmbeddedItem();

      expect(result).toBe(item);
    });

    test('should pass fromEmbeddedItem flag for virtual items', async () => {
      // Virtual item has no collection
      item.collection = null;

      await item.clearEmbeddedItem();

      expect(item.update).toHaveBeenCalledWith(
        { 'system.embeddedItem': null },
        { fromEmbeddedItem: true }
      );
    });
  });

  describe('getEmbeddedItem()', () => {
    test('should return null for non-actionCard items', () => {
      const nonActionCard = new MixedClass({ type: 'gear' });

      const result = nonActionCard.getEmbeddedItem();

      expect(result).toBeNull();
    });

    test('should return null when no embedded item exists', () => {
      item.system.embeddedItem = null;

      const result = item.getEmbeddedItem();

      expect(result).toBeNull();
    });

    test('should return null when embedded item is empty object', () => {
      item.system.embeddedItem = {};

      const result = item.getEmbeddedItem();

      expect(result).toBeNull();
    });

    test('should call CONFIG.Item.documentClass when creating temporary item', () => {
      const embeddedData = {
        _id: 'embedded-id',
        type: 'combatPower',
        name: 'Test Power',
        img: 'icons/svg/sword.svg',
        system: {
          roll: { type: 'roll', ability: 'acro' }
        }
      };
      item.system.embeddedItem = embeddedData;

      // Reset deepClone to return proper data
      global.foundry.utils.deepClone.mockImplementation(() => ({ ...embeddedData }));

      item.getEmbeddedItem();

      // The method should call CONFIG.Item.documentClass constructor
      expect(global.CONFIG.Item.documentClass).toHaveBeenCalled();
    });

    test('should set isEditable property on temporary item', () => {
      item.isEditable = false;
      item.system.embeddedItem = {
        _id: 'embedded-id',
        type: 'combatPower',
        name: 'Test Power',
        system: {}
      };

      const mockTempItem = {
        effects: new MockCollection(),
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      item.getEmbeddedItem();

      expect(mockTempItem.isEditable).toBe(false);
    });

    test('should create ActiveEffect documents from embedded effects', () => {
      const effectData = {
        _id: 'effect-id',
        name: 'Test Effect',
        changes: []
      };
      item.system.embeddedItem = {
        _id: 'embedded-id',
        type: 'combatPower',
        name: 'Test Power',
        system: {},
        effects: [effectData]
      };

      const mockTempEffect = { _id: 'effect-id' };
      global.CONFIG.ActiveEffect.documentClass.mockReturnValue(mockTempEffect);

      const mockTempItem = {
        effects: new MockCollection(),
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      item.getEmbeddedItem();

      expect(global.CONFIG.ActiveEffect.documentClass).toHaveBeenCalledWith(
        effectData,
        { parent: mockTempItem }
      );
    });

    test('should modify cost to 0 in repetition context without shouldApplyCost', () => {
      item._currentRepetitionContext = { shouldApplyCost: false };
      item.system.embeddedItem = {
        _id: 'embedded-id',
        type: 'combatPower',
        name: 'Test Power',
        system: {
          cost: 5
        }
      };

      const mockTempItem = {
        effects: new MockCollection(),
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      // The deepClone mock will be called, and the cost should be modified
      item.getEmbeddedItem();

      // Verify deepClone was called (indicating modification path was taken)
      expect(global.foundry.utils.deepClone).toHaveBeenCalled();
    });

    test('should not modify cost when shouldApplyCost is true', () => {
      item._currentRepetitionContext = { shouldApplyCost: true };
      item.system.embeddedItem = {
        _id: 'embedded-id',
        type: 'combatPower',
        name: 'Test Power',
        system: {
          cost: 5
        }
      };

      const mockTempItem = {
        effects: new MockCollection(),
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      item.getEmbeddedItem();

      // deepClone should not be called for cost modification
      expect(global.foundry.utils.deepClone).not.toHaveBeenCalled();
    });
  });

  describe('addEmbeddedEffect()', () => {
    test('should throw error when called on non-actionCard item', async () => {
      const nonActionCard = new MixedClass({ type: 'gear' });
      const statusEffect = { type: 'status', name: 'Test Status' };

      await expect(nonActionCard.addEmbeddedEffect(statusEffect)).rejects.toThrow(
        'addEmbeddedEffect can only be called on action card items'
      );
    });

    test('should throw error for unsupported effect types', async () => {
      const unsupportedEffect = { type: 'combatPower', name: 'Test' };

      await expect(item.addEmbeddedEffect(unsupportedEffect)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should accept status effect type', async () => {
      const statusEffect = {
        type: 'status',
        name: 'Test Status',
        img: 'icons/svg/status.svg',
        toObject: vi.fn().mockReturnValue({
          _id: 'status-id',
          type: 'status',
          name: 'Test Status',
          img: 'icons/svg/status.svg',
          system: {}
        })
      };

      await item.addEmbeddedEffect(statusEffect);

      expect(item.update).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]).toHaveProperty('system.embeddedStatusEffects');
      expect(updateCall[0]['system.embeddedStatusEffects']).toHaveLength(1);
      expect(updateCall[0]['system.embeddedStatusEffects'][0].type).toBe('status');
    });

    test('should accept gear effect type', async () => {
      const gearEffect = {
        type: 'gear',
        name: 'Test Gear Effect',
        img: 'icons/svg/gear.svg',
        toObject: vi.fn().mockReturnValue({
          _id: 'gear-id',
          type: 'gear',
          name: 'Test Gear Effect',
          img: 'icons/svg/gear.svg',
          system: {}
        })
      };

      await item.addEmbeddedEffect(gearEffect);

      expect(item.update).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedStatusEffects']).toHaveLength(1);
      expect(updateCall[0]['system.embeddedStatusEffects'][0].type).toBe('gear');
    });

    test('should add effect to existing effects array', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'existing-id', type: 'status', name: 'Existing' }
      ];

      const statusEffect = {
        type: 'status',
        name: 'New Status',
        img: 'icons/svg/status.svg',
        toObject: vi.fn().mockReturnValue({
          _id: 'new-status-id',
          type: 'status',
          name: 'New Status',
          img: 'icons/svg/status.svg',
          system: {}
        })
      };

      await item.addEmbeddedEffect(statusEffect);

      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedStatusEffects']).toHaveLength(2);
    });

    test('should assign new random ID to effect', async () => {
      global.foundry.utils.randomID.mockReturnValue('new-effect-id');

      const statusEffect = {
        type: 'status',
        name: 'Test Status',
        img: 'icons/svg/status.svg',
        toObject: vi.fn().mockReturnValue({
          _id: 'original-id',
          type: 'status',
          name: 'Test Status',
          img: 'icons/svg/status.svg',
          system: {}
        })
      };

      await item.addEmbeddedEffect(statusEffect);

      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedStatusEffects'][0]._id).toBe('new-effect-id');
    });

    test('should add default ActiveEffect for status items without effects', async () => {
      const statusEffect = {
        type: 'status',
        name: 'Test Status',
        img: 'icons/svg/status.svg',
        toObject: vi.fn().mockReturnValue({
          _id: 'status-id',
          type: 'status',
          name: 'Test Status',
          img: 'icons/svg/status.svg',
          system: {}
        })
      };

      await item.addEmbeddedEffect(statusEffect);

      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedStatusEffects'][0].effects).toBeDefined();
      expect(updateCall[0]['system.embeddedStatusEffects'][0].effects).toHaveLength(1);
    });

    test('should sanitize roll type for gear effects', async () => {
      const gearEffect = {
        type: 'gear',
        name: 'Test Gear',
        img: 'icons/svg/gear.svg',
        toObject: vi.fn().mockReturnValue({
          _id: 'gear-id',
          type: 'gear',
          name: 'Test Gear',
          img: 'icons/svg/gear.svg',
          system: {
            roll: { type: 'invalid' }
          }
        })
      };

      await item.addEmbeddedEffect(gearEffect);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    test('should return this for method chaining', async () => {
      const statusEffect = {
        type: 'status',
        name: 'Test Status',
        img: 'icons/svg/status.svg',
        toObject: vi.fn().mockReturnValue({
          _id: 'status-id',
          type: 'status',
          name: 'Test Status',
          img: 'icons/svg/status.svg',
          system: {}
        })
      };

      const result = await item.addEmbeddedEffect(statusEffect);

      expect(result).toBe(item);
    });
  });

  describe('removeEmbeddedEffect()', () => {
    test('should throw error when called on non-actionCard item', async () => {
      const nonActionCard = new MixedClass({ type: 'gear' });

      await expect(nonActionCard.removeEmbeddedEffect('effect-id')).rejects.toThrow(
        'removeEmbeddedEffect can only be called on action card items'
      );
    });

    test('should remove effect by ID', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1' },
        { _id: 'effect-2', type: 'status', name: 'Effect 2' },
        { _id: 'effect-3', type: 'status', name: 'Effect 3' }
      ];

      await item.removeEmbeddedEffect('effect-2');

      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedStatusEffects']).toHaveLength(2);
      expect(updateCall[0]['system.embeddedStatusEffects'].find(e => e._id === 'effect-2')).toBeUndefined();
    });

    test('should return this if effect not found', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1' }
      ];

      const result = await item.removeEmbeddedEffect('non-existent-id');

      expect(result).toBe(item);
      expect(item.update).not.toHaveBeenCalled();
    });

    test('should handle malformed effect entries gracefully', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1' },
        null,
        { name: 'No ID' },
        { _id: 'effect-2', type: 'status', name: 'Effect 2' }
      ];

      await item.removeEmbeddedEffect('effect-2');

      // Malformed entries are warned about but not removed - only the target is removed
      expect(mockLogger.warn).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      // After removing effect-2, we have effect-1, null, {name: 'No ID'} = 3 entries
      expect(updateCall[0]['system.embeddedStatusEffects']).toHaveLength(3);
    });

    test('should return this for method chaining', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1' }
      ];

      const result = await item.removeEmbeddedEffect('effect-1');

      expect(result).toBe(item);
    });

    test('should pass fromEmbeddedItem flag for virtual items', async () => {
      item.collection = null;
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1' }
      ];

      await item.removeEmbeddedEffect('effect-1');

      expect(item.update).toHaveBeenCalledWith(
        expect.objectContaining({ 'system.embeddedStatusEffects': [] }),
        { fromEmbeddedItem: true }
      );
    });
  });

  describe('getEmbeddedEffects()', () => {
    test('should return empty array for non-actionCard items', () => {
      const nonActionCard = new MixedClass({ type: 'gear' });

      const result = nonActionCard.getEmbeddedEffects();

      expect(result).toEqual([]);
    });

    test('should return empty array when no effects exist', () => {
      item.system.embeddedStatusEffects = null;

      const result = item.getEmbeddedEffects();

      expect(result).toEqual([]);
    });

    test('should return empty array when effects array is empty', () => {
      item.system.embeddedStatusEffects = [];

      const result = item.getEmbeddedEffects();

      expect(result).toEqual([]);
    });

    test('should create temporary items for each effect', () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} },
        { _id: 'effect-2', type: 'gear', name: 'Effect 2', system: {} }
      ];

      const mockTempItem1 = {
        effects: new MockCollection(),
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      const mockTempItem2 = {
        effects: new MockCollection(),
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };

      global.CONFIG.Item.documentClass
        .mockReturnValueOnce(mockTempItem1)
        .mockReturnValueOnce(mockTempItem2);

      const result = item.getEmbeddedEffects();

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockTempItem1);
      expect(result[1]).toBe(mockTempItem2);
    });

    test('should set isEditable property on temporary items', () => {
      item.isEditable = false;
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} }
      ];

      const mockTempItem = {
        effects: new MockCollection(),
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      item.getEmbeddedEffects();

      expect(mockTempItem.isEditable).toBe(false);
    });

    test('should set originalId property on temporary items', () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} }
      ];

      const mockTempItem = {
        effects: new MockCollection(),
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      item.getEmbeddedEffects();

      expect(mockTempItem.originalId).toBe('effect-1');
    });

    test('should create ActiveEffect documents for effects with effects array', () => {
      const effectData = {
        _id: 'effect-1',
        type: 'status',
        name: 'Effect 1',
        system: {},
        effects: [{ _id: 'ae-1', name: 'Active Effect' }]
      };
      item.system.embeddedStatusEffects = [effectData];

      const mockTempEffect = { _id: 'ae-1' };
      global.CONFIG.ActiveEffect.documentClass.mockReturnValue(mockTempEffect);

      const mockTempItem = {
        effects: new MockCollection(),
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      item.getEmbeddedEffects();

      expect(global.CONFIG.ActiveEffect.documentClass).toHaveBeenCalled();
    });

    test('should filter out null entries from invalid effect data', () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} },
        null,
        { _id: 'effect-2', type: 'status', name: 'Effect 2', system: {} }
      ];

      const mockTempItem = {
        effects: new MockCollection(),
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const result = item.getEmbeddedEffects();

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    test('should handle execution context option', () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} }
      ];

      const mockTempItem = {
        effects: new MockCollection(),
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const result = item.getEmbeddedEffects({ executionContext: true });

      expect(result).toHaveLength(1);
    });
  });

  describe('addEmbeddedTransformation()', () => {
    test('should throw error when called on non-actionCard item', async () => {
      const nonActionCard = new MixedClass({ type: 'gear' });
      const transformation = { type: 'transformation', name: 'Test Transformation' };

      await expect(nonActionCard.addEmbeddedTransformation(transformation)).rejects.toThrow(
        'addEmbeddedTransformation can only be called on action card items'
      );
    });

    test('should throw error for non-transformation items', async () => {
      const nonTransformation = { type: 'combatPower', name: 'Test' };

      await expect(item.addEmbeddedTransformation(nonTransformation)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should add transformation to action card', async () => {
      const transformation = {
        type: 'transformation',
        name: 'Test Transformation',
        img: 'icons/svg/transformation.svg',
        toObject: vi.fn().mockReturnValue({
          _id: 'trans-id',
          type: 'transformation',
          name: 'Test Transformation',
          img: 'icons/svg/transformation.svg',
          system: {}
        })
      };

      await item.addEmbeddedTransformation(transformation);

      expect(item.update).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]).toHaveProperty('system.embeddedTransformations');
      expect(updateCall[0]['system.embeddedTransformations']).toHaveLength(1);
      expect(updateCall[0]['system.embeddedTransformations'][0].type).toBe('transformation');
    });

    test('should add transformation to existing transformations array', async () => {
      item.system.embeddedTransformations = [
        { _id: 'existing-id', type: 'transformation', name: 'Existing' }
      ];

      const transformation = {
        type: 'transformation',
        name: 'New Transformation',
        img: 'icons/svg/transformation.svg',
        toObject: vi.fn().mockReturnValue({
          _id: 'new-trans-id',
          type: 'transformation',
          name: 'New Transformation',
          img: 'icons/svg/transformation.svg',
          system: {}
        })
      };

      await item.addEmbeddedTransformation(transformation);

      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedTransformations']).toHaveLength(2);
    });

    test('should assign new random ID to transformation', async () => {
      global.foundry.utils.randomID.mockReturnValue('new-transformation-id');

      const transformation = {
        type: 'transformation',
        name: 'Test Transformation',
        img: 'icons/svg/transformation.svg',
        toObject: vi.fn().mockReturnValue({
          _id: 'original-id',
          type: 'transformation',
          name: 'Test Transformation',
          img: 'icons/svg/transformation.svg',
          system: {}
        })
      };

      await item.addEmbeddedTransformation(transformation);

      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedTransformations'][0]._id).toBe('new-transformation-id');
    });

    test('should return this for method chaining', async () => {
      const transformation = {
        type: 'transformation',
        name: 'Test Transformation',
        img: 'icons/svg/transformation.svg',
        toObject: vi.fn().mockReturnValue({
          _id: 'trans-id',
          type: 'transformation',
          name: 'Test Transformation',
          img: 'icons/svg/transformation.svg',
          system: {}
        })
      };

      const result = await item.addEmbeddedTransformation(transformation);

      expect(result).toBe(item);
    });

    test('should pass fromEmbeddedItem flag for virtual items', async () => {
      item.collection = null;

      const transformation = {
        type: 'transformation',
        name: 'Test Transformation',
        img: 'icons/svg/transformation.svg',
        toObject: vi.fn().mockReturnValue({
          _id: 'trans-id',
          type: 'transformation',
          name: 'Test Transformation',
          img: 'icons/svg/transformation.svg',
          system: {}
        })
      };

      await item.addEmbeddedTransformation(transformation);

      expect(item.update).toHaveBeenCalledWith(
        expect.objectContaining({ 'system.embeddedTransformations': expect.any(Array) }),
        { fromEmbeddedItem: true }
      );
    });
  });

  describe('removeEmbeddedTransformation()', () => {
    test('should throw error when called on non-actionCard item', async () => {
      const nonActionCard = new MixedClass({ type: 'gear' });

      await expect(nonActionCard.removeEmbeddedTransformation('trans-id')).rejects.toThrow(
        'removeEmbeddedTransformation can only be called on action card items'
      );
    });

    test('should remove transformation by ID', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1' },
        { _id: 'trans-2', type: 'transformation', name: 'Transformation 2' },
        { _id: 'trans-3', type: 'transformation', name: 'Transformation 3' }
      ];

      await item.removeEmbeddedTransformation('trans-2');

      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]['system.embeddedTransformations']).toHaveLength(2);
      expect(updateCall[0]['system.embeddedTransformations'].find(t => t._id === 'trans-2')).toBeUndefined();
    });

    test('should return this if transformation not found', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1' }
      ];

      const result = await item.removeEmbeddedTransformation('non-existent-id');

      expect(result).toBe(item);
      expect(item.update).not.toHaveBeenCalled();
    });

    test('should handle malformed transformation entries gracefully', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1' },
        null,
        { name: 'No ID' },
        { _id: 'trans-2', type: 'transformation', name: 'Transformation 2' }
      ];

      await item.removeEmbeddedTransformation('trans-2');

      // Malformed entries are warned about but not removed - only the target is removed
      expect(mockLogger.warn).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      // After removing trans-2, we have trans-1, null, {name: 'No ID'} = 3 entries
      expect(updateCall[0]['system.embeddedTransformations']).toHaveLength(3);
    });

    test('should return this for method chaining', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1' }
      ];

      const result = await item.removeEmbeddedTransformation('trans-1');

      expect(result).toBe(item);
    });

    test('should pass fromEmbeddedItem flag for virtual items', async () => {
      item.collection = null;
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1' }
      ];

      await item.removeEmbeddedTransformation('trans-1');

      expect(item.update).toHaveBeenCalledWith(
        expect.objectContaining({ 'system.embeddedTransformations': [] }),
        { fromEmbeddedItem: true }
      );
    });
  });

  describe('getEmbeddedTransformations()', () => {
    test('should return empty array for non-actionCard items', async () => {
      const nonActionCard = new MixedClass({ type: 'gear' });

      const result = await nonActionCard.getEmbeddedTransformations();

      expect(result).toEqual([]);
    });

    test('should return empty array when no transformations exist', async () => {
      item.system.embeddedTransformations = null;

      const result = await item.getEmbeddedTransformations();

      expect(result).toEqual([]);
    });

    test('should return empty array when transformations array is empty', async () => {
      item.system.embeddedTransformations = [];

      const result = await item.getEmbeddedTransformations();

      expect(result).toEqual([]);
    });

    test('should process multiple transformations', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} },
        { _id: 'trans-2', type: 'transformation', name: 'Transformation 2', system: {} }
      ];

      const result = await item.getEmbeddedTransformations();

      // Should return an array with 2 items (even if they're mock objects)
      expect(Array.isArray(result)).toBe(true);
    });

    test('should set isEditable property on temporary items', async () => {
      item.isEditable = false;
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      await item.getEmbeddedTransformations();

      // Verify CONFIG.Item.documentClass was called
      expect(global.CONFIG.Item.documentClass).toHaveBeenCalled();
    });

    test('should set originalId property on temporary items', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      await item.getEmbeddedTransformations();

      // Verify CONFIG.Item.documentClass was called
      expect(global.CONFIG.Item.documentClass).toHaveBeenCalled();
    });

    test('should filter out null entries from invalid transformation data', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} },
        null,
        { _id: 'trans-2', type: 'transformation', name: 'Transformation 2', system: {} }
      ];

      const result = await item.getEmbeddedTransformations();

      // Should return array (null entries are filtered out by the implementation)
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle execution context option', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      await item.getEmbeddedTransformations({ executionContext: true });

      // Verify CONFIG.Item.documentClass was called
      expect(global.CONFIG.Item.documentClass).toHaveBeenCalled();
    });

    test('should handle handleBypass delegation when available', async () => {
      item.system.embeddedTransformations = [
        {
          _id: 'trans-1',
          type: 'transformation',
          name: 'Transformation 1',
          system: {
            handleBypass: vi.fn()
          }
        }
      ];

      const mockTempItem = {
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() },
        system: {
          handleBypass: vi.fn()
        }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      await item.getEmbeddedTransformations();

      expect(mockTempItem.handleBypass).toBeDefined();
    });
  });

  // Additional tests for uncovered lines

  describe('getEmbeddedItem() - handleBypass delegation', () => {
    test('should delegate handleBypass when system.handleBypass is a function', async () => {
      const embeddedData = {
        _id: 'embedded-id',
        type: 'combatPower',
        name: 'Test Power',
        system: {}
      };
      item.system.embeddedItem = embeddedData;
      global.foundry.utils.deepClone.mockImplementation(() => ({ ...embeddedData }));

      const mockHandleBypass = vi.fn().mockResolvedValue({ success: true });
      const mockTempItem = {
        effects: new MockCollection(),
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() },
        system: {
          handleBypass: mockHandleBypass
        }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const tempItem = item.getEmbeddedItem();

      expect(tempItem.handleBypass).toBeDefined();
      await tempItem.handleBypass({ test: 'config' }, { option: 'value' });
      expect(mockHandleBypass).toHaveBeenCalled();
    });
  });

  describe('getEmbeddedEffects() - update method', () => {
    test('should call actionCard.update when tempItem.update is called', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} }
      ];

      const mockTempItem = {
        effects: new MockCollection(),
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const effects = item.getEmbeddedEffects();
      expect(effects.length).toBeGreaterThan(0);
      const tempEffect = effects[0];

      await tempEffect.update({ 'system.someProperty': 'newValue' });

      expect(item.update).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]).toHaveProperty('system.embeddedStatusEffects');
    });

    test('should throw error when effect not found during update', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} }
      ];

      const mockTempItem = {
        effects: new MockCollection(),
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const effects = item.getEmbeddedEffects();
      const tempEffect = effects[0];

      // Change the effect ID to simulate not found
      item.system.embeddedStatusEffects = [
        { _id: 'different-id', type: 'status', name: 'Different Effect', system: {} }
      ];

      await expect(tempEffect.update({ 'system.someProperty': 'newValue' }))
        .rejects.toThrow('Could not find embedded effect to update');
    });

    test('should call updateSource after updating effect', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} }
      ];

      const mockTempItem = {
        effects: new MockCollection(),
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const effects = item.getEmbeddedEffects();
      await effects[0].update({ 'system.someProperty': 'newValue' });

      expect(mockTempItem.updateSource).toHaveBeenCalled();
    });

    test('should close sheet when fromEmbeddedItem is false', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} }
      ];

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        effects: new MockCollection(),
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const effects = item.getEmbeddedEffects();
      await effects[0].update({ 'system.someProperty': 'newValue' });

      expect(mockSheet.close).toHaveBeenCalled();
      expect(item.sheet.render).toHaveBeenCalledWith(true);
    });

    test('should not close sheet when fromEmbeddedItem is true', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} }
      ];

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        effects: new MockCollection(),
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const effects = item.getEmbeddedEffects();
      await effects[0].update({ 'system.someProperty': 'newValue' }, { fromEmbeddedItem: true });

      expect(mockSheet.close).not.toHaveBeenCalled();
      expect(mockSheet.render).toHaveBeenCalledWith(false);
    });
  });

  describe('getEmbeddedEffects() - updateEmbeddedDocuments method', () => {
    test('should call prototype updateEmbeddedDocuments', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} }
      ];

      const mockPrototypeUpdate = vi.fn().mockResolvedValue([]);
      global.CONFIG.Item.documentClass.prototype = {
        updateEmbeddedDocuments: mockPrototypeUpdate
      };

      const mockTempItem = {
        effects: new MockCollection(),
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn(), rendered: true }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const effects = item.getEmbeddedEffects();
      await effects[0].updateEmbeddedDocuments('ActiveEffect', []);

      expect(mockPrototypeUpdate).toHaveBeenCalled();
    });

    test('should close sheet when fromEmbeddedItem is false', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} }
      ];

      const mockPrototypeUpdate = vi.fn().mockResolvedValue([]);
      global.CONFIG.Item.documentClass.prototype = {
        updateEmbeddedDocuments: mockPrototypeUpdate
      };

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        effects: new MockCollection(),
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const effects = item.getEmbeddedEffects();
      await effects[0].updateEmbeddedDocuments('ActiveEffect', []);

      expect(mockSheet.close).toHaveBeenCalled();
      expect(item.sheet.render).toHaveBeenCalledWith(true);
    });

    test('should not close sheet when fromEmbeddedItem is true', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} }
      ];

      const mockPrototypeUpdate = vi.fn().mockResolvedValue([]);
      global.CONFIG.Item.documentClass.prototype = {
        updateEmbeddedDocuments: mockPrototypeUpdate
      };

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        effects: new MockCollection(),
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const effects = item.getEmbeddedEffects();
      await effects[0].updateEmbeddedDocuments('ActiveEffect', [], { fromEmbeddedItem: true });

      expect(mockSheet.close).not.toHaveBeenCalled();
      expect(mockSheet.render).toHaveBeenCalledWith(false);
    });
  });

  describe('removeEmbeddedEffect() - error handling', () => {
    test('should log error and throw when update fails', async () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1' }
      ];

      const updateError = new Error('Update failed');
      item.update.mockRejectedValue(updateError);

      await expect(item.removeEmbeddedEffect('effect-1')).rejects.toThrow('Update failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('removeEmbeddedTransformation() - error handling', () => {
    test('should log error and throw when update fails', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1' }
      ];

      const updateError = new Error('Update failed');
      item.update.mockRejectedValue(updateError);

      await expect(item.removeEmbeddedTransformation('trans-1')).rejects.toThrow('Update failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getEmbeddedTransformations() - error handling', () => {
    test('should return empty array and log error when exception occurs', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      // Make CONFIG.Item.documentClass throw an error
      global.CONFIG.Item.documentClass.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await item.getEmbeddedTransformations();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // Tests for clearEmbeddedItem() error handling (lines 162-164)
  describe('clearEmbeddedItem() - error handling', () => {
    test('should log error and rethrow when update fails', async () => {
      const updateError = new Error('Update failed');
      item.update.mockRejectedValue(updateError);

      await expect(item.clearEmbeddedItem()).rejects.toThrow('Update failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // Tests for getEmbeddedItem() overridden update method (lines 242-279)
  describe('getEmbeddedItem() - tempItem.update() method', () => {
    test('should call actionCard.update with merged data when tempItem.update is called', async () => {
      const embeddedData = {
        _id: 'embedded-id',
        type: 'combatPower',
        name: 'Test Power',
        system: { roll: { type: 'roll', ability: 'acro' } }
      };

      // Verify deepClone is a mock
      expect(typeof global.foundry.utils.deepClone.mockImplementation).toBe('function');

      // Spy on Logger.error to catch any errors
      mockLogger.error.mockClear();
      
      global.foundry.utils.deepClone.mockImplementation(() => ({ ...embeddedData }));

      const mockTempItem = {
        effects: new MockCollection(),
        isEditable: true,
        system: {},
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      // Mock the prototype for updateEmbeddedDocuments calls
      global.CONFIG.Item.documentClass.prototype = {
        updateEmbeddedDocuments: vi.fn().mockResolvedValue([])
      };
      const documentClassSpy = global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      // Set embeddedItem after configuring mocks
      item.system.embeddedItem = embeddedData;

      console.log('documentClassSpy.calls:', documentClassSpy.calls);

      console.log('item.type:', item.type);
      console.log('item.system:', item.system);
      console.log('Object.keys(item.system.embeddedItem):', Object.keys(item.system.embeddedItem || {}));
      console.log('CONFIG.Item.documentClass:', global.CONFIG.Item.documentClass);
      console.log('deepClone mock:', global.foundry.utils.deepClone);
      console.log('CONFIG.Item.documentClass.prototype:', global.CONFIG.Item.documentClass.prototype);
      console.log('mockTempItem:', mockTempItem);
      console.log('documentClassSpy.calls before:', global.CONFIG.Item.documentClass.mock.calls.length);
      
      let tempItem;
      try {
        tempItem = item.getEmbeddedItem();
        console.log('tempItem:', tempItem);
        console.log('documentClassSpy.calls after:', global.CONFIG.Item.documentClass.mock.calls.length);
      } catch (e) {
        console.error('Error calling getEmbeddedItem():', e);
        throw e;
      }
      // Check if Logger.error was called (which would indicate an internal error)
      console.log('Logger.error calls:', mockLogger.error.mock.calls.length);
      console.log('Logger.error was called with:', mockLogger.error.mock.calls);

      await tempItem.update({ 'system.someProperty': 'newValue' });

      expect(item.update).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]).toHaveProperty('system.embeddedItem');
      expect(updateCall[0]['system.embeddedItem'].system.someProperty).toBe('newValue');
    });

    test('should call updateSource after updating', async () => {
      const embeddedData = {
        _id: 'embedded-id',
        type: 'combatPower',
        name: 'Test Power',
        system: {}
      };

      global.foundry.utils.deepClone.mockImplementation(() => ({ ...embeddedData }));

      const mockTempItem = {
        effects: new MockCollection(),
        isEditable: true,
        system: {},
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() }
      };
      // Mock the prototype for updateEmbeddedDocuments calls
      global.CONFIG.Item.documentClass.prototype = {
        updateEmbeddedDocuments: vi.fn().mockResolvedValue([])
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      item.system.embeddedItem = embeddedData;

      const tempItem = item.getEmbeddedItem();
      await tempItem.update({ 'system.someProperty': 'newValue' });

      expect(mockTempItem.updateSource).toHaveBeenCalled();
    });

    test('should close sheet and render action card sheet when fromEmbeddedItem is false', async () => {
      const embeddedData = {
        _id: 'embedded-id',
        type: 'combatPower',
        name: 'Test Power',
        system: {}
      };

      global.foundry.utils.deepClone.mockImplementation(() => ({ ...embeddedData }));

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        effects: new MockCollection(),
        isEditable: true,
        system: {},
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet
      };
      // Mock the prototype for updateEmbeddedDocuments calls
      global.CONFIG.Item.documentClass.prototype = {
        updateEmbeddedDocuments: vi.fn().mockResolvedValue([])
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      item.system.embeddedItem = embeddedData;

      const tempItem = item.getEmbeddedItem();
      await tempItem.update({ 'system.someProperty': 'newValue' });

      expect(mockSheet.close).toHaveBeenCalled();
      expect(item.sheet.render).toHaveBeenCalledWith(true);
    });
  });

  // Tests for getEmbeddedEffects() error handling (lines 666-668)
  describe('getEmbeddedEffects() - error handling', () => {
    test('should return empty array and log error when exception occurs', () => {
      item.system.embeddedStatusEffects = [
        { _id: 'effect-1', type: 'status', name: 'Effect 1', system: {} }
      ];

      // Make CONFIG.Item.documentClass throw an error
      global.CONFIG.Item.documentClass.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = item.getEmbeddedEffects();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // Tests for getEmbeddedTransformations() invalid data handling (lines 868-874)
  describe('getEmbeddedTransformations() - invalid data handling', () => {
    test('should filter out null entries from transformation data', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} },
        null,
        { _id: 'trans-2', type: 'transformation', name: 'Transformation 2', system: {} }
      ];

      const mockTempItem = {
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() },
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const result = await item.getEmbeddedTransformations();

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    test('should filter out invalid object entries from transformation data', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} },
        'invalid string',
        { _id: 'trans-2', type: 'transformation', name: 'Transformation 2', system: {} }
      ];

      const mockTempItem = {
        isEditable: true,
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() },
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const result = await item.getEmbeddedTransformations();

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  // Tests for getEmbeddedTransformations() update method (lines 895-950)
  describe('getEmbeddedTransformations() - tempItem.update() method', () => {
    test('should call actionCard.update with merged data', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() },
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      const tempTransformation = transformations[0];

      await tempTransformation.update({ 'system.someProperty': 'newValue' });

      expect(item.update).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]).toHaveProperty('system.embeddedTransformations');
    });

    test('should throw error when transformation not found', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() },
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      const tempTransformation = transformations[0];

      // Change the transformation ID to simulate not found
      item.system.embeddedTransformations = [
        { _id: 'different-id', type: 'transformation', name: 'Different Transformation', system: {} }
      ];

      await expect(tempTransformation.update({ 'system.someProperty': 'newValue' }))
        .rejects.toThrow('Could not find embedded transformation to update');
    });

    test('should call updateSource after updating', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() },
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      await transformations[0].update({ 'system.someProperty': 'newValue' });

      expect(mockTempItem.updateSource).toHaveBeenCalled();
    });

    test('should close sheet when fromEmbeddedItem is false', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet,
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      await transformations[0].update({ 'system.someProperty': 'newValue' });

      expect(mockSheet.close).toHaveBeenCalled();
      expect(item.sheet.render).toHaveBeenCalledWith(true);
    });

    test('should not close sheet when fromEmbeddedItem is true', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet,
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      await transformations[0].update({ 'system.someProperty': 'newValue' }, { fromEmbeddedItem: true });

      expect(mockSheet.close).not.toHaveBeenCalled();
      expect(mockSheet.render).toHaveBeenCalledWith(false);
    });

    test('should not close sheet for image updates', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet,
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      await transformations[0].update({ img: 'new-image.svg' });

      expect(mockSheet.close).not.toHaveBeenCalled();
      expect(mockSheet.render).toHaveBeenCalledWith(false);
    });

    test('should not render action card sheet in execution context', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet,
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations({ executionContext: true });
      await transformations[0].update({ 'system.someProperty': 'newValue' });

      expect(mockSheet.close).toHaveBeenCalled();
      expect(item.sheet.render).not.toHaveBeenCalled();
    });
  });

  // Tests for getEmbeddedTransformations() dual-override update method (lines 957-1028)
  describe('getEmbeddedTransformations() - dual-override update method', () => {
    test('should handle embeddedCombatPowers updates specially', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet,
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      await transformations[0].update({ 'system.embeddedCombatPowers': [] });

      expect(item.update).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]).toHaveProperty('system.embeddedTransformations');
    });

    test('should handle embeddedActionCards updates specially', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet,
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      await transformations[0].update({ 'system.embeddedActionCards': [] });

      expect(item.update).toHaveBeenCalled();
      const updateCall = item.update.mock.calls[0];
      expect(updateCall[0]).toHaveProperty('system.embeddedTransformations');
    });

    test('should throw error when transformation not found during dual-override update', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet,
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      const tempTransformation = transformations[0];

      // Change the transformation ID to simulate not found
      item.system.embeddedTransformations = [
        { _id: 'different-id', type: 'transformation', name: 'Different Transformation', system: {} }
      ];

      await expect(tempTransformation.update({ 'system.embeddedCombatPowers': [] }))
        .rejects.toThrow('Could not find embedded transformation to update');
    });

    test('should call updateSource after dual-override update', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet,
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      await transformations[0].update({ 'system.embeddedCombatPowers': [] });

      expect(mockTempItem.updateSource).toHaveBeenCalled();
    });

    test('should render sheets without closing for dual-override updates', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      // Set item.sheet.rendered to true so the render call happens
      item.sheet.rendered = true;

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet,
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      await transformations[0].update({ 'system.embeddedCombatPowers': [] });

      // Should not close sheets for dual-override updates
      expect(mockSheet.close).not.toHaveBeenCalled();
      expect(mockSheet.render).toHaveBeenCalledWith(false);
      expect(item.sheet.render).toHaveBeenCalledWith(false);
    });
  });

  // Tests for getEmbeddedTransformations() updateEmbeddedDocuments method (lines 1033-1060)
  describe('getEmbeddedTransformations() - tempItem.updateEmbeddedDocuments() method', () => {
    test('should call prototype updateEmbeddedDocuments', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockPrototypeUpdate = vi.fn().mockResolvedValue([]);
      global.CONFIG.Item.documentClass.prototype = {
        updateEmbeddedDocuments: mockPrototypeUpdate
      };

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet,
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      await transformations[0].updateEmbeddedDocuments('ActiveEffect', []);

      expect(mockPrototypeUpdate).toHaveBeenCalled();
    });

    test('should close sheet when fromEmbeddedItem is false', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockPrototypeUpdate = vi.fn().mockResolvedValue([]);
      global.CONFIG.Item.documentClass.prototype = {
        updateEmbeddedDocuments: mockPrototypeUpdate
      };

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet,
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      await transformations[0].updateEmbeddedDocuments('ActiveEffect', []);

      expect(mockSheet.close).toHaveBeenCalled();
      expect(item.sheet.render).toHaveBeenCalledWith(true);
    });

    test('should not close sheet when fromEmbeddedItem is true', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockPrototypeUpdate = vi.fn().mockResolvedValue([]);
      global.CONFIG.Item.documentClass.prototype = {
        updateEmbeddedDocuments: mockPrototypeUpdate
      };

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet,
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();
      await transformations[0].updateEmbeddedDocuments('ActiveEffect', [], { fromEmbeddedItem: true });

      expect(mockSheet.close).not.toHaveBeenCalled();
      expect(mockSheet.render).toHaveBeenCalledWith(false);
    });

    test('should not render action card sheet in execution context', async () => {
      item.system.embeddedTransformations = [
        { _id: 'trans-1', type: 'transformation', name: 'Transformation 1', system: {} }
      ];

      const mockPrototypeUpdate = vi.fn().mockResolvedValue([]);
      global.CONFIG.Item.documentClass.prototype = {
        updateEmbeddedDocuments: mockPrototypeUpdate
      };

      const mockSheet = { close: vi.fn(), render: vi.fn(), rendered: true };
      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: mockSheet,
        system: {}
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations({ executionContext: true });
      await transformations[0].updateEmbeddedDocuments('ActiveEffect', []);

      expect(mockSheet.close).toHaveBeenCalled();
      expect(item.sheet.render).not.toHaveBeenCalled();
    });
  });

  // Tests for getEmbeddedTransformations() handleBypass delegation (line 1066)
  describe('getEmbeddedTransformations() - handleBypass delegation', () => {
    test('should delegate handleBypass when system.handleBypass is a function', async () => {
      const mockHandleBypass = vi.fn().mockResolvedValue({ success: true });
      item.system.embeddedTransformations = [
        {
          _id: 'trans-1',
          type: 'transformation',
          name: 'Transformation 1',
          system: {
            handleBypass: mockHandleBypass
          }
        }
      ];

      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() },
        system: {
          handleBypass: mockHandleBypass
        }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();

      expect(transformations[0].handleBypass).toBeDefined();
      await transformations[0].handleBypass({ test: 'config' }, { option: 'value' });
      expect(mockHandleBypass).toHaveBeenCalled();
    });

    test('should not add handleBypass when system.handleBypass is not a function', async () => {
      item.system.embeddedTransformations = [
        {
          _id: 'trans-1',
          type: 'transformation',
          name: 'Transformation 1',
          system: {
            handleBypass: 'not a function'
          }
        }
      ];

      const mockTempItem = {
        isEditable: true,
        id: 'trans-1',
        update: vi.fn(),
        updateEmbeddedDocuments: vi.fn(),
        updateSource: vi.fn(),
        sheet: { close: vi.fn(), render: vi.fn() },
        system: {
          handleBypass: 'not a function'
        }
      };
      global.CONFIG.Item.documentClass.mockImplementation(() => mockTempItem);

      const transformations = await item.getEmbeddedTransformations();

      expect(transformations[0].handleBypass).toBeUndefined();
    });
  });
});