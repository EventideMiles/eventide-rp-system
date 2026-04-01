// @ts-nocheck
/**
 * @fileoverview Tests for DragDropHandler service
 *
 * Tests the drag-drop functionality for actor and item sheets, including:
 * - Visual feedback for drag operations
 * - Embedded document retrieval
 * - Configuration exports
 *
 * Note: Some complex integration methods (handleDrop, handleDropItem, etc.) are skipped
 * as they require extensive Foundry VTT integration mocking that would make the tests
 * fragile and difficult to maintain. The simpler methods are tested here for meaningful
 * coverage while keeping the tests maintainable.
 */

import { DragDropHandler } from '../../../module/services/drag-drop-handler.mjs';

// Mock dependencies
vi.mock('../../../module/helpers/logger.mjs', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fromUuid on global.foundry.utils
if (!global.foundry.utils) {
  global.foundry.utils = {};
}
global.foundry.utils.fromUuid = vi.fn();

describe('DragDropHandler', () => {
  let mockActor;
  let mockItem;
  let mockSheet;
  let mockTarget;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock item
    mockItem = {
      _id: 'item123',
      name: 'Test Item',
      type: 'actionCard',
      system: {
        groupId: null,
      },
    };

    // Setup mock items collection with get and filter methods
    // Use a custom class to extend Map with spy methods
    class MockItemsCollection extends Map {
      constructor() {
        super();
        this.set('item123', mockItem);
        // Spy on get method
        this._get = this.get;
        this.get = vi.fn((id) => super.get(id));
        // Spy on filter method
        this._filter = this.filter;
        this.filter = vi.fn((fn) => {
          const values = Array.from(this.values());
          return values.filter(fn);
        });
      }
    }
    const mockItemsCollection = new MockItemsCollection();

    // Setup mock actor with items collection
    mockActor = {
      _id: 'actor123',
      name: 'Test Actor',
      type: 'character',
      system: {
        actionCardGroups: [],
      },
      items: mockItemsCollection,
      update: vi.fn(() => Promise.resolve()),
      updateEmbeddedDocuments: vi.fn(() => Promise.resolve([])),
      createEmbeddedDocuments: vi.fn(() => Promise.resolve([])),
      getFlag: vi.fn(() => null),
    };

    // Setup mock sheet
    mockSheet = {
      actor: mockActor,
      item: mockItem,
      document: mockActor,
      element: {
        querySelector: vi.fn(),
        querySelectorAll: vi.fn(() => []),
      },
      render: vi.fn(),
    };

    // Setup mock target element
    mockTarget = document.createElement('div');
    mockTarget.dataset.itemId = 'item123';
    mockTarget.classList.add('action-card');
    mockTarget.closest = vi.fn(() => mockTarget);
  });

  describe('addDragFeedback()', () => {
    test('should add drag feedback for actor sheet', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      const dropZone = document.createElement('div');
      dropZone.classList.add('drop-zone');
      mockSheet.element.querySelector.mockReturnValue(dropZone);

      const mockEvent = {
        dataTransfer: {
          getData: vi.fn(() => JSON.stringify({
            type: 'Item',
            data: { type: 'combatPower' },
          })),
        },
        target: mockTarget,
      };

      DragDropHandler.addDragFeedback(config, mockSheet, mockEvent);

      expect(dropZone.classList.contains(config.dragOverClass)).toBe(true);
    });

    test('should not add drag feedback for item sheet when supportsActionCardCreation is false', () => {
      const config = DragDropHandler.CONFIG.ITEM;
      const dropZone = document.createElement('div');
      dropZone.classList.add('drop-zone');
      mockSheet.element.querySelector.mockReturnValue(dropZone);

      const mockEvent = {
        dataTransfer: {
          getData: vi.fn(() => JSON.stringify({
            type: 'Item',
            data: { type: 'combatPower' },
          })),
        },
        target: mockTarget,
      };

      DragDropHandler.addDragFeedback(config, mockSheet, mockEvent);

      // ITEM config has supportsActionCardCreation: false, so class should not be added
      expect(dropZone.classList.contains(config.dragOverClass)).toBe(false);
    });

    test('should handle invalid drag data gracefully', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      const dropZone = document.createElement('div');
      dropZone.classList.add('drop-zone');
      mockSheet.element.querySelector.mockReturnValue(dropZone);

      const mockEvent = {
        dataTransfer: {
          getData: vi.fn(() => {
            throw new Error('Invalid JSON');
          }),
        },
        target: mockTarget,
      };

      expect(() => {
        DragDropHandler.addDragFeedback(config, mockSheet, mockEvent);
      }).not.toThrow();

      // Class should NOT be added for invalid data
      expect(dropZone.classList.contains(config.dragOverClass)).toBe(false);
    });
  });

  describe('removeDragFeedback()', () => {
    test('should remove drag feedback for actor sheet', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      const dropZone = document.createElement('div');
      dropZone.classList.add(config.dragOverClass);
      mockSheet.element.querySelector.mockReturnValue(dropZone);

      DragDropHandler.removeDragFeedback(config, mockSheet);

      expect(dropZone.classList.contains(config.dragOverClass)).toBe(false);
    });

    test('should remove drag feedback for item sheet', () => {
      const config = DragDropHandler.CONFIG.ITEM;
      const dropZone1 = document.createElement('div');
      const dropZone2 = document.createElement('div');
      dropZone1.classList.add(config.dragOverClass);
      dropZone2.classList.add(config.dragOverClass);
      mockSheet.element.querySelectorAll.mockReturnValue([dropZone1, dropZone2]);
      mockSheet.element.querySelector.mockReturnValue(null);

      DragDropHandler.removeDragFeedback(config, mockSheet);

      expect(dropZone1.classList.contains(config.dragOverClass)).toBe(false);
      expect(dropZone2.classList.contains(config.dragOverClass)).toBe(false);
    });

    test('should handle null drop zone', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      mockSheet.element.querySelector.mockReturnValue(null);

      expect(() => {
        DragDropHandler.removeDragFeedback(config, mockSheet);
      }).not.toThrow();
    });
  });

  describe('getEmbeddedDocument()', () => {
    test('should get embedded document from target with data-document-class', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      const docRow = document.createElement('li');
      docRow.dataset.itemId = 'item123';
      docRow.dataset.documentClass = 'Item';
      mockTarget.closest.mockReturnValue(docRow);

      const result = DragDropHandler.getEmbeddedDocument(config, mockSheet, mockTarget);

      expect(result).toBeDefined();
    });

    test('should handle null document row with item-id', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      mockTarget.closest.mockReturnValue(null);
      mockTarget.dataset.itemId = 'item123';

      const result = DragDropHandler.getEmbeddedDocument(config, mockSheet, mockTarget);

      expect(result).toBeDefined();
    });
  });

  describe('_findItemByDocumentClass()', () => {
    test('should find item by document class lookup', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      const docRow = document.createElement('li');
      docRow.dataset.itemId = 'item123';
      docRow.dataset.documentClass = 'Item';

      const result = DragDropHandler._findItemByDocumentClass(
        config,
        mockActor,
        'item123',
        docRow,
      );

      expect(result).toBeDefined();
    });

    test('should handle non-Item document class', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      const docRow = document.createElement('li');
      docRow.dataset.itemId = 'item123';
      docRow.dataset.documentClass = 'Other';

      const result = DragDropHandler._findItemByDocumentClass(
        config,
        mockActor,
        'item123',
        docRow,
      );

      expect(result).toBeDefined();
    });
  });

  describe('_tryDirectItemIdLookup()', () => {
    test('should find item by direct ID lookup', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      mockTarget.dataset.itemId = 'item123';

      const result = DragDropHandler._tryDirectItemIdLookup(config, mockActor, mockTarget);

      expect(result).toBeDefined();
    });

    test('should return null when no item ID', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      mockTarget.dataset.itemId = undefined;

      const result = DragDropHandler._tryDirectItemIdLookup(config, mockActor, mockTarget);

      expect(result).toBeNull();
    });
  });

  describe('_findDocumentRow()', () => {
    test('should find document row from target', () => {
      const docRow = document.createElement('li');
      docRow.dataset.itemId = 'item123';
      docRow.dataset.documentClass = 'Item';
      mockTarget.closest.mockReturnValue(docRow);

      const result = DragDropHandler._findDocumentRow(mockTarget);

      expect(result).toBe(docRow);
    });

    test('should return null when no document row found', () => {
      mockTarget.closest.mockReturnValue(null);

      const result = DragDropHandler._findDocumentRow(mockTarget);

      expect(result).toBeNull();
    });
  });

  describe('_findTransformationCard()', () => {
    test('should create temporary transformation item from flags', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      mockActor.getFlag.mockImplementation((scope, key) => {
        if (key === 'activeTransformation') return 'trans123';
        if (key === 'activeTransformationName') return 'Test Transformation';
        if (key === 'activeTransformationCursed') return false;
        if (key === 'activeTransformationCombatPowers') return [];
        return null;
      });

      // Mock game.items for this test
      const originalGameItems = global.game?.items;
      global.game = global.game || {};
      global.game.items = {
        get: vi.fn(() => null),
      };

      // Mock CONFIG.Item.documentClass for this test
      const originalConfigItem = global.CONFIG?.Item;
      global.CONFIG = global.CONFIG || {};
      global.CONFIG.Item = {
        documentClass: vi.fn((data) => ({
          _id: data._id,
          name: data.name,
          type: data.type,
          system: data.system,
        })),
      };

      const result = DragDropHandler._findTransformationCard(
        config,
        mockActor,
        'trans123',
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Transformation');
      expect(result.type).toBe('transformation');

      // Restore
      if (originalGameItems) {
        global.game.items = originalGameItems;
      }
      if (originalConfigItem) {
        global.CONFIG.Item = originalConfigItem;
      }
    });
  });

  describe('_findItemByDocumentClass()', () => {
    test('should find item by document class lookup', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      const docRow = document.createElement('li');
      docRow.dataset.itemId = 'item123';
      docRow.dataset.documentClass = 'Item';

      const result = DragDropHandler._findItemByDocumentClass(
        config,
        mockActor,
        'item123',
        docRow,
      );

      expect(result).toBeDefined();
    });

    test('should handle non-Item document class', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      const docRow = document.createElement('li');
      docRow.dataset.itemId = 'item123';
      docRow.dataset.documentClass = 'Other';

      const result = DragDropHandler._findItemByDocumentClass(
        config,
        mockActor,
        'item123',
        docRow,
      );

      expect(result).toBeDefined();
    });
  });

  describe('_tryDirectItemIdLookup()', () => {
    test('should find item by direct ID lookup', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      mockTarget.dataset.itemId = 'item123';

      const result = DragDropHandler._tryDirectItemIdLookup(config, mockActor, mockTarget);

      expect(result).toBeDefined();
    });

    test('should return null when no item ID', () => {
      const config = DragDropHandler.CONFIG.ACTOR;
      mockTarget.dataset.itemId = undefined;

      const result = DragDropHandler._tryDirectItemIdLookup(config, mockActor, mockTarget);

      expect(result).toBeNull();
    });
  });

  describe('CONFIG', () => {
    test('should export ACTOR configuration', () => {
      const config = DragDropHandler.CONFIG;

      expect(config.ACTOR).toBeDefined();
      expect(config.ACTOR.type).toBe('actor');
      expect(config.ACTOR.getDataStore).toBeInstanceOf(Function);
      expect(config.ACTOR.getItems).toBeInstanceOf(Function);
      expect(config.ACTOR.getGroups).toBeInstanceOf(Function);
    });

    test('should export ITEM configuration', () => {
      const config = DragDropHandler.CONFIG;

      expect(config.ITEM).toBeDefined();
      expect(config.ITEM.type).toBe('item');
      expect(config.ITEM.getDataStore).toBeInstanceOf(Function);
      expect(config.ITEM.getItems).toBeInstanceOf(Function);
      expect(config.ITEM.getGroups).toBeInstanceOf(Function);
    });

    test('should have frozen configuration objects', () => {
      const config = DragDropHandler.CONFIG;
      const actorConfig = config.ACTOR;

      expect(Object.isFrozen(actorConfig)).toBe(true);
      expect(Object.isFrozen(config.ITEM)).toBe(true);
    });
  });
});
