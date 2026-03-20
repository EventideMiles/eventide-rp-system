// @ts-nocheck
/**
 * @fileoverview Tests for EventideRpSystemItemBase Data Model
 *
 * Tests the base item data model that defines common schema and functionality
 * shared by all item types in the Eventide RP System.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock the EventideRpSystemDataModel
const mockDataModel = class {
  static defineSchema() {
    return {};
  }
};

// Mock module imports
vi.mock('../../../module/data/base-model.mjs', () => ({
  default: mockDataModel
}));

// Import the data model after setting up mocks
const { default: EventideRpSystemItemBase } = await import('../../../module/data/base-item.mjs');

describe('EventideRpSystemItemBase', () => {
  beforeEach(() => {
    // Create a fresh item data instance for each test
    new EventideRpSystemItemBase({
      description: 'Test item description',
      rollActorName: true,
    });
  });

  describe('Schema Definition', () => {
    test('should define schema with description field', () => {
      const schema = EventideRpSystemItemBase.defineSchema();
      expect(schema.description).toBeDefined();
    });

    test('should define description as required StringField', () => {
      const schema = EventideRpSystemItemBase.defineSchema();
      const descField = schema.description;
      expect(descField.constructor.name).toBe('StringField');
      expect(descField.options.required).toBe(true);
      expect(descField.options.blank).toBe(true);
    });

    test('should define schema with rollActorName field', () => {
      const schema = EventideRpSystemItemBase.defineSchema();
      expect(schema.rollActorName).toBeDefined();
    });

    test('should define rollActorName as BooleanField with initial true', () => {
      const schema = EventideRpSystemItemBase.defineSchema();
      const rollField = schema.rollActorName;
      expect(rollField.constructor.name).toBe('BooleanField');
      expect(rollField.options.required).toBe(true);
      expect(rollField.options.initial).toBe(true);
    });

    test('should include only base item fields in schema', () => {
      const schema = EventideRpSystemItemBase.defineSchema();
      const keys = Object.keys(schema);
      expect(keys).toHaveLength(2);
      expect(keys).toContain('description');
      expect(keys).toContain('rollActorName');
    });
  });

  describe('Instance Creation', () => {
    test('should create instance with valid data', () => {
      const data = new EventideRpSystemItemBase({
        description: 'A powerful sword',
        rollActorName: true,
      });
      expect(data).toBeInstanceOf(EventideRpSystemItemBase);
    });

    test('should create instance with minimal data', () => {
      const data = new EventideRpSystemItemBase({});
      expect(data).toBeInstanceOf(EventideRpSystemItemBase);
    });

    test('should handle empty constructor', () => {
      const data = new EventideRpSystemItemBase();
      expect(data).toBeInstanceOf(EventideRpSystemItemBase);
    });

    test('should apply default values for missing fields', () => {
      // Check that schema defines proper default values
      const schema = EventideRpSystemItemBase.defineSchema();
      expect(schema.description).toBeDefined();
      expect(schema.rollActorName.options.initial).toBe(true);
    });
  });

  describe('Field Values', () => {
    test('should define description field in schema', () => {
      const schema = EventideRpSystemItemBase.defineSchema();
      expect(schema.description).toBeDefined();
      expect(schema.description.constructor.name).toBe('StringField');
    });

    test('should define rollActorName field in schema', () => {
      const schema = EventideRpSystemItemBase.defineSchema();
      expect(schema.rollActorName).toBeDefined();
      expect(schema.rollActorName.constructor.name).toBe('BooleanField');
    });

    test('should set rollActorName default to true', () => {
      const schema = EventideRpSystemItemBase.defineSchema();
      expect(schema.rollActorName.options.initial).toBe(true);
    });

    test('should mark description as required with blank allowed', () => {
      const schema = EventideRpSystemItemBase.defineSchema();
      expect(schema.description.options.required).toBe(true);
      expect(schema.description.options.blank).toBe(true);
    });
  });

  describe('Schema Validation', () => {
    test('should handle missing description in schema definition', () => {
      const schema = EventideRpSystemItemBase.defineSchema();
      expect(schema.description).toBeDefined();
    });

    test('should define rollActorName with correct default', () => {
      const schema = EventideRpSystemItemBase.defineSchema();
      expect(schema.rollActorName.options.initial).toBe(true);
    });
  });

  describe('Base Model Extension', () => {
    test('should extend EventideRpSystemDataModel', () => {
      expect(EventideRpSystemItemBase.prototype).toBeInstanceOf(mockDataModel.prototype.constructor);
    });
  });
});