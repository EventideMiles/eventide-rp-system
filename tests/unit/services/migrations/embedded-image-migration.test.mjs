// @ts-nocheck
/**
 * @fileoverview EmbeddedImageMigration Service Tests
 *
 * Unit tests for the EmbeddedImageMigration service which handles
 * embedded item image association fixes and statusPerSuccess field migrations.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally
import { EmbeddedImageMigration } from '../../../../module/services/migrations/embedded-image-migration.mjs';

// Mock Logger
vi.mock('../../../../module/services/logger.mjs', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('EmbeddedImageMigration', () => {
  describe('run()', () => {
    beforeEach(() => {
      // Reset mocks
      vi.clearAllMocks();

      // Mock game.user
      global.game = {
        user: {
          isGM: true
        },
        settings: {
          get: vi.fn(),
          set: vi.fn()
        },
        items: [],
        actors: [],
        packs: [],
        i18n: {
          localize: vi.fn((key) => key),
          format: vi.fn((key, params) => `${key} ${JSON.stringify(params)}`)
        }
      };

      // Mock ui.notifications
      global.ui = {
        notifications: {
          warn: vi.fn(() => ({ remove: vi.fn() })),
          info: vi.fn(),
          error: vi.fn()
        }
      };

      // Mock foundry.utils
      global.foundry = {
        utils: {
          deepClone: vi.fn((obj) => JSON.parse(JSON.stringify(obj)))
        }
      };
    });

    test('should return early when user is not GM', async () => {
      global.game.user.isGM = false;

      await EmbeddedImageMigration.run();

      expect(global.game.settings.get).not.toHaveBeenCalled();
    });

    test('should return early when migration already completed', async () => {
      global.game.settings.get.mockReturnValue('1.3.0');

      await EmbeddedImageMigration.run();

      expect(global.game.settings.set).not.toHaveBeenCalled();
    });

    test('should process game.items when migration version is different', async () => {
      global.game.settings.get.mockReturnValue('1.0.0');

      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          statusPerSuccess: true
        },
        update: vi.fn()
      });

      global.game.items = [mockItem];

      await EmbeddedImageMigration.run();

      expect(global.game.settings.set).toHaveBeenCalledWith(
        'eventide-rp-system',
        'embeddedImageMigrationVersion',
        '1.3.0'
      );
    });

    test('should process game.actors items during migration', async () => {
      global.game.settings.get.mockReturnValue('1.0.0');

      const mockActor = global.testUtils.createMockActor({
        name: 'Test Actor'
      });

      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          statusPerSuccess: true
        },
        update: vi.fn()
      });

      mockActor.items = [mockItem];
      global.game.actors = [mockActor];

      await EmbeddedImageMigration.run();

      expect(global.game.settings.set).toHaveBeenCalledWith(
        'eventide-rp-system',
        'embeddedImageMigrationVersion',
        '1.3.0'
      );
    });

    test('should process unlocked world compendium packs during migration', async () => {
      global.game.settings.get.mockReturnValue('1.0.0');

      const mockPack = {
        documentName: 'Item',
        locked: false,
        metadata: {
          packageType: 'world'
        },
        getDocuments: vi.fn().mockResolvedValue([
          global.testUtils.createMockItem({
            type: 'actionCard',
            name: 'Compendium Action Card',
            system: {
              statusPerSuccess: false
            },
            update: vi.fn()
          })
        ])
      };

      global.game.packs = [mockPack];

      await EmbeddedImageMigration.run();

      expect(mockPack.getDocuments).toHaveBeenCalled();
      expect(global.game.settings.set).toHaveBeenCalledWith(
        'eventide-rp-system',
        'embeddedImageMigrationVersion',
        '1.3.0'
      );
    });

    test('should skip locked compendium packs', async () => {
      global.game.settings.get.mockReturnValue('1.0.0');

      const mockLockedPack = {
        documentName: 'Item',
        locked: true,
        metadata: {
          packageType: 'world'
        },
        getDocuments: vi.fn()
      };

      global.game.packs = [mockLockedPack];

      await EmbeddedImageMigration.run();

      expect(mockLockedPack.getDocuments).not.toHaveBeenCalled();
    });

    test('should skip non-world compendium packs', async () => {
      global.game.settings.get.mockReturnValue('1.0.0');

      const mockSystemPack = {
        documentName: 'Item',
        locked: false,
        metadata: {
          packageType: 'system'
        },
        getDocuments: vi.fn()
      };

      global.game.packs = [mockSystemPack];

      await EmbeddedImageMigration.run();

      expect(mockSystemPack.getDocuments).not.toHaveBeenCalled();
    });

    test('should show migration in progress notification', async () => {
      global.game.settings.get.mockReturnValue('1.0.0');

      const mockNotification = { remove: vi.fn() };
      global.ui.notifications.warn.mockReturnValue(mockNotification);

      await EmbeddedImageMigration.run();

      expect(global.ui.notifications.warn).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Migration.InProgress',
        { permanent: true }
      );
    });

    test('should remove in progress notification on completion', async () => {
      global.game.settings.get.mockReturnValue('1.0.0');

      const mockNotification = { remove: vi.fn() };
      global.ui.notifications.warn.mockReturnValue(mockNotification);

      await EmbeddedImageMigration.run();

      expect(mockNotification.remove).toHaveBeenCalled();
    });

    test('should handle migration errors gracefully', async () => {
      // Make the settings.get throw an error after the initial check
      global.game.settings.get.mockImplementation((scope, key) => {
        if (key === 'embeddedImageMigrationVersion') {
          return '1.0.0';
        }
        throw new Error('Settings error');
      });

      // Make the pack processing throw an error
      const mockPack = {
        documentName: 'Item',
        locked: false,
        metadata: {
          packageType: 'world'
        },
        getDocuments: vi.fn().mockRejectedValue(new Error('Pack error'))
      };

      global.game.packs = [mockPack];
      global.game.items = [];
      global.game.actors = [];

      const mockNotification = { remove: vi.fn() };
      global.ui.notifications.warn.mockReturnValue(mockNotification);

      await EmbeddedImageMigration.run();

      expect(mockNotification.remove).toHaveBeenCalled();
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });
  });

  describe('_processItem()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      global.foundry = {
        utils: {
          deepClone: vi.fn((obj) => JSON.parse(JSON.stringify(obj)))
        }
      };
    });

    test('should process actionCard with statusPerSuccess migration', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          statusPerSuccess: true
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._processItem(mockItem);

      expect(result.itemsFixed).toBe(1);
      expect(result.statusFieldsMigrated).toBe(1);
    });

    test('should skip items already migrated (statusPerSuccess is not boolean)', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          statusPerSuccess: null,
          statusApplicationLimit: 0
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._processItem(mockItem);

      expect(result.itemsFixed).toBe(0);
      expect(result.statusFieldsMigrated).toBe(0);
    });

    test('should return zero counts for non-actionCard items', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'gear',
        name: 'Test Gear',
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._processItem(mockItem);

      expect(result.itemsFixed).toBe(0);
      expect(result.effectsFixed).toBe(0);
      expect(result.statusFieldsMigrated).toBe(0);
    });
  });

  describe('_fixActionCardEmbeddedEffects()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      global.foundry = {
        utils: {
          deepClone: vi.fn((obj) => JSON.parse(JSON.stringify(obj)))
        }
      };
    });

    test('should fix effect icon when different from item image', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          embeddedStatusEffects: [
            {
              name: 'Bleeding',
              img: 'icons/svg/bleed.svg',
              effects: [
                { icon: 'icons/svg/wrong.svg', name: 'Bleeding' }
              ]
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixActionCardEmbeddedEffects(mockItem);

      expect(result.fixed).toBe(true);
      expect(result.effectsFixed).toBe(1);
      expect(mockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          'system.embeddedStatusEffects': expect.any(Array)
        })
      );
    });

    test('should fix effect name when different from item name', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          embeddedStatusEffects: [
            {
              name: 'Bleeding',
              img: 'icons/svg/bleed.svg',
              effects: [
                { icon: 'icons/svg/bleed.svg', name: 'Wrong Name' }
              ]
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixActionCardEmbeddedEffects(mockItem);

      expect(result.fixed).toBe(true);
      // Note: Only name changes don't increment effectsFixed counter
      expect(result.effectsFixed).toBe(0);
    });

    test('should skip when effect icon already matches item image', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          embeddedStatusEffects: [
            {
              name: 'Bleeding',
              img: 'icons/svg/bleed.svg',
              effects: [
                { icon: 'icons/svg/bleed.svg', name: 'Bleeding' }
              ]
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixActionCardEmbeddedEffects(mockItem);

      expect(result.fixed).toBe(false);
      expect(result.effectsFixed).toBe(0);
      expect(mockItem.update).not.toHaveBeenCalled();
    });

    test('should handle multiple embedded status effects', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          embeddedStatusEffects: [
            {
              name: 'Bleeding',
              img: 'icons/svg/bleed.svg',
              effects: [
                { icon: 'wrong.svg', name: 'Bleeding' }
              ]
            },
            {
              name: 'Poisoned',
              img: 'icons/svg/poison.svg',
              effects: [
                { icon: 'wrong2.svg', name: 'Poisoned' }
              ]
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixActionCardEmbeddedEffects(mockItem);

      expect(result.fixed).toBe(true);
      expect(result.effectsFixed).toBe(2);
    });

    test('should skip effects without effects array', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          embeddedStatusEffects: [
            {
              name: 'No Effects',
              img: 'icons/svg/test.svg'
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixActionCardEmbeddedEffects(mockItem);

      expect(result.fixed).toBe(false);
      expect(result.effectsFixed).toBe(0);
    });

    test('should skip when item image is empty', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          embeddedStatusEffects: [
            {
              name: 'No Image',
              img: '',
              effects: [
                { icon: 'wrong.svg', name: 'No Image' }
              ]
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixActionCardEmbeddedEffects(mockItem);

      expect(result.fixed).toBe(false);
      expect(result.effectsFixed).toBe(0);
    });
  });

  describe('_fixActionCardEmbeddedItem()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      global.foundry = {
        utils: {
          deepClone: vi.fn((obj) => JSON.parse(JSON.stringify(obj)))
        }
      };
    });

    test('should fix embedded item effect icon', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          embeddedItem: {
            name: 'Sword',
            img: 'icons/svg/sword.svg',
            effects: [
              { icon: 'wrong.svg', name: 'Sword' }
            ]
          }
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixActionCardEmbeddedItem(mockItem);

      expect(result.fixed).toBe(true);
      expect(result.effectsFixed).toBe(1);
      expect(mockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          'system.embeddedItem': expect.any(Object)
        })
      );
    });

    test('should fix embedded item effect name', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          embeddedItem: {
            name: 'Sword',
            img: 'icons/svg/sword.svg',
            effects: [
              { icon: 'icons/svg/sword.svg', name: 'Wrong Name' }
            ]
          }
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixActionCardEmbeddedItem(mockItem);

      expect(result.fixed).toBe(true);
      // Note: Only name changes don't increment effectsFixed counter
      expect(result.effectsFixed).toBe(0);
    });

    test('should skip when no effects array present', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          embeddedItem: {
            name: 'No Effects',
            img: 'icons/svg/test.svg'
          }
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixActionCardEmbeddedItem(mockItem);

      expect(result.fixed).toBe(false);
      expect(result.effectsFixed).toBe(0);
    });

    test('should skip when already matching', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          embeddedItem: {
            name: 'Sword',
            img: 'icons/svg/sword.svg',
            effects: [
              { icon: 'icons/svg/sword.svg', name: 'Sword' }
            ]
          }
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixActionCardEmbeddedItem(mockItem);

      expect(result.fixed).toBe(false);
      expect(mockItem.update).not.toHaveBeenCalled();
    });
  });

  describe('_migrateStatusPerSuccess()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    test('should migrate statusPerSuccess true to statusApplicationLimit 0', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          statusPerSuccess: true
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._migrateStatusPerSuccess(mockItem);

      expect(result.fixed).toBe(true);
      expect(mockItem.update).toHaveBeenCalledWith({
        'system.statusApplicationLimit': 0,
        'system.statusPerSuccess': null
      });
    });

    test('should migrate statusPerSuccess false to statusApplicationLimit 1', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          statusPerSuccess: false
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._migrateStatusPerSuccess(mockItem);

      expect(result.fixed).toBe(true);
      expect(mockItem.update).toHaveBeenCalledWith({
        'system.statusApplicationLimit': 1,
        'system.statusPerSuccess': null
      });
    });

    test('should skip when statusPerSuccess is not boolean', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {
          statusPerSuccess: null
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._migrateStatusPerSuccess(mockItem);

      expect(result.fixed).toBe(false);
      expect(mockItem.update).not.toHaveBeenCalled();
    });

    test('should skip when statusPerSuccess is undefined', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'actionCard',
        name: 'Test Action Card',
        system: {},
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._migrateStatusPerSuccess(mockItem);

      expect(result.fixed).toBe(false);
      expect(mockItem.update).not.toHaveBeenCalled();
    });
  });

  describe('_fixTransformationEmbeddedPowers()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      global.foundry = {
        utils: {
          deepClone: vi.fn((obj) => JSON.parse(JSON.stringify(obj)))
        }
      };
    });

    test('should fix embedded combat power effect icon', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'transformation',
        name: 'Test Transformation',
        system: {
          embeddedCombatPowers: [
            {
              name: 'Fireball',
              img: 'icons/svg/fire.svg',
              effects: [
                { icon: 'wrong.svg', name: 'Fireball' }
              ]
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixTransformationEmbeddedPowers(mockItem);

      expect(result.fixed).toBe(true);
      expect(result.effectsFixed).toBe(1);
      expect(mockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          'system.embeddedCombatPowers': expect.any(Array)
        })
      );
    });

    test('should fix embedded combat power effect name', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'transformation',
        name: 'Test Transformation',
        system: {
          embeddedCombatPowers: [
            {
              name: 'Fireball',
              img: 'icons/svg/fire.svg',
              effects: [
                { icon: 'icons/svg/fire.svg', name: 'Wrong Name' }
              ]
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixTransformationEmbeddedPowers(mockItem);

      expect(result.fixed).toBe(true);
      // Note: Only name changes don't increment effectsFixed counter
      expect(result.effectsFixed).toBe(0);
    });

    test('should skip when no effects array present', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'transformation',
        name: 'Test Transformation',
        system: {
          embeddedCombatPowers: [
            {
              name: 'No Effects',
              img: 'icons/svg/test.svg'
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixTransformationEmbeddedPowers(mockItem);

      expect(result.fixed).toBe(false);
      expect(result.effectsFixed).toBe(0);
    });

    test('should handle multiple embedded powers', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'transformation',
        name: 'Test Transformation',
        system: {
          embeddedCombatPowers: [
            {
              name: 'Fireball',
              img: 'icons/svg/fire.svg',
              effects: [
                { icon: 'wrong.svg', name: 'Fireball' }
              ]
            },
            {
              name: 'Ice Storm',
              img: 'icons/svg/ice.svg',
              effects: [
                { icon: 'wrong2.svg', name: 'Ice Storm' }
              ]
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixTransformationEmbeddedPowers(mockItem);

      expect(result.fixed).toBe(true);
      expect(result.effectsFixed).toBe(2);
    });
  });

  describe('_fixTransformationEmbeddedActionCards()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      global.foundry = {
        utils: {
          deepClone: vi.fn((obj) => JSON.parse(JSON.stringify(obj)))
        }
      };
    });

    test('should migrate statusPerSuccess in embedded action cards', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'transformation',
        name: 'Test Transformation',
        system: {
          embeddedActionCards: [
            {
              name: 'Embedded Action',
              system: {
                statusPerSuccess: true
              }
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixTransformationEmbeddedActionCards(mockItem);

      expect(result.fixed).toBe(true);
      expect(mockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          'system.embeddedActionCards': expect.any(Array)
        })
      );
    });

    test('should fix embedded item effect in embedded action cards', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'transformation',
        name: 'Test Transformation',
        system: {
          embeddedActionCards: [
            {
              name: 'Embedded Action',
              system: {
                embeddedItem: {
                  name: 'Test Gear',
                  img: 'icons/svg/gear.svg',
                  effects: [
                    { icon: 'wrong.svg', name: 'Test Gear' }
                  ]
                }
              }
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixTransformationEmbeddedActionCards(mockItem);

      expect(result.fixed).toBe(true);
      expect(result.effectsFixed).toBe(1);
    });

    test('should fix embedded status effects in embedded action cards', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'transformation',
        name: 'Test Transformation',
        system: {
          embeddedActionCards: [
            {
              name: 'Embedded Action',
              system: {
                embeddedStatusEffects: [
                  {
                    name: 'Bleeding',
                    img: 'icons/svg/bleed.svg',
                    effects: [
                      { icon: 'wrong.svg', name: 'Bleeding' }
                    ]
                  }
                ]
              }
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixTransformationEmbeddedActionCards(mockItem);

      expect(result.fixed).toBe(true);
      expect(result.effectsFixed).toBe(1);
    });

    test('should handle multiple embedded action cards', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'transformation',
        name: 'Test Transformation',
        system: {
          embeddedActionCards: [
            {
              name: 'Action 1',
              system: {
                statusPerSuccess: true
              }
            },
            {
              name: 'Action 2',
              system: {
                statusPerSuccess: false
              }
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixTransformationEmbeddedActionCards(mockItem);

      expect(result.fixed).toBe(true);
    });

    test('should skip when no changes needed', async () => {
      const mockItem = global.testUtils.createMockItem({
        type: 'transformation',
        name: 'Test Transformation',
        system: {
          embeddedActionCards: [
            {
              name: 'Embedded Action',
              system: {
                statusPerSuccess: null,
                statusApplicationLimit: 0
              }
            }
          ]
        },
        update: vi.fn()
      });

      const result = await EmbeddedImageMigration._fixTransformationEmbeddedActionCards(mockItem);

      expect(result.fixed).toBe(false);
      expect(result.effectsFixed).toBe(0);
      expect(mockItem.update).not.toHaveBeenCalled();
    });
  });
});