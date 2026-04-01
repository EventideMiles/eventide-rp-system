// @ts-nocheck
/**
 * @fileoverview Tests for Base Data Model
 *
 * Tests the EventideRpSystemDataModel base class which provides
 * common functionality for all data models in the system.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock the foundry.abstract.TypeDataModel
class MockTypeDataModel {
  constructor(data, options) {
    this._data = data;
    this._options = options;
  }

  static defineSchema() {
    return {};
  }

  toObject() {
    return this._data || {};
  }
}

// Set up global foundry mock
global.foundry = global.foundry || {};
global.foundry.abstract = global.foundry.abstract || {};
global.foundry.abstract.TypeDataModel = MockTypeDataModel;

// Import the module under test
import EventideRpSystemDataModel from '../../../module/data/base-model.mjs';

describe('EventideRpSystemDataModel', () => {
  describe('toPlainObject()', () => {
    test('should return a plain object with spread operator', () => {
      // Create a data model instance with test data
      const testData = {
        name: 'Test Model',
        value: 42,
        nested: {
          key: 'value',
          array: [1, 2, 3]
        }
      };

      const model = new EventideRpSystemDataModel(testData);

      // Call toPlainObject
      const result = model.toPlainObject();

      // Verify it returns an object
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should return an object even for empty data', () => {
      const model = new EventideRpSystemDataModel({});

      const result = model.toPlainObject();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should return an object for null data', () => {
      const model = new EventideRpSystemDataModel(null);

      const result = model.toPlainObject();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should return an object for undefined data', () => {
      const model = new EventideRpSystemDataModel(undefined);

      const result = model.toPlainObject();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should handle complex nested data', () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
              array: [{ id: 1 }, { id: 2 }]
            }
          }
        },
        items: ['a', 'b', 'c'],
        count: 10
      };

      const model = new EventideRpSystemDataModel(complexData);
      const result = model.toPlainObject();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });
});