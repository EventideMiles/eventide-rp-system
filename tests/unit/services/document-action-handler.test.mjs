// @ts-nocheck
/**
 * @fileoverview DocumentActionHandler Service Tests
 *
 * Unit tests for the DocumentActionHandler service which handles
 * document actions (view, create, delete) for embedded documents on items.
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

vi.mock('../../../module/services/effect-manager.mjs', () => ({
  EffectManager: {
    deleteEffect: vi.fn()
  }
}));

// Import the service after setting up mocks
import { DocumentActionHandler } from '../../../module/services/document-action-handler.mjs';

describe('DocumentActionHandler', () => {
  let mockItem;
  let mockTarget;
  let mockEffect;
  let mockPower;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock effect
    mockEffect = {
      id: 'effect-123',
      sheet: {
        render: vi.fn()
      },
      delete: vi.fn()
    };

    // Create mock power
    mockPower = {
      id: 'power-456',
      sheet: {
        render: vi.fn()
      }
    };

    // Create mock item
    mockItem = {
      id: 'item-123',
      name: 'Test Item',
      type: 'transformation',
      system: {
        getEmbeddedCombatPowers: vi.fn(() => [mockPower])
      },
      effects: {
        get: vi.fn((id) => id === 'effect-123' ? mockEffect : undefined)
      }
    };

    // Create mock element data
    mockTarget = {
      closest: vi.fn(() => ({
        dataset: {
          itemId: 'power-456',
          effectId: 'effect-123'
        }
      })),
      dataset: {
        action: 'create',
        documentClass: 'ActiveEffect',
        type: 'base'
      }
    };

    // Mock Foundry utilities
    global.foundry = {
      utils: {
        getDocumentClass: vi.fn(),
        setProperty: vi.fn()
      }
    };

    // mock ui.notifications
    global.ui = {
      notifications: {
        error: vi.fn()
      }
    };

    // mock game.i18n
    global.game = {
      i18n: {
        format: vi.fn(() => 'Error message')
      }
    };
  });

  describe('viewDoc()', () => {
    test('should view embedded combat power sheet for transformation item', async () => {
      // Arrange
      mockTarget.closest.mockReturnValue({
        dataset: { itemId: 'power-456' }
      });

      // Act
      await DocumentActionHandler.viewDoc(mockItem, mockTarget);

      // Assert
      expect(mockItem.system.getEmbeddedCombatPowers).toHaveBeenCalled();
      expect(mockPower.sheet.render).toHaveBeenCalledWith(true, { readOnly: true });
    });

    test('should not open sheet when embedded power not found', async () => {
      // Arrange
      mockTarget.closest.mockReturnValue({
        dataset: { itemId: 'non-existent' }
      });

      // Act
      await DocumentActionHandler.viewDoc(mockItem, mockTarget);

      // Assert
      expect(mockPower.sheet.render).not.toHaveBeenCalled();
    });

    test('should view effect sheet when effectId is present', async () => {
      // Arrange
      mockTarget.closest.mockReturnValue({
        dataset: { effectId: 'effect-123' }
      });

      // Act
      await DocumentActionHandler.viewDoc(mockItem, mockTarget);

      // Assert
      expect(mockItem.effects.get).toHaveBeenCalledWith('effect-123');
      expect(mockEffect.sheet.render).toHaveBeenCalledWith(true);
    });

    test('should not open sheet when effect not found', async () => {
      // Arrange
      mockTarget.closest.mockReturnValue({
        dataset: { effectId: 'non-existent' }
      });

      // Act
      await DocumentActionHandler.viewDoc(mockItem, mockTarget);

      // Assert
      expect(mockEffect.sheet.render).not.toHaveBeenCalled();
    });

    test('should log error and show notification when viewing fails', async () => {
      // Arrange
      mockTarget.closest.mockImplementation(() => {
        throw new Error('Simulated error');
      });

      // Act
      await DocumentActionHandler.viewDoc(mockItem, mockTarget);

      // Assert
      const { Logger } = await import('../../../module/services/logger.mjs');
      expect(Logger.error).toHaveBeenCalledWith(
        'Failed to view document',
        expect.any(Error),
        'ITEM_ACTIONS'
      );
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should handle null item in error gracefully', async () => {
      // Arrange
      mockTarget.closest.mockImplementation(() => {
        throw new Error('Simulated error');
      });

      // Act
      await DocumentActionHandler.viewDoc(null, mockTarget);

      // Assert
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });
  });

  describe('createDoc()', () => {
    let mockDocClass;

    beforeEach(() => {
      mockDocClass = {
        defaultName: vi.fn(() => 'New Document'),
        create: vi.fn()
      };
      global.foundry.utils.getDocumentClass.mockReturnValue(mockDocClass);
    });

    test('should create document with proper data', async () => {
      // Arrange
      mockTarget.dataset = {
        action: 'create',
        documentClass: 'ActiveEffect',
        type: 'base',
        // Additional custom data attributes
        label: 'Test Label',
        duration: 5
      };

      // Act
      await DocumentActionHandler.createDoc(mockItem, mockTarget);

      // Assert
      expect(mockDocClass.defaultName).toHaveBeenCalledWith({
        type: 'base',
        parent: mockItem
      });
      expect(global.foundry.utils.setProperty).toHaveBeenCalledTimes(3);
      expect(mockDocClass.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Document'
        }),
        { parent: mockItem }
      );
    });

    test('should skip action and documentClass from dataset when creating', async () => {
      // Arrange
      mockTarget.dataset = {
        action: 'create',
        documentClass: 'ActiveEffect',
        type: 'base'
      };

      // Act
      await DocumentActionHandler.createDoc(mockItem, mockTarget);

      // Assert
      const createCallArgs = mockDocClass.create.mock.calls[0];
      const createData = createCallArgs[0];
      expect(createData.action).toBeUndefined();
      expect(createData.documentClass).toBeUndefined();
    });

    test('should throw error when documentClass is not specified', async () => {
      // Arrange
      mockTarget.dataset = {
        action: 'create',
        type: 'base'
      };

      // Act & Assert
      await DocumentActionHandler.createDoc(mockItem, mockTarget);

      const { Logger } = await import('../../../module/services/logger.mjs');
      expect(Logger.error).toHaveBeenCalledWith(
        'Failed to create document',
        expect.objectContaining({
          message: 'Document class not specified'
        }),
        'ITEM_ACTIONS'
      );
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should throw error when documentClass not found', async () => {
      // Arrange
      global.foundry.utils.getDocumentClass.mockReturnValue(null);
      mockTarget.dataset = {
        action: 'create',
        documentClass: 'NonExistentClass',
        type: 'base'
      };

      // Act & Assert
      await DocumentActionHandler.createDoc(mockItem, mockTarget);

      const { Logger } = await import('../../../module/services/logger.mjs');
      expect(Logger.error).toHaveBeenCalledWith(
        'Failed to create document',
        expect.objectContaining({
          message: 'Document class NonExistentClass not found'
        }),
        'ITEM_ACTIONS'
      );
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should log error and show notification when creation fails', async () => {
      // Arrange
      mockDocClass.create.mockRejectedValue(new Error('Creation failed'));
      mockTarget.dataset = {
        action: 'create',
        documentClass: 'ActiveEffect',
        type: 'base'
      };

      // Act & Assert
      await DocumentActionHandler.createDoc(mockItem, mockTarget);

      const { Logger } = await import('../../../module/services/logger.mjs');
      expect(Logger.error).toHaveBeenCalledWith(
        'Failed to create document',
        expect.any(Error),
        'ITEM_ACTIONS'
      );
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should handle null item in error message', async () => {
      // Arrange
      mockDocClass.create.mockRejectedValue(new Error('Creation failed'));
      mockTarget.dataset = {
        action: 'create',
        documentClass: 'ActiveEffect',
        type: 'base'
      };

      // Act & Assert
      await DocumentActionHandler.createDoc(null, mockTarget);

      expect(global.ui.notifications.error).toHaveBeenCalled();
    });
  });

  describe('deleteDoc()', () => {
    let mockEffectManager;

    beforeEach(() => {
      mockEffectManager = {
        deleteEffect: vi.fn()
      };
    });

    test('should delete ActiveEffect using injected effectManager', async () => {
      // Arrange
      mockTarget.dataset = {
        action: 'delete',
        documentClass: 'ActiveEffect'
      };
      mockTarget.closest = vi.fn(() => ({
        dataset: { effectId: 'effect-123' }
      }));

      // Act
      await DocumentActionHandler.deleteDoc(mockItem, mockTarget, mockEffectManager);

      // Assert
      expect(mockEffectManager.deleteEffect).toHaveBeenCalledWith(mockItem, mockTarget);
      expect(mockEffectManager.deleteEffect).toHaveBeenCalledTimes(1);
    });

    test('should use default EffectManager when no effectManager injected', async () => {
      // Arrange
      mockTarget.dataset = {
        action: 'delete',
        documentClass: 'ActiveEffect'
      };
      mockTarget.closest = vi.fn(() => ({
        dataset: { effectId: 'effect-123' }
      }));

      // Act
      await DocumentActionHandler.deleteDoc(mockItem, mockTarget, null);

      // Assert
      const { EffectManager } = await import('../../../module/services/effect-manager.mjs');
      expect(EffectManager.deleteEffect).toHaveBeenCalledWith(mockItem, mockTarget);
    });

    test('should throw error when documentClass is not specified', async () => {
      // Arrange
      mockTarget.dataset = {
        action: 'delete'
      };

      // Act & Assert
      await DocumentActionHandler.deleteDoc(mockItem, mockTarget, mockEffectManager);

      const { Logger } = await import('../../../module/services/logger.mjs');
      expect(Logger.error).toHaveBeenCalledWith(
        'Failed to delete document',
        expect.objectContaining({
          message: 'Document class not specified'
        }),
        'ITEM_ACTIONS'
      );
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should throw error for unsupported documentClass', async () => {
      // Arrange
      mockTarget.dataset = {
        action: 'delete',
        documentClass: 'UnsupportedClass'
      };

      // Act & Assert
      await DocumentActionHandler.deleteDoc(mockItem, mockTarget, mockEffectManager);

      const { Logger } = await import('../../../module/services/logger.mjs');
      expect(Logger.error).toHaveBeenCalledWith(
        'Failed to delete document',
        expect.objectContaining({
          message: 'Deletion of UnsupportedClass not yet implemented'
        }),
        'ITEM_ACTIONS'
      );
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should log error and show notification when deletion fails', async () => {
      // Arrange
      mockEffectManager.deleteEffect.mockRejectedValue(new Error('Deletion failed'));
      mockTarget.dataset = {
        action: 'delete',
        documentClass: 'ActiveEffect'
      };

      // Act & Assert
      await DocumentActionHandler.deleteDoc(mockItem, mockTarget, mockEffectManager);

      const { Logger } = await import('../../../module/services/logger.mjs');
      expect(Logger.error).toHaveBeenCalledWith(
        'Failed to delete document',
        expect.any(Error),
        'ITEM_ACTIONS'
      );
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should handle null item in error message', async () => {
      // Arrange
      mockEffectManager.deleteEffect.mockRejectedValue(new Error('Deletion failed'));
      mockTarget.dataset = {
        action: 'delete',
        documentClass: 'ActiveEffect'
      };

      // Act & Assert
      await DocumentActionHandler.deleteDoc(null, mockTarget, mockEffectManager);

      expect(global.ui.notifications.error).toHaveBeenCalled();
    });
  });
});