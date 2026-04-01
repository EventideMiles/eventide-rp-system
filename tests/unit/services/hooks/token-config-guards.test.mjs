// @ts-nocheck
/**
 * @fileoverview Token Configuration Guards Tests
 *
 * Unit tests for the TokenConfigGuards service which prevents editing
 * of tokens and prototype tokens while transformations are active.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock Logger
vi.mock('../../../../module/services/logger.mjs', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Set up mocks before any tests
beforeEach(async () => {
  // Reset module state to clear any initialization state
  vi.resetModules();
  vi.clearAllMocks();

  // Reset global mocks
  global.game = {
    user: { isGM: true },
    i18n: {
      localize: vi.fn((key) => `[${key}]`),
      format: vi.fn((key, _data) => `[${key}]`),
    },
  };

  // Mock foundry.applications.sheets with proper prototype methods
  const originalTokenConfigRender = vi.fn().mockResolvedValue('token-config-rendered');
  const originalPrototypeTokenConfigRender = vi.fn().mockResolvedValue('prototype-token-config-rendered');

  global.foundry = {
    ...global.foundry,
    applications: {
      ...global.foundry?.applications,
      sheets: {
        TokenConfig: class MockTokenConfig {
          constructor() {
            this.token = null;
          }
        },
        PrototypeTokenConfig: class MockPrototypeTokenConfig {
          constructor() {
            this.actor = null;
          }
        },
      },
      api: {
        DialogV2: {
          confirm: vi.fn().mockResolvedValue(false),
        },
      },
    },
  };

  // Set render methods on prototypes
  global.foundry.applications.sheets.TokenConfig.prototype.render = originalTokenConfigRender;
  global.foundry.applications.sheets.PrototypeTokenConfig.prototype.render = originalPrototypeTokenConfigRender;

  // Store original render methods for test access
  global.originalTokenConfigRender = originalTokenConfigRender;
  global.originalPrototypeTokenConfigRender = originalPrototypeTokenConfigRender;

  // Mock ui
  global.ui = {
    notifications: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    },
  };

  // Re-import the module after reset to get fresh state
  const module = await import('../../../../module/services/hooks/token-config-guards.mjs');
  global.TokenConfigGuards = module.TokenConfigGuards;
});

/**
 * Helper to create a mock actor
 * @param {object} options - Configuration options
 * @param {boolean} [options.isToken] - Whether this is a token actor
 * @param {boolean} [options.hasActiveTransformation] - Whether actor has active transformation
 * @param {string} [options.name] - Actor name
 * @returns {object} Mock actor
 */
function createMockActor(options = {}) {
  const {
    isToken = false,
    hasActiveTransformation = false,
    name = 'Test Actor',
  } = options;

  return {
    name,
    isToken,
    getFlag: vi.fn((_scope, _key) => hasActiveTransformation),
    removeTransformation: vi.fn().mockResolvedValue(undefined),
    token: isToken ? { id: 'token-123' } : null,
  };
}

/**
 * Helper to create a mock token
 * @param {object} options - Configuration options
 * @param {object} [options.actor] - The actor for this token
 * @returns {object} Mock token
 */
function createMockToken(options = {}) {
  const { actor = null } = options;
  return {
    id: 'token-123',
    actor,
  };
}

describe('TokenConfigGuards', () => {
  describe('initialize()', () => {
    test('should override TokenConfig and PrototypeTokenConfig render methods', () => {
      // Arrange
      const TokenConfig = global.foundry.applications.sheets.TokenConfig;
      const PrototypeTokenConfig = global.foundry.applications.sheets.PrototypeTokenConfig;

      // Act
      global.TokenConfigGuards.initialize();

      // Assert
      expect(TokenConfig.prototype.render).not.toBe(global.originalTokenConfigRender);
      expect(PrototypeTokenConfig.prototype.render).not.toBe(global.originalPrototypeTokenConfigRender);
    });

    test('should log initialization message', async () => {
      // Arrange
      const { Logger } = await import('../../../../module/services/logger.mjs');

      // Act
      global.TokenConfigGuards.initialize();

      // Assert
      expect(Logger.info).toHaveBeenCalledWith(
        'Initializing Token Configuration Guards',
        null,
        'TRANSFORMATION'
      );
      expect(Logger.info).toHaveBeenCalledWith(
        'Token Configuration Guards initialized',
        null,
        'TRANSFORMATION'
      );
    });
  });

  describe('TokenConfig.render() - Linked Actor with Active Transformation', () => {
    test('should block non-GM users from token config', async () => {
      // Arrange
      global.game.user.isGM = false;
      const actor = createMockActor({
        isToken: false,
        hasActiveTransformation: true,
        name: 'Transformed Actor',
      });
      const token = createMockToken({ actor });
      const mockTokenConfig = new global.foundry.applications.sheets.TokenConfig();
      mockTokenConfig.token = token;

      // Act
      global.TokenConfigGuards.initialize();
      await mockTokenConfig.render();

      // Assert
      expect(ui.notifications.warn).toHaveBeenCalledWith(
        '[EVENTIDE_RP_SYSTEM.Notifications.TokenConfigBlockedForPlayers]'
      );
      expect(actor.removeTransformation).not.toHaveBeenCalled();
    });

    test('should show confirmation dialog for GM users', async () => {
      // Arrange
      global.game.user.isGM = true;
      const actor = createMockActor({
        isToken: false,
        hasActiveTransformation: true,
        name: 'Transformed Actor',
      });
      const token = createMockToken({ actor });
      const mockTokenConfig = new global.foundry.applications.sheets.TokenConfig();
      mockTokenConfig.token = token;

      // Act
      global.TokenConfigGuards.initialize();
      await mockTokenConfig.render();

      // Assert
      expect(global.foundry.applications.api.DialogV2.confirm).toHaveBeenCalled();
    });

    test('should revert transformation and proceed when GM confirms', async () => {
      // Arrange
      global.game.user.isGM = true;
      const actor = createMockActor({
        isToken: false,
        hasActiveTransformation: true,
        name: 'Transformed Actor',
      });
      const token = createMockToken({ actor });
      const mockTokenConfig = new global.foundry.applications.sheets.TokenConfig();
      mockTokenConfig.token = token;
      global.foundry.applications.api.DialogV2.confirm.mockResolvedValue(true);

      // Act
      global.TokenConfigGuards.initialize();
      await mockTokenConfig.render();

      // Assert
      expect(actor.removeTransformation).toHaveBeenCalled();
      expect(global.originalTokenConfigRender).toHaveBeenCalled();
    });

    test('should cancel and show notification when GM declines', async () => {
      // Arrange
      global.game.user.isGM = true;
      const actor = createMockActor({
        isToken: false,
        hasActiveTransformation: true,
        name: 'Transformed Actor',
      });
      const token = createMockToken({ actor });
      const mockTokenConfig = new global.foundry.applications.sheets.TokenConfig();
      mockTokenConfig.token = token;
      global.foundry.applications.api.DialogV2.confirm.mockResolvedValue(false);

      // Act
      global.TokenConfigGuards.initialize();
      const result = await mockTokenConfig.render();

      // Assert
      expect(actor.removeTransformation).not.toHaveBeenCalled();
      expect(ui.notifications.info).toHaveBeenCalledWith(
        '[EVENTIDE_RP_SYSTEM.Notifications.TokenConfigCancelled]'
      );
      expect(result).toBe(mockTokenConfig);
    });
  });

  describe('TokenConfig.render() - Unlinked Token with Active Transformation', () => {
    test('should block non-GM users from unlinked token config', async () => {
      // Arrange
      global.game.user.isGM = false;
      const actor = createMockActor({
        isToken: true,
        hasActiveTransformation: true,
        name: 'Unlinked Token Actor',
      });
      const token = createMockToken({ actor });
      const mockTokenConfig = new global.foundry.applications.sheets.TokenConfig();
      mockTokenConfig.token = token;

      // Act
      global.TokenConfigGuards.initialize();
      await mockTokenConfig.render();

      // Assert
      expect(ui.notifications.warn).toHaveBeenCalledWith(
        '[EVENTIDE_RP_SYSTEM.Notifications.TokenConfigBlockedForPlayers]'
      );
      expect(actor.removeTransformation).not.toHaveBeenCalled();
    });

    test('should show confirmation dialog for GM users with unlinked token', async () => {
      // Arrange
      global.game.user.isGM = true;
      const actor = createMockActor({
        isToken: true,
        hasActiveTransformation: true,
        name: 'Unlinked Token Actor',
      });
      const token = createMockToken({ actor });
      const mockTokenConfig = new global.foundry.applications.sheets.TokenConfig();
      mockTokenConfig.token = token;

      // Act
      global.TokenConfigGuards.initialize();
      await mockTokenConfig.render();

      // Assert
      expect(global.foundry.applications.api.DialogV2.confirm).toHaveBeenCalled();
    });

    test('should revert transformation and proceed when GM confirms for unlinked token', async () => {
      // Arrange
      global.game.user.isGM = true;
      const actor = createMockActor({
        isToken: true,
        hasActiveTransformation: true,
        name: 'Unlinked Token Actor',
      });
      const token = createMockToken({ actor });
      const mockTokenConfig = new global.foundry.applications.sheets.TokenConfig();
      mockTokenConfig.token = token;
      global.foundry.applications.api.DialogV2.confirm.mockResolvedValue(true);

      // Act
      global.TokenConfigGuards.initialize();
      await mockTokenConfig.render();

      // Assert
      expect(actor.removeTransformation).toHaveBeenCalled();
      expect(global.originalTokenConfigRender).toHaveBeenCalled();
    });

    test('should cancel and show notification when GM declines for unlinked token', async () => {
      // Arrange
      global.game.user.isGM = true;
      const actor = createMockActor({
        isToken: true,
        hasActiveTransformation: true,
        name: 'Unlinked Token Actor',
      });
      const token = createMockToken({ actor });
      const mockTokenConfig = new global.foundry.applications.sheets.TokenConfig();
      mockTokenConfig.token = token;
      global.foundry.applications.api.DialogV2.confirm.mockResolvedValue(false);

      // Act
      global.TokenConfigGuards.initialize();
      const result = await mockTokenConfig.render();

      // Assert
      expect(actor.removeTransformation).not.toHaveBeenCalled();
      expect(ui.notifications.info).toHaveBeenCalledWith(
        '[EVENTIDE_RP_SYSTEM.Notifications.TokenConfigCancelled]'
      );
      expect(result).toBe(mockTokenConfig);
    });
  });

  describe('TokenConfig.render() - No Active Transformation', () => {
    test('should allow token config when no active transformation', async () => {
      // Arrange
      const actor = createMockActor({
        isToken: false,
        hasActiveTransformation: false,
        name: 'Normal Actor',
      });
      const token = createMockToken({ actor });
      const mockTokenConfig = new global.foundry.applications.sheets.TokenConfig();
      mockTokenConfig.token = token;

      // Act
      global.TokenConfigGuards.initialize();
      await mockTokenConfig.render();

      // Assert
      expect(global.originalTokenConfigRender).toHaveBeenCalled();
      expect(global.foundry.applications.api.DialogV2.confirm).not.toHaveBeenCalled();
    });

    test('should allow token config when actor is null', async () => {
      // Arrange
      const token = createMockToken({ actor: null });
      const mockTokenConfig = new global.foundry.applications.sheets.TokenConfig();
      mockTokenConfig.token = token;

      // Act
      global.TokenConfigGuards.initialize();
      await mockTokenConfig.render();

      // Assert
      expect(global.originalTokenConfigRender).toHaveBeenCalled();
      expect(global.foundry.applications.api.DialogV2.confirm).not.toHaveBeenCalled();
    });

    test('should allow token config when token is null', async () => {
      // Arrange
      const mockTokenConfig = new global.foundry.applications.sheets.TokenConfig();
      mockTokenConfig.token = null;

      // Act
      global.TokenConfigGuards.initialize();
      await mockTokenConfig.render();

      // Assert
      expect(global.originalTokenConfigRender).toHaveBeenCalled();
      expect(global.foundry.applications.api.DialogV2.confirm).not.toHaveBeenCalled();
    });
  });

  describe('PrototypeTokenConfig.render() - Actor with Active Transformation', () => {
    test('should block non-GM users from prototype token config', async () => {
      // Arrange
      global.game.user.isGM = false;
      const actor = createMockActor({
        isToken: false,
        hasActiveTransformation: true,
        name: 'Transformed Actor',
      });
      const mockPrototypeTokenConfig = new global.foundry.applications.sheets.PrototypeTokenConfig();
      mockPrototypeTokenConfig.actor = actor;

      // Act
      global.TokenConfigGuards.initialize();
      await mockPrototypeTokenConfig.render();

      // Assert
      expect(ui.notifications.warn).toHaveBeenCalledWith(
        '[EVENTIDE_RP_SYSTEM.Notifications.PrototypeTokenConfigBlockedForPlayers]'
      );
      expect(actor.removeTransformation).not.toHaveBeenCalled();
    });

    test('should show confirmation dialog for GM users', async () => {
      // Arrange
      global.game.user.isGM = true;
      const actor = createMockActor({
        isToken: false,
        hasActiveTransformation: true,
        name: 'Transformed Actor',
      });
      const mockPrototypeTokenConfig = new global.foundry.applications.sheets.PrototypeTokenConfig();
      mockPrototypeTokenConfig.actor = actor;

      // Act
      global.TokenConfigGuards.initialize();
      await mockPrototypeTokenConfig.render();

      // Assert
      expect(global.foundry.applications.api.DialogV2.confirm).toHaveBeenCalled();
    });

    test('should revert transformation and proceed when GM confirms', async () => {
      // Arrange
      global.game.user.isGM = true;
      const actor = createMockActor({
        isToken: false,
        hasActiveTransformation: true,
        name: 'Transformed Actor',
      });
      const mockPrototypeTokenConfig = new global.foundry.applications.sheets.PrototypeTokenConfig();
      mockPrototypeTokenConfig.actor = actor;
      global.foundry.applications.api.DialogV2.confirm.mockResolvedValue(true);

      // Act
      global.TokenConfigGuards.initialize();
      await mockPrototypeTokenConfig.render();

      // Assert
      expect(actor.removeTransformation).toHaveBeenCalled();
      expect(global.originalPrototypeTokenConfigRender).toHaveBeenCalled();
    });

    test('should cancel and show notification when GM declines', async () => {
      // Arrange
      global.game.user.isGM = true;
      const actor = createMockActor({
        isToken: false,
        hasActiveTransformation: true,
        name: 'Transformed Actor',
      });
      const mockPrototypeTokenConfig = new global.foundry.applications.sheets.PrototypeTokenConfig();
      mockPrototypeTokenConfig.actor = actor;
      global.foundry.applications.api.DialogV2.confirm.mockResolvedValue(false);

      // Act
      global.TokenConfigGuards.initialize();
      const result = await mockPrototypeTokenConfig.render();

      // Assert
      expect(actor.removeTransformation).not.toHaveBeenCalled();
      expect(ui.notifications.info).toHaveBeenCalledWith(
        '[EVENTIDE_RP_SYSTEM.Notifications.PrototypeTokenConfigCancelled]'
      );
      expect(result).toBe(mockPrototypeTokenConfig);
    });
  });

  describe('PrototypeTokenConfig.render() - No Active Transformation', () => {
    test('should allow prototype token config when no active transformation', async () => {
      // Arrange
      const actor = createMockActor({
        isToken: false,
        hasActiveTransformation: false,
        name: 'Normal Actor',
      });
      const mockPrototypeTokenConfig = new global.foundry.applications.sheets.PrototypeTokenConfig();
      mockPrototypeTokenConfig.actor = actor;

      // Act
      global.TokenConfigGuards.initialize();
      await mockPrototypeTokenConfig.render();

      // Assert
      expect(global.originalPrototypeTokenConfigRender).toHaveBeenCalled();
      expect(global.foundry.applications.api.DialogV2.confirm).not.toHaveBeenCalled();
    });

    test('should allow prototype token config when actor is null', async () => {
      // Arrange
      const mockPrototypeTokenConfig = new global.foundry.applications.sheets.PrototypeTokenConfig();
      mockPrototypeTokenConfig.actor = null;

      // Act
      global.TokenConfigGuards.initialize();
      await mockPrototypeTokenConfig.render();

      // Assert
      expect(global.originalPrototypeTokenConfigRender).toHaveBeenCalled();
      expect(global.foundry.applications.api.DialogV2.confirm).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should throw error when actor has no getFlag method', async () => {
      // Arrange
      const actor = createMockActor({
        isToken: false,
        hasActiveTransformation: false,
        name: 'Actor without getFlag',
      });
      delete actor.getFlag;
      const token = createMockToken({ actor });
      const mockTokenConfig = new global.foundry.applications.sheets.TokenConfig();
      mockTokenConfig.token = token;

      // Act & Assert
      global.TokenConfigGuards.initialize();
      await expect(mockTokenConfig.render()).rejects.toThrow(
        'actor.getFlag is not a function'
      );
    });

    test('should handle actor without getFlag method in prototype token config', async () => {
      // Arrange
      const actor = createMockActor({
        isToken: false,
        hasActiveTransformation: false,
        name: 'Actor without getFlag',
      });
      delete actor.getFlag;
      const mockPrototypeTokenConfig = new global.foundry.applications.sheets.PrototypeTokenConfig();
      mockPrototypeTokenConfig.actor = actor;

      // Act & Assert - should allow since getFlag is checked for existence first
      global.TokenConfigGuards.initialize();
      await expect(mockPrototypeTokenConfig.render()).resolves.toBe('prototype-token-config-rendered');
    });
  });
});