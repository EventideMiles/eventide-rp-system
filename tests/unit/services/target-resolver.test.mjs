// @ts-nocheck
/**
 * @fileoverview Target Resolver Tests
 *
 * Unit tests for the TargetResolver service which handles
 * target resolution for action card processing in the Eventide RP System.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

import { TargetResolver } from '../../../module/services/target-resolver.mjs';

// Set up mocks before any tests
beforeEach(() => {
  vi.clearAllMocks();
});

describe('TargetResolver', () => {
  describe('resolveTargets()', () => {
    test('should return success with targets when targets are available', async () => {
      // Arrange
      const mockActor = { id: 'actor1', name: 'Test Actor' };
      const mockTargets = [{ id: 'token1', name: 'Target 1' }];
      const mockGetTargetArray = vi.fn().mockResolvedValue(mockTargets);
      global.erps = { utils: { getTargetArray: mockGetTargetArray } };

      // Act
      const result = await TargetResolver.resolveTargets({
        actor: mockActor,
        selfTarget: false,
        contextName: 'test action'
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.targets).toEqual(mockTargets);
      expect(mockGetTargetArray).toHaveBeenCalled();
    });

    test('should use self-targeting when enabled and token is available', async () => {
      // Arrange
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        token: { id: 'selfToken', name: 'Self Token' }
      };
      const mockGetTargetArray = vi.fn().mockResolvedValue([]);
      global.erps = { utils: { getTargetArray: mockGetTargetArray } };

      // Act
      const result = await TargetResolver.resolveTargets({
        actor: mockActor,
        selfTarget: true
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.targets).toHaveLength(1);
      expect(result.targets[0].id).toBe('selfToken');
    });

    test('should return failure when self-targeting enabled but no token found', async () => {
      // Arrange
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        getActiveTokens: vi.fn().mockReturnValue([])
      };
      const mockGetTargetArray = vi.fn().mockResolvedValue([]);
      global.erps = { utils: { getTargetArray: mockGetTargetArray } };
      global.ui = { notifications: { warn: vi.fn() } };
      global.game = { i18n: { localize: vi.fn((key) => key) } };

      // Act
      const result = await TargetResolver.resolveTargets({
        actor: mockActor,
        selfTarget: true
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.targets).toEqual([]);
      expect(result.reason).toBe('noSelfToken');
      expect(global.ui.notifications.warn).toHaveBeenCalled();
    });

    test('should return failure when no targets are available', async () => {
      // Arrange
      const mockActor = { id: 'actor1', name: 'Test Actor' };
      const mockGetTargetArray = vi.fn().mockResolvedValue([]);
      global.erps = { utils: { getTargetArray: mockGetTargetArray } };
      global.ui = { notifications: { warn: vi.fn() } };
      global.game = { i18n: { localize: vi.fn((key) => key) } };

      // Act
      const result = await TargetResolver.resolveTargets({
        actor: mockActor,
        selfTarget: false
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.targets).toEqual([]);
      expect(result.reason).toBe('noTargets');
      expect(global.ui.notifications.warn).toHaveBeenCalled();
    });

    test('should return failure with error reason when exception occurs', async () => {
      // Arrange
      const mockActor = { id: 'actor1', name: 'Test Actor' };
      const mockError = new Error('Test error');
      const mockGetTargetArray = vi.fn().mockRejectedValue(mockError);
      global.erps = { utils: { getTargetArray: mockGetTargetArray } };
      global.ui = { notifications: { error: vi.fn() } };
      global.game = { i18n: { format: vi.fn((key, data) => `${key}: ${data.message}`) } };

      // Act
      const result = await TargetResolver.resolveTargets({
        actor: mockActor,
        selfTarget: false
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.targets).toEqual([]);
      expect(result.reason).toBe('error');
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should use default context name when not provided', async () => {
      // Arrange
      const mockActor = { id: 'actor1', name: 'Test Actor' };
      const mockTargets = [{ id: 'token1' }];
      const mockGetTargetArray = vi.fn().mockResolvedValue(mockTargets);
      global.erps = { utils: { getTargetArray: mockGetTargetArray } };

      // Act
      const result = await TargetResolver.resolveTargets({
        actor: mockActor,
        selfTarget: false
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.targets).toEqual(mockTargets);
    });
  });

  describe('getSelfTargetToken()', () => {
    test('should return actor token when available', () => {
      // Arrange
      const mockActor = {
        id: 'actor1',
        token: { id: 'token1', name: 'Actor Token' }
      };

      // Act
      const result = TargetResolver.getSelfTargetToken(mockActor);

      // Assert
      expect(result).toEqual({ id: 'token1', name: 'Actor Token' });
    });

    test('should return first active token when actor token not available', () => {
      // Arrange
      const mockActiveTokens = [
        { id: 'token1', name: 'Active Token 1' },
        { id: 'token2', name: 'Active Token 2' }
      ];
      const mockActor = {
        id: 'actor1',
        getActiveTokens: vi.fn().mockReturnValue(mockActiveTokens)
      };

      // Act
      const result = TargetResolver.getSelfTargetToken(mockActor);

      // Assert
      expect(result).toEqual({ id: 'token1', name: 'Active Token 1' });
      expect(mockActor.getActiveTokens).toHaveBeenCalled();
    });

    test('should return null when no token is available', () => {
      // Arrange
      const mockActor = {
        id: 'actor1',
        getActiveTokens: vi.fn().mockReturnValue([])
      };

      // Act
      const result = TargetResolver.getSelfTargetToken(mockActor);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getTargetArray()', () => {
    test('should return target array from erps.utils', async () => {
      // Arrange
      const mockTargets = [{ id: 'token1' }, { id: 'token2' }];
      const mockGetTargetArray = vi.fn().mockResolvedValue(mockTargets);
      global.erps = { utils: { getTargetArray: mockGetTargetArray } };

      // Act
      const result = await TargetResolver.getTargetArray();

      // Assert
      expect(result).toEqual(mockTargets);
      expect(mockGetTargetArray).toHaveBeenCalled();
    });

    test('should return empty array when error occurs', async () => {
      // Arrange
      const mockError = new Error('Test error');
      const mockGetTargetArray = vi.fn().mockRejectedValue(mockError);
      global.erps = { utils: { getTargetArray: mockGetTargetArray } };

      // Act
      const result = await TargetResolver.getTargetArray();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('validateTargets()', () => {
    test('should return true when targets are available', () => {
      // Arrange
      const mockTargets = [{ id: 'token1' }, { id: 'token2' }];

      // Act
      const result = TargetResolver.validateTargets(mockTargets, 'test action');

      // Assert
      expect(result).toBe(true);
    });

    test('should return false when targets array is empty', () => {
      // Arrange
      const mockTargets = [];
      global.ui = { notifications: { warn: vi.fn() } };
      global.game = { i18n: { localize: vi.fn((key) => key) } };

      // Act
      const result = TargetResolver.validateTargets(mockTargets, 'test action');

      // Assert
      expect(result).toBe(false);
      expect(global.ui.notifications.warn).toHaveBeenCalled();
    });

    test('should return false when targets is null', () => {
      // Arrange
      const mockTargets = null;
      global.ui = { notifications: { warn: vi.fn() } };
      global.game = { i18n: { localize: vi.fn((key) => key) } };

      // Act
      const result = TargetResolver.validateTargets(mockTargets, 'test action');

      // Assert
      expect(result).toBe(false);
      expect(global.ui.notifications.warn).toHaveBeenCalled();
    });

    test('should use default context name when not provided', () => {
      // Arrange
      const mockTargets = [];

      // Act
      const result = TargetResolver.validateTargets(mockTargets);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('hasValidSelfToken()', () => {
    test('should return true when actor has valid token', () => {
      // Arrange
      const mockActor = {
        id: 'actor1',
        token: { id: 'token1' }
      };

      // Act
      const result = TargetResolver.hasValidSelfToken(mockActor);

      // Assert
      expect(result).toBe(true);
    });

    test('should return false when actor has no token', () => {
      // Arrange
      const mockActor = {
        id: 'actor1',
        getActiveTokens: vi.fn().mockReturnValue([])
      };

      // Act
      const result = TargetResolver.hasValidSelfToken(mockActor);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('createSelfTargetArray()', () => {
    test('should return array with actor token when available', () => {
      // Arrange
      const mockActor = {
        id: 'actor1',
        token: { id: 'token1', name: 'Self Token' }
      };

      // Act
      const result = TargetResolver.createSelfTargetArray(mockActor);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('token1');
    });

    test('should return empty array when no token available', () => {
      // Arrange
      const mockActor = {
        id: 'actor1',
        getActiveTokens: vi.fn().mockReturnValue([])
      };

      // Act
      const result = TargetResolver.createSelfTargetArray(mockActor);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('lockTargets()', () => {
    test('should return empty array when tokens is null', () => {
      // Arrange
      const tokens = null;

      // Act
      const result = TargetResolver.lockTargets(tokens);

      // Assert
      expect(result).toEqual([]);
    });

    test('should return empty array when tokens is empty', () => {
      // Arrange
      const tokens = [];

      // Act
      const result = TargetResolver.lockTargets(tokens);

      // Assert
      expect(result).toEqual([]);
    });

    test('should lock target data for each token', () => {
      // Arrange
      const mockActor = { id: 'actor1', name: 'Test Actor', uuid: 'Actor.uuid1', img: 'actor.jpg' };
      const mockTokens = [
        {
          id: 'token1',
          name: 'Token 1',
          actor: mockActor,
          isLinked: true,
          texture: { src: 'token1.jpg' },
          scene: { id: 'scene1' }
        },
        {
          id: 'token2',
          name: 'Token 2',
          actor: mockActor,
          isLinked: false,
          texture: { src: 'token2.jpg' },
          scene: { id: 'scene1' }
        }
      ];

      // Act
      const result = TargetResolver.lockTargets(mockTokens);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        actorId: 'actor1',
        tokenId: 'token1',
        sceneId: 'scene1',
        actorName: 'Test Actor',
        tokenName: 'Token 1',
        img: 'token1.jpg',
        isLinked: true,
        uuid: 'Actor.uuid1'
      });
      expect(result[1].isLinked).toBe(false);
    });

    test('should handle tokens with missing actor', () => {
      // Arrange
      const mockTokens = [
        {
          id: 'token1',
          name: 'Token 1',
          actor: null,
          isLinked: true,
          texture: { src: 'token1.jpg' },
          scene: { id: 'scene1' }
        }
      ];

      // Act
      const result = TargetResolver.lockTargets(mockTokens);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].actorId).toBeNull();
      expect(result[0].actorName).toBe('Unknown');
      expect(result[0].img).toBe('token1.jpg');
    });

    test('should use actor image when token texture is missing', () => {
      // Arrange
      const mockActor = { id: 'actor1', name: 'Test Actor', uuid: 'Actor.uuid1', img: 'actor.jpg' };
      const mockTokens = [
        {
          id: 'token1',
          name: 'Token 1',
          actor: mockActor,
          isLinked: true,
          scene: { id: 'scene1' }
        }
      ];

      // Act
      const result = TargetResolver.lockTargets(mockTokens);

      // Assert
      expect(result[0].img).toBe('actor.jpg');
    });

    test('should handle tokens with document structure', () => {
      // Arrange
      const mockActor = { id: 'actor1', name: 'Test Actor', uuid: 'Actor.uuid1' };
      const mockTokens = [
        {
          id: 'token1',
          name: 'Token 1',
          actor: mockActor,
          document: {
            isLinked: true,
            parent: { id: 'scene1' }
          },
          texture: { src: 'token1.jpg' }
        }
      ];

      // Act
      const result = TargetResolver.lockTargets(mockTokens);

      // Assert
      expect(result[0].isLinked).toBe(true);
      expect(result[0].sceneId).toBe('scene1');
    });
  });

  describe('resolveLockedTargets()', () => {
    test('should return empty result when lockedTargets is null', () => {
      // Arrange
      const lockedTargets = null;

      // Act
      const result = TargetResolver.resolveLockedTargets(lockedTargets);

      // Assert
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
      expect(result.allValid).toBe(true);
    });

    test('should return empty result when lockedTargets is empty', () => {
      // Arrange
      const lockedTargets = [];

      // Act
      const result = TargetResolver.resolveLockedTargets(lockedTargets);

      // Assert
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
      expect(result.allValid).toBe(true);
    });

    test('should resolve all valid targets', () => {
      // Arrange
      const lockedTargets = [
        {
          actorId: 'actor1',
          tokenId: 'token1',
          sceneId: 'scene1',
          uuid: 'Actor.uuid1',
          actorName: 'Test Actor',
          tokenName: 'Token 1',
          img: 'token.jpg',
          isLinked: true
        }
      ];
      const mockToken = { id: 'token1', name: 'Token 1' };
      const mockActor = { id: 'actor1', name: 'Test Actor' };
      const mockScene = { tokens: { get: vi.fn().mockReturnValue(mockToken) } };
      global.game = {
        scenes: { get: vi.fn().mockReturnValue(mockScene) }
      };
      mockToken.actor = mockActor;

      // Act
      const result = TargetResolver.resolveLockedTargets(lockedTargets);

      // Assert
      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toEqual([]);
      expect(result.allValid).toBe(true);
      expect(result.valid[0].token).toEqual(mockToken);
      expect(result.valid[0].actor).toEqual(mockActor);
    });

    test('should separate valid and invalid targets', () => {
      // Arrange
      const lockedTargets = [
        {
          actorId: 'actor1',
          tokenId: 'token1',
          sceneId: 'scene1',
          uuid: 'Actor.uuid1',
          actorName: 'Valid Actor',
          tokenName: 'Token 1',
          img: 'token.jpg',
          isLinked: true
        },
        {
          actorId: 'actor999',
          tokenId: 'token999',
          sceneId: 'scene999',
          uuid: null,
          actorName: 'Invalid Actor',
          tokenName: 'Token 999',
          img: 'token.jpg',
          isLinked: true
        }
      ];
      const mockToken = { id: 'token1', name: 'Token 1' };
      const mockActor = { id: 'actor1', name: 'Valid Actor' };
      const mockScene = { 
        id: "scene1",
        tokens: { get: vi.fn().mockReturnValue(mockToken) } 
      };
      global.game = {
        scenes: {
          get: vi.fn((sceneId) => sceneId === "scene1" ? mockScene : null)
        },
        actors: { get: vi.fn().mockReturnValue(null) }
      };
      mockToken.actor = mockActor;

      // Act
      const result = TargetResolver.resolveLockedTargets(lockedTargets);

      // Assert
      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(1);
      expect(result.allValid).toBe(false);
      expect(result.invalid[0].reason).toBe('deleted');
    });
  });

  describe('validateLockedTarget()', () => {
    test('should return not found when lockedTarget is null', () => {
      // Arrange
      const lockedTarget = null;

      // Act
      const result = TargetResolver.validateLockedTarget(lockedTarget);

      // Assert
      expect(result.found).toBe(false);
      expect(result.token).toBeNull();
      expect(result.actor).toBeNull();
      expect(result.reason).toBe('noData');
    });

    test('should find target via token lookup', () => {
      // Arrange
      const lockedTarget = {
        actorId: 'actor1',
        tokenId: 'token1',
        sceneId: 'scene1',
        uuid: 'Actor.uuid1'
      };
      const mockToken = { id: 'token1', name: 'Token 1' };
      const mockActor = { id: 'actor1', name: 'Test Actor' };
      const mockScene = { tokens: { get: vi.fn().mockReturnValue(mockToken) } };
      global.game = {
        scenes: { get: vi.fn().mockReturnValue(mockScene) }
      };
      mockToken.actor = mockActor;

      // Act
      const result = TargetResolver.validateLockedTarget(lockedTarget);

      // Assert
      expect(result.found).toBe(true);
      expect(result.token).toEqual(mockToken);
      expect(result.actor).toEqual(mockActor);
      expect(result.reason).toBeNull();
    });

    test('should find target via actor UUID when token not found', () => {
      // Arrange
      const lockedTarget = {
        actorId: 'actor1',
        tokenId: 'token1',
        sceneId: 'scene1',
        uuid: 'Actor.uuid1',
        actorName: 'Test Actor'
      };
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        getActiveTokens: vi.fn().mockReturnValue([])
      };
      global.game = {
        scenes: { get: vi.fn().mockReturnValue(null) }
      };
      global.fromUuidSync = vi.fn().mockReturnValue(mockActor);

      // Act
      const result = TargetResolver.validateLockedTarget(lockedTarget);

      // Assert
      expect(result.found).toBe(true);
      expect(result.token).toBeNull();
      expect(result.actor).toEqual(mockActor);
      expect(result.reason).toBe('actorOnly');
    });

    test('should find target via actor ID as last resort', () => {
      // Arrange
      const lockedTarget = {
        actorId: 'actor1',
        tokenId: 'token1',
        sceneId: 'scene1',
        uuid: null,
        actorName: 'Test Actor'
      };
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        getActiveTokens: vi.fn().mockReturnValue([])
      };
      global.game = {
        scenes: { get: vi.fn().mockReturnValue(null) },
        actors: { get: vi.fn().mockReturnValue(mockActor) }
      };
      global.fromUuidSync = vi.fn().mockReturnValue(null);

      // Act
      const result = TargetResolver.validateLockedTarget(lockedTarget);

      // Assert
      expect(result.found).toBe(true);
      expect(result.token).toBeNull();
      expect(result.actor).toEqual(mockActor);
      expect(result.reason).toBe('actorOnly');
    });

    test('should return not found when target is deleted', () => {
      // Arrange
      const lockedTarget = {
        actorId: 'actor999',
        tokenId: 'token999',
        sceneId: 'scene999',
        uuid: null,
        actorName: 'Deleted Actor'
      };
      global.game = {
        scenes: { get: vi.fn().mockReturnValue(null) },
        actors: { get: vi.fn().mockReturnValue(null) }
      };
      global.fromUuidSync = vi.fn().mockReturnValue(null);

      // Act
      const result = TargetResolver.validateLockedTarget(lockedTarget);

      // Assert
      expect(result.found).toBe(false);
      expect(result.token).toBeNull();
      expect(result.actor).toBeNull();
      expect(result.reason).toBe('deleted');
    });

    test('should get active token for actor found via UUID', () => {
      // Arrange
      const lockedTarget = {
        actorId: 'actor1',
        tokenId: 'token1',
        sceneId: 'scene1',
        uuid: 'Actor.uuid1',
        actorName: 'Test Actor'
      };
      const mockActiveToken = { id: 'activeToken', name: 'Active Token' };
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        getActiveTokens: vi.fn().mockReturnValue([mockActiveToken])
      };
      global.game = {
        scenes: { get: vi.fn().mockReturnValue(null) }
      };
      global.fromUuidSync = vi.fn().mockReturnValue(mockActor);

      // Act
      const result = TargetResolver.validateLockedTarget(lockedTarget);

      // Assert
      expect(result.found).toBe(true);
      expect(result.token).toEqual(mockActiveToken);
      expect(result.actor).toEqual(mockActor);
      expect(result.reason).toBeNull();
    });

    test('should handle missing getActiveTokens method', () => {
      // Arrange
      const lockedTarget = {
        actorId: 'actor1',
        tokenId: 'token1',
        sceneId: 'scene1',
        uuid: 'Actor.uuid1',
        actorName: 'Test Actor'
      };
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor'
        // No getActiveTokens method
      };
      global.game = {
        scenes: { get: vi.fn().mockReturnValue(null) }
      };
      global.fromUuidSync = vi.fn().mockReturnValue(mockActor);

      // Act
      const result = TargetResolver.validateLockedTarget(lockedTarget);

      // Assert
      expect(result.found).toBe(true);
      expect(result.token).toBeNull();
      expect(result.actor).toEqual(mockActor);
      expect(result.reason).toBe('actorOnly');
    });
  });
});
