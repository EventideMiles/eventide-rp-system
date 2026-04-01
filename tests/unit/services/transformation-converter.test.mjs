// @ts-nocheck
/**
 * @fileoverview Transformation Converter Tests
 *
 * Unit tests for the TransformationConverter service which handles
 * bidirectional conversion between actors and transformations.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

import { TransformationConverter } from '../../../module/services/transformation-converter.mjs';

// Set up mocks before any tests
beforeEach(() => {
  vi.clearAllMocks();
});

describe('TransformationConverter', () => {
  describe('actorToTransformation()', () => {
    test('should return null for both world and compendium when user is not GM', async () => {
      // Arrange
      global.game.user.isGM = false;
      const mockActor = { id: 'actor1', name: 'Test Actor' };
      global.ui = { notifications: { error: vi.fn() } };
      global.game.i18n = { localize: vi.fn((key) => key) };

      // Act
      const result = await TransformationConverter.actorToTransformation(mockActor);

      // Assert
      expect(result.world).toBeNull();
      expect(result.compendium).toBeNull();
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should create transformation in compendium by default', async () => {
      // Arrange
      global.game.user.isGM = true;
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        img: 'actor.jpg',
        system: {
          biography: 'Test biography',
          abilities: { acro: { value: 3 }, phys: { value: 4 } },
          power: { max: 8 },
          resolve: { max: 12 },
          actionCardGroups: []
        },
        prototypeToken: {
          texture: { src: 'token.jpg' },
          width: 1,
          height: 1
        },
        items: []
      };
      mockActor.items.filter = vi.fn().mockReturnValue([]);
      const mockCreatedItem = { id: 'transformation1', name: 'Test Actor' };
      const mockPack = { collection: 'world.convertedtransformations' };
      const mockCompendiumCollection = {
        get: vi.fn().mockReturnValue(mockPack)
      };
      global.game = {
        ...global.game,
        packs: mockCompendiumCollection,
        i18n: {
          format: vi.fn((key, data) => `${key}: ${data?.name || ''}`),
          localize: vi.fn((key) => key)
        }
      };
      global.Item = {
        create: vi.fn().mockResolvedValue(mockCreatedItem)
      };
      global.foundry = {
        utils: {
          deepClone: vi.fn((data) => JSON.parse(JSON.stringify(data))),
          randomID: vi.fn(() => 'randomId')
        }
      };
      global.CONST = {
        ACTIVE_EFFECT_MODES: { OVERRIDE: 5 }
      };
      global.ui = { notifications: { info: vi.fn() } };

      // Act
      const result = await TransformationConverter.actorToTransformation(mockActor);

      // Assert
      expect(result.world).toBeNull();
      expect(result.compendium).toEqual(mockCreatedItem);
      expect(global.Item.create).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
        pack: 'world.convertedtransformations'
      }));
    });

    test('should create transformation in world when createIn is world', async () => {
      // Arrange
      global.game.user.isGM = true;
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        img: 'actor.jpg',
        system: {
          biography: 'Test biography',
          abilities: { acro: { value: 3 } },
          power: { max: 5 },
          resolve: { max: 10 },
          actionCardGroups: []
        },
        prototypeToken: {
          texture: { src: 'token.jpg' },
          width: 1,
          height: 1
        },
        items: []
      };
      mockActor.items.filter = vi.fn().mockReturnValue([]);
      const mockCreatedItem = { id: 'transformation1' };
      global.game = {
        ...global.game,
        i18n: {
          format: vi.fn((key, data) => `${key}: ${data?.name || ''}`),
          localize: vi.fn((key) => key)
        }
      };
      global.Item = {
        create: vi.fn().mockResolvedValue(mockCreatedItem)
      };
      global.foundry = {
        utils: {
          deepClone: vi.fn((data) => JSON.parse(JSON.stringify(data))),
          randomID: vi.fn(() => 'randomId')
        }
      };
      global.CONST = {
        ACTIVE_EFFECT_MODES: { OVERRIDE: 5 }
      };
      global.ui = { notifications: { info: vi.fn() } };

      // Act
      const result = await TransformationConverter.actorToTransformation(mockActor, { createIn: 'world' });

      // Assert
      expect(result.world).toEqual(mockCreatedItem);
      expect(result.compendium).toBeNull();
    });

    test('should use custom name when provided in options', async () => {
      // Arrange
      global.game.user.isGM = true;
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        img: 'actor.jpg',
        system: {
          biography: 'Bio',
          abilities: { acro: { value: 3 } },
          power: { max: 5 },
          resolve: { max: 10 },
          actionCardGroups: []
        },
        prototypeToken: {
          texture: { src: 'token.jpg' },
          width: 1,
          height: 1
        },
        items: []
      };
      mockActor.items.filter = vi.fn().mockReturnValue([]);
      const mockCreatedItem = { id: 'transformation1' };
      const mockPack = { collection: 'world.convertedtransformations' };
      global.game = {
        ...global.game,
        packs: { get: vi.fn().mockReturnValue(mockPack) },
        i18n: {
          format: vi.fn((key, data) => `${key}: ${data?.name || ''}`),
          localize: vi.fn((key) => key)
        }
      };
      global.Item = {
        create: vi.fn().mockResolvedValue(mockCreatedItem)
      };
      global.foundry = {
        utils: {
          deepClone: vi.fn((data) => JSON.parse(JSON.stringify(data))),
          randomID: vi.fn(() => 'randomId')
        }
      };
      global.CONST = {
        ACTIVE_EFFECT_MODES: { OVERRIDE: 5 }
      };
      global.ui = { notifications: { info: vi.fn() } };

      // Act
      await TransformationConverter.actorToTransformation(mockActor, { name: 'Custom Name' });

      // Assert
      expect(global.Item.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Custom Name'
      }), expect.any(Object));
    });
  });

  describe('transformationToActor()', () => {
    test('should return null for both world and compendium when user is not GM', async () => {
      // Arrange
      global.game.user.isGM = false;
      const mockTransformation = { id: 'trans1', name: 'Test Transformation', type: 'transformation' };
      global.ui = { notifications: { error: vi.fn() } };
      global.game.i18n = { localize: vi.fn((key) => key) };

      // Act
      const result = await TransformationConverter.transformationToActor(mockTransformation);

      // Assert
      expect(result.world).toBeNull();
      expect(result.compendium).toBeNull();
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should return null when item type is not transformation', async () => {
      // Arrange
      global.game.user.isGM = true;
      const mockTransformation = { id: 'trans1', name: 'Test Item', type: 'feature' };
      global.ui = { notifications: { error: vi.fn() } };
      global.game.i18n = { localize: vi.fn((key) => key) };

      // Act
      const result = await TransformationConverter.transformationToActor(mockTransformation);

      // Assert
      expect(result.world).toBeNull();
      expect(result.compendium).toBeNull();
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should create actor in compendium by default', async () => {
      // Arrange
      global.game.user.isGM = true;
      const mockTransformation = {
        id: 'trans1',
        name: 'Test Transformation',
        type: 'transformation',
        img: 'transform.jpg',
        system: {
          description: 'Test description',
          tokenImage: 'token.jpg',
          powerAdjustment: 3,
          resolveAdjustment: 2,
          size: 1,
          abilityOverrides: { acro: 4, phys: 5 },
          embeddedCombatPowers: [],
          embeddedActionCards: [],
          actionCardGroups: []
        },
        effects: new Map(),
        items: new Map()
      };
      const mockCreatedActor = { id: 'actor1', name: 'Test Transformation' };
      const mockPack = { collection: 'world.convertedactors' };
      global.game = {
        ...global.game,
        user: { isGM: true },
        packs: { get: vi.fn().mockReturnValue(mockPack) },
        i18n: {
          format: vi.fn((key, data) => `${key}: ${data?.name || ''}`),
          localize: vi.fn((key) => key)
        },
        actors: { get: vi.fn() }
      };
      global.Actor = {
        create: vi.fn().mockResolvedValue(mockCreatedActor)
      };
      global.foundry = {
        utils: {
          deepClone: vi.fn((data) => JSON.parse(JSON.stringify(data))),
          randomID: vi.fn(() => 'randomId')
        }
      };
      global.CONFIG = {
        EVENTIDE_RP_SYSTEM: {
          abilities: { acro: {}, phys: {} }
        }
      };
      global.ui = { notifications: { info: vi.fn() } };

      // Act
      const result = await TransformationConverter.transformationToActor(mockTransformation);

      // Assert
      expect(result.world).toBeNull();
      expect(result.compendium).toEqual(mockCreatedActor);
      expect(global.Actor.create).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
        pack: 'world.convertedactors'
      }));
    });

    test('should create actor in world when createIn is world', async () => {
      // Arrange
      global.game.user.isGM = true;
      const mockTransformation = {
        id: 'trans1',
        name: 'Test Transformation',
        type: 'transformation',
        img: 'transform.jpg',
        system: {
          description: 'Desc',
          tokenImage: 'token.jpg',
          powerAdjustment: 0,
          resolveAdjustment: 0,
          size: 1,
          abilityOverrides: {},
          embeddedCombatPowers: [],
          embeddedActionCards: [],
          actionCardGroups: []
        },
        effects: new Map(),
        items: new Map()
      };
      const mockCreatedActor = { id: 'actor1' };
      global.game = {
        ...global.game,
        user: { isGM: true },
        i18n: {
          format: vi.fn((key, data) => `${key}: ${data?.name || ''}`),
          localize: vi.fn((key) => key)
        },
        actors: { get: vi.fn() }
      };
      global.Actor = {
        create: vi.fn().mockResolvedValue(mockCreatedActor)
      };
      global.foundry = {
        utils: {
          deepClone: vi.fn((data) => JSON.parse(JSON.stringify(data))),
          randomID: vi.fn(() => 'randomId')
        }
      };
      global.CONFIG = {
        EVENTIDE_RP_SYSTEM: {
          abilities: { acro: {}, phys: {} }
        }
      };
      global.ui = { notifications: { info: vi.fn() } };

      // Act
      const result = await TransformationConverter.transformationToActor(mockTransformation, { createIn: 'world' });

      // Assert
      expect(result.world).toEqual(mockCreatedActor);
      expect(result.compendium).toBeNull();
    });

    test('should use custom name when provided in options', async () => {
      // Arrange
      global.game.user.isGM = true;
      const mockTransformation = {
        id: 'trans1',
        name: 'Test Transformation',
        type: 'transformation',
        img: 'transform.jpg',
        system: {
          description: 'Desc',
          tokenImage: 'token.jpg',
          powerAdjustment: 0,
          resolveAdjustment: 0,
          size: 1,
          abilityOverrides: {},
          embeddedCombatPowers: [],
          embeddedActionCards: [],
          actionCardGroups: []
        },
        effects: new Map(),
        items: new Map()
      };
      const mockCreatedActor = { id: 'actor1' };
      const mockPack = { collection: 'world.convertedactors' };
      global.game = {
        ...global.game,
        user: { isGM: true },
        packs: { get: vi.fn().mockReturnValue(mockPack) },
        i18n: {
          format: vi.fn((key, data) => `${key}: ${data?.name || ''}`),
          localize: vi.fn((key) => key)
        },
        actors: { get: vi.fn() }
      };
      global.Actor = {
        create: vi.fn().mockResolvedValue(mockCreatedActor)
      };
      global.foundry = {
        utils: {
          deepClone: vi.fn((data) => JSON.parse(JSON.stringify(data))),
          randomID: vi.fn(() => 'randomId')
        }
      };
      global.CONFIG = {
        EVENTIDE_RP_SYSTEM: {
          abilities: { acro: {}, phys: {} }
        }
      };
      global.ui = { notifications: { info: vi.fn() } };

      // Act
      await TransformationConverter.transformationToActor(mockTransformation, { name: 'Custom Actor Name' });

      // Assert
      expect(global.Actor.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Custom Actor Name'
      }), expect.any(Object));
    });
  });

  describe('_calculateTokenSize()', () => {
    test('should return 0.5 for tiny tokens', () => {
      // Arrange
      const prototypeToken = {
        texture: { scaleX: 0.5 },
        width: 0.5,
        height: 0.5
      };

      // Act
      const result = TransformationConverter._calculateTokenSize(prototypeToken);

      // Assert
      expect(result).toBe(0.5);
    });

    test('should return 0.75 for small tokens', () => {
      // Arrange
      const prototypeToken = {
        texture: { scaleX: 0.75 },
        width: 1,
        height: 1
      };

      // Act
      const result = TransformationConverter._calculateTokenSize(prototypeToken);

      // Assert
      expect(result).toBe(0.75);
    });

    test('should return 1 for normal tokens', () => {
      // Arrange
      const prototypeToken = {
        texture: { scaleX: 1 },
        width: 1,
        height: 1
      };

      // Act
      const result = TransformationConverter._calculateTokenSize(prototypeToken);

      // Assert
      expect(result).toBe(1);
    });

    test('should return 5 for large tokens at max size', () => {
      // Arrange
      const prototypeToken = {
        texture: { scaleX: 1 },
        width: 5,
        height: 5
      };

      // Act
      const result = TransformationConverter._calculateTokenSize(prototypeToken);

      // Assert
      expect(result).toBe(5);
    });

    test('should handle missing texture scaleX', () => {
      // Arrange
      const prototypeToken = {
        width: 1,
        height: 1
      };

      // Act
      const result = TransformationConverter._calculateTokenSize(prototypeToken);

      // Assert
      expect(result).toBe(1);
    });

    test('should constrain token size to max of 5', () => {
      // Arrange
      const prototypeToken = {
        texture: { scaleX: 1 },
        width: 10,
        height: 10
      };

      // Act
      const result = TransformationConverter._calculateTokenSize(prototypeToken);

      // Assert
      expect(result).toBe(5);
    });
  });

  describe('_ensureCompendium()', () => {
    test('should return existing compendium if it exists', async () => {
      // Arrange
      const mockPack = { id: 'pack1', name: 'convertedactors' };
      global.game = {
        ...global.game,
        packs: { get: vi.fn().mockReturnValue(mockPack) }
      };

      // Act
      const result = await TransformationConverter._ensureCompendium('world.convertedactors', 'Actor', 'Converted Actors');

      // Assert
      expect(result).toEqual(mockPack);
      expect(global.game.packs.get).toHaveBeenCalledWith('world.convertedactors');
    });

    test('should create new compendium if it does not exist', async () => {
      // Arrange
      const mockPack = { id: 'pack1', name: 'convertedactors', collection: 'world.convertedactors' };
      global.game = {
        ...global.game,
        packs: { get: vi.fn().mockReturnValue(null) }
      };
      global.foundry = {
        documents: {
          collections: {
            CompendiumCollection: {
              createCompendium: vi.fn().mockResolvedValue(mockPack)
            }
          }
        }
      };
      global.ui = { notifications: { error: vi.fn() } };
      global.game.i18n = {
        format: vi.fn((key, data) => `${key}: ${data?.name || ''}`)
      };

      // Act
      const result = await TransformationConverter._ensureCompendium('world.convertedactors', 'Actor', 'Converted Actors');

      // Assert
      expect(result).toEqual(mockPack);
      expect(global.foundry.documents.collections.CompendiumCollection.createCompendium).toHaveBeenCalledWith({
        name: 'convertedactors',
        label: 'Converted Actors',
        type: 'Actor'
      });
    });

    test('should return null when compendium creation fails', async () => {
      // Arrange
      const mockError = new Error('Creation failed');
      global.game = {
        ...global.game,
        packs: { get: vi.fn().mockReturnValue(null) }
      };
      global.foundry = {
        documents: {
          collections: {
            CompendiumCollection: {
              createCompendium: vi.fn().mockRejectedValue(mockError)
            }
          }
        }
      };
      global.ui = { notifications: { error: vi.fn() } };
      global.game.i18n = {
        format: vi.fn((key, data) => `${key}: ${data?.name || ''}`)
      };

      // Act
      const result = await TransformationConverter._ensureCompendium('world.newcompendium', 'Actor', 'New Compendium');

      // Assert
      expect(result).toBeNull();
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });
  });

  describe('COMPENDIUMS constant', () => {
    test('should have correct default compendium names', () => {
      // Act & Assert
      expect(TransformationConverter.COMPENDIUMS.actors).toBe('convertedactors');
      expect(TransformationConverter.COMPENDIUMS.actorsLabel).toBe('Converted Actors');
      expect(TransformationConverter.COMPENDIUMS.transformations).toBe('convertedtransformations');
      expect(TransformationConverter.COMPENDIUMS.transformationsLabel).toBe('Converted Transformations');
    });
  });
});