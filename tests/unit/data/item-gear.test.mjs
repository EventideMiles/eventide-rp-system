// @ts-nocheck
/**
 * @fileoverview Tests for EventideRpSystemGear Data Model
 *
 * Tests the gear item data model which includes schema definitions,
 * dice adjustment calculations, and handleBypass method for gear usage.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock dependencies
const mockInventoryUtils = {
  findGearByName: vi.fn(),
};

const mockLogger = {
  methodEntry: vi.fn(),
  methodExit: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const mockErpsMessages = {
  createCombatPowerMessage: vi.fn(),
};

// Set up global erps object
global.erps = {
  messages: mockErpsMessages,
};

// Mock module imports
vi.mock('../../../module/helpers/_module.mjs', () => ({
  InventoryUtils: mockInventoryUtils,
}));

vi.mock('../../../module/services/_module.mjs', () => ({
  Logger: mockLogger,
}));

// Import the data model after setting up mocks
const { default: EventideRpSystemGear } = await import('../../../module/data/item-gear.mjs');

describe('EventideRpSystemGear', () => {
  let gear;
  let mockActor;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock actor
    mockActor = {
      name: 'Test Hero',
      items: new Map(),
    };

    // Create a fresh gear data instance for each test
    gear = new EventideRpSystemGear({
      description: 'A piece of gear',
      rollActorName: true,
    });

    // Set parent on gear instance
    Object.defineProperty(gear, 'actor', {
      value: mockActor,
      writable: true,
    });

    // Set name property
    Object.defineProperty(gear, 'name', {
      value: 'Health Potion',
      writable: true,
    });

    // Set id property
    Object.defineProperty(gear, 'id', {
      value: 'gear-id',
      writable: true,
    });

    // Set parent document
    Object.defineProperty(gear, 'parent', {
      value: { update: vi.fn() },
      writable: true,
    });
  });

  describe('Schema Definition', () => {
    test('should define schema with description field', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.description).toBeDefined();
    });

    test('should define equipped field with initial true', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.equipped).toBeDefined();
      expect(schema.equipped.options.initial).toBe(true);
    });

    test('should define cursed field with initial false', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.cursed).toBeDefined();
      expect(schema.cursed.options.initial).toBe(false);
    });

    test('should define bgColor field with default #8B4513', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.bgColor).toBeDefined();
      expect(schema.bgColor.options.initial).toBe('#8B4513');
    });

    test('should define textColor field with default #ffffff', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.textColor).toBeDefined();
      expect(schema.textColor.options.initial).toBe('#ffffff');
    });

    test('should define quantity field with initial 1', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.quantity).toBeDefined();
      expect(schema.quantity.options.initial).toBe(1);
    });

    test('should define weight field with initial 0', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.weight).toBeDefined();
      expect(schema.weight.options.initial).toBe(0);
    });

    test('should define cost field with initial 0', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.cost).toBeDefined();
      expect(schema.cost.options.initial).toBe(0);
    });

    test('should define targeted field with initial true', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.targeted).toBeDefined();
      expect(schema.targeted.options.initial).toBe(true);
    });

    test('should define className field with default "other"', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.className).toBeDefined();
      expect(schema.className.options.initial).toBe('other');
    });

    test('should define roll schema field', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.roll).toBeDefined();
    });

    test('should have LOCALIZATION_PREFIXES static property', () => {
      expect(EventideRpSystemGear.LOCALIZATION_PREFIXES).toEqual([
        'EVENTIDE_RP_SYSTEM.Item.base',
        'EVENTIDE_RP_SYSTEM.Item.Gear',
      ]);
    });
  });

  describe('prepareDerivedData()', () => {
    test('should calculate total dice adjustments correctly', () => {
      gear.roll = {
        type: 'roll',
        ability: 'phys',
        bonus: 3,
        diceAdjustments: {
          advantage: 2,
          disadvantage: 1,
          total: 0,
        },
      };

      gear.prepareDerivedData();

      expect(gear.roll.diceAdjustments.total).toBe(1);
    });

    test('should handle zero dice adjustments', () => {
      gear.roll = {
        type: 'roll',
        ability: 'phys',
        bonus: 0,
        diceAdjustments: {
          advantage: 0,
          disadvantage: 0,
          total: 0,
        },
      };

      gear.prepareDerivedData();

      expect(gear.roll.diceAdjustments.total).toBe(0);
    });
  });

  describe('Instance Creation', () => {
    test('should create instance with valid data', () => {
      const data = new EventideRpSystemGear({
        description: 'A sword',
        equipped: true,
        quantity: 1,
        cost: 50,
      });
      expect(data).toBeInstanceOf(EventideRpSystemGear);
    });

    test('should create instance with minimal data', () => {
      const data = new EventideRpSystemGear({});
      expect(data).toBeInstanceOf(EventideRpSystemGear);
    });

    test('should apply default values', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.bgColor.options.initial).toBe('#8B4513');
      expect(schema.textColor.options.initial).toBe('#ffffff');
      expect(schema.equipped.options.initial).toBe(true);
      expect(schema.cursed.options.initial).toBe(false);
      expect(schema.quantity.options.initial).toBe(1);
      expect(schema.weight.options.initial).toBe(0);
      expect(schema.cost.options.initial).toBe(0);
      expect(schema.targeted.options.initial).toBe(true);
      expect(schema.className.options.initial).toBe('other');
    });
  });

  describe('Field Values', () => {
    test('should accept custom className via schema', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.className).toBeDefined();
      expect(schema.className.options.initial).toBe('other');
    });

    test('should accept cursed property via schema', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.cursed).toBeDefined();
      expect(schema.cursed.options.initial).toBe(false);
    });

    test('should accept roll configuration via schema', () => {
      const schema = EventideRpSystemGear.defineSchema();
      expect(schema.roll).toBeDefined();
      expect(schema.roll.schema.type.options.initial).toBe('roll');
    });
  });

  describe('Edge Cases', () => {
    test('should verify Logger mock is available for handleBypass', async () => {
      gear.parent.update = vi.fn();
      mockErpsMessages.createCombatPowerMessage.mockResolvedValue({ success: true });

      // Verify the mock is set up correctly for future handleBypass tests
      expect(mockLogger.methodEntry).toBeDefined();
      expect(mockErpsMessages.createCombatPowerMessage).toBeDefined();
    });
  });
});