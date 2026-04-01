// @ts-nocheck
/**
 * @fileoverview Embedded Item Exporter Tests
 *
 * Unit tests for the EmbeddedItemExporter service which handles
 * exporting embedded items from transformations and action cards to compendiums.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

import { EmbeddedItemExporter } from '../../../module/services/embedded-item-exporter.mjs';

// Mock Logger
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Set up mocks before any tests
beforeEach(() => {
  vi.clearAllMocks();

  // Reset global mocks
  if (global.game) {
    global.game.packs = {
      get: vi.fn(),
    };
    global.user = { isGM: true };
  }

  // Mock Item.create
  global.Item = {
    create: vi.fn(),
  };

  // Mock foundry.utils
  global.foundry = {
    utils: {
      duplicate: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
      deepClone: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
      randomID: vi.fn(() => 'mock-id'),
    },
    documents: {
      collections: {
        CompendiumCollection: {
          createCompendium: vi.fn(),
        },
      },
    },
  };

  // Mock ui.notifications
  if (global.ui) {
    ui.notifications = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };
  }

  // Mock game.i18n
  if (global.game) {
    game.i18n = {
      localize: vi.fn((key) => `[${key}]`),
      format: vi.fn((key, data) => `[${key} ${JSON.stringify(data)}]`),
    };
  }
});

describe('EmbeddedItemExporter', () => {
  describe('COMPENDIUM_MAPPINGS', () => {
    test('should define compendium mappings for all item types', () => {
      // Arrange & Act
      const mappings = EmbeddedItemExporter.COMPENDIUM_MAPPINGS;

      // Assert
      expect(mappings).toHaveProperty('combatPower');
      expect(mappings).toHaveProperty('actionCard');
      expect(mappings).toHaveProperty('feature');
      expect(mappings).toHaveProperty('gear');
      expect(mappings).toHaveProperty('status');
      expect(mappings).toHaveProperty('transformation');
    });

    test('should have correct mapping for combatPower', () => {
      // Arrange & Act
      const mapping = EmbeddedItemExporter.COMPENDIUM_MAPPINGS.combatPower;

      // Assert
      expect(mapping.name).toBe('customcombatpowers');
      expect(mapping.label).toBe('Custom Combat Powers');
    });

    test('should have correct mapping for transformation', () => {
      // Arrange & Act
      const mapping = EmbeddedItemExporter.COMPENDIUM_MAPPINGS.transformation;

      // Assert
      expect(mapping.name).toBe('customtransformations');
      expect(mapping.label).toBe('Custom Transformations');
    });
  });

  describe('exportEmbeddedCombatPowers()', () => {
    test('should return error when user is not GM', async () => {
      // Arrange
      game.user.isGM = false;
      const mockSourceItem = { type: 'transformation' };

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedCombatPowers(mockSourceItem);

      // Assert
      expect(result).toEqual({
        success: 0,
        failed: 0,
        errors: ['[EVENTIDE_RP_SYSTEM.Errors.UserIsNotGM]'],
      });
      expect(ui.notifications.error).toHaveBeenCalled();
    });

    test('should return error when source item is not transformation', async () => {
      // Arrange
      game.user.isGM = true;
      const mockSourceItem = { type: 'actionCard' };

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedCombatPowers(mockSourceItem);

      // Assert
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should return success when no embedded powers exist', async () => {
      // Arrange
      game.user.isGM = true;
      const mockSourceItem = {
        type: 'transformation',
        system: {
          getEmbeddedCombatPowers: vi.fn(() => []),
        },
      };

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedCombatPowers(mockSourceItem);

      // Assert
      expect(result).toEqual({
        success: 0,
        failed: 0,
        errors: [],
      });
      expect(ui.notifications.info).toHaveBeenCalled();
    });

    test('should export embedded combat powers successfully', async () => {
      // Arrange
      game.user.isGM = true;
      const mockPower = {
        name: 'Fire Blast',
        type: 'combatPower',
        img: 'icons/fire.png',
        system: { damage: 10 },
        effects: [],
      };
      const mockSourceItem = {
        type: 'transformation',
        system: {
          getEmbeddedCombatPowers: vi.fn(() => [mockPower]),
        },
      };
      const mockCompendium = {
        collection: 'world.customcombatpowers',
        title: 'Custom Combat Powers',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedCombatPowers(mockSourceItem);

      // Assert
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(Item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fire Blast',
          type: 'combatPower',
        }),
        { pack: 'world.customcombatpowers' }
      );
    });
  });

  describe('exportEmbeddedActionCards()', () => {
    test('should return error when user is not GM', async () => {
      // Arrange
      game.user.isGM = false;
      const mockSourceItem = { type: 'transformation' };

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedActionCards(mockSourceItem);

      // Assert
      expect(result).toEqual({
        success: 0,
        failed: 0,
        errors: ['[EVENTIDE_RP_SYSTEM.Errors.UserIsNotGM]'],
      });
    });

    test('should return error when source item is not transformation', async () => {
      // Arrange
      game.user.isGM = true;
      const mockSourceItem = { type: 'actionCard' };

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedActionCards(mockSourceItem);

      // Assert
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should export embedded action cards successfully', async () => {
      // Arrange
      game.user.isGM = true;
      const mockCard = {
        name: 'Quick Strike',
        type: 'actionCard',
        img: 'icons/strike.png',
        system: { cost: 2 },
        effects: [],
      };
      const mockSourceItem = {
        type: 'transformation',
        system: {
          getEmbeddedActionCards: vi.fn(() => [mockCard]),
        },
      };
      const mockCompendium = {
        collection: 'world.customactioncards',
        title: 'Custom Action Cards',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedActionCards(mockSourceItem);

      // Assert
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(Item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Quick Strike',
          type: 'actionCard',
        }),
        { pack: 'world.customactioncards' }
      );
    });
  });

  describe('exportEmbeddedActionItem()', () => {
    test('should return error when user is not GM', async () => {
      // Arrange
      game.user.isGM = false;
      const mockSourceItem = { type: 'actionCard' };

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedActionItem(mockSourceItem);

      // Assert
      expect(result).toEqual({
        success: 0,
        failed: 0,
        errors: ['[EVENTIDE_RP_SYSTEM.Errors.UserIsNotGM]'],
      });
    });

    test('should return error when source item is not action card', async () => {
      // Arrange
      game.user.isGM = true;
      const mockSourceItem = { type: 'transformation' };

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedActionItem(mockSourceItem);

      // Assert
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should return success when no embedded item exists', async () => {
      // Arrange
      game.user.isGM = true;
      const mockSourceItem = {
        type: 'actionCard',
        getEmbeddedItem: vi.fn(() => null),
      };

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedActionItem(mockSourceItem);

      // Assert
      expect(result).toEqual({
        success: 0,
        failed: 0,
        errors: [],
      });
    });

    test('should export combat power embedded item', async () => {
      // Arrange
      game.user.isGM = true;
      const mockEmbeddedItem = {
        name: 'Electric Shock',
        type: 'combatPower',
        img: 'icons/shock.png',
        system: { damage: 5 },
        effects: [],
      };
      const mockSourceItem = {
        type: 'actionCard',
        getEmbeddedItem: vi.fn(() => mockEmbeddedItem),
      };
      const mockCompendium = {
        collection: 'world.customcombatpowers',
        title: 'Custom Combat Powers',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedActionItem(mockSourceItem);

      // Assert
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(Item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Electric Shock',
          type: 'combatPower',
        }),
        { pack: 'world.customcombatpowers' }
      );
    });

    test('should export feature embedded item', async () => {
      // Arrange
      game.user.isGM = true;
      const mockEmbeddedItem = {
        name: 'Flying',
        type: 'feature',
        img: 'icons/wing.png',
        system: { description: 'Can fly' },
        effects: [],
      };
      const mockSourceItem = {
        type: 'actionCard',
        getEmbeddedItem: vi.fn(() => mockEmbeddedItem),
      };
      const mockCompendium = {
        collection: 'world.customfeatures',
        title: 'Custom Features',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedActionItem(mockSourceItem);

      // Assert
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(Item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Flying',
          type: 'feature',
        }),
        { pack: 'world.customfeatures' }
      );
    });

    test('should export gear embedded item', async () => {
      // Arrange
      game.user.isGM = true;
      const mockEmbeddedItem = {
        name: 'Magic Sword',
        type: 'gear',
        img: 'icons/sword.png',
        system: { damage: 10 },
        effects: [],
      };
      const mockSourceItem = {
        type: 'actionCard',
        getEmbeddedItem: vi.fn(() => mockEmbeddedItem),
      };
      const mockCompendium = {
        collection: 'world.customgear',
        title: 'Custom Gear',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedActionItem(mockSourceItem);

      // Assert
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(Item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Magic Sword',
          type: 'gear',
        }),
        { pack: 'world.customgear' }
      );
    });

    test('should return error for unsupported embedded item type', async () => {
      // Arrange
      game.user.isGM = true;
      const mockEmbeddedItem = {
        name: 'Unknown Item',
        type: 'unknown',
      };
      const mockSourceItem = {
        type: 'actionCard',
        getEmbeddedItem: vi.fn(() => mockEmbeddedItem),
      };

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedActionItem(mockSourceItem);

      // Assert
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('exportEmbeddedEffects()', () => {
    test('should return error when user is not GM', async () => {
      // Arrange
      game.user.isGM = false;
      const mockSourceItem = { type: 'actionCard' };

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedEffects(mockSourceItem);

      // Assert
      expect(result).toEqual({
        success: 0,
        failed: 0,
        errors: ['[EVENTIDE_RP_SYSTEM.Errors.UserIsNotGM]'],
      });
    });

    test('should return error when source item is not action card', async () => {
      // Arrange
      game.user.isGM = true;
      const mockSourceItem = { type: 'transformation' };

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedEffects(mockSourceItem);

      // Assert
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should export status effects', async () => {
      // Arrange
      game.user.isGM = true;
      const mockEffect = {
        name: 'Burning',
        type: 'status',
        img: 'icons/burning.png',
        system: { duration: 3 },
        effects: [],
      };
      const mockSourceItem = {
        type: 'actionCard',
        getEmbeddedEffects: vi.fn(() => [mockEffect]),
      };
      const mockCompendium = {
        collection: 'world.customstatuses',
        title: 'Custom Status Effects',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedEffects(mockSourceItem);

      // Assert
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(Item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Burning',
          type: 'status',
        }),
        { pack: 'world.customstatuses' }
      );
    });

    test('should export feature effects', async () => {
      // Arrange
      game.user.isGM = true;
      const mockEffect = {
        name: 'Regeneration',
        type: 'feature',
        img: 'icons/healing.png',
        system: { healing: 5 },
        effects: [],
      };
      const mockSourceItem = {
        type: 'actionCard',
        getEmbeddedEffects: vi.fn(() => [mockEffect]),
      };
      const mockCompendium = {
        collection: 'world.customfeatures',
        title: 'Custom Features',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedEffects(mockSourceItem);

      // Assert
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(Item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Regeneration',
          type: 'feature',
        }),
        { pack: 'world.customfeatures' }
      );
    });

    test('should default to status compendium for unknown effect types', async () => {
      // Arrange
      game.user.isGM = true;
      const mockEffect = {
        name: 'Unknown Effect',
        type: 'unknown',
        img: 'icons/unknown.png',
        system: {},
        effects: [],
      };
      const mockSourceItem = {
        type: 'actionCard',
        getEmbeddedEffects: vi.fn(() => [mockEffect]),
      };
      const mockCompendium = {
        collection: 'world.customstatuses',
        title: 'Custom Status Effects',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedEffects(mockSourceItem);

      // Assert
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(Item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Unknown Effect',
          type: 'unknown',
        }),
        { pack: 'world.customstatuses' }
      );
    });
  });

  describe('exportEmbeddedTransformations()', () => {
    test('should return error when user is not GM', async () => {
      // Arrange
      game.user.isGM = false;
      const mockSourceItem = { type: 'actionCard' };

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedTransformations(mockSourceItem);

      // Assert
      expect(result).toEqual({
        success: 0,
        failed: 0,
        errors: ['[EVENTIDE_RP_SYSTEM.Errors.UserIsNotGM]'],
      });
    });

    test('should return error when source item is not action card', async () => {
      // Arrange
      game.user.isGM = true;
      const mockSourceItem = { type: 'transformation' };

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedTransformations(mockSourceItem);

      // Assert
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should export embedded transformations successfully', async () => {
      // Arrange
      game.user.isGM = true;
      const mockTransformation = {
        name: 'Werewolf',
        type: 'transformation',
        img: 'icons/werewolf.png',
        system: { cursed: true },
        effects: [],
      };
      const mockSourceItem = {
        type: 'actionCard',
        getEmbeddedTransformations: vi.fn().mockResolvedValue([mockTransformation]),
      };
      const mockCompendium = {
        collection: 'world.customtransformations',
        title: 'Custom Transformations',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      const result = await EmbeddedItemExporter.exportEmbeddedTransformations(mockSourceItem);

      // Assert
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(Item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Werewolf',
          type: 'transformation',
        }),
        { pack: 'world.customtransformations' }
      );
    });
  });

  describe('exportAllEmbeddedItems()', () => {
    test('should return error when user is not GM', async () => {
      // Arrange
      game.user.isGM = false;
      const mockSourceItem = { type: 'transformation' };

      // Act
      const result = await EmbeddedItemExporter.exportAllEmbeddedItems(mockSourceItem);

      // Assert
      expect(result).toEqual({
        success: 0,
        failed: 0,
        errors: ['[EVENTIDE_RP_SYSTEM.Errors.UserIsNotGM]'],
      });
    });

    test('should return error when source item type is not supported', async () => {
      // Arrange
      game.user.isGM = true;
      const mockSourceItem = { type: 'combatPower' };

      // Act
      const result = await EmbeddedItemExporter.exportAllEmbeddedItems(mockSourceItem);

      // Assert
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should export all embedded items from transformation', async () => {
      // Arrange
      game.user.isGM = true;
      const mockPower = {
        name: 'Fire',
        type: 'combatPower',
        img: 'icons/fire.png',
        system: {},
        effects: [],
      };
      const mockCard = {
        name: 'Quick',
        type: 'actionCard',
        img: 'icons/quick.png',
        system: {},
        effects: [],
      };
      const mockSourceItem = {
        type: 'transformation',
        system: {
          getEmbeddedCombatPowers: vi.fn(() => [mockPower]),
          getEmbeddedActionCards: vi.fn(() => [mockCard]),
        },
      };
      const mockCompendium = {
        collection: 'world.test',
        title: 'Test Compendium',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      const result = await EmbeddedItemExporter.exportAllEmbeddedItems(mockSourceItem);

      // Assert
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    test('should export all embedded items from action card', async () => {
      // Arrange
      game.user.isGM = true;
      const mockItem = {
        name: 'Sword',
        type: 'gear',
        img: 'icons/sword.png',
        system: {},
        effects: [],
      };
      const mockEffect = {
        name: 'Bleeding',
        type: 'status',
        img: 'icons/bleeding.png',
        system: {},
        effects: [],
      };
      const mockTransformation = {
        name: 'Werewolf',
        type: 'transformation',
        img: 'icons/werewolf.png',
        system: {},
        effects: [],
      };
      const mockSourceItem = {
        type: 'actionCard',
        getEmbeddedItem: vi.fn(() => mockItem),
        getEmbeddedEffects: vi.fn(() => [mockEffect]),
        getEmbeddedTransformations: vi.fn().mockResolvedValue([mockTransformation]),
      };
      const mockCompendium = {
        collection: 'world.test',
        title: 'Test Compendium',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      const result = await EmbeddedItemExporter.exportAllEmbeddedItems(mockSourceItem);

      // Assert
      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
    });
  });

  describe('_ensureCompendium()', () => {
    test('should return existing compendium if it exists', async () => {
      // Arrange
      const mockCompendium = { collection: 'world.customcombatpowers' };
      game.packs.get.mockReturnValue(mockCompendium);

      // Act
      const result = await EmbeddedItemExporter._ensureCompendium('combatPower');

      // Assert
      expect(result).toBe(mockCompendium);
      expect(foundry.documents.collections.CompendiumCollection.createCompendium).not.toHaveBeenCalled();
    });

    test('should create new compendium if it does not exist', async () => {
      // Arrange
      const mockCompendium = { collection: 'world.customcombatpowers', title: 'Custom Combat Powers' };
      game.packs.get.mockReturnValue(null);
      foundry.documents.collections.CompendiumCollection.createCompendium.mockResolvedValue(mockCompendium);

      // Act
      const result = await EmbeddedItemExporter._ensureCompendium('combatPower');

      // Assert
      expect(result).toBe(mockCompendium);
      expect(foundry.documents.collections.CompendiumCollection.createCompendium).toHaveBeenCalledWith({
        name: 'customcombatpowers',
        label: 'Custom Combat Powers',
        type: 'Item',
      });
    });

    test('should return null for invalid item type', async () => {
      // Arrange
      game.packs.get.mockReturnValue(null);

      // Act
      const result = await EmbeddedItemExporter._ensureCompendium('invalidType');

      // Assert
      expect(result).toBeNull();
      expect(foundry.documents.collections.CompendiumCollection.createCompendium).not.toHaveBeenCalled();
    });

    test('should return null if compendium creation fails', async () => {
      // Arrange
      game.packs.get.mockReturnValue(null);
      foundry.documents.collections.CompendiumCollection.createCompendium.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await EmbeddedItemExporter._ensureCompendium('combatPower');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('_exportItems()', () => {
    test('should export items to compendium', async () => {
      // Arrange
      const mockItems = [
        {
          name: 'Power 1',
          type: 'combatPower',
          img: 'icons/power1.png',
          system: { damage: 5 },
          effects: [],
        },
        {
          name: 'Power 2',
          type: 'combatPower',
          img: 'icons/power2.png',
          system: { damage: 10 },
          effects: [],
        },
      ];
      const mockCompendium = {
        collection: 'world.customcombatpowers',
        title: 'Custom Combat Powers',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      const result = await EmbeddedItemExporter._exportItems(mockItems, 'combatPower');

      // Assert
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(Item.create).toHaveBeenCalledTimes(2);
    });

    test('should handle duplicate system data correctly', async () => {
      // Arrange
      const mockItems = [
        {
          name: 'Power',
          type: 'combatPower',
          img: 'icons/power.png',
          system: { damage: 5 },
          effects: [],
        },
      ];
      const mockCompendium = {
        collection: 'world.customcombatpowers',
        title: 'Custom Combat Powers',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      await EmbeddedItemExporter._exportItems(mockItems, 'combatPower');

      // Assert
      expect(foundry.utils.duplicate).toHaveBeenCalledWith({ damage: 5 });
    });

    test('should handle effects correctly', async () => {
      // Arrange
      const mockEffect = { toObject: vi.fn(() => ({ name: 'Effect 1' })) };
      const mockItems = [
        {
          name: 'Power',
          type: 'combatPower',
          img: 'icons/power.png',
          system: {},
          effects: [mockEffect],
        },
      ];
      const mockCompendium = {
        collection: 'world.customcombatpowers',
        title: 'Custom Combat Powers',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValue({});

      // Act
      await EmbeddedItemExporter._exportItems(mockItems, 'combatPower');

      // Assert
      expect(Item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          effects: [{ name: 'Effect 1' }],
        }),
        { pack: 'world.customcombatpowers' }
      );
    });

    test('should handle export failure for individual items', async () => {
      // Arrange
      const mockItems = [
        { name: 'Power 1', type: 'combatPower', img: 'icons/power1.png', system: {}, effects: [] },
        { name: 'Power 2', type: 'combatPower', img: 'icons/power2.png', system: {}, effects: [] },
      ];
      const mockCompendium = {
        collection: 'world.customcombatpowers',
        title: 'Custom Combat Powers',
      };
      game.packs.get.mockReturnValue(mockCompendium);
      Item.create.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Failed'));

      // Act
      const result = await EmbeddedItemExporter._exportItems(mockItems, 'combatPower');

      // Assert
      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
    });

    test('should return all failed if compendium is null', async () => {
      // Arrange
      const mockItems = [
        { name: 'Power', type: 'combatPower', img: 'icons/power.png', system: {}, effects: [] },
      ];
      game.packs.get.mockReturnValue(null);

      // Act
      const result = await EmbeddedItemExporter._exportItems(mockItems, 'combatPower');

      // Assert
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Failed to create or find compendium');
    });
  });
});