// @ts-nocheck
/**
 * @fileoverview Tests for EventideRpSystemActor - Main actor document class
 *
 * Tests the core actor document functionality including data preparation,
 * lifecycle hooks, export methods, and capability checks.
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

const mockGetSetting = vi.fn();

// Mock the module imports
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: mockLogger
}));

vi.mock('../../../module/services/_module.mjs', () => ({
  getSetting: mockGetSetting
}));


// Mock the mixins module - each mixin returns the class unchanged
vi.mock('../../../module/documents/mixins/_module.mjs', () => ({
  ActorTransformationMixin: (BaseClass) => BaseClass,
  ActorResourceMixin: (BaseClass) => BaseClass,
  ActorRollsMixin: (BaseClass) => BaseClass
}));

// Import the actor class after mocking dependencies
const { EventideRpSystemActor } = await import('../../../module/documents/actor.mjs');

describe('EventideRpSystemActor', () => {
  let actor;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSetting.mockReturnValue(50);
    
    // Setup global game object
    global.game = {
      user: { isGM: false },
      actors: { filter: vi.fn().mockReturnValue([]) }
    };
    
    // Setup global foundry object
    global.foundry = {
      utils: {
        getProperty: vi.fn().mockReturnValue(undefined)
      }
    };
  });

  describe('prepareData()', () => {
    test('should exist as a method', () => {
      actor = new EventideRpSystemActor();
      
      expect(typeof actor.prepareData).toBe('function');
    });

    test('should call super.prepareData()', () => {
      // Mock the parent Actor.prototype.prepareData method
      const originalPrepareData = Actor.prototype.prepareData;
      Actor.prototype.prepareData = vi.fn();
      
      actor = new EventideRpSystemActor();
      actor.prepareData();
      
      expect(Actor.prototype.prepareData).toHaveBeenCalled();
      
      // Restore original
      Actor.prototype.prepareData = originalPrepareData;
    });
  });

  describe('prepareBaseData()', () => {
    test('should exist as a method', () => {
      actor = new EventideRpSystemActor();
      
      expect(typeof actor.prepareBaseData).toBe('function');
    });

    test('should execute without error (intentionally empty method)', () => {
      actor = new EventideRpSystemActor();
      
      // Method is intentionally empty, just verify it doesn't throw
      expect(() => actor.prepareBaseData()).not.toThrow();
    });
  });

  describe('prepareDerivedData()', () => {
    test('should exist as a method', () => {
      actor = new EventideRpSystemActor();
      
      expect(typeof actor.prepareDerivedData).toBe('function');
    });

    test('should call super.prepareDerivedData and complete without error', () => {
      // Mock the parent Actor.prototype.prepareDerivedData method
      const originalPrepareDerivedData = Actor.prototype.prepareDerivedData;
      Actor.prototype.prepareDerivedData = vi.fn();
      
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.system = {};
      
      // Mock testingMode as false by default
      mockGetSetting.mockReturnValue(false);
      
      expect(() => actor.prepareDerivedData()).not.toThrow();
      expect(Actor.prototype.prepareDerivedData).toHaveBeenCalled();
      
      // Restore original
      Actor.prototype.prepareDerivedData = originalPrepareDerivedData;
    });

    test('should log debug info when testingMode is enabled', () => {
      // Mock the parent Actor.prototype.prepareDerivedData method
      const originalPrepareDerivedData = Actor.prototype.prepareDerivedData;
      Actor.prototype.prepareDerivedData = vi.fn();
      
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.system = { abilities: {}, health: {} };
      
      // Enable testing mode
      mockGetSetting.mockReturnValue(true);
      global.foundry.utils.getProperty.mockReturnValue({ someFlag: true });
      
      actor.prepareDerivedData();
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Prepared derived data for actor',
        expect.objectContaining({
          actorName: 'Test Actor',
          systemDataKeys: expect.any(Array),
          flagsKeys: expect.any(Array)
        }),
        'ACTOR_DATA'
      );
      
      // Restore original
      Actor.prototype.prepareDerivedData = originalPrepareDerivedData;
    });

    test('should not log debug info when testingMode is disabled', () => {
      // Mock the parent Actor.prototype.prepareDerivedData method
      const originalPrepareDerivedData = Actor.prototype.prepareDerivedData;
      Actor.prototype.prepareDerivedData = vi.fn();
      
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.system = {};
      
      // Disable testing mode
      mockGetSetting.mockReturnValue(false);
      
      actor.prepareDerivedData();
      
      expect(mockLogger.debug).not.toHaveBeenCalled();
      
      // Restore original
      Actor.prototype.prepareDerivedData = originalPrepareDerivedData;
    });

    test('should handle missing flags gracefully', () => {
      // Mock the parent Actor.prototype.prepareDerivedData method
      const originalPrepareDerivedData = Actor.prototype.prepareDerivedData;
      Actor.prototype.prepareDerivedData = vi.fn();
      
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.system = {};
      
      global.foundry.utils.getProperty.mockReturnValue(undefined);
      mockGetSetting.mockReturnValue(false);
      
      expect(() => actor.prepareDerivedData()).not.toThrow();
      
      // Restore original
      Actor.prototype.prepareDerivedData = originalPrepareDerivedData;
    });
  });

  describe('toPlainObject()', () => {
    test('should return object with system data', () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.system = {
        toPlainObject: vi.fn().mockReturnValue({ abilities: {} })
      };
      actor.items = { size: 0, contents: [] };
      actor.effects = { size: 0, contents: [] };

      const result = actor.toPlainObject();

      expect(result.system).toEqual({ abilities: {} });
      expect(result.items).toEqual([]);
      expect(result.effects).toEqual([]);
    });

    test('should include items when present', () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.system = {
        toPlainObject: vi.fn().mockReturnValue({})
      };
      const mockItems = [{ name: 'Sword' }];
      actor.items = { size: 1, contents: mockItems };
      actor.effects = { size: 0, contents: [] };

      const result = actor.toPlainObject();

      expect(result.items).toEqual(mockItems);
    });

    test('should include effects when present', () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.system = {
        toPlainObject: vi.fn().mockReturnValue({})
      };
      actor.items = { size: 0, contents: [] };
      const mockEffects = [{ name: 'Buff' }];
      actor.effects = { size: 1, contents: mockEffects };

      const result = actor.toPlainObject();

      expect(result.effects).toEqual(mockEffects);
    });
  });

  describe('getSummary()', () => {
    test('should return summary object with actor information', () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.type = 'character';
      actor.items = { size: 3 };
      actor.effects = { size: 1 };

      // Mock mixin methods
      actor.getResourcePercentages = vi.fn().mockReturnValue({ hp: 100, resolve: 80 });
      actor.getFlag = vi.fn()
        .mockReturnValueOnce(null) // activeTransformation
        .mockReturnValueOnce(null); // activeTransformationName
      actor.getRollableAbilities = vi.fn().mockReturnValue(['acro', 'phys']);

      const summary = actor.getSummary();

      expect(summary.name).toBe('Test Actor');
      expect(summary.type).toBe('character');
      expect(summary.resources).toEqual({ hp: 100, resolve: 80 });
      expect(summary.hasTransformation).toBe(false);
      expect(summary.transformationName).toBeNull();
      expect(summary.rollableAbilityCount).toBe(2);
      expect(summary.itemCount).toBe(3);
      expect(summary.effectCount).toBe(1);
    });

    test('should include transformation info when transformed', () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Transformed Actor';
      actor.type = 'character';
      actor.items = { size: 5 };
      actor.effects = { size: 2 };

      actor.getResourcePercentages = vi.fn().mockReturnValue({});
      actor.getFlag = vi.fn()
        .mockReturnValueOnce('transformation-id') // activeTransformation
        .mockReturnValueOnce('Werewolf'); // activeTransformationName
      actor.getRollableAbilities = vi.fn().mockReturnValue([]);

      const summary = actor.getSummary();

      expect(summary.hasTransformation).toBe(true);
      expect(summary.transformationName).toBe('Werewolf');
    });
  });

  describe('hasCapability()', () => {
    test('should return true for "roll" capability', () => {
      actor = new EventideRpSystemActor();
      expect(actor.hasCapability('roll')).toBe(true);
    });

    test('should return actor.isOwner for "transform" capability', () => {
      actor = new EventideRpSystemActor();
      actor.isOwner = true;
      expect(actor.hasCapability('transform')).toBe(true);

      actor.isOwner = false;
      expect(actor.hasCapability('transform')).toBe(false);
    });

    test('should return actor.isOwner for "damage" capability', () => {
      actor = new EventideRpSystemActor();
      actor.isOwner = true;
      expect(actor.hasCapability('damage')).toBe(true);

      actor.isOwner = false;
      expect(actor.hasCapability('damage')).toBe(false);
    });

    test('should check GM status for "restore" capability', () => {
      actor = new EventideRpSystemActor();
      
      global.game = { user: { isGM: true } };
      expect(actor.hasCapability('restore')).toBe(true);

      global.game = { user: { isGM: false } };
      expect(actor.hasCapability('restore')).toBe(false);
    });

    test('should return false and warn for unknown capability', () => {
      actor = new EventideRpSystemActor();
      
      const result = actor.hasCapability('unknown');
      
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unknown capability check: unknown',
        null,
        'ACTOR'
      );
    });
  });

  describe('getDisplayName()', () => {
    test('should return base name when no transformation or low resources', () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.getFlag = vi.fn().mockReturnValue(null);
      actor.isLowResources = vi.fn().mockReturnValue({ any: false });

      const displayName = actor.getDisplayName();

      expect(displayName).toBe('Test Actor');
    });

    test('should append transformation name when transformed', () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.getFlag = vi.fn().mockReturnValue('Werewolf');
      actor.isLowResources = vi.fn().mockReturnValue({ any: false });

      const displayName = actor.getDisplayName();

      expect(displayName).toBe('Test Actor (Werewolf)');
    });

    test('should add low resource indicators', () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.getFlag = vi.fn().mockReturnValue(null);
      actor.isLowResources = vi.fn().mockReturnValue({
        any: true,
        resolve: true,
        power: false
      });

      const displayName = actor.getDisplayName();

      expect(displayName).toBe('Test Actor [Low Resolve]');
    });

    test('should add multiple low resource indicators', () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.getFlag = vi.fn().mockReturnValue(null);
      actor.isLowResources = vi.fn().mockReturnValue({
        any: true,
        resolve: true,
        power: true
      });

      const displayName = actor.getDisplayName();

      expect(displayName).toBe('Test Actor [Low Resolve, Low Power]');
    });

    test('should include both transformation and low resource indicators', () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.getFlag = vi.fn().mockReturnValue('Werewolf');
      actor.isLowResources = vi.fn().mockReturnValue({
        any: true,
        resolve: true,
        power: false
      });

      const displayName = actor.getDisplayName();

      expect(displayName).toBe('Test Actor (Werewolf) [Low Resolve]');
    });
  });

  describe('_onCreate()', () => {
    test('should exist as an async method', () => {
      actor = new EventideRpSystemActor();
      
      expect(typeof actor._onCreate).toBe('function');
    });

    test('should call super._onCreate and log method entry/exit for character type', async () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test Character';
      actor.update = vi.fn().mockResolvedValue(undefined);
      
      const data = { name: 'Test Character', type: 'character' };
      const options = {};
      const userId = 'user123';
      
      // Mock super._onCreate by tracking the call
      const originalSuperOnCreate = Actor.prototype._onCreate;
      Actor.prototype._onCreate = vi.fn().mockResolvedValue(undefined);
      
      await actor._onCreate(data, options, userId);
      
      expect(mockLogger.methodEntry).toHaveBeenCalledWith('EventideRpSystemActor', '_onCreate', {
        actorName: 'Test Character',
        actorType: 'character',
        userId: 'user123'
      });
      expect(mockLogger.methodExit).toHaveBeenCalledWith('EventideRpSystemActor', '_onCreate');
      expect(actor.update).toHaveBeenCalledWith({
        'prototypeToken.actorLink': true,
        'prototypeToken.sight.enabled': true,
        'prototypeToken.sight.range': 50
      });
      
      Actor.prototype._onCreate = originalSuperOnCreate;
    });

    test('should call update with correct params for NPC type', async () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test NPC';
      actor.update = vi.fn().mockResolvedValue(undefined);
      
      const data = { name: 'Test NPC', type: 'npc' };
      const options = {};
      const userId = 'user123';
      
      const originalSuperOnCreate = Actor.prototype._onCreate;
      Actor.prototype._onCreate = vi.fn().mockResolvedValue(undefined);
      
      await actor._onCreate(data, options, userId);
      
      expect(actor.update).toHaveBeenCalledWith({
        'prototypeToken.actorLink': false,
        'prototypeToken.sight.enabled': true,
        'prototypeToken.sight.range': 50
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Ensured prototype token is unlinked'),
        { visionRange: 50 },
        'ACTOR_CREATION'
      );
      
      Actor.prototype._onCreate = originalSuperOnCreate;
    });

    test('should use custom vision range from settings', async () => {
      mockGetSetting.mockReturnValue(75);
      
      actor = new EventideRpSystemActor();
      actor.name = 'Test Character';
      actor.update = vi.fn().mockResolvedValue(undefined);
      
      const data = { name: 'Test Character', type: 'character' };
      const options = {};
      const userId = 'user123';
      
      const originalSuperOnCreate = Actor.prototype._onCreate;
      Actor.prototype._onCreate = vi.fn().mockResolvedValue(undefined);
      
      await actor._onCreate(data, options, userId);
      
      expect(actor.update).toHaveBeenCalledWith({
        'prototypeToken.actorLink': true,
        'prototypeToken.sight.enabled': true,
        'prototypeToken.sight.range': 75
      });
      
      Actor.prototype._onCreate = originalSuperOnCreate;
    });

    test('should use default vision range when setting returns null', async () => {
      mockGetSetting.mockReturnValue(null);
      
      actor = new EventideRpSystemActor();
      actor.name = 'Test Character';
      actor.update = vi.fn().mockResolvedValue(undefined);
      
      const data = { name: 'Test Character', type: 'character' };
      const options = {};
      const userId = 'user123';
      
      const originalSuperOnCreate = Actor.prototype._onCreate;
      Actor.prototype._onCreate = vi.fn().mockResolvedValue(undefined);
      
      await actor._onCreate(data, options, userId);
      
      expect(actor.update).toHaveBeenCalledWith({
        'prototypeToken.actorLink': true,
        'prototypeToken.sight.enabled': true,
        'prototypeToken.sight.range': 50
      });
      
      Actor.prototype._onCreate = originalSuperOnCreate;
    });

    test('should handle update errors gracefully for character type', async () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test Character';
      actor.update = vi.fn().mockRejectedValue(new Error('Update failed'));
      
      const data = { name: 'Test Character', type: 'character' };
      const options = {};
      const userId = 'user123';
      
      const originalSuperOnCreate = Actor.prototype._onCreate;
      Actor.prototype._onCreate = vi.fn().mockResolvedValue(undefined);
      
      // Should not throw
      await expect(actor._onCreate(data, options, userId)).resolves.not.toThrow();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to set prototype token configuration for character actor: Test Character',
        expect.any(Error),
        'ACTOR_CREATION'
      );
      
      Actor.prototype._onCreate = originalSuperOnCreate;
    });

    test('should handle update errors gracefully for NPC type', async () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test NPC';
      actor.update = vi.fn().mockRejectedValue(new Error('Update failed'));
      
      const data = { name: 'Test NPC', type: 'npc' };
      const options = {};
      const userId = 'user123';
      
      const originalSuperOnCreate = Actor.prototype._onCreate;
      Actor.prototype._onCreate = vi.fn().mockResolvedValue(undefined);
      
      // Should not throw
      await expect(actor._onCreate(data, options, userId)).resolves.not.toThrow();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to set prototype token configuration for npc actor: Test NPC',
        expect.any(Error),
        'ACTOR_CREATION'
      );
      
      Actor.prototype._onCreate = originalSuperOnCreate;
    });

    test('should not update prototype token for unknown actor types', async () => {
      actor = new EventideRpSystemActor();
      actor.name = 'Test Actor';
      actor.update = vi.fn().mockResolvedValue(undefined);
      
      const data = { name: 'Test Actor', type: 'other' };
      const options = {};
      const userId = 'user123';
      
      const originalSuperOnCreate = Actor.prototype._onCreate;
      Actor.prototype._onCreate = vi.fn().mockResolvedValue(undefined);
      
      await actor._onCreate(data, options, userId);
      
      // Should not call update for unknown types
      expect(actor.update).not.toHaveBeenCalled();
      
      Actor.prototype._onCreate = originalSuperOnCreate;
    });
  });

  describe('static _onCreateToken()', () => {
    test('should return early for non-EventideRpSystemActor', async () => {
      const mockTokenDocument = {
        id: 'token123',
        actorId: 'actor123',
        actor: { constructor: { name: 'OtherActor' } }
      };

      await EventideRpSystemActor._onCreateToken(mockTokenDocument, {}, {}, 'user123');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Token creation hook skipped - not an EventideRpSystemActor',
        expect.any(Object),
        'TRANSFORMATION'
      );
    });

    test('should return early when actor is null', async () => {
      const mockTokenDocument = {
        id: 'token123',
        actorId: 'actor123',
        actor: null
      };

      // Should not throw
      await expect(
        EventideRpSystemActor._onCreateToken(mockTokenDocument, {}, {}, 'user123')
      ).resolves.not.toThrow();
    });
  });

  describe('static _onCreateToken() - transformation application', () => {
    test('should return early when actor has no active transformation', async () => {
      // Create a mock actor that passes the instanceof check
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockReturnValue(null);
      mockActor.name = 'Test Actor';
      
      const mockTokenDocument = {
        id: 'token123',
        actorId: 'actor123',
        actor: mockActor
      };

      await EventideRpSystemActor._onCreateToken(mockTokenDocument, {}, {}, 'user123');

      expect(mockActor.getFlag).toHaveBeenCalledWith('eventide-rp-system', 'activeTransformation');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No active transformation found on actor',
        { actorName: 'Test Actor' },
        'TRANSFORMATION'
      );
    });

    test('should handle errors during transformation application gracefully', async () => {
      // Create a mock actor that passes the instanceof check
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockReturnValue('transformation-id');
      mockActor._applyTransformationToNewToken = vi.fn().mockRejectedValue(new Error('Update failed'));
      mockActor.name = 'Test Actor';
      
      const mockTokenDocument = {
        id: 'token123',
        actorId: 'actor123',
        actor: mockActor
      };

      // Should not throw
      await expect(
        EventideRpSystemActor._onCreateToken(mockTokenDocument, {}, {}, 'user123')
      ).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to apply transformation to new token for actor "Test Actor"',
        expect.any(Error),
        'TRANSFORMATION'
      );
    });

    test('should successfully apply transformation to new token', async () => {
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockReturnValue('transformation-id');
      mockActor._applyTransformationToNewToken = vi.fn().mockResolvedValue(undefined);
      mockActor.name = 'Transformed Actor';
      
      const mockTokenDocument = {
        id: 'token123',
        actorId: 'actor123',
        actor: mockActor
      };

      await EventideRpSystemActor._onCreateToken(mockTokenDocument, {}, {}, 'user123');

      expect(mockActor._applyTransformationToNewToken).toHaveBeenCalledWith(mockTokenDocument);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Applied transformation to newly created token for actor "Transformed Actor"',
        { tokenId: 'token123', transformationId: 'transformation-id' },
        'TRANSFORMATION'
      );
    });
  });

  describe('static _onCanvasReady()', () => {
    test('should return early when no transformed actors', async () => {
      global.game = {
        actors: {
          filter: vi.fn().mockReturnValue([])
        }
      };

      await EventideRpSystemActor._onCanvasReady();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No actors with active transformations found',
        null,
        'TRANSFORMATION'
      );
    });

    test('should handle errors gracefully', async () => {
      global.game = {
        actors: {
          filter: vi.fn().mockImplementation(() => {
            throw new Error('Filter error');
          })
        }
      };

      // Should not throw
      await expect(EventideRpSystemActor._onCanvasReady()).resolves.not.toThrow();
    });

    test('should process transformed actors and log debug info', async () => {
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockReturnValue('transformation-id');
      mockActor.name = 'Transformed Actor';
      mockActor.items = {
        get: vi.fn().mockReturnValue(null) // No transformation item found
      };
      
      global.game = {
        actors: {
          filter: vi.fn().mockReturnValue([mockActor])
        }
      };
      
      global.canvas = {
        tokens: { placeables: [] },
        scene: { name: 'Test Scene' }
      };

      await EventideRpSystemActor._onCanvasReady();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Found 1 actors with active transformations',
        { actorNames: ['Transformed Actor'] },
        'TRANSFORMATION'
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Active transformation item not found for actor Transformed Actor',
        { transformationId: 'transformation-id' },
        'TRANSFORMATION'
      );
    });

    test('should skip actors without transformation items', async () => {
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockReturnValue('transformation-id');
      mockActor.name = 'Transformed Actor';
      mockActor.items = {
        get: vi.fn().mockReturnValue(null)
      };
      
      global.game = {
        actors: {
          filter: vi.fn().mockReturnValue([mockActor])
        }
      };
      
      global.canvas = {
        tokens: { placeables: [] },
        scene: { name: 'Test Scene' }
      };

      await EventideRpSystemActor._onCanvasReady();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Active transformation item not found for actor Transformed Actor',
        { transformationId: 'transformation-id' },
        'TRANSFORMATION'
      );
    });

    test('should skip when no tokens in current scene', async () => {
      const mockTransformationItem = { name: 'Werewolf Form' };
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockReturnValue('transformation-id');
      mockActor.name = 'Transformed Actor';
      mockActor.id = 'actor123';
      mockActor.items = {
        get: vi.fn().mockReturnValue(mockTransformationItem)
      };
      mockActor._getTokenTransformationUpdates = vi.fn().mockReturnValue({
        'texture.src': 'new-image.png',
        width: 2,
        height: 2
      });
      
      global.game = {
        actors: {
          filter: vi.fn().mockReturnValue([mockActor])
        }
      };
      
      global.canvas = {
        tokens: { placeables: [] },
        scene: { name: 'Test Scene' }
      };

      await EventideRpSystemActor._onCanvasReady();

      // Should not attempt updates when no tokens
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Applying transformation consistency updates'),
        expect.any(Object),
        'TRANSFORMATION'
      );
    });

    test('should apply transformation updates to tokens needing updates', async () => {
      const mockTransformationItem = { name: 'Werewolf Form' };
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockReturnValue('transformation-id');
      mockActor.name = 'Transformed Actor';
      mockActor.id = 'actor123';
      mockActor.items = {
        get: vi.fn().mockReturnValue(mockTransformationItem)
      };
      mockActor._getTokenTransformationUpdates = vi.fn().mockReturnValue({
        'texture.src': 'new-image.png',
        width: 2,
        height: 2
      });
      
      const mockToken = {
        id: 'token123',
        document: {
          actorId: 'actor123',
          texture: { src: 'old-image.png' },
          width: 1,
          height: 1
        }
      };
      
      const mockScene = {
        name: 'Test Scene',
        updateEmbeddedDocuments: vi.fn().mockResolvedValue(undefined)
      };
      
      global.game = {
        actors: {
          filter: vi.fn().mockReturnValue([mockActor])
        }
      };
      
      global.canvas = {
        tokens: { placeables: [mockToken] },
        scene: mockScene
      };

      await EventideRpSystemActor._onCanvasReady();

      expect(mockScene.updateEmbeddedDocuments).toHaveBeenCalledWith('Token', [
        { _id: 'token123', 'texture.src': 'new-image.png', width: 2, height: 2 }
      ]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Applying transformation consistency updates to 1 tokens for actor "Transformed Actor" in scene "Test Scene"',
        { transformationName: 'Werewolf Form' },
        'TRANSFORMATION'
      );
    });

    test('should skip tokens that already have correct transformation', async () => {
      const mockTransformationItem = { name: 'Werewolf Form' };
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockReturnValue('transformation-id');
      mockActor.name = 'Transformed Actor';
      mockActor.id = 'actor123';
      mockActor.items = {
        get: vi.fn().mockReturnValue(mockTransformationItem)
      };
      mockActor._getTokenTransformationUpdates = vi.fn().mockReturnValue({
        'texture.src': 'correct-image.png',
        width: 2,
        height: 2
      });
      
      const mockToken = {
        id: 'token123',
        document: {
          actorId: 'actor123',
          texture: { src: 'correct-image.png' },
          width: 2,
          height: 2
        }
      };
      
      const mockScene = {
        name: 'Test Scene',
        updateEmbeddedDocuments: vi.fn().mockResolvedValue(undefined)
      };
      
      global.game = {
        actors: {
          filter: vi.fn().mockReturnValue([mockActor])
        }
      };
      
      global.canvas = {
        tokens: { placeables: [mockToken] },
        scene: mockScene
      };

      await EventideRpSystemActor._onCanvasReady();

      // Should not call update since token already matches
      expect(mockScene.updateEmbeddedDocuments).not.toHaveBeenCalled();
    });

    test('should filter out non-EventideRpSystemActor instances in filter callback', async () => {
      // Create a mock actor that passes the instanceof check
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockReturnValue('transformation-id');
      mockActor.name = 'Transformed Actor';
      mockActor.id = 'actor123';
      mockActor.items = {
        get: vi.fn().mockReturnValue({ name: 'Werewolf Form' })
      };
      mockActor._getTokenTransformationUpdates = vi.fn().mockReturnValue({});
      
      // Use a real filter callback to test the instanceof check
      global.game = {
        actors: {
          filter: vi.fn().mockImplementation((callback) => {
            // Test with both EventideRpSystemActor and non-EventideRpSystemActor instances
            const nonEventideActor = { name: 'Other Actor', getFlag: vi.fn() };
            const actors = [mockActor, nonEventideActor];
            return actors.filter(callback);
          })
        }
      };
      
      global.canvas = {
        tokens: { placeables: [] },
        scene: { name: 'Test Scene' }
      };

      await EventideRpSystemActor._onCanvasReady();

      // Should find only the EventideRpSystemActor instance
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Found 1 actors with active transformations',
        { actorNames: ['Transformed Actor'] },
        'TRANSFORMATION'
      );
    });

    test('should handle errors during transformation consistency check', async () => {
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockImplementation(() => {
        throw new Error('Flag error');
      });
      mockActor.name = 'Error Actor';
      
      global.game = {
        actors: {
          filter: vi.fn().mockReturnValue([mockActor])
        }
      };

      // Should not throw
      await expect(EventideRpSystemActor._onCanvasReady()).resolves.not.toThrow();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to ensure transformation consistency on scene change',
        expect.any(Error),
        'TRANSFORMATION'
      );
    });

    test('should filter out non-EventideRpSystemActor instances', async () => {
      global.game = {
        actors: {
          filter: vi.fn().mockImplementation((_callback) => {
            // Simulate filter returning only EventideRpSystemActor instances
            return [];
          })
        }
      };

      await EventideRpSystemActor._onCanvasReady();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No actors with active transformations found',
        null,
        'TRANSFORMATION'
      );
    });

    test('should handle empty transformation updates', async () => {
      const mockTransformationItem = { name: 'Empty Transformation' };
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockReturnValue('transformation-id');
      mockActor.name = 'Transformed Actor';
      mockActor.id = 'actor123';
      mockActor.items = {
        get: vi.fn().mockReturnValue(mockTransformationItem)
      };
      mockActor._getTokenTransformationUpdates = vi.fn().mockReturnValue({});
      
      global.game = {
        actors: {
          filter: vi.fn().mockReturnValue([mockActor])
        }
      };
      
      global.canvas = {
        tokens: { placeables: [] },
        scene: { name: 'Test Scene' }
      };

      await EventideRpSystemActor._onCanvasReady();

      // Should not attempt updates when transformation updates are empty
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Applying transformation consistency updates'),
        expect.any(Object),
        'TRANSFORMATION'
      );
    });

    test('should handle tokens for different actors', async () => {
      const mockTransformationItem = { name: 'Werewolf Form' };
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockReturnValue('transformation-id');
      mockActor.name = 'Transformed Actor';
      mockActor.id = 'actor123';
      mockActor.items = {
        get: vi.fn().mockReturnValue(mockTransformationItem)
      };
      mockActor._getTokenTransformationUpdates = vi.fn().mockReturnValue({
        'texture.src': 'new-image.png'
      });
      
      // Token belongs to a different actor
      const mockToken = {
        id: 'token456',
        document: {
          actorId: 'different-actor-id',
          texture: { src: 'old-image.png' }
        }
      };
      
      const mockScene = {
        name: 'Test Scene',
        updateEmbeddedDocuments: vi.fn().mockResolvedValue(undefined)
      };
      
      global.game = {
        actors: {
          filter: vi.fn().mockReturnValue([mockActor])
        }
      };
      
      global.canvas = {
        tokens: { placeables: [mockToken] },
        scene: mockScene
      };

      await EventideRpSystemActor._onCanvasReady();

      // Should not update tokens for different actors
      expect(mockScene.updateEmbeddedDocuments).not.toHaveBeenCalled();
    });

    test('should detect texture changes needing update', async () => {
      const mockTransformationItem = { name: 'Werewolf Form' };
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockReturnValue('transformation-id');
      mockActor.name = 'Transformed Actor';
      mockActor.id = 'actor123';
      mockActor.items = {
        get: vi.fn().mockReturnValue(mockTransformationItem)
      };
      mockActor._getTokenTransformationUpdates = vi.fn().mockReturnValue({
        'texture.src': 'new-texture.png'
      });
      
      const mockToken = {
        id: 'token123',
        document: {
          actorId: 'actor123',
          texture: { src: 'old-texture.png' },
          width: 1,
          height: 1
        }
      };
      
      const mockScene = {
        name: 'Test Scene',
        updateEmbeddedDocuments: vi.fn().mockResolvedValue(undefined)
      };
      
      global.game = {
        actors: {
          filter: vi.fn().mockReturnValue([mockActor])
        }
      };
      
      global.canvas = {
        tokens: { placeables: [mockToken] },
        scene: mockScene
      };

      await EventideRpSystemActor._onCanvasReady();

      expect(mockScene.updateEmbeddedDocuments).toHaveBeenCalledWith('Token', [
        { _id: 'token123', 'texture.src': 'new-texture.png' }
      ]);
    });

    test('should detect width/height changes needing update', async () => {
      const mockTransformationItem = { name: 'Large Form' };
      const mockActor = new EventideRpSystemActor();
      mockActor.getFlag = vi.fn().mockReturnValue('transformation-id');
      mockActor.name = 'Transformed Actor';
      mockActor.id = 'actor123';
      mockActor.items = {
        get: vi.fn().mockReturnValue(mockTransformationItem)
      };
      mockActor._getTokenTransformationUpdates = vi.fn().mockReturnValue({
        width: 3,
        height: 3
      });
      
      const mockToken = {
        id: 'token123',
        document: {
          actorId: 'actor123',
          texture: { src: 'same-texture.png' },
          width: 1,
          height: 1
        }
      };
      
      const mockScene = {
        name: 'Test Scene',
        updateEmbeddedDocuments: vi.fn().mockResolvedValue(undefined)
      };
      
      global.game = {
        actors: {
          filter: vi.fn().mockReturnValue([mockActor])
        }
      };
      
      global.canvas = {
        tokens: { placeables: [mockToken] },
        scene: mockScene
      };

      await EventideRpSystemActor._onCanvasReady();

      expect(mockScene.updateEmbeddedDocuments).toHaveBeenCalledWith('Token', [
        { _id: 'token123', width: 3, height: 3 }
      ]);
    });
  });
});
