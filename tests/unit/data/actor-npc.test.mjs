// @ts-nocheck
/**
 * @fileoverview Tests for EventideRpSystemNPC Data Model
 *
 * Tests the NPC actor data model which extends the base actor model.
 * The NPC model is currently a simple pass-through that calls super methods.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock the EventideRpSystemActorBase
const mockActorBase = class {
  static defineSchema() {
    const fields = global.foundry.data.fields;
    return {
      name: new fields.StringField({ required: true, initial: '' }),
    };
  }

  prepareDerivedData() {
    // Mock implementation
  }

  getRollData() {
    return { mock: 'npc-data', cr: 5, xp: 1200 };
  }
};

// Mock module imports
vi.mock('../../../module/data/base-actor.mjs', () => ({
  default: mockActorBase
}));

// Import the data model after setting up mocks
const { default: EventideRpSystemNPC } = await import('../../../module/data/actor-npc.mjs');

describe('EventideRpSystemNPC', () => {
  let npc;

  beforeEach(() => {
    // Create a fresh NPC data instance for each test
    npc = new EventideRpSystemNPC({
      name: 'Test NPC',
    });
  });

  describe('Schema Definition', () => {
    test('should define schema that extends base actor schema', () => {
      const schema = EventideRpSystemNPC.defineSchema();
      expect(schema).toBeDefined();
      expect(schema.name).toBeDefined();
    });

    test('should include all base actor fields', () => {
      const schema = EventideRpSystemNPC.defineSchema();
      const baseSchema = mockActorBase.defineSchema();
      Object.keys(baseSchema).forEach(key => {
        expect(schema[key]).toBeDefined();
      });
    });
  });

  describe('prepareDerivedData()', () => {
    test('should call super.prepareDerivedData()', () => {
      const spy = vi.spyOn(mockActorBase.prototype, 'prepareDerivedData');
      npc.prepareDerivedData();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test('should prepare derived data correctly', () => {
      // Should not throw any errors
      expect(() => npc.prepareDerivedData()).not.toThrow();
    });
  });

  describe('getRollData()', () => {
    test('should call super.getRollData()', () => {
      const spy = vi.spyOn(mockActorBase.prototype, 'getRollData');
      npc.getRollData();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test('should return roll data from base actor', () => {
      const result = npc.getRollData();
      expect(result).toEqual({ mock: 'npc-data', cr: 5, xp: 1200 });
    });

    test('should include CR and XP in returned data', () => {
      const result = npc.getRollData();
      expect(result.cr).toBe(5);
      expect(result.xp).toBe(1200);
    });
  });

  describe('Instance Creation', () => {
    test('should create instance with valid data', () => {
      const data = new EventideRpSystemNPC({
        name: 'Orc Warrior',
      });
      expect(data).toBeInstanceOf(EventideRpSystemNPC);
    });

    test('should create instance with minimal data', () => {
      const data = new EventideRpSystemNPC({});
      expect(data).toBeInstanceOf(EventideRpSystemNPC);
    });

    test('should handle empty constructor', () => {
      const data = new EventideRpSystemNPC();
      expect(data).toBeInstanceOf(EventideRpSystemNPC);
    });
  });

  describe('NPC Specific Behavior', () => {
    test('should handle NPC-specific derived data calculations', () => {
      // NPC can have custom derived data in the future
      expect(() => npc.prepareDerivedData()).not.toThrow();
    });

    test('should handle NPC-specific roll data', () => {
      const result = npc.getRollData();
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });
});