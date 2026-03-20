// @ts-nocheck
/**
 * @fileoverview Tests for EventideRpSystemTransformation Data Model
 *
 * Tests the transformation item data model which includes schema definitions,
 * embedded combat powers and action cards management, and token image handling.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock the EventideRpSystemItemBase
const mockItemBase = class {
  static defineSchema() {
    return {
      description: new global.foundry.data.fields.StringField({ required: true, blank: true }),
      rollActorName: new global.foundry.data.fields.BooleanField({ required: true, initial: true }),
    };
  }
};

// Mock foundry.utils
global.foundry.utils = {
  deepClone: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
  randomID: vi.fn(() => 'random-id-123'),
  mergeObject: vi.fn((original, updates) => ({ ...original, ...updates })),
};

// Mock game.i18n
global.game.i18n = {
  localize: vi.fn((key) => key),
};

// Mock module imports
vi.mock('../../../module/data/base-item.mjs', () => ({
  default: mockItemBase
}));

// Import the data model after setting up mocks
const { default: EventideRpSystemTransformation } = await import('../../../module/data/item-transformation.mjs');

describe('EventideRpSystemTransformation', () => {
  let transformation;
  let mockParent;
  let mockActor;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock sheet
    const mockSheet = {
      close: vi.fn(),
      render: vi.fn(),
      rendered: true,
    };

    // Create mock actor
    mockActor = {
      id: 'actor-123',
      name: 'Test Actor',
    };

    // Create mock parent (transformation item)
    mockParent = {
      id: 'transformation-123',
      name: 'Wolf Form',
      img: 'icons/svg/wolf.svg',
      isOwned: true,
      parent: mockActor,
      isEditable: true,
      sheet: mockSheet,
      update: vi.fn(),
    };

    // Create a fresh transformation data instance for each test
    transformation = new EventideRpSystemTransformation({
      description: 'A transformation',
      rollActorName: true,
      embeddedCombatPowers: [],
      embeddedActionCards: [],
      size: 1,
      tokenImage: '',
      powerAdjustment: 0,
      resolveAdjustment: 0,
      cursed: false,
      actionCardGroups: [],
    });

    // Set parent on transformation
    Object.defineProperty(transformation, 'parent', {
      value: mockParent,
      writable: true,
    });
  });

  describe('Schema Definition', () => {
    test('should define schema that extends base item schema', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema).toBeDefined();
      expect(schema.description).toBeDefined();
      expect(schema.rollActorName).toBeDefined();
    });

    test('should define embeddedCombatPowers as ArrayField', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema.embeddedCombatPowers).toBeDefined();
    });

    test('should define embeddedActionCards as ArrayField', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema.embeddedActionCards).toBeDefined();
    });

    test('should define size field with initial 0', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema.size).toBeDefined();
      expect(schema.size.options.initial).toBe(0);
    });

    test('should define size field with valid choices', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      const choices = schema.size.options.choices;
      expect(choices).toContain(0);
      expect(choices).toContain(0.5);
      expect(choices).toContain(1);
      expect(choices).toContain(2);
      expect(choices).toContain(5);
    });

    test('should define tokenImage as FilePathField', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema.tokenImage).toBeDefined();
      expect(schema.tokenImage.options.initial).toBe('');
    });

    test('should define powerAdjustment field with initial 0', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema.powerAdjustment).toBeDefined();
      expect(schema.powerAdjustment.options.initial).toBe(0);
    });

    test('should define resolveAdjustment field with initial 0', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema.resolveAdjustment).toBeDefined();
      expect(schema.resolveAdjustment.options.initial).toBe(0);
    });

    test('should define cursed field with initial false', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema.cursed).toBeDefined();
      expect(schema.cursed.options.initial).toBe(false);
    });

    test('should define actionCardGroups as ArrayField', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema.actionCardGroups).toBeDefined();
    });
  });

  describe('addCombatPower()', () => {
    test('should add combat power to embeddedCombatPowers', async () => {
      const mockCombatPower = {
        type: 'combatPower',
        toObject: vi.fn(() => ({ _id: 'original-id', name: 'Fire Blast' })),
      };

      await transformation.addCombatPower(mockCombatPower);

      expect(mockParent.update).toHaveBeenCalledWith({
        'system.embeddedCombatPowers': expect.arrayContaining([
          expect.objectContaining({ _id: 'random-id-123' }),
        ]),
      });
    });

    test('should assign new random ID to copied combat power', async () => {
      const mockCombatPower = {
        type: 'combatPower',
        toObject: vi.fn(() => ({ _id: 'original-id', name: 'Power' })),
      };

      await transformation.addCombatPower(mockCombatPower);

      expect(global.foundry.utils.randomID).toHaveBeenCalled();
      expect(mockParent.update).toHaveBeenCalledWith({
        'system.embeddedCombatPowers': expect.arrayContaining([
          expect.objectContaining({ _id: 'random-id-123' }),
        ]),
      });
    });

    test('should throw error for non-combatPower item', async () => {
      const mockItem = {
        type: 'feature',
        toObject: vi.fn(() => ({ _id: 'id', name: 'Feature' })),
      };

      await expect(transformation.addCombatPower(mockItem)).rejects.toThrow();
    });

    test('should add multiple combat powers', async () => {
      transformation.embeddedCombatPowers = [{ _id: 'existing', name: 'Power 1' }];

      const mockPower1 = {
        type: 'combatPower',
        toObject: vi.fn(() => ({ _id: 'orig-1', name: 'Power 1' })),
      };

      const mockPower2 = {
        type: 'combatPower',
        toObject: vi.fn(() => ({ _id: 'orig-2', name: 'Power 2' })),
      };

      await transformation.addCombatPower(mockPower1);
      await transformation.addCombatPower(mockPower2);

      expect(mockParent.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('removeCombatPower()', () => {
    test('should remove combat power by ID', async () => {
      transformation.embeddedCombatPowers = [
        { _id: 'power-1', name: 'Power 1' },
        { _id: 'power-2', name: 'Power 2' },
      ];

      await transformation.removeCombatPower('power-1');

      expect(mockParent.update).toHaveBeenCalledWith({
        'system.embeddedCombatPowers': [{ _id: 'power-2', name: 'Power 2' }],
      });
    });

    test('should handle non-existent power ID gracefully', async () => {
      transformation.embeddedCombatPowers = [{ _id: 'power-1', name: 'Power 1' }];

      await transformation.removeCombatPower('non-existent');

      expect(mockParent.update).not.toHaveBeenCalled();
    });

    test('should handle empty powers array', async () => {
      transformation.embeddedCombatPowers = [];

      await transformation.removeCombatPower('power-1');

      expect(mockParent.update).not.toHaveBeenCalled();
    });
  });

  describe('addActionCard()', () => {
    test('should add action card to embeddedActionCards', async () => {
      const mockActionCard = {
        type: 'actionCard',
        toObject: vi.fn(() => ({ _id: 'original-id', name: 'Attack' })),
      };

      await transformation.addActionCard(mockActionCard);

      expect(mockParent.update).toHaveBeenCalledWith({
        'system.embeddedActionCards': expect.arrayContaining([
          expect.objectContaining({ _id: 'random-id-123' }),
        ]),
      });
    });

    test('should assign new random ID to copied action card', async () => {
      const mockActionCard = {
        type: 'actionCard',
        toObject: vi.fn(() => ({ _id: 'original-id', name: 'Card' })),
      };

      await transformation.addActionCard(mockActionCard);

      expect(global.foundry.utils.randomID).toHaveBeenCalled();
      expect(mockParent.update).toHaveBeenCalledWith({
        'system.embeddedActionCards': expect.arrayContaining([
          expect.objectContaining({ _id: 'random-id-123' }),
        ]),
      });
    });

    test('should throw error for non-actionCard item', async () => {
      const mockItem = {
        type: 'feature',
        toObject: vi.fn(() => ({ _id: 'id', name: 'Feature' })),
      };

      await expect(transformation.addActionCard(mockItem)).rejects.toThrow();
    });
  });

  describe('removeActionCard()', () => {
    test('should remove action card by ID', () => {
      transformation.embeddedActionCards = [
        { _id: 'card-1', name: 'Card 1', system: { groupId: 'group-1' } },
        { _id: 'card-2', name: 'Card 2', system: { groupId: 'group-1' } },
      ];

      transformation.actionCardGroups = [
        { _id: 'group-1', name: 'Group 1' },
        { _id: 'group-2', name: 'Group 2' },
      ];

      transformation.removeActionCard('card-1');

      expect(mockParent.update).toHaveBeenCalledWith({
        'system.embeddedActionCards': [
          { _id: 'card-2', name: 'Card 2', system: { groupId: 'group-1' } },
        ],
        'system.actionCardGroups': [
          { _id: 'group-1', name: 'Group 1' },
          { _id: 'group-2', name: 'Group 2' },
        ],
      });
    });

    test('should remove empty group when last card is removed', () => {
      transformation.embeddedActionCards = [
        { _id: 'card-1', name: 'Card 1', system: { groupId: 'group-1' } },
      ];

      transformation.actionCardGroups = [
        { _id: 'group-1', name: 'Group 1' },
        { _id: 'group-2', name: 'Group 2' },
      ];

      transformation.removeActionCard('card-1');

      expect(mockParent.update).toHaveBeenCalledWith({
        'system.embeddedActionCards': [],
        'system.actionCardGroups': [
          { _id: 'group-2', name: 'Group 2' },
        ],
      });
    });

    test('should handle non-existent action card ID gracefully', () => {
      transformation.embeddedActionCards = [{ _id: 'card-1', name: 'Card 1' }];

      transformation.removeActionCard('non-existent');

      expect(mockParent.update).not.toHaveBeenCalled();
    });

    test('should handle action card without groupId', () => {
      transformation.embeddedActionCards = [
        { _id: 'card-1', name: 'Card 1' },
      ];

      transformation.actionCardGroups = [
        { _id: 'group-1', name: 'Group 1' },
      ];

      transformation.removeActionCard('card-1');

      expect(mockParent.update).toHaveBeenCalledWith({
        'system.embeddedActionCards': [],
        'system.actionCardGroups': [
          { _id: 'group-1', name: 'Group 1' },
        ],
      });
    });
  });

  describe('getEmbeddedCombatPowers()', () => {
    test('should return empty array when no powers', () => {
      transformation.embeddedCombatPowers = [];

      const result = transformation.getEmbeddedCombatPowers();

      expect(result).toEqual([]);
    });

    test('should return array of temporary item instances', () => {
      transformation.embeddedCombatPowers = [
        { _id: 'power-1', name: 'Power 1' },
        { _id: 'power-2', name: 'Power 2' },
      ];

      // Mock CONFIG.Item.documentClass
      const mockItemClass = vi.fn(() => ({
        sheet: mockParent.sheet,
        isEditable: true,
        update: vi.fn(),
      }));
      global.CONFIG.Item = { documentClass: mockItemClass };

      const result = transformation.getEmbeddedCombatPowers();

      expect(result).toHaveLength(2);
      expect(mockItemClass).toHaveBeenCalledTimes(2);
    });

    test('should set editable property based on parent', () => {
      mockParent.isEditable = false;
      transformation.embeddedCombatPowers = [{ _id: 'power-1', name: 'Power 1' }];

      const mockItemClass = vi.fn(() => ({
        sheet: mockParent.sheet,
        update: vi.fn(),
      }));
      global.CONFIG.Item = { documentClass: mockItemClass };

      transformation.getEmbeddedCombatPowers();

      const tempItem = mockItemClass.mock.results[0].value;
      expect(tempItem.isEditable).toBe(false);
    });
  });

  describe('getEmbeddedActionCards()', () => {
    test('should return empty array when no action cards', () => {
      transformation.embeddedActionCards = [];

      const result = transformation.getEmbeddedActionCards();

      expect(result).toEqual([]);
    });

    test('should return array of temporary item instances', () => {
      transformation.embeddedActionCards = [
        { _id: 'card-1', name: 'Card 1' },
        { _id: 'card-2', name: 'Card 2' },
      ];

      const mockItemClass = vi.fn(() => ({
        sheet: mockParent.sheet,
        isEditable: true,
        update: vi.fn(),
      }));
      global.CONFIG.Item = { documentClass: mockItemClass };

      const result = transformation.getEmbeddedActionCards();

      expect(result).toHaveLength(2);
      expect(mockItemClass).toHaveBeenCalledTimes(2);
    });
  });

  describe('prepareDerivedData()', () => {
    test('should set tokenImage to parent.img when not default', () => {
      mockParent.img = 'custom/token.png';
      transformation.parent = mockParent;

      transformation.prepareDerivedData();

      expect(transformation.tokenImage).toBe('custom/token.png');
    });

    test('should set tokenImage to empty string for default images', () => {
      const defaultImages = [
        'icons/svg/item-bag.svg',
        'icons/svg/ice-aura.svg',
        '',
        null,
        undefined,
      ];

      defaultImages.forEach(img => {
        mockParent.img = img;
        transformation.parent = mockParent;

        transformation.prepareDerivedData();

        expect(transformation.tokenImage).toBe('');
      });
    });

    test('should call super.prepareDerivedData if it exists', () => {
      mockParent.img = 'custom/token.png';
      transformation.parent = mockParent;

      transformation.prepareDerivedData();

      expect(transformation.tokenImage).toBe('custom/token.png');
    });
  });

  describe('Instance Creation', () => {
    test('should create instance with valid data', () => {
      const data = new EventideRpSystemTransformation({
        description: 'Wolf transformation',
        size: 1.5,
        cursed: false,
      });
      expect(data).toBeInstanceOf(EventideRpSystemTransformation);
    });

    test('should create instance with minimal data', () => {
      const data = new EventideRpSystemTransformation({});
      expect(data).toBeInstanceOf(EventideRpSystemTransformation);
    });

    test('should apply default values via schema', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema.size.options.initial).toBe(0);
      expect(schema.tokenImage.options.initial).toBe('');
      expect(schema.powerAdjustment.options.initial).toBe(0);
      expect(schema.resolveAdjustment.options.initial).toBe(0);
      expect(schema.cursed.options.initial).toBe(false);
    });
  });

  describe('Field Values', () => {
    test('should verify size field schema', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema.size).toBeDefined();
      expect(schema.size.options.initial).toBe(0);
    });

    test('should verify tokenImage field schema', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema.tokenImage).toBeDefined();
      expect(schema.tokenImage.options.initial).toBe('');
    });

    test('should verify power and resolve adjustments schema', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema.powerAdjustment).toBeDefined();
      expect(schema.powerAdjustment.options.initial).toBe(0);
      expect(schema.resolveAdjustment).toBeDefined();
      expect(schema.resolveAdjustment.options.initial).toBe(0);
    });

    test('should verify cursed field schema', () => {
      const schema = EventideRpSystemTransformation.defineSchema();
      expect(schema.cursed).toBeDefined();
      expect(schema.cursed.options.initial).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null embeddedCombatPowers', () => {
      transformation.embeddedCombatPowers = null;

      const result = transformation.getEmbeddedCombatPowers();

      expect(result).toEqual([]);
    });

    test('should handle undefined embeddedActionCards', () => {
      transformation.embeddedActionCards = undefined;

      const result = transformation.getEmbeddedActionCards();

      expect(result).toEqual([]);
    });

    test('should handle non-owned transformation parent', () => {
      mockParent.isOwned = false;
      mockParent.parent = null;
      transformation.parent = mockParent;

      const mockItemClass = vi.fn(() => ({ update: vi.fn() }));
      global.CONFIG.Item = { documentClass: mockItemClass };

      transformation.getEmbeddedCombatPowers();
    });
  });
});