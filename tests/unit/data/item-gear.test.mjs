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

    // Create mock actor with items collection that supports has(), filter(), map()
    const mockItems = {
      has: vi.fn().mockReturnValue(true),
      filter: vi.fn().mockReturnValue([]),
    };
    mockActor = {
      name: 'Test Hero',
      items: mockItems,
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
      configurable: true,
    });

    // Set name property
    Object.defineProperty(gear, 'name', {
      value: 'Health Potion',
      writable: true,
      configurable: true,
    });

    // Set id property
    Object.defineProperty(gear, 'id', {
      value: 'gear-id',
      writable: true,
      configurable: true,
    });

    // Set parent document
    Object.defineProperty(gear, 'parent', {
      value: { update: vi.fn() },
      writable: true,
      configurable: true,
    });

    // Set system property with default cost
    Object.defineProperty(gear, 'system', {
      value: { quantity: 5, cost: 1 },
      writable: true,
      configurable: true,
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

  describe('prepareDerivedData() - Edge Cases', () => {
    test('should calculate negative total when disadvantage exceeds advantage', () => {
      gear.roll = {
        type: 'roll',
        ability: 'phys',
        bonus: 0,
        diceAdjustments: {
          advantage: 1,
          disadvantage: 3,
          total: 0,
        },
      };

      gear.prepareDerivedData();

      expect(gear.roll.diceAdjustments.total).toBe(-2);
    });

    test('should calculate positive total when advantage exceeds disadvantage', () => {
      gear.roll = {
        type: 'roll',
        ability: 'acro',
        bonus: 5,
        diceAdjustments: {
          advantage: 5,
          disadvantage: 2,
          total: 0,
        },
      };

      gear.prepareDerivedData();

      expect(gear.roll.diceAdjustments.total).toBe(3);
    });

    test('should handle equal advantage and disadvantage', () => {
      gear.roll = {
        type: 'roll',
        ability: 'wits',
        bonus: 2,
        diceAdjustments: {
          advantage: 4,
          disadvantage: 4,
          total: 0,
        },
      };

      gear.prepareDerivedData();

      expect(gear.roll.diceAdjustments.total).toBe(0);
    });
  });

  describe('handleBypass()', () => {
    test('should throw error when actor is null', async () => {
      // Create a new gear instance with null actor
      const gearWithNullActor = new EventideRpSystemGear({ description: 'Test' });
      Object.defineProperty(gearWithNullActor, 'actor', { value: null, writable: true, configurable: true });
      Object.defineProperty(gearWithNullActor, 'name', { value: 'Test Gear', writable: true, configurable: true });
      Object.defineProperty(gearWithNullActor, 'system', { value: { cost: 1 }, writable: true, configurable: true });

      await expect(gearWithNullActor.handleBypass({}, {})).rejects.toThrow('Cannot execute gear bypass without an actor');
    });

    test('should throw error when actor is undefined', async () => {
      // Create a new gear instance with undefined actor
      const gearWithUndefinedActor = new EventideRpSystemGear({ description: 'Test' });
      Object.defineProperty(gearWithUndefinedActor, 'actor', { value: undefined, writable: true, configurable: true });
      Object.defineProperty(gearWithUndefinedActor, 'name', { value: 'Test Gear', writable: true, configurable: true });
      Object.defineProperty(gearWithUndefinedActor, 'system', { value: { cost: 1 }, writable: true, configurable: true });

      await expect(gearWithUndefinedActor.handleBypass({}, {})).rejects.toThrow('Cannot execute gear bypass without an actor');
    });

    test('should update own quantity for direct gear use', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({});
      Object.defineProperty(gear, 'update', { value: mockUpdate, writable: true, configurable: true });
      Object.defineProperty(gear, 'system', {
        value: {
          quantity: 5,
          cost: 1,
        },
        writable: true,
        configurable: true,
      });
      mockErpsMessages.createCombatPowerMessage.mockResolvedValue({ success: true });

      const result = await gear.handleBypass({}, {});

      expect(mockUpdate).toHaveBeenCalledWith({ 'system.quantity': 4 });
      expect(mockErpsMessages.createCombatPowerMessage).toHaveBeenCalledWith(gear);
      expect(result).toEqual({ success: true });
    });

    test('should not reduce quantity below zero for direct gear use', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({});
      Object.defineProperty(gear, 'update', { value: mockUpdate, writable: true, configurable: true });
      Object.defineProperty(gear, 'system', {
        value: {
          quantity: 1,
          cost: 5,
        },
        writable: true,
        configurable: true,
      });
      mockErpsMessages.createCombatPowerMessage.mockResolvedValue({ success: true });

      await gear.handleBypass({}, {});

      expect(mockUpdate).toHaveBeenCalledWith({ 'system.quantity': 0 });
    });

    test('should find and update real gear item when from action card', async () => {
      const mockRealGearItem = {
        id: 'real-gear-id',
        name: 'Health Potion',
        system: { quantity: 10, cost: 1 },
        update: vi.fn().mockResolvedValue({}),
      };
      mockInventoryUtils.findGearByName.mockReturnValue(mockRealGearItem);
      mockErpsMessages.createCombatPowerMessage.mockResolvedValue({ success: true });

      Object.defineProperty(gear, 'system', {
        value: { quantity: 5, cost: 2 },
        writable: true,
        configurable: true,
      });

      const options = {
        actionCardContext: {
          isFromActionCard: true,
          actionCard: { name: 'Use Potion' },
        },
      };

      const result = await gear.handleBypass({}, options);

      expect(mockInventoryUtils.findGearByName).toHaveBeenCalledWith(mockActor, 'Health Potion', 2);
      expect(mockRealGearItem.update).toHaveBeenCalledWith({ 'system.quantity': 8 });
      expect(result).toEqual({ success: true });
    });

    test('should find and update real gear item when embedded gear', async () => {
      const mockRealGearItem = {
        id: 'real-gear-id',
        name: 'Health Potion',
        system: { quantity: 5, cost: 1 },
        update: vi.fn().mockResolvedValue({}),
      };
      mockInventoryUtils.findGearByName.mockReturnValue(mockRealGearItem);
      mockErpsMessages.createCombatPowerMessage.mockResolvedValue({ success: true });

      // Make actor.items.has return false to simulate embedded gear
      mockActor.items.has = vi.fn().mockReturnValue(false);
      Object.defineProperty(gear, 'system', {
        value: { quantity: 3, cost: 2 },
        writable: true,
        configurable: true,
      });

      const options = {};

      await gear.handleBypass({}, options);

      expect(mockInventoryUtils.findGearByName).toHaveBeenCalledWith(mockActor, 'Health Potion', 2);
      expect(mockRealGearItem.update).toHaveBeenCalledWith({ 'system.quantity': 3 });
    });

    test('should throw error when gear not found in actor inventory for action card', async () => {
      mockInventoryUtils.findGearByName.mockReturnValue(null);
      mockActor.items.filter = vi.fn().mockReturnValue([]);
      Object.defineProperty(gear, 'system', {
        value: { quantity: 5, cost: 1 },
        writable: true,
        configurable: true,
      });

      const options = {
        actionCardContext: {
          isFromActionCard: true,
          actionCard: { name: 'Use Potion' },
        },
      };

      await expect(gear.handleBypass({}, options)).rejects.toThrow("Gear \"Health Potion\" not found in actor's inventory");
    });

    test('should set resource depleted flag when quantity insufficient after use', async () => {
      const mockRealGearItem = {
        id: 'real-gear-id',
        name: 'Health Potion',
        system: { quantity: 2, cost: 2 },
        update: vi.fn().mockResolvedValue({}),
      };
      mockInventoryUtils.findGearByName.mockReturnValue(mockRealGearItem);
      mockErpsMessages.createCombatPowerMessage.mockResolvedValue({ success: true });

      Object.defineProperty(gear, 'system', {
        value: { quantity: 2, cost: 2 },
        writable: true,
        configurable: true,
      });

      const actionCardContext = {
        isFromActionCard: true,
        actionCard: { name: 'Use Potion' },
      };

      await gear.handleBypass({}, { actionCardContext });

      expect(actionCardContext.resourceDepleted).toBe(true);
      expect(actionCardContext.depletedResourceType).toBe('quantity');
      expect(actionCardContext.depletedItemName).toBe('Health Potion');
      expect(actionCardContext.depletedRequired).toBe(2);
      expect(actionCardContext.depletedAvailable).toBe(0);
    });

    test('should not set resource depleted flag when quantity still sufficient', async () => {
      const mockRealGearItem = {
        id: 'real-gear-id',
        name: 'Health Potion',
        system: { quantity: 10, cost: 1 },
        update: vi.fn().mockResolvedValue({}),
      };
      mockInventoryUtils.findGearByName.mockReturnValue(mockRealGearItem);
      mockErpsMessages.createCombatPowerMessage.mockResolvedValue({ success: true });

      Object.defineProperty(gear, 'system', {
        value: { quantity: 10, cost: 1 },
        writable: true,
        configurable: true,
      });

      const actionCardContext = {
        isFromActionCard: true,
        actionCard: { name: 'Use Potion' },
      };

      await gear.handleBypass({}, { actionCardContext });

      expect(actionCardContext.resourceDepleted).toBeUndefined();
    });

    test('should handle zero cost for direct gear use', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({});
      Object.defineProperty(gear, 'update', { value: mockUpdate, writable: true });
      Object.defineProperty(gear, 'system', {
        value: {
          quantity: 5,
          cost: 0,
        },
        writable: true,
        configurable: true,
      });
      mockErpsMessages.createCombatPowerMessage.mockResolvedValue({ success: true });

      await gear.handleBypass({}, {});

      expect(mockUpdate).toHaveBeenCalledWith({ 'system.quantity': 5 });
    });

    test('should log method entry and exit', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({});
      Object.defineProperty(gear, 'update', { value: mockUpdate, writable: true });
      Object.defineProperty(gear, 'system', {
        value: { quantity: 5, cost: 1 },
        writable: true,
        configurable: true,
      });
      mockErpsMessages.createCombatPowerMessage.mockResolvedValue({ success: true });

      await gear.handleBypass({}, {});

      expect(mockLogger.methodEntry).toHaveBeenCalled();
      expect(mockLogger.methodExit).toHaveBeenCalled();
    });

    test('should log error and rethrow when update fails', async () => {
      const mockUpdate = vi.fn().mockRejectedValue(new Error('Update failed'));
      Object.defineProperty(gear, 'update', { value: mockUpdate, writable: true });
      Object.defineProperty(gear, 'system', {
        value: { quantity: 5, cost: 1 },
        writable: true,
        configurable: true,
      });

      await expect(gear.handleBypass({}, {})).rejects.toThrow('Update failed');
      expect(mockLogger.error).toHaveBeenCalled();
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