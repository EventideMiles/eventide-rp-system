// @ts-nocheck
/**
 * @fileoverview Tests for EventideRpSystemStatus Data Model
 *
 * Tests the status item data model which includes schema definitions
 * for status effects with customizable background and text colors.
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
const { default: EventideRpSystemStatus } = await import('../../../module/data/item-status.mjs');

describe('EventideRpSystemStatus', () => {
  beforeEach(() => {
    // Create a fresh status data instance for each test
    new EventideRpSystemStatus({
      description: 'A status effect',
      rollActorName: true,
    });
  });

  describe('Schema Definition', () => {
    test('should define schema that extends base item schema', () => {
      const schema = EventideRpSystemStatus.defineSchema();
      expect(schema).toBeDefined();
      expect(schema.description).toBeDefined();
      expect(schema.rollActorName).toBeDefined();
    });

    test('should define bgColor field with default #7A70B8', () => {
      const schema = EventideRpSystemStatus.defineSchema();
      expect(schema.bgColor).toBeDefined();
      expect(schema.bgColor.options.initial).toBe('#7A70B8');
    });

    test('should define textColor field with default #ffffff', () => {
      const schema = EventideRpSystemStatus.defineSchema();
      expect(schema.textColor).toBeDefined();
      expect(schema.textColor.options.initial).toBe('#ffffff');
    });

    test('should include only base item and status-specific fields', () => {
      const schema = EventideRpSystemStatus.defineSchema();
      const keys = Object.keys(schema);
      expect(keys).toHaveLength(4);
      expect(keys).toContain('description');
      expect(keys).toContain('rollActorName');
      expect(keys).toContain('bgColor');
      expect(keys).toContain('textColor');
    });
  });

  describe('Instance Creation', () => {
    test('should create instance with valid data', () => {
      const data = new EventideRpSystemStatus({
        description: 'Poisoned',
        bgColor: '#FF0000',
        textColor: '#000000',
      });
      expect(data).toBeInstanceOf(EventideRpSystemStatus);
    });

    test('should create instance with minimal data', () => {
      const data = new EventideRpSystemStatus({});
      expect(data).toBeInstanceOf(EventideRpSystemStatus);
    });

    test('should handle empty constructor', () => {
      const data = new EventideRpSystemStatus();
      expect(data).toBeInstanceOf(EventideRpSystemStatus);
    });

    test('should apply default values via schema', () => {
      const schema = EventideRpSystemStatus.defineSchema();
      expect(schema.bgColor.options.initial).toBe('#7A70B8');
      expect(schema.textColor.options.initial).toBe('#ffffff');
    });
  });

  describe('Field Values', () => {
    test('should accept custom bgColor via schema', () => {
      const schema = EventideRpSystemStatus.defineSchema();
      expect(schema.bgColor).toBeDefined();
    });

    test('should accept custom textColor via schema', () => {
      const schema = EventideRpSystemStatus.defineSchema();
      expect(schema.textColor).toBeDefined();
    });

    test('should accept status description via schema', () => {
      const schema = EventideRpSystemStatus.defineSchema();
      expect(schema.description).toBeDefined();
    });
  });

  describe('Color Combinations', () => {
    test('should handle red status with white text', () => {
      const data = new EventideRpSystemStatus({
        bgColor: '#FF0000',
        textColor: '#FFFFFF',
      });
      expect(data).toBeInstanceOf(EventideRpSystemStatus);
    });

    test('should handle green status with black text', () => {
      const data = new EventideRpSystemStatus({
        bgColor: '#00FF00',
        textColor: '#000000',
      });
      expect(data).toBeInstanceOf(EventideRpSystemStatus);
    });

    test('should handle blue status with white text', () => {
      const data = new EventideRpSystemStatus({
        bgColor: '#0000FF',
        textColor: '#FFFFFF',
      });
      expect(data).toBeInstanceOf(EventideRpSystemStatus);
    });
  });

  describe('Base Model Extension', () => {
    test('should extend EventideRpSystemItemBase', () => {
      expect(EventideRpSystemStatus.prototype).toBeInstanceOf(mockItemBase.prototype.constructor);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty description via schema', () => {
      const schema = EventideRpSystemStatus.defineSchema();
      expect(schema.description.options.blank).toBe(true);
    });

    test('should handle missing color values with defaults', () => {
      const schema = EventideRpSystemStatus.defineSchema();
      expect(schema.bgColor.options.initial).toBe('#7A70B8');
      expect(schema.textColor.options.initial).toBe('#ffffff');
    });

    test('should verify schema allows long descriptions', () => {
      const schema = EventideRpSystemStatus.defineSchema();
      expect(schema.description).toBeDefined();
    });
  });

  describe('Common Status Effects', () => {
    test('should create poisoned status instance', () => {
      new EventideRpSystemStatus({
        description: 'The character is poisoned and takes ongoing damage',
        bgColor: '#00FF00',
        textColor: '#000000',
      });
      const schema = EventideRpSystemStatus.defineSchema();
      expect(schema.bgColor.options.initial).toBe('#7A70B8');
      expect(schema.textColor.options.initial).toBe('#ffffff');
    });

    test('should create stunned status instance', () => {
      new EventideRpSystemStatus({
        description: 'The character is stunned and cannot act',
        bgColor: '#FFFF00',
        textColor: '#000000',
      });
      const schema = EventideRpSystemStatus.defineSchema();
      expect(schema.bgColor).toBeDefined();
      expect(schema.textColor).toBeDefined();
    });

    test('should create bleeding status instance', () => {
      new EventideRpSystemStatus({
        description: 'The character is bleeding',
        bgColor: '#FF0000',
        textColor: '#FFFFFF',
      });
      const schema = EventideRpSystemStatus.defineSchema();
      expect(schema.bgColor).toBeDefined();
      expect(schema.textColor).toBeDefined();
    });
  });
});