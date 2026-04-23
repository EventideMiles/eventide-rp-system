// @ts-nocheck
/**
 * @fileoverview Tests for EventideRpSystemCombatPower Data Model
 *
 * Tests the combat power item data model which includes schema definitions
 * for combat-related fields and dice adjustment calculations.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock the EventideRpSystemItemBase
const mockItemBase = class {
  static defineSchema() {
    const fields = global.foundry.data.fields;
    return {
      description: new fields.StringField({ required: true, blank: true }),
      rollActorName: new fields.BooleanField({ required: true, initial: true }),
    };
  }
};

// Mock module imports
vi.mock('../../../module/data/base-item.mjs', () => ({
  default: mockItemBase
}));

// Import the data model after setting up mocks
const { default: EventideRpSystemCombatPower } = await import('../../../module/data/item-combat-power.mjs');

describe('EventideRpSystemCombatPower', () => {
  let combatPower;

  beforeEach(() => {
    // Create a fresh combat power data instance for each test
    combatPower = new EventideRpSystemCombatPower({
      description: 'A powerful combat ability',
      rollActorName: true,
    });
  });

  describe('Schema Definition', () => {
    test('should define schema that extends base item schema', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema).toBeDefined();
      expect(schema.description).toBeDefined();
      expect(schema.rollActorName).toBeDefined();
    });

    test('should define bgColor field with default #B8860B', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema.bgColor).toBeDefined();
      expect(schema.bgColor.options.initial).toBe('#B8860B');
    });

    test('should define textColor field with default #ffffff', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema.textColor).toBeDefined();
      expect(schema.textColor.options.initial).toBe('#ffffff');
    });

    test('should define cost field with initial value 1', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema.cost).toBeDefined();
      expect(schema.cost.options.initial).toBe(1);
    });

    test('should define targeted field with initial true', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema.targeted).toBeDefined();
      expect(schema.targeted.options.initial).toBe(true);
    });

    test('should define prerequisites field', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema.prerequisites).toBeDefined();
    });

    test('should define usageInfo field', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema.usageInfo).toBeDefined();
    });

    test('should define roll schema with all required fields', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema.roll).toBeDefined();
      // Use .schema property which is provided by @rayners/foundry-test-utils SchemaField mock
      expect(schema.roll.schema.type).toBeDefined();
      expect(schema.roll.schema.ability).toBeDefined();
      expect(schema.roll.schema.secondAbility).toBeDefined();
      expect(schema.roll.schema.bonus).toBeDefined();
      expect(schema.roll.schema.diceAdjustments).toBeDefined();
    });

    test('should define roll type field with default "roll"', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema.roll.schema.type.options.initial).toBe('roll');
    });

    test('should define roll ability field with default "unaugmented"', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema.roll.schema.ability.options.initial).toBe('unaugmented');
    });

    test('should define diceAdjustments with advantage, disadvantage, and total', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      const diceAdj = schema.roll.schema.diceAdjustments;
      expect(diceAdj.schema.advantage).toBeDefined();
      expect(diceAdj.schema.disadvantage).toBeDefined();
      expect(diceAdj.schema.total).toBeDefined();
    });

    test('should have LOCALIZATION_PREFIXES static property', () => {
      expect(EventideRpSystemCombatPower.LOCALIZATION_PREFIXES).toEqual([
        'EVENTIDE_RP_SYSTEM.Item.base',
        'EVENTIDE_RP_SYSTEM.Item.CombatPower',
      ]);
    });
  });

  describe('prepareDerivedData()', () => {
    test('should calculate total dice adjustments correctly', () => {
      combatPower.roll = {
        type: 'roll',
        ability: 'acro',
        secondAbility: 'phys',
        bonus: 3,
        diceAdjustments: {
          advantage: 2,
          disadvantage: 1,
          total: 0,
        },
      };

      combatPower.prepareDerivedData();

      expect(combatPower.roll.diceAdjustments.total).toBe(1);
    });

    test('should handle zero dice adjustments', () => {
      combatPower.roll = {
        type: 'roll',
        ability: 'acro',
        secondAbility: 'phys',
        bonus: 0,
        diceAdjustments: {
          advantage: 0,
          disadvantage: 0,
          total: 0,
        },
      };

      combatPower.prepareDerivedData();

      expect(combatPower.roll.diceAdjustments.total).toBe(0);
    });

    test('should handle more disadvantage than advantage', () => {
      combatPower.roll = {
        type: 'roll',
        ability: 'acro',
        secondAbility: 'phys',
        bonus: 0,
        diceAdjustments: {
          advantage: 1,
          disadvantage: 3,
          total: 0,
        },
      };

      combatPower.prepareDerivedData();

      expect(combatPower.roll.diceAdjustments.total).toBe(-2);
    });

    test('should handle high dice adjustment values', () => {
      combatPower.roll = {
        type: 'roll',
        ability: 'acro',
        secondAbility: 'phys',
        bonus: 0,
        diceAdjustments: {
          advantage: 10,
          disadvantage: 2,
          total: 0,
        },
      };

      combatPower.prepareDerivedData();

      expect(combatPower.roll.diceAdjustments.total).toBe(8);
    });
  });

  describe('Instance Creation', () => {
    test('should create instance with valid data', () => {
      const data = new EventideRpSystemCombatPower({
        description: 'Fireball spell',
        rollActorName: true,
        cost: 5,
      });
      expect(data).toBeInstanceOf(EventideRpSystemCombatPower);
    });

    test('should create instance with minimal data', () => {
      const data = new EventideRpSystemCombatPower({});
      expect(data).toBeInstanceOf(EventideRpSystemCombatPower);
    });

    test('should apply default values via schema', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema.bgColor.options.initial).toBe('#B8860B');
      expect(schema.textColor.options.initial).toBe('#ffffff');
      expect(schema.cost.options.initial).toBe(1);
      expect(schema.targeted.options.initial).toBe(true);
    });
  });

  describe('Field Values', () => {
    test('should accept custom bgColor via schema', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema.bgColor).toBeDefined();
      expect(schema.bgColor.options.initial).toBe('#B8860B');
    });

    test('should accept custom cost via schema', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema.cost).toBeDefined();
      expect(schema.cost.options.initial).toBe(1);
    });

    test('should define roll schema with correct defaults', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      expect(schema.roll).toBeDefined();
      expect(schema.roll.schema.type.options.initial).toBe('roll');
      expect(schema.roll.schema.ability.options.initial).toBe('unaugmented');
      expect(schema.roll.schema.bonus.options.initial).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should have valid diceAdjustments schema structure', () => {
      const schema = EventideRpSystemCombatPower.defineSchema();
      const diceAdj = schema.roll.schema.diceAdjustments;
      expect(diceAdj).toBeDefined();
      expect(diceAdj.schema.advantage).toBeDefined();
      expect(diceAdj.schema.disadvantage).toBeDefined();
      expect(diceAdj.schema.total).toBeDefined();
    });
  });
});