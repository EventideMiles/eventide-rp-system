// @ts-nocheck
/**
 * @fileoverview Tests for ItemSourceCollector Helper
 *
 * Unit tests for the ItemSourceCollector helper which provides
 * centralized system for collecting items from all accessible sources
 * including compendiums, character sheets, and world items.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock dependencies before import
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    methodEntry: vi.fn(),
    methodExit: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Import the helper after setting up mocks
import { ItemSourceCollector } from '../../../module/helpers/item-source-collector.mjs';
import { Logger } from '../../../module/services/logger.mjs';

describe('ItemSourceCollector', () => {
  let mockUser, mockPack, mockActor, mockItem;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUser = { id: 'user-123', name: 'Test User' };
    mockItem = {
      ...global.testUtils.createMockItem({
        name: 'Test Item', type: 'gear', id: 'item-123',
        uuid: 'Item.world-123', img: 'icons/sword.png'
      }),
      testUserPermission: vi.fn(() => true)
    };
    mockActor = global.testUtils.createMockActor({
      name: 'Test Actor', id: 'actor-123', type: 'character',
      items: [mockItem], testUserPermission: vi.fn(() => true)
    });
    mockPack = {
      id: 'test-pack', collection: 'test-pack', documentName: 'Item',
      visible: true, metadata: { label: 'Test Pack' },
      getIndex: vi.fn().mockResolvedValue([
        { _id: 'pack-item-1', name: 'Pack Item 1', type: 'gear' },
        { _id: 'pack-item-2', name: 'Pack Item 2', type: 'combatPower' }
      ])
    };

    global.game = {
      packs: [mockPack], actors: [mockActor], items: [mockItem], user: mockUser
    };
    global.ui = {
      ...global.ui, notifications: { error: vi.fn() }
    };
    global.fromUuid = vi.fn().mockResolvedValue(mockItem);
  });

  describe('getAllAccessibleItems()', () => {
    test('returns items from all sources (compendium, character, world)', async () => {
      const result = await ItemSourceCollector.getAllAccessibleItems(mockUser, []);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toBeInstanceOf(Array);
    });

    test('removes duplicates based on name and type', async () => {
      const duplicateItem = {
        ...global.testUtils.createMockItem({
          name: 'Pack Item 1', type: 'gear', id: 'item-duplicate'
        }),
        testUserPermission: vi.fn(() => true)
      };
      global.game.packs = [mockPack];
      global.game.actors = [mockActor];
      global.game.items = [duplicateItem];
      const result = await ItemSourceCollector.getAllAccessibleItems(mockUser, []);
      const packItems = result.filter(i => i.name === 'Pack Item 1');
      expect(packItems.length).toBeGreaterThan(0);
    });

    test('sorts items by name alphabetically', async () => {
      const result = await ItemSourceCollector.getAllAccessibleItems(mockUser, []);
      const sortedNames = result.map(i => i.name).sort();
      const actualNames = result.map(i => i.name);
      expect(actualNames).toEqual(sortedNames);
    });

    test('filters by itemTypes parameter', async () => {
      const result = await ItemSourceCollector.getAllAccessibleItems(mockUser, ['gear']);
      result.forEach(item => {
        expect(item.type).toBe('gear');
      });
    });

    test('returns all items with empty itemTypes', async () => {
      const result = await ItemSourceCollector.getAllAccessibleItems(mockUser, []);
      expect(result.length).toBeGreaterThan(0);
    });

    test('prioritizes actor items over world over compendium', async () => {
      const result = await ItemSourceCollector.getAllAccessibleItems(mockUser, []);
      const packItems = result.filter(i => i.name.startsWith('Pack Item'));
      expect(packItems.length).toBeGreaterThan(0);
    });

    test('handles errors gracefully - returns empty array', async () => {
      global.game.packs = null;
      const result = await ItemSourceCollector.getAllAccessibleItems(mockUser, []);
      expect(result).toEqual([]);
    });

    test('shows error notification on failure', async () => {
      global.game.packs = null;
      await ItemSourceCollector.getAllAccessibleItems(mockUser, []);
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });
  });

  describe('getCompendiumItems()', () => {
    test('returns items from visible compendium packs', async () => {
      const result = await ItemSourceCollector.getCompendiumItems([], mockUser);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('source');
      expect(result[0].source).toContain('Compendium');
    });

    test('skips packs user does not have permission to view', async () => {
      const invisiblePack = { ...mockPack, visible: false };
      global.game.packs = [invisiblePack];
      const result = await ItemSourceCollector.getCompendiumItems([], mockUser);
      expect(result).toHaveLength(0);
    });

    test('skips non-Item packs', async () => {
      const actorPack = { ...mockPack, documentName: 'Actor' };
      global.game.packs = [actorPack];
      const result = await ItemSourceCollector.getCompendiumItems([], mockUser);
      expect(result).toHaveLength(0);
    });

    test('filters by itemTypes parameter', async () => {
      const result = await ItemSourceCollector.getCompendiumItems(['gear'], mockUser);
      result.forEach(item => {
        expect(item.type).toBe('gear');
      });
    });

    test('uses pack.collection as fallback for pack.id', async () => {
      const packWithoutId = { ...mockPack, id: undefined };
      global.game.packs = [packWithoutId];
      const result = await ItemSourceCollector.getCompendiumItems([], mockUser);
      expect(result).toHaveLength(2);
    });

    test('creates correct UUID format', async () => {
      const result = await ItemSourceCollector.getCompendiumItems([], mockUser);
      expect(result[0].uuid).toContain('Compendium.');
      expect(result[0].uuid).toContain('.Item.');
    });

    test('handles pack index errors gracefully', async () => {
      const errorPack = {
        ...mockPack,
        getIndex: vi.fn().mockRejectedValue(new Error('Index error'))
      };
      global.game.packs = [errorPack];
      const result = await ItemSourceCollector.getCompendiumItems([], mockUser);
      expect(result).toHaveLength(0);
    });

    test('logs warnings for failed packs', async () => {
      const errorPack = {
        ...mockPack,
        getIndex: vi.fn().mockRejectedValue(new Error('Index error'))
      };
      global.game.packs = [errorPack];
      await ItemSourceCollector.getCompendiumItems([], mockUser);
      expect(Logger.warn).toHaveBeenCalled();
    });
  });

  describe('getCharacterSheetItems()', () => {
    test('returns items from character actors', async () => {
      const result = await ItemSourceCollector.getCharacterSheetItems([], mockUser);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('source');
      expect(result[0].source).toContain('Character');
    });

    test('skips actors user does not have LIMITED permission', async () => {
      mockActor.testUserPermission.mockReturnValue(false);
      const result = await ItemSourceCollector.getCharacterSheetItems([], mockUser);
      expect(result).toHaveLength(0);
    });

    test('skips non-character actors', async () => {
      const npcActor = global.testUtils.createMockActor({
        name: 'NPC', id: 'npc-1', type: 'npc', testUserPermission: vi.fn(() => true)
      });
      global.game.actors = [npcActor];
      const result = await ItemSourceCollector.getCharacterSheetItems([], mockUser);
      expect(result).toHaveLength(0);
    });

    test('filters by itemTypes parameter', async () => {
      const result = await ItemSourceCollector.getCharacterSheetItems(['gear'], mockUser);
      result.forEach(item => {
        expect(item.type).toBe('gear');
      });
    });

    test('creates correct UUID format', async () => {
      const result = await ItemSourceCollector.getCharacterSheetItems([], mockUser);
      expect(result[0].uuid).toBe(mockItem.uuid);
    });

    test('returns formatted items with source metadata', async () => {
      const result = await ItemSourceCollector.getCharacterSheetItems([], mockUser);
      expect(result[0]).toHaveProperty('source');
      expect(result[0]).toHaveProperty('sourceType');
      expect(result[0]).toHaveProperty('metadata');
      expect(result[0].sourceType).toBe('actor');
    });

    test('handles empty game.actors array', async () => {
      global.game.actors = [];
      const result = await ItemSourceCollector.getCharacterSheetItems([], mockUser);
      expect(result).toHaveLength(0);
    });
  });

  describe('getWorldItems()', () => {
    test('returns items from game.items', async () => {
      const result = await ItemSourceCollector.getWorldItems([], mockUser);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].source).toBe('World Items');
    });

    test('skips items user does not have LIMITED permission', async () => {
      const restrictedItem = { ...mockItem, testUserPermission: vi.fn(() => false) };
      global.game.items = [restrictedItem];
      const result = await ItemSourceCollector.getWorldItems([], mockUser);
      expect(result).toHaveLength(0);
    });

    test('filters by itemTypes parameter', async () => {
      const result = await ItemSourceCollector.getWorldItems(['gear'], mockUser);
      result.forEach(item => {
        expect(item.type).toBe('gear');
      });
    });

    test('creates correct UUID format', async () => {
      const result = await ItemSourceCollector.getWorldItems([], mockUser);
      expect(result[0].uuid).toBe(mockItem.uuid);
    });

    test('returns formatted items with source metadata', async () => {
      const result = await ItemSourceCollector.getWorldItems([], mockUser);
      expect(result[0]).toHaveProperty('source');
      expect(result[0]).toHaveProperty('sourceType');
      expect(result[0].sourceType).toBe('world');
    });

    test('handles empty game.items array', async () => {
      global.game.items = [];
      const result = await ItemSourceCollector.getWorldItems([], mockUser);
      expect(result).toHaveLength(0);
    });
  });

  describe('formatItemForDisplay()', () => {
    test('creates formatted item with all required fields', () => {
      const sourceInfo = { source: 'Test Source', sourceType: 'world', uuid: 'Item.123' };
      const result = ItemSourceCollector.formatItemForDisplay(mockItem, sourceInfo);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('img');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('sourceType');
      expect(result).toHaveProperty('uuid');
      expect(result).toHaveProperty('metadata');
    });

    test('uses item.uuid if available', () => {
      const sourceInfo = { source: 'Test Source', sourceType: 'world', uuid: 'Item.world-123' };
      const result = ItemSourceCollector.formatItemForDisplay(mockItem, sourceInfo);
      expect(result.id).toBe(mockItem.uuid);
      expect(result.uuid).toBe('Item.world-123');
    });

    test('uses sourceInfo.uuid as fallback', () => {
      const itemNoUuid = { ...mockItem, uuid: undefined };
      const sourceInfo = { source: 'Test', sourceType: 'world', uuid: 'Item.fallback' };
      const result = ItemSourceCollector.formatItemForDisplay(itemNoUuid, sourceInfo);
      expect(result.id).toBe('Item.fallback');
    });

    test('uses fallback icon if item.img is missing', () => {
      const itemNoImg = { ...mockItem, img: undefined };
      const sourceInfo = { source: 'Test', sourceType: 'world', uuid: 'Item.123' };
      const result = ItemSourceCollector.formatItemForDisplay(itemNoImg, sourceInfo);
      expect(result.img).toBe('icons/svg/item-bag.svg');
    });

    test('includes metadata with packId, actorId, originalId', () => {
      const sourceInfo = {
        source: 'Test', sourceType: 'compendium', uuid: 'Compendium.test.Item.123',
        packId: 'test-pack', actorId: null, originalId: 'original-123'
      };
      const itemWithId = { ...mockItem, _id: 'original-123' };
      const result = ItemSourceCollector.formatItemForDisplay(itemWithId, sourceInfo);
      expect(result.metadata.packId).toBe('test-pack');
      expect(result.metadata.originalId).toBe('original-123');
    });

    test('handles item with _id property', () => {
      const itemWithId = { ...mockItem, _id: 'internal-id' };
      const sourceInfo = { source: 'Test', sourceType: 'world', uuid: 'Item.123' };
      const result = ItemSourceCollector.formatItemForDisplay(itemWithId, sourceInfo);
      expect(result.metadata.originalId).toBe('internal-id');
    });
  });

  describe('getItemDocument()', () => {
    test('successfully loads item from UUID', async () => {
      const formattedItem = { uuid: 'Item.123' };
      const result = await ItemSourceCollector.getItemDocument(formattedItem);
      expect(result).toBe(mockItem);
      expect(global.fromUuid).toHaveBeenCalledWith('Item.123');
    });

    test('returns null on error', async () => {
      const formattedItem = { uuid: 'Item.123' };
      global.fromUuid.mockRejectedValue(new Error('Not found'));
      const result = await ItemSourceCollector.getItemDocument(formattedItem);
      expect(result).toBeNull();
    });

    test('logs error on failure', async () => {
      const formattedItem = { uuid: 'Item.123' };
      global.fromUuid.mockRejectedValue(new Error('Not found'));
      await ItemSourceCollector.getItemDocument(formattedItem);
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('_removeDuplicates()', () => {
    test('removes duplicate items with same name and type', () => {
      const items = [
        { name: 'Sword', type: 'gear', sourceType: 'compendium' },
        { name: 'Sword', type: 'gear', sourceType: 'world' },
        { name: 'Shield', type: 'gear', sourceType: 'actor' }
      ];
      const result = ItemSourceCollector._removeDuplicates(items);
      expect(result).toHaveLength(2);
      expect(result.some(i => i.name === 'Sword' && i.sourceType === 'world')).toBe(true);
    });

    test('prioritizes actor items over world over compendium', () => {
      const items = [
        { name: 'Test', type: 'gear', sourceType: 'compendium' },
        { name: 'Test', type: 'gear', sourceType: 'world' },
        { name: 'Test', type: 'gear', sourceType: 'actor' }
      ];
      const result = ItemSourceCollector._removeDuplicates(items);
      expect(result).toHaveLength(1);
      expect(result[0].sourceType).toBe('actor');
    });

    test('keeps first occurrence of each unique item', () => {
      const items = [
        { name: 'Item1', type: 'gear', sourceType: 'world' },
        { name: 'Item2', type: 'combatPower', sourceType: 'world' },
        { name: 'Item1', type: 'gear', sourceType: 'compendium' }
      ];
      const result = ItemSourceCollector._removeDuplicates(items);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Item1');
    });

    test('handles empty array', () => {
      const result = ItemSourceCollector._removeDuplicates([]);
      expect(result).toEqual([]);
    });

    test('handles array with no duplicates', () => {
      const items = [
        { name: 'Item1', type: 'gear', sourceType: 'world' },
        { name: 'Item2', type: 'combatPower', sourceType: 'world' }
      ];
      const result = ItemSourceCollector._removeDuplicates(items);
      expect(result).toHaveLength(2);
    });
  });

  describe('filterItems()', () => {
    let testItems;

    beforeEach(() => {
      testItems = [
        { name: 'Longsword', type: 'gear', source: 'World Items' },
        { name: 'Fireball', type: 'combatPower', source: 'Compendium: Spells' },
        { name: 'Shield', type: 'gear', source: 'Character: Hero' }
      ];
    });

    test('filters by item name (case insensitive)', () => {
      const result = ItemSourceCollector.filterItems(testItems, 'longsword');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Longsword');
    });

    test('filters by item type (case insensitive)', () => {
      const result = ItemSourceCollector.filterItems(testItems, 'GEAR');
      expect(result).toHaveLength(2);
    });

    test('filters by source (case insensitive)', () => {
      const result = ItemSourceCollector.filterItems(testItems, 'CHARACTER');
      expect(result).toHaveLength(1);
      expect(result[0].source).toContain('Character');
    });

    test('returns all items with empty search text', () => {
      const result = ItemSourceCollector.filterItems(testItems, '');
      expect(result).toHaveLength(3);
    });

    test('handles whitespace in search text', () => {
      const result = ItemSourceCollector.filterItems(testItems, '  sword  ');
      expect(result).toHaveLength(1);
    });

    test('matches partial strings', () => {
      const result = ItemSourceCollector.filterItems(testItems, 'long');
      expect(result).toHaveLength(1);
    });
  });

  describe('filterActionItemsByRollType()', () => {
    test('filters out items with roll type "none"', async () => {
      const items = [
        { name: 'Item1', uuid: 'Item.1' },
        { name: 'Item2', uuid: 'Item.2' }
      ];
      global.fromUuid
        .mockResolvedValueOnce({ system: { roll: { type: 'attack' } } })
        .mockResolvedValueOnce({ system: { roll: { type: 'none' } } });

      const result = await ItemSourceCollector.filterActionItemsByRollType(items);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Item1');
    });

    test('keeps items with valid roll types', async () => {
      const items = [
        { name: 'Item1', uuid: 'Item.1' },
        { name: 'Item2', uuid: 'Item.2' }
      ];
      global.fromUuid
        .mockResolvedValueOnce({ system: { roll: { type: 'attack' } } })
        .mockResolvedValueOnce({ system: { roll: { type: 'defense' } } });

      const result = await ItemSourceCollector.filterActionItemsByRollType(items);
      expect(result).toHaveLength(2);
    });

    test('handles items without roll type property', async () => {
      const items = [{ name: 'Item1', uuid: 'Item.1' }];
      global.fromUuid.mockResolvedValueOnce({ system: {} });

      const result = await ItemSourceCollector.filterActionItemsByRollType(items);
      expect(result).toHaveLength(0);
    });

    test('logs warnings for items that fail to load', async () => {
      const items = [{ name: 'Item1', uuid: 'Item.1' }];
      global.fromUuid.mockRejectedValueOnce(new Error('Load failed'));

      await ItemSourceCollector.filterActionItemsByRollType(items);
      expect(Logger.warn).toHaveBeenCalled();
    });

    test('returns array of valid items', async () => {
      const items = [
        { name: 'Item1', uuid: 'Item.1' },
        { name: 'Item2', uuid: 'Item.2' }
      ];
      global.fromUuid
        .mockResolvedValueOnce({ system: { roll: { type: 'attack' } } })
        .mockResolvedValueOnce({ system: { roll: { type: 'attack' } } });

      const result = await ItemSourceCollector.filterActionItemsByRollType(items);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getActionItemTypes()', () => {
    test('returns array of action item types', () => {
      const result = ItemSourceCollector.getActionItemTypes();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('includes combatPower', () => {
      const result = ItemSourceCollector.getActionItemTypes();
      expect(result).toContain('combatPower');
    });

    test('includes gear', () => {
      const result = ItemSourceCollector.getActionItemTypes();
      expect(result).toContain('gear');
    });

    test('includes feature', () => {
      const result = ItemSourceCollector.getActionItemTypes();
      expect(result).toContain('feature');
    });
  });

  describe('getEffectItemTypes()', () => {
    test('returns array of effect item types', () => {
      const result = ItemSourceCollector.getEffectItemTypes();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('includes gear', () => {
      const result = ItemSourceCollector.getEffectItemTypes();
      expect(result).toContain('gear');
    });

    test('includes status', () => {
      const result = ItemSourceCollector.getEffectItemTypes();
      expect(result).toContain('status');
    });
  });
});