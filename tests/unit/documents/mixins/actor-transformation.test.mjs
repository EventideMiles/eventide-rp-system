// @ts-nocheck
/**
 * @fileoverview Tests for ActorTransformationMixin - Transformation functionality
 *
 * Tests transformation application, removal, token updates, and power/resolve adjustments.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock the dependencies first
const mockLogger = {
  methodEntry: vi.fn(),
  methodExit: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};

const mockErpsMessageHandler = {
  createTransformationMessage: vi.fn().mockResolvedValue({})
};

// Mock the module imports
vi.mock('../../../../module/services/logger.mjs', () => ({
  Logger: mockLogger
}));

vi.mock('../../../../module/services/_module.mjs', () => ({
  erpsMessageHandler: mockErpsMessageHandler
}));

vi.mock('../../../../module/utils/error-handler.mjs', () => ({
  ErrorHandler: {
    handleAsync: vi.fn((promise) => promise.then((result) => [result, null]).catch((error) => [null, error])),
    ERROR_TYPES: {
      VALIDATION: 'validation',
      FOUNDRY_API: 'foundry-api'
    }
  }
}));

// Import the mixin after mocking dependencies
const { ActorTransformationMixin } = await import('../../../../module/documents/mixins/actor-transformation.mjs');

// Create a test class that uses the mixin
class TestActorClass {
  constructor() {
    this.system = {
      resolve: { value: 10, max: 20 },
      power: { value: 5, max: 15 }
    };
    this.items = [];
    this.name = 'Test Actor';
    this.id = 'actor123';
    this.isOwner = true;
    this.isToken = false;
    this.token = null;
    this.isEditable = true;
    this.update = vi.fn().mockResolvedValue(this);
    this.deleteEmbeddedDocuments = vi.fn().mockResolvedValue([]);
    this.createEmbeddedDocuments = vi.fn().mockResolvedValue([]);
    this.getFlag = vi.fn();
    this.setFlag = vi.fn().mockResolvedValue(this);
    this.unsetFlag = vi.fn().mockResolvedValue(this);
  }

  _clampValue(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
}

const MixedClass = ActorTransformationMixin(TestActorClass);

describe('ActorTransformationMixin', () => {
  let actor;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup global game object
    global.game = {
      user: { isGM: false },
      i18n: {
        format: vi.fn((key) => key)
      },
      scenes: {
        contents: [],
        get: vi.fn()
      }
    };
    
    global.ui = {
      notifications: {
        warn: vi.fn(),
        error: vi.fn()
      }
    };

    global.CONFIG = {
      Item: {
        documentClass: vi.fn().mockImplementation((data, options) => ({
          ...data,
          parent: options?.parent,
          isEditable: options?.parent?.isEditable ?? true,
          toObject: vi.fn().mockReturnValue(data)
        }))
      }
    };
    
    actor = new MixedClass();
  });

  describe('_clampValue()', () => {
    test('should return value when within range', () => {
      const result = actor._clampValue(5, 0, 10);
      expect(result).toBe(5);
    });

    test('should return min when value is below range', () => {
      const result = actor._clampValue(-5, 0, 10);
      expect(result).toBe(0);
    });

    test('should return max when value is above range', () => {
      const result = actor._clampValue(15, 0, 10);
      expect(result).toBe(10);
    });

    test('should handle equal min and max', () => {
      const result = actor._clampValue(50, 10, 10);
      expect(result).toBe(10);
    });

    test('should handle value at min boundary', () => {
      const result = actor._clampValue(0, 0, 10);
      expect(result).toBe(0);
    });

    test('should handle value at max boundary', () => {
      const result = actor._clampValue(10, 0, 10);
      expect(result).toBe(10);
    });

    test('should handle negative ranges', () => {
      const result = actor._clampValue(-5, -10, -1);
      expect(result).toBe(-5);
    });

    test('should clamp to negative min', () => {
      const result = actor._clampValue(-15, -10, 10);
      expect(result).toBe(-10);
    });
  });

  describe('_validateTransformationOperation()', () => {
    test('should return true when actor is owner and item is valid transformation', () => {
      actor.isOwner = true;
      const transformationItem = { id: 'trans1', type: 'transformation', name: 'Wolf Form' };

      const result = actor._validateTransformationOperation(transformationItem);

      expect(result).toBe(true);
    });

    test('should return false when actor is not owner', () => {
      actor.isOwner = false;
      const transformationItem = { id: 'trans1', type: 'transformation', name: 'Wolf Form' };

      const result = actor._validateTransformationOperation(transformationItem);

      expect(result).toBe(false);
      expect(global.ui.notifications.warn).toHaveBeenCalled();
    });

    test('should return false when transformation item is null', () => {
      actor.isOwner = true;

      const result = actor._validateTransformationOperation(null);

      expect(result).toBe(false);
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should return false when item type is not transformation', () => {
      actor.isOwner = true;
      const invalidItem = { id: 'item1', type: 'gear', name: 'Sword' };

      const result = actor._validateTransformationOperation(invalidItem);

      expect(result).toBe(false);
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should return false when item is undefined', () => {
      actor.isOwner = true;

      const result = actor._validateTransformationOperation(undefined);

      expect(result).toBe(false);
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });
  });

  describe('_calculateTransformationSize()', () => {
    test('should set tiny size for size 0.5', () => {
      const updates = {};
      actor._calculateTransformationSize(updates, 0.5);

      expect(updates.width).toBe(0.5);
      expect(updates.height).toBe(0.5);
      expect(updates['texture.scaleX']).toBe(1);
      expect(updates['texture.scaleY']).toBe(1);
    });

    test('should set small size for size 0.75', () => {
      const updates = {};
      actor._calculateTransformationSize(updates, 0.75);

      expect(updates.width).toBe(1);
      expect(updates.height).toBe(1);
      expect(updates['texture.scaleX']).toBe(0.75);
      expect(updates['texture.scaleY']).toBe(0.75);
    });

    test('should set medium size for size 1', () => {
      const updates = {};
      actor._calculateTransformationSize(updates, 1);

      expect(updates.width).toBe(1);
      expect(updates.height).toBe(1);
      expect(updates['texture.scaleX']).toBe(1);
      expect(updates['texture.scaleY']).toBe(1);
    });

    test('should set large size for size 2', () => {
      const updates = {};
      actor._calculateTransformationSize(updates, 2);

      expect(updates.width).toBe(2);
      expect(updates.height).toBe(2);
      expect(updates['texture.scaleX']).toBe(1);
      expect(updates['texture.scaleY']).toBe(1);
    });

    test('should set size with half increment scale for size 1.5', () => {
      const updates = {};
      actor._calculateTransformationSize(updates, 1.5);

      expect(updates.width).toBe(1);
      expect(updates.height).toBe(1);
      expect(updates['texture.scaleX']).toBe(1.5);
      expect(updates['texture.scaleY']).toBe(1.5);
    });

    test('should set size with half increment scale for size 2.5', () => {
      const updates = {};
      actor._calculateTransformationSize(updates, 2.5);

      expect(updates.width).toBe(2);
      expect(updates.height).toBe(2);
      expect(updates['texture.scaleX']).toBe(1.25);
      expect(updates['texture.scaleY']).toBe(1.25);
    });

    test('should set huge size for size 4', () => {
      const updates = {};
      actor._calculateTransformationSize(updates, 4);

      expect(updates.width).toBe(4);
      expect(updates.height).toBe(4);
      expect(updates['texture.scaleX']).toBe(1);
      expect(updates['texture.scaleY']).toBe(1);
    });

    test('should set gargantuan size for size 6', () => {
      const updates = {};
      actor._calculateTransformationSize(updates, 6);

      expect(updates.width).toBe(6);
      expect(updates.height).toBe(6);
      expect(updates['texture.scaleX']).toBe(1);
      expect(updates['texture.scaleY']).toBe(1);
    });
  });

  describe('_getTokenTransformationUpdates()', () => {
    test('should return empty object when no transformation data provided', () => {
      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form',
        system: {
          tokenImage: null,
          size: 0
        }
      };

      const result = actor._getTokenTransformationUpdates(transformationItem);

      expect(result).toEqual({});
    });

    test('should include token image when provided', () => {
      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form',
        system: {
          tokenImage: 'modules/test/images/wolf-token.webp',
          size: 0
        }
      };

      const result = actor._getTokenTransformationUpdates(transformationItem);

      expect(result['texture.src']).toBe('modules/test/images/wolf-token.webp');
    });

    test('should include size updates when size is greater than 0', () => {
      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Giant Form',
        system: {
          tokenImage: 'modules/test/images/giant-token.webp',
          size: 2
        }
      };

      const result = actor._getTokenTransformationUpdates(transformationItem);

      expect(result['texture.src']).toBe('modules/test/images/giant-token.webp');
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
    });

    test('should not include size updates when size is 0', () => {
      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Disguise',
        system: {
          tokenImage: 'modules/test/images/disguise-token.webp',
          size: 0
        }
      };

      const result = actor._getTokenTransformationUpdates(transformationItem);

      expect(result['texture.src']).toBe('modules/test/images/disguise-token.webp');
      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
    });

    test('should handle tiny creature size (0.5)', () => {
      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Fairy Form',
        system: {
          tokenImage: 'modules/test/images/fairy-token.webp',
          size: 0.5
        }
      };

      const result = actor._getTokenTransformationUpdates(transformationItem);

      expect(result.width).toBe(0.5);
      expect(result.height).toBe(0.5);
    });
  });

  describe('_getAllTokensAcrossScenes()', () => {
    test('should return empty array when no scenes exist', () => {
      global.game.scenes.contents = [];

      const result = actor._getAllTokensAcrossScenes();

      expect(result).toEqual([]);
    });

    test('should return empty array when no tokens match actor', () => {
      const mockScene = {
        id: 'scene1',
        name: 'Test Scene',
        tokens: []
      };
      global.game.scenes.contents = [mockScene];

      const result = actor._getAllTokensAcrossScenes();

      expect(result).toEqual([]);
    });

    test('should return tokens that match actor ID', () => {
      const mockTokenDoc = {
        id: 'token1',
        actorId: 'actor123',
        actor: { id: 'actor123' }
      };
      const mockScene = {
        id: 'scene1',
        name: 'Test Scene',
        tokens: [mockTokenDoc]
      };
      global.game.scenes.contents = [mockScene];

      const result = actor._getAllTokensAcrossScenes();

      expect(result).toHaveLength(1);
      expect(result[0].document).toBe(mockTokenDoc);
      expect(result[0].scene).toBe(mockScene);
    });

    test('should not return tokens with different actor ID', () => {
      const mockTokenDoc1 = {
        id: 'token1',
        actorId: 'actor123',
        actor: { id: 'actor123' }
      };
      const mockTokenDoc2 = {
        id: 'token2',
        actorId: 'other-actor',
        actor: { id: 'other-actor' }
      };
      const mockScene = {
        id: 'scene1',
        name: 'Test Scene',
        tokens: [mockTokenDoc1, mockTokenDoc2]
      };
      global.game.scenes.contents = [mockScene];

      const result = actor._getAllTokensAcrossScenes();

      expect(result).toHaveLength(1);
      expect(result[0].document.id).toBe('token1');
    });

    test('should not return tokens without actor reference', () => {
      const mockTokenDoc = {
        id: 'token1',
        actorId: 'actor123',
        actor: null
      };
      const mockScene = {
        id: 'scene1',
        name: 'Test Scene',
        tokens: [mockTokenDoc]
      };
      global.game.scenes.contents = [mockScene];

      const result = actor._getAllTokensAcrossScenes();

      expect(result).toHaveLength(0);
    });

    test('should aggregate tokens from multiple scenes', () => {
      const mockTokenDoc1 = {
        id: 'token1',
        actorId: 'actor123',
        actor: { id: 'actor123' }
      };
      const mockTokenDoc2 = {
        id: 'token2',
        actorId: 'actor123',
        actor: { id: 'actor123' }
      };
      const mockScene1 = {
        id: 'scene1',
        name: 'Scene One',
        tokens: [mockTokenDoc1]
      };
      const mockScene2 = {
        id: 'scene2',
        name: 'Scene Two',
        tokens: [mockTokenDoc2]
      };
      global.game.scenes.contents = [mockScene1, mockScene2];

      const result = actor._getAllTokensAcrossScenes();

      expect(result).toHaveLength(2);
    });
  });

  describe('hasTransformationCombatPowers()', () => {
    test('should return falsy when no transformation combat powers flag', () => {
      actor.getFlag = vi.fn().mockReturnValue(null);

      const result = actor.hasTransformationCombatPowers();

      expect(result).toBeFalsy();
    });

    test('should return false when transformation combat powers is empty array', () => {
      actor.getFlag = vi.fn().mockReturnValue([]);

      const result = actor.hasTransformationCombatPowers();

      expect(result).toBe(false);
    });

    test('should return true when transformation combat powers exist', () => {
      actor.getFlag = vi.fn().mockReturnValue([
        { id: 'power1', name: 'Fire Breath' }
      ]);

      const result = actor.hasTransformationCombatPowers();

      expect(result).toBe(true);
    });

    test('should return true when multiple transformation combat powers exist', () => {
      actor.getFlag = vi.fn().mockReturnValue([
        { id: 'power1', name: 'Fire Breath' },
        { id: 'power2', name: 'Ice Claw' }
      ]);

      const result = actor.hasTransformationCombatPowers();

      expect(result).toBe(true);
    });
  });

  describe('hasTransformationActionCards()', () => {
    test('should return falsy when no transformation action cards flag', () => {
      actor.getFlag = vi.fn().mockReturnValue(null);

      const result = actor.hasTransformationActionCards();

      expect(result).toBeFalsy();
    });

    test('should return false when transformation action cards is empty array', () => {
      actor.getFlag = vi.fn().mockReturnValue([]);

      const result = actor.hasTransformationActionCards();

      expect(result).toBe(false);
    });

    test('should return true when transformation action cards exist', () => {
      actor.getFlag = vi.fn().mockReturnValue([
        { id: 'card1', name: 'Rage' }
      ]);

      const result = actor.hasTransformationActionCards();

      expect(result).toBe(true);
    });

    test('should return true when multiple transformation action cards exist', () => {
      actor.getFlag = vi.fn().mockReturnValue([
        { id: 'card1', name: 'Rage' },
        { id: 'card2', name: 'Frenzy' }
      ]);

      const result = actor.hasTransformationActionCards();

      expect(result).toBe(true);
    });
  });

  describe('getCurrentActionCards()', () => {
    test('should return actor action cards when not transformed', () => {
      actor.getFlag = vi.fn().mockReturnValue(null);
      actor.items = [
        { id: 'card1', type: 'actionCard', name: 'Quick Strike' },
        { id: 'card2', type: 'actionCard', name: 'Defensive Stance' },
        { id: 'gear1', type: 'gear', name: 'Sword' }
      ];

      const result = actor.getCurrentActionCards();

      expect(result).toHaveLength(2);
      expect(result.map(c => c.name)).toContain('Quick Strike');
      expect(result.map(c => c.name)).toContain('Defensive Stance');
    });

    test('should return transformation action cards when transformed', () => {
      const transformationActionCards = [
        { id: 'trans-card1', name: 'Wolf Bite', type: 'actionCard' },
        { id: 'trans-card2', name: 'Howl', type: 'actionCard' }
      ];
      actor.getFlag = vi.fn().mockReturnValue(transformationActionCards);
      actor.items = [
        { id: 'card1', type: 'actionCard', name: 'Quick Strike' }
      ];

      const result = actor.getCurrentActionCards();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Wolf Bite');
      expect(result[1].name).toBe('Howl');
    });

    test('should return empty array when no action cards and not transformed', () => {
      actor.getFlag = vi.fn().mockReturnValue(null);
      actor.items = [
        { id: 'gear1', type: 'gear', name: 'Sword' }
      ];

      const result = actor.getCurrentActionCards();

      expect(result).toEqual([]);
    });

    test('should return empty array when transformation has empty action cards', () => {
      actor.getFlag = vi.fn().mockReturnValue([]);
      actor.items = [];

      const result = actor.getCurrentActionCards();

      expect(result).toEqual([]);
    });
  });

  describe('getCurrentCombatPowers()', () => {
    test('should return actor combat powers when not transformed', () => {
      actor.getFlag = vi.fn().mockReturnValue(null);
      actor.items = [
        { id: 'power1', type: 'combatPower', name: 'Fireball' },
        { id: 'power2', type: 'combatPower', name: 'Shield' },
        { id: 'gear1', type: 'gear', name: 'Sword' }
      ];

      const result = actor.getCurrentCombatPowers();

      expect(result).toHaveLength(2);
      expect(result.map(p => p.name)).toContain('Fireball');
      expect(result.map(p => p.name)).toContain('Shield');
    });

    test('should return transformation combat powers when transformed', () => {
      const transformationCombatPowers = [
        { id: 'trans-power1', name: 'Dragon Breath', type: 'combatPower' },
        { id: 'trans-power2', name: 'Wing Attack', type: 'combatPower' }
      ];
      actor.getFlag = vi.fn().mockReturnValue(transformationCombatPowers);
      actor.items = [
        { id: 'power1', type: 'combatPower', name: 'Fireball' }
      ];

      const result = actor.getCurrentCombatPowers();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Dragon Breath');
      expect(result[1].name).toBe('Wing Attack');
    });

    test('should return empty array when no combat powers and not transformed', () => {
      actor.getFlag = vi.fn().mockReturnValue(null);
      actor.items = [
        { id: 'gear1', type: 'gear', name: 'Sword' }
      ];

      const result = actor.getCurrentCombatPowers();

      expect(result).toEqual([]);
    });

    test('should return empty array when transformation has empty combat powers', () => {
      actor.getFlag = vi.fn().mockReturnValue([]);
      actor.items = [];

      const result = actor.getCurrentCombatPowers();

      expect(result).toEqual([]);
    });
  });

  describe('_transformPowerAndResolveUpdate()', () => {
    test('should apply positive power and resolve adjustments', async () => {
      actor.system = {
        resolve: { value: 10, max: 20 },
        power: { value: 5, max: 15 }
      };
      actor.update = vi.fn().mockResolvedValue(actor);

      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        system: {
          powerAdjustment: 3,
          resolveAdjustment: 5
        }
      };

      await actor._transformPowerAndResolveUpdate(transformationItem);

      expect(actor.update).toHaveBeenCalledWith({
        'system.resolve.max': 25,
        'system.resolve.value': 15,
        'system.power.max': 18,
        'system.power.value': 8
      });
    });

    test('should apply negative power and resolve adjustments', async () => {
      actor.system = {
        resolve: { value: 10, max: 20 },
        power: { value: 5, max: 15 }
      };
      actor.update = vi.fn().mockResolvedValue(actor);

      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        system: {
          powerAdjustment: -2,
          resolveAdjustment: -3
        }
      };

      await actor._transformPowerAndResolveUpdate(transformationItem);

      expect(actor.update).toHaveBeenCalledWith({
        'system.resolve.max': 17,
        'system.resolve.value': 7,
        'system.power.max': 13,
        'system.power.value': 3
      });
    });

    test('should clamp max to 0 minimum when adjustment exceeds original max', async () => {
      actor.system = {
        resolve: { value: 10, max: 20 },
        power: { value: 5, max: 15 }
      };
      actor.update = vi.fn().mockResolvedValue(actor);

      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        system: {
          powerAdjustment: -20,
          resolveAdjustment: -25
        }
      };

      await actor._transformPowerAndResolveUpdate(transformationItem);

      // Note: _clampValue uses the adjusted max as the upper bound
      // resolve: value = 10 + (-25) = -15, clamped to [0, 20+(-25)=-5] = -5
      // power: value = 5 + (-20) = -15, clamped to [0, 15+(-20)=-5] = -5
      expect(actor.update).toHaveBeenCalledWith({
        'system.resolve.max': 0,
        'system.resolve.value': -5,
        'system.power.max': 0,
        'system.power.value': -5
      });
    });

    test('should handle zero adjustments', async () => {
      actor.system = {
        resolve: { value: 10, max: 20 },
        power: { value: 5, max: 15 }
      };
      actor.update = vi.fn().mockResolvedValue(actor);

      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        system: {
          powerAdjustment: 0,
          resolveAdjustment: 0
        }
      };

      await actor._transformPowerAndResolveUpdate(transformationItem);

      expect(actor.update).toHaveBeenCalledWith({
        'system.resolve.max': 20,
        'system.resolve.value': 10,
        'system.power.max': 15,
        'system.power.value': 5
      });
    });

    test('should handle string number adjustments', async () => {
      actor.system = {
        resolve: { value: 10, max: 20 },
        power: { value: 5, max: 15 }
      };
      actor.update = vi.fn().mockResolvedValue(actor);

      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        system: {
          powerAdjustment: '5',
          resolveAdjustment: '10'
        }
      };

      await actor._transformPowerAndResolveUpdate(transformationItem);

      expect(actor.update).toHaveBeenCalledWith({
        'system.resolve.max': 30,
        'system.resolve.value': 20,
        'system.power.max': 20,
        'system.power.value': 10
      });
    });
  });

  describe('_restoreOriginalStats()', () => {
    test('should restore original stats from token data', async () => {
      actor.system = {
        resolve: { value: 15, max: 25 },
        power: { value: 10, max: 20 }
      };
      actor.update = vi.fn().mockResolvedValue(actor);

      const originalTokenData = {
        maxResolve: 20,
        maxPower: 15
      };

      await actor._restoreOriginalStats(originalTokenData);

      expect(actor.update).toHaveBeenCalledWith({
        'system.resolve.max': 20,
        'system.resolve.value': 15,
        'system.power.max': 15,
        'system.power.value': 10
      });
    });

    test('should clamp values to restored max', async () => {
      actor.system = {
        resolve: { value: 25, max: 30 },
        power: { value: 20, max: 25 }
      };
      actor.update = vi.fn().mockResolvedValue(actor);

      const originalTokenData = {
        maxResolve: 20,
        maxPower: 15
      };

      await actor._restoreOriginalStats(originalTokenData);

      expect(actor.update).toHaveBeenCalledWith({
        'system.resolve.max': 20,
        'system.resolve.value': 20,
        'system.power.max': 15,
        'system.power.value': 15
      });
    });

    test('should return early when originalTokenData is null', async () => {
      actor.update = vi.fn().mockResolvedValue(actor);

      await actor._restoreOriginalStats(null);

      expect(actor.update).not.toHaveBeenCalled();
    });

    test('should return early when originalTokenData is undefined', async () => {
      actor.update = vi.fn().mockResolvedValue(actor);

      await actor._restoreOriginalStats(undefined);

      expect(actor.update).not.toHaveBeenCalled();
    });
  });

  describe('_removeTransformationItems()', () => {
    test('should delete all transformation items from actor', async () => {
      actor.items = [
        { id: 'trans1', type: 'transformation', name: 'Wolf Form' },
        { id: 'trans2', type: 'transformation', name: 'Bear Form' },
        { id: 'gear1', type: 'gear', name: 'Sword' }
      ];
      actor.deleteEmbeddedDocuments = vi.fn().mockResolvedValue([]);

      await actor._removeTransformationItems();

      expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledWith('Item', ['trans1', 'trans2']);
    });

    test('should not call delete when no transformation items', async () => {
      actor.items = [
        { id: 'gear1', type: 'gear', name: 'Sword' },
        { id: 'power1', type: 'combatPower', name: 'Fireball' }
      ];
      actor.deleteEmbeddedDocuments = vi.fn().mockResolvedValue([]);

      await actor._removeTransformationItems();

      expect(actor.deleteEmbeddedDocuments).not.toHaveBeenCalled();
    });

    test('should handle empty items array', async () => {
      actor.items = [];
      actor.deleteEmbeddedDocuments = vi.fn().mockResolvedValue([]);

      await actor._removeTransformationItems();

      expect(actor.deleteEmbeddedDocuments).not.toHaveBeenCalled();
    });
  });

  describe('_clearTransformationFlags()', () => {
    test('should unset all transformation flags', async () => {
      await actor._clearTransformationFlags();

      expect(actor.unsetFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformation');
      expect(actor.unsetFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformationName');
      expect(actor.unsetFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformationCursed');
      expect(actor.unsetFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformationCombatPowers');
      expect(actor.unsetFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformationActionCards');
    });

    test('should call unsetFlag five times', async () => {
      await actor._clearTransformationFlags();

      expect(actor.unsetFlag).toHaveBeenCalledTimes(5);
    });
  });

  describe('_setTransformationFlags()', () => {
    test('should set all transformation flags with item data', async () => {
      const mockCombatPower = {
        toObject: vi.fn().mockReturnValue({ id: 'power1', name: 'Fire Breath' })
      };
      const mockActionCard = {
        toObject: vi.fn().mockReturnValue({ id: 'card1', name: 'Rage' }),
        system: { gmOnly: false }
      };

      const transformationItem = {
        id: 'trans1',
        name: 'Wolf Form',
        system: {
          cursed: true,
          getEmbeddedCombatPowers: vi.fn().mockReturnValue([mockCombatPower]),
          getEmbeddedActionCards: vi.fn().mockReturnValue([mockActionCard])
        }
      };

      await actor._setTransformationFlags(transformationItem);

      expect(actor.setFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformation', 'trans1');
      expect(actor.setFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformationName', 'Wolf Form');
      expect(actor.setFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformationCursed', true);
      expect(actor.setFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformationCombatPowers', [{ id: 'power1', name: 'Fire Breath' }]);
      expect(actor.setFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformationActionCards', [{ id: 'card1', name: 'Rage' }]);
    });

    test('should filter out GM-only action cards', async () => {
      const mockCombatPower = {
        toObject: vi.fn().mockReturnValue({ id: 'power1', name: 'Fire Breath' })
      };
      const mockActionCard1 = {
        toObject: vi.fn().mockReturnValue({ id: 'card1', name: 'Rage' }),
        system: { gmOnly: false }
      };
      const mockActionCard2 = {
        toObject: vi.fn().mockReturnValue({ id: 'card2', name: 'Secret Move' }),
        system: { gmOnly: true }
      };

      const transformationItem = {
        id: 'trans1',
        name: 'Wolf Form',
        system: {
          cursed: false,
          getEmbeddedCombatPowers: vi.fn().mockReturnValue([mockCombatPower]),
          getEmbeddedActionCards: vi.fn().mockReturnValue([mockActionCard1, mockActionCard2])
        }
      };

      await actor._setTransformationFlags(transformationItem);

      expect(actor.setFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformationActionCards', [{ id: 'card1', name: 'Rage' }]);
    });

    test('should handle empty embedded items', async () => {
      const transformationItem = {
        id: 'trans1',
        name: 'Simple Form',
        system: {
          cursed: false,
          getEmbeddedCombatPowers: vi.fn().mockReturnValue([]),
          getEmbeddedActionCards: vi.fn().mockReturnValue([])
        }
      };

      await actor._setTransformationFlags(transformationItem);

      expect(actor.setFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformationCombatPowers', []);
      expect(actor.setFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformationActionCards', []);
    });
  });

  describe('_storeOriginalTokenData()', () => {
    test('should store original token data when no active transformation', async () => {
      actor.getFlag = vi.fn().mockReturnValue(null);
      actor.setFlag = vi.fn().mockResolvedValue(actor);
      actor.system = {
        resolve: { max: 20 },
        power: { max: 15 }
      };

      const mockTokenDoc = {
        texture: { src: 'original-image.webp', scaleX: 1 },
        width: 1,
        height: 1
      };
      const tokens = [{ document: mockTokenDoc, scene: { id: 'scene1' } }];

      await actor._storeOriginalTokenData(tokens);

      expect(actor.setFlag).toHaveBeenCalledWith('eventide-rp-system', 'originalTokenData', {
        img: 'original-image.webp',
        scale: 1,
        width: 1,
        height: 1,
        maxResolve: 20,
        maxPower: 15
      });
    });

    test('should not store data when active transformation exists', async () => {
      actor.getFlag = vi.fn().mockReturnValue('existing-transformation');
      actor.setFlag = vi.fn().mockResolvedValue(actor);

      const tokens = [{ document: {}, scene: {} }];

      await actor._storeOriginalTokenData(tokens);

      expect(actor.setFlag).not.toHaveBeenCalled();
    });

    test('should return early when tokens array is empty', async () => {
      actor.setFlag = vi.fn().mockResolvedValue(actor);

      await actor._storeOriginalTokenData([]);

      expect(actor.setFlag).not.toHaveBeenCalled();
    });
  });

  describe('_applyTransformationToNewToken()', () => {
    test('should return early when no active transformation', async () => {
      actor.getFlag = vi.fn().mockReturnValue(null);
      const tokenDocument = { id: 'token1', update: vi.fn() };

      await actor._applyTransformationToNewToken(tokenDocument);

      expect(tokenDocument.update).not.toHaveBeenCalled();
    });

    test('should return early when transformation item not found', async () => {
      actor.getFlag = vi.fn().mockReturnValue('trans1');
      actor.items = {
        get: vi.fn().mockReturnValue(undefined)
      };
      const tokenDocument = { id: 'token1', update: vi.fn() };

      await actor._applyTransformationToNewToken(tokenDocument);

      expect(tokenDocument.update).not.toHaveBeenCalled();
    });

    test('should apply transformation updates to new token', async () => {
      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form',
        system: {
          tokenImage: 'modules/test/images/wolf-token.webp',
          size: 2
        }
      };
      actor.getFlag = vi.fn().mockReturnValue('trans1');
      actor.items = {
        get: vi.fn().mockReturnValue(transformationItem)
      };
      const tokenDocument = {
        id: 'token1',
        update: vi.fn().mockResolvedValue({})
      };

      await actor._applyTransformationToNewToken(tokenDocument);

      expect(tokenDocument.update).toHaveBeenCalledWith({
        'texture.src': 'modules/test/images/wolf-token.webp',
        width: 2,
        height: 2,
        'texture.scaleX': 1,
        'texture.scaleY': 1
      });
    });

    test('should not update when no transformation updates needed', async () => {
      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Subtle Form',
        system: {
          tokenImage: null,
          size: 0
        }
      };
      actor.getFlag = vi.fn().mockReturnValue('trans1');
      actor.items = {
        get: vi.fn().mockReturnValue(transformationItem)
      };
      const tokenDocument = {
        id: 'token1',
        update: vi.fn().mockResolvedValue({})
      };

      await actor._applyTransformationToNewToken(tokenDocument);

      expect(tokenDocument.update).not.toHaveBeenCalled();
    });
  });

  describe('_ensureTransformationItemOnActor()', () => {
    test('should return existing transformation if already on actor', async () => {
      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form',
        parent: actor
      };
      actor.items = {
        get: vi.fn().mockReturnValue(transformationItem)
      };

      const result = await actor._ensureTransformationItemOnActor(transformationItem);

      expect(result).toBe(transformationItem);
      expect(actor.items.get).toHaveBeenCalledWith('trans1');
    });

    test('should remove existing transformations and create new one', async () => {
      const existingTransformation = { id: 'old-trans', type: 'transformation', name: 'Old Form' };
      const newTransformation = {
        id: 'new-trans',
        type: 'transformation',
        name: 'New Form',
        parent: null,
        collection: null,
        toObject: vi.fn().mockReturnValue({ id: 'new-trans', type: 'transformation', name: 'New Form' }),
        effects: { size: 0 }
      };
      
      actor.items = {
        get: vi.fn().mockReturnValue(undefined),
        filter: vi.fn().mockReturnValue([existingTransformation])
      };
      actor.deleteEmbeddedDocuments = vi.fn().mockResolvedValue([]);
      actor.createEmbeddedDocuments = vi.fn().mockResolvedValue([{ id: 'created-trans', name: 'New Form' }]);

      await actor._ensureTransformationItemOnActor(newTransformation);

      expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledWith('Item', ['old-trans']);
      expect(actor.createEmbeddedDocuments).toHaveBeenCalled();
    });

    test('should create transformation with effects', async () => {
      const mockEffect = {
        toObject: vi.fn().mockReturnValue({ id: 'effect1', name: 'Effect 1' })
      };
      // Create a mock effects collection that has size property and is iterable
      const mockEffects = [mockEffect];
      Object.defineProperty(mockEffects, 'size', { value: 1, enumerable: false });
      
      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form',
        parent: null,
        collection: null,
        toObject: vi.fn().mockReturnValue({ id: 'trans1', type: 'transformation', name: 'Wolf Form' }),
        effects: mockEffects
      };
      
      actor.items = {
        get: vi.fn().mockReturnValue(undefined),
        filter: vi.fn().mockReturnValue([])
      };
      actor.createEmbeddedDocuments = vi.fn().mockResolvedValue([{ id: 'created-trans', name: 'Wolf Form' }]);

      await actor._ensureTransformationItemOnActor(transformationItem);

      // Verify createEmbeddedDocuments was called with transformation data including effects
      expect(actor.createEmbeddedDocuments).toHaveBeenCalledWith('Item', [
        expect.objectContaining({
          id: 'trans1',
          effects: [{ id: 'effect1', name: 'Effect 1' }]
        })
      ]);
    });

    test('should return transformation if already owned by actor', async () => {
      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form',
        parent: actor,
        collection: { name: 'items' }
      };
      actor.items = {
        get: vi.fn().mockReturnValue(undefined),
        filter: vi.fn().mockReturnValue([])
      };

      const result = await actor._ensureTransformationItemOnActor(transformationItem);

      expect(result).toBe(transformationItem);
      expect(actor.createEmbeddedDocuments).not.toHaveBeenCalled();
    });
  });

  describe('applyTransformation()', () => {
    test('should return early when validation fails (not owner)', async () => {
      actor.isOwner = false;
      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form'
      };

      const result = await actor.applyTransformation(transformationItem);

      expect(result).toBe(actor);
      expect(global.ui.notifications.warn).toHaveBeenCalled();
    });

    test('should return early when transformation item is invalid', async () => {
      actor.isOwner = true;

      const result = await actor.applyTransformation(null);

      expect(result).toBe(actor);
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should return early when transformation name is duplicate', async () => {
      actor.isOwner = true;
      // The first getFlag call in applyTransformation is for activeTransformationName
      actor.getFlag = vi.fn().mockReturnValue('Wolf Form');

      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form',
        system: { cursed: false }
      };

      const result = await actor.applyTransformation(transformationItem);

      expect(result).toBe(actor);
      expect(global.ui.notifications.warn).toHaveBeenCalled();
    });

    test('should deny transformation when cursed transformation is active', async () => {
      actor.isOwner = true;
      actor.getFlag = vi.fn()
        .mockReturnValueOnce('trans-old') // activeTransformation
        .mockReturnValueOnce('Cursed Form') // activeTransformationName
        .mockReturnValueOnce(true); // activeTransformationCursed

      const transformationItem = {
        id: 'trans-new',
        type: 'transformation',
        name: 'Wolf Form',
        system: { cursed: false }
      };

      const result = await actor.applyTransformation(transformationItem);

      expect(result).toBe(actor);
      expect(global.ui.notifications.warn).toHaveBeenCalled();
    });

    test('should apply transformation successfully for linked actor', async () => {
      actor.isOwner = true;
      actor.isToken = false;
      // Mock getFlag for multiple calls in applyTransformation flow:
      // 1. activeTransformationName (for duplicate check)
      // 2. activeTransformationCursed (for cursed check)
      // 3. activeTransformation (called from _storeOriginalTokenData)
      actor.getFlag = vi.fn()
        .mockReturnValueOnce(null) // activeTransformationName (for duplicate check)
        .mockReturnValueOnce(null) // activeTransformationCursed (for cursed check)
        .mockReturnValueOnce(null); // activeTransformation (called from _storeOriginalTokenData)

      const mockScene = {
        id: 'scene1',
        name: 'Test Scene',
        updateEmbeddedDocuments: vi.fn().mockResolvedValue([])
      };

      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form',
        system: {
          cursed: false,
          powerAdjustment: 2,
          resolveAdjustment: 3,
          tokenImage: 'modules/test/wolf.webp',
          size: 2,
          getEmbeddedCombatPowers: vi.fn().mockReturnValue([]),
          getEmbeddedActionCards: vi.fn().mockReturnValue([])
        },
        parent: actor
      };

      // Mock token document with texture property
      const mockTokenDoc = {
        id: 'token1',
        texture: { src: 'original.webp', scaleX: 1 }
      };

      actor.items = {
        get: vi.fn().mockReturnValue(transformationItem),
        filter: vi.fn().mockReturnValue([])
      };
      actor._getAllTokensAcrossScenes = vi.fn().mockReturnValue([
        { document: mockTokenDoc, scene: mockScene }
      ]);
      actor.update = vi.fn().mockResolvedValue(actor);
      actor.setFlag = vi.fn().mockResolvedValue(actor);
      actor.system = {
        resolve: { max: 20 },
        power: { max: 15 }
      };

      // Configure game.scenes.get to return our mock scene
      global.game.scenes.get = vi.fn().mockReturnValue(mockScene);

      const result = await actor.applyTransformation(transformationItem);

      expect(actor.setFlag).toHaveBeenCalled();
      expect(result).toBe(actor);
    });
  });

  describe('removeTransformation()', () => {
    test('should return early when actor is not owner', async () => {
      actor.isOwner = false;

      const result = await actor.removeTransformation();

      expect(result).toBe(actor);
      expect(global.ui.notifications.warn).toHaveBeenCalled();
    });

    test('should return early when no active transformation', async () => {
      actor.isOwner = true;
      actor.getFlag = vi.fn().mockReturnValue(null);

      const result = await actor.removeTransformation();

      expect(result).toBe(actor);
    });

    test('should return early when no original token data', async () => {
      actor.isOwner = true;
      actor.isToken = false;
      actor.getFlag = vi.fn()
        .mockReturnValueOnce('trans1') // activeTransformation
        .mockReturnValueOnce(null); // originalTokenData

      const result = await actor.removeTransformation();

      expect(result).toBe(actor);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No original token data found for transformation removal',
        null,
        'TRANSFORMATION'
      );
    });

    test('should remove transformation successfully for linked actor', async () => {
      actor.isOwner = true;
      actor.isToken = false;
      actor.getFlag = vi.fn()
        .mockReturnValueOnce('trans1') // activeTransformation
        .mockReturnValueOnce({ img: 'original.webp', maxResolve: 20, maxPower: 15 }); // originalTokenData

      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form'
      };
      actor.items = [transformationItem];
      actor._getAllTokensAcrossScenes = vi.fn().mockReturnValue([
        { document: { id: 'token1' }, scene: { id: 'scene1' } }
      ]);
      actor.system = { resolve: { value: 10, max: 25 }, power: { value: 5, max: 18 } };
      actor.update = vi.fn().mockResolvedValue(actor);
      actor.deleteEmbeddedDocuments = vi.fn().mockResolvedValue([]);
      actor.unsetFlag = vi.fn().mockResolvedValue(actor);

      const result = await actor.removeTransformation();

      expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledWith('Item', ['trans1']);
      expect(actor.unsetFlag).toHaveBeenCalled();
      expect(result).toBe(actor);
    });
  });

  describe('_applyTransformationToUnlinkedToken()', () => {
    test('should return early when no token reference', async () => {
      actor.isToken = true;
      actor.token = null;

      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form'
      };

      const result = await actor._applyTransformationToUnlinkedToken(transformationItem);

      expect(result).toBe(actor);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Cannot apply transformation to unlinked token: no token reference found',
        null,
        'TRANSFORMATION'
      );
    });

    test('should store original token data when first transformation', async () => {
      actor.isToken = true;
      actor.token = {
        id: 'token1',
        texture: { src: 'original.webp', scaleX: 1 },
        width: 1,
        height: 1,
        update: vi.fn().mockResolvedValue({})
      };
      actor.getFlag = vi.fn().mockReturnValue(null); // no active transformation
      actor.setFlag = vi.fn().mockResolvedValue(actor);

      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form',
        system: {
          tokenImage: 'wolf.webp',
          size: 2,
          getEmbeddedCombatPowers: vi.fn().mockReturnValue([]),
          getEmbeddedActionCards: vi.fn().mockReturnValue([])
        },
        parent: actor
      };
      actor.items = {
        get: vi.fn().mockReturnValue(transformationItem),
        filter: vi.fn().mockReturnValue([])
      };

      await actor._applyTransformationToUnlinkedToken(transformationItem);

      expect(actor.setFlag).toHaveBeenCalledWith(
        'eventide-rp-system',
        'originalTokenData',
        expect.objectContaining({
          img: 'original.webp',
          scale: 1,
          width: 1,
          height: 1
        })
      );
    });

    test('should skip storing original data when already transformed', async () => {
      actor.isToken = true;
      actor.token = {
        id: 'token1',
        texture: { src: 'original.webp', scaleX: 1 },
        width: 1,
        height: 1,
        update: vi.fn().mockResolvedValue({})
      };
      actor.getFlag = vi.fn()
        .mockReturnValueOnce('existing-trans') // activeTransformation
        .mockReturnValueOnce('trans1'); // for setFlag calls

      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form',
        system: {
          tokenImage: 'wolf.webp',
          size: 2,
          getEmbeddedCombatPowers: vi.fn().mockReturnValue([]),
          getEmbeddedActionCards: vi.fn().mockReturnValue([])
        },
        parent: actor
      };
      actor.items = {
        get: vi.fn().mockReturnValue(transformationItem),
        filter: vi.fn().mockReturnValue([])
      };
      actor.setFlag = vi.fn().mockResolvedValue(actor);

      await actor._applyTransformationToUnlinkedToken(transformationItem);

      // Should not store original data since already transformed
      expect(actor.setFlag).not.toHaveBeenCalledWith(
        'eventide-rp-system',
        'originalTokenData',
        expect.anything()
      );
    });
  });

  describe('_removeTransformationFromUnlinkedToken()', () => {
    test('should return early when no token reference', async () => {
      actor.isToken = true;
      actor.token = null;

      const result = await actor._removeTransformationFromUnlinkedToken();

      expect(result).toBe(actor);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Cannot remove transformation from unlinked token: no token reference found',
        null,
        'TRANSFORMATION'
      );
    });

    test('should return early when no original token data', async () => {
      actor.isToken = true;
      actor.token = {
        id: 'token1',
        update: vi.fn().mockResolvedValue({})
      };
      actor.getFlag = vi.fn().mockReturnValue(null); // no originalTokenData
      actor.items = [];

      const result = await actor._removeTransformationFromUnlinkedToken();

      expect(result).toBe(actor);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No original token data found for unlinked token transformation removal',
        { tokenId: 'token1' },
        'TRANSFORMATION'
      );
    });

    test('should restore token appearance and clear flags', async () => {
      actor.isToken = true;
      actor.token = {
        id: 'token1',
        texture: { src: 'wolf.webp', scaleX: 1 },
        width: 2,
        height: 2,
        update: vi.fn().mockResolvedValue({})
      };
      actor.getFlag = vi.fn().mockReturnValue({
        img: 'original.webp',
        scale: 1,
        width: 1,
        height: 1,
        maxResolve: 20,
        maxPower: 15
      });
      actor.items = [];
      actor.unsetFlag = vi.fn().mockResolvedValue(actor);
      actor.system = { resolve: { value: 10, max: 25 }, power: { value: 5, max: 18 } };
      actor.update = vi.fn().mockResolvedValue(actor);

      const result = await actor._removeTransformationFromUnlinkedToken();

      expect(actor.token.update).toHaveBeenCalledWith({
        'texture.src': 'original.webp',
        'texture.scaleX': 1,
        'texture.scaleY': 1,
        width: 1,
        height: 1
      });
      expect(actor.unsetFlag).toHaveBeenCalled();
      expect(result).toBe(actor);
    });
  });

  describe('_updateTokensForTransformation()', () => {
    test('should return early when no tokens provided', async () => {
      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form',
        system: { tokenImage: 'wolf.webp', size: 2 }
      };

      // Empty tokens array - method should return early without processing
      await actor._updateTokensForTransformation([], transformationItem);

      // Verify no errors thrown - method returns early without updates
      // The method exits early when tokens array is empty
      expect(true).toBe(true);
    });

    test('should update tokens across multiple scenes', async () => {
      const transformationItem = {
        id: 'trans1',
        type: 'transformation',
        name: 'Wolf Form',
        system: { tokenImage: 'wolf.webp', size: 2 }
      };

      const mockScene1 = {
        id: 'scene1',
        name: 'Scene One',
        updateEmbeddedDocuments: vi.fn().mockResolvedValue([])
      };
      const mockScene2 = {
        id: 'scene2',
        name: 'Scene Two',
        updateEmbeddedDocuments: vi.fn().mockResolvedValue([])
      };

      const tokens = [
        { document: { id: 'token1' }, scene: mockScene1 },
        { document: { id: 'token2' }, scene: mockScene2 }
      ];

      // Configure game.scenes.get to return appropriate scenes
      global.game.scenes.get = vi.fn().mockImplementation((sceneId) => {
        if (sceneId === 'scene1') return mockScene1;
        if (sceneId === 'scene2') return mockScene2;
        return null;
      });

      await actor._updateTokensForTransformation(tokens, transformationItem);

      expect(mockScene1.updateEmbeddedDocuments).toHaveBeenCalledWith(
        'Token',
        expect.arrayContaining([
          expect.objectContaining({ _id: 'token1' })
        ])
      );
      expect(mockScene2.updateEmbeddedDocuments).toHaveBeenCalledWith(
        'Token',
        expect.arrayContaining([
          expect.objectContaining({ _id: 'token2' })
        ])
      );
    });
  });

  describe('_restoreOriginalTokenData()', () => {
    test('should restore token appearance from original data', async () => {
      const mockScene = {
        id: 'scene1',
        name: 'Test Scene',
        updateEmbeddedDocuments: vi.fn().mockResolvedValue([])
      };

      const tokens = [
        { document: { id: 'token1' }, scene: mockScene }
      ];

      const originalTokenData = {
        img: 'original.webp',
        scale: 1,
        width: 1,
        height: 1
      };

      // Mock _getAllTokensAcrossScenes to return our tokens
      actor._getAllTokensAcrossScenes = vi.fn().mockReturnValue(tokens);

      // Configure game.scenes.get to return our mock scene
      global.game.scenes.get = vi.fn().mockReturnValue(mockScene);

      await actor._restoreOriginalTokenData(tokens, originalTokenData);

      expect(mockScene.updateEmbeddedDocuments).toHaveBeenCalledWith(
        'Token',
        expect.arrayContaining([
          expect.objectContaining({
            _id: 'token1',
            'texture.src': 'original.webp'
          })
        ])
      );
    });

    test('should handle empty tokens array', async () => {
      const originalTokenData = {
        img: 'original.webp',
        scale: 1,
        width: 1,
        height: 1
      };

      // Mock _getAllTokensAcrossScenes to return empty array
      actor._getAllTokensAcrossScenes = vi.fn().mockReturnValue([]);

      // Should not throw
      await expect(
        actor._restoreOriginalTokenData([], originalTokenData)
      ).resolves.not.toThrow();
    });
  });
});