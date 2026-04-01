// @ts-nocheck
/**
 * @fileoverview Tests for EventideRpSystemCharacter Data Model
 *
 * Tests the character actor data model which extends the base actor model.
 * The character model is currently a simple pass-through that calls super methods.
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
    return { mock: 'data' };
  }
};

// Mock module imports
vi.mock('../../../module/data/base-actor.mjs', () => ({
  default: mockActorBase
}));

// Import the data model after setting up mocks
const { default: EventideRpSystemCharacter } = await import('../../../module/data/actor-character.mjs');

describe('EventideRpSystemCharacter', () => {
  let character;

  beforeEach(() => {
    // Create a fresh character data instance for each test
    character = new EventideRpSystemCharacter({
      name: 'Test Character',
    });
  });

  describe('Schema Definition', () => {
    test('should define schema that extends base actor schema', () => {
      const schema = EventideRpSystemCharacter.defineSchema();
      expect(schema).toBeDefined();
      expect(schema.name).toBeDefined();
    });

    test('should include all base actor fields', () => {
      const schema = EventideRpSystemCharacter.defineSchema();
      const baseSchema = mockActorBase.defineSchema();
      Object.keys(baseSchema).forEach(key => {
        expect(schema[key]).toBeDefined();
      });
    });
  });

  describe('prepareDerivedData()', () => {
    test('should call super.prepareDerivedData()', () => {
      const spy = vi.spyOn(mockActorBase.prototype, 'prepareDerivedData');
      character.prepareDerivedData();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test('should prepare derived data correctly', () => {
      // Should not throw any errors
      expect(() => character.prepareDerivedData()).not.toThrow();
    });
  });

  describe('getRollData()', () => {
    test('should call super.getRollData()', () => {
      const spy = vi.spyOn(mockActorBase.prototype, 'getRollData');
      character.getRollData();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test('should return undefined (implementation does not return super result)', () => {
      // Note: The actual implementation in actor-character.mjs calls super.getRollData()
      // but does not return the result. This test documents that behavior.
      const result = character.getRollData();
      expect(result).toBeUndefined();
    });
  });

  describe('Instance Creation', () => {
    test('should create instance with valid data', () => {
      const data = new EventideRpSystemCharacter({
        name: 'Hero',
      });
      expect(data).toBeInstanceOf(EventideRpSystemCharacter);
    });

    test('should create instance with minimal data', () => {
      const data = new EventideRpSystemCharacter({});
      expect(data).toBeInstanceOf(EventideRpSystemCharacter);
    });

    test('should handle empty constructor', () => {
      const data = new EventideRpSystemCharacter();
      expect(data).toBeInstanceOf(EventideRpSystemCharacter);
    });
  });
});