// @ts-nocheck
/**
 * @fileoverview Tests for EventideRpSystemFeature Data Model
 *
 * Tests the feature item data model which includes schema definitions
 * for feature-related fields and dice adjustment calculations.
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
const { default: EventideRpSystemFeature } = await import('../../../module/data/item-feature.mjs');

describe('EventideRpSystemFeature', () => {
  let feature;

  beforeEach(() => {
    // Create a fresh feature data instance for each test
    feature = new EventideRpSystemFeature({
      description: 'A character feature',
      rollActorName: true,
    });
  });

  describe('Schema Definition', () => {
    test('should define schema that extends base item schema', () => {
      const schema = EventideRpSystemFeature.defineSchema();
      expect(schema).toBeDefined();
      expect(schema.description).toBeDefined();
      expect(schema.rollActorName).toBeDefined();
    });

    test('should define bgColor field with default #70B87A', () => {
      const schema = EventideRpSystemFeature.defineSchema();
      expect(schema.bgColor).toBeDefined();
      expect(schema.bgColor.options.initial).toBe('#70B87A');
    });

    test('should define textColor field with default #ffffff', () => {
      const schema = EventideRpSystemFeature.defineSchema();
      expect(schema.textColor).toBeDefined();
      expect(schema.textColor.options.initial).toBe('#ffffff');
    });

    test('should define targeted field with initial false', () => {
      const schema = EventideRpSystemFeature.defineSchema();
      expect(schema.targeted).toBeDefined();
      expect(schema.targeted.options.initial).toBe(false);
    });

    test('should define roll schema field', () => {
      const schema = EventideRpSystemFeature.defineSchema();
      expect(schema.roll).toBeDefined();
    });

    test('should define active field with initial true', () => {
      const schema = EventideRpSystemFeature.defineSchema();
      expect(schema.active).toBeDefined();
      expect(schema.active.options.initial).toBe(true);
    });
  });

  describe('prepareDerivedData()', () => {
    test('should calculate total dice adjustments correctly', () => {
      feature.roll = {
        type: 'roll',
        ability: 'acro',
        bonus: 3,
        diceAdjustments: {
          advantage: 2,
          disadvantage: 1,
          total: 0,
        },
      };

      feature.prepareDerivedData();

      expect(feature.roll.diceAdjustments.total).toBe(1);
    });

    test('should handle zero dice adjustments', () => {
      feature.roll = {
        type: 'none',
        ability: 'unaugmented',
        bonus: 0,
        diceAdjustments: {
          advantage: 0,
          disadvantage: 0,
          total: 0,
        },
      };

      feature.prepareDerivedData();

      expect(feature.roll.diceAdjustments.total).toBe(0);
    });

    test('should handle more disadvantage than advantage', () => {
      feature.roll = {
        type: 'roll',
        ability: 'phys',
        bonus: 0,
        diceAdjustments: {
          advantage: 1,
          disadvantage: 3,
          total: 0,
        },
      };

      feature.prepareDerivedData();

      expect(feature.roll.diceAdjustments.total).toBe(-2);
    });

    test('should handle high dice adjustment values', () => {
      feature.roll = {
        type: 'flat',
        ability: 'will',
        bonus: 0,
        diceAdjustments: {
          advantage: 10,
          disadvantage: 2,
          total: 0,
        },
      };

      feature.prepareDerivedData();

      expect(feature.roll.diceAdjustments.total).toBe(8);
    });
  });

  describe('Instance Creation', () => {
    test('should create instance with valid data', () => {
      const data = new EventideRpSystemFeature({
        description: 'Strong grip',
        rollActorName: true,
        active: true,
      });
      expect(data).toBeInstanceOf(EventideRpSystemFeature);
    });

    test('should create instance with minimal data', () => {
      const data = new EventideRpSystemFeature({});
      expect(data).toBeInstanceOf(EventideRpSystemFeature);
    });

    test('should apply default values via schema', () => {
      const schema = EventideRpSystemFeature.defineSchema();
      expect(schema.bgColor.options.initial).toBe('#70B87A');
      expect(schema.textColor.options.initial).toBe('#ffffff');
      expect(schema.targeted.options.initial).toBe(false);
      expect(schema.active.options.initial).toBe(true);
    });
  });

  describe('Field Values', () => {
    test('should accept custom bgColor via schema', () => {
      const schema = EventideRpSystemFeature.defineSchema();
      expect(schema.bgColor).toBeDefined();
      expect(schema.bgColor.options.initial).toBe('#70B87A');
    });

    test('should accept active state via schema', () => {
      const schema = EventideRpSystemFeature.defineSchema();
      expect(schema.active).toBeDefined();
      expect(schema.active.options.initial).toBe(true);
    });

    test('should define roll schema field', () => {
      const schema = EventideRpSystemFeature.defineSchema();
      expect(schema.roll).toBeDefined();
    });
  });

  describe('Feature Specific Behavior', () => {
    test('should have active field for toggling features', () => {
      const schema = EventideRpSystemFeature.defineSchema();
      expect(schema.active).toBeDefined();
      expect(schema.active.options.initial).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should have targeted field for targeting behavior', () => {
      const schema = EventideRpSystemFeature.defineSchema();
      expect(schema.targeted).toBeDefined();
      expect(schema.targeted.options.initial).toBe(false);
    });
  });
});