// @ts-nocheck
/**
 * @fileoverview Tests for ExportActionHandler service
 *
 * Tests the export action delegation and header control generation functionality.
 */

import { ExportActionHandler } from '../../../module/services/export-action-handler.mjs';

// Mock dependencies
vi.mock('../../../module/services/embedded-item-exporter.mjs', () => ({
  EmbeddedItemExporter: {
    exportEmbeddedCombatPowers: vi.fn(),
    exportEmbeddedActionCards: vi.fn(),
    exportEmbeddedActionItem: vi.fn(),
    exportEmbeddedEffects: vi.fn(),
    exportEmbeddedTransformations: vi.fn(),
    exportAllEmbeddedItems: vi.fn(),
  },
}));

vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ExportActionHandler', () => {
  let mockGame;
  let mockEmbeddedItemExporter;
  let mockLogger;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mock game
    mockGame = {
      user: {
        isGM: true,
      },
      i18n: {
        localize: vi.fn((key) => key),
      },
    };
    global.game = mockGame;

    // Get mocked modules
    const { EmbeddedItemExporter } = await import(
      '../../../module/services/embedded-item-exporter.mjs'
    );
    mockEmbeddedItemExporter = EmbeddedItemExporter;

    const { Logger } = await import('../../../module/services/logger.mjs');
    mockLogger = Logger;
  });

  describe('EXPORT_ACTIONS configuration', () => {
    test('should define exportEmbeddedCombatPowers action', () => {
      // Assert
      expect(ExportActionHandler.EXPORT_ACTIONS.exportEmbeddedCombatPowers).toEqual({
        serviceMethod: 'exportEmbeddedCombatPowers',
        icon: 'fas fa-swords',
        labelKey: 'EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedCombatPowers',
        applicableItemTypes: ['transformation'],
        contentCheck: expect.any(Function),
      });
    });

    test('should define exportEmbeddedActionCards action', () => {
      // Assert
      expect(ExportActionHandler.EXPORT_ACTIONS.exportEmbeddedActionCards).toEqual({
        serviceMethod: 'exportEmbeddedActionCards',
        icon: 'fas fa-cards-blank',
        labelKey: 'EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedActionCards',
        applicableItemTypes: ['transformation'],
        contentCheck: expect.any(Function),
      });
    });

    test('should define exportEmbeddedActionItem action', () => {
      // Assert
      expect(ExportActionHandler.EXPORT_ACTIONS.exportEmbeddedActionItem).toEqual({
        serviceMethod: 'exportEmbeddedActionItem',
        icon: 'fas fa-magic',
        labelKey: 'EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedActionItem',
        applicableItemTypes: ['actionCard'],
        contentCheck: expect.any(Function),
      });
    });

    test('should define exportEmbeddedEffects action', () => {
      // Assert
      expect(ExportActionHandler.EXPORT_ACTIONS.exportEmbeddedEffects).toEqual({
        serviceMethod: 'exportEmbeddedEffects',
        icon: 'fas fa-sparkles',
        labelKey: 'EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedEffects',
        applicableItemTypes: ['actionCard'],
        contentCheck: expect.any(Function),
      });
    });

    test('should define exportEmbeddedTransformations action', () => {
      // Assert
      expect(ExportActionHandler.EXPORT_ACTIONS.exportEmbeddedTransformations).toEqual({
        serviceMethod: 'exportEmbeddedTransformations',
        icon: 'fas fa-exchange-alt',
        labelKey: 'EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedTransformations',
        applicableItemTypes: ['actionCard'],
        contentCheck: expect.any(Function),
      });
    });

    test('should define exportAllEmbeddedItems action', () => {
      // Assert
      expect(ExportActionHandler.EXPORT_ACTIONS.exportAllEmbeddedItems).toEqual({
        serviceMethod: 'exportAllEmbeddedItems',
        icon: 'fas fa-file-export',
        labelKey: 'EVENTIDE_RP_SYSTEM.UI.ExportAllEmbeddedItems',
        applicableItemTypes: ['transformation', 'actionCard'],
        contentCheck: expect.any(Function),
      });
    });
  });

  describe('executeExport()', () => {
    test('should call appropriate service method for valid export action', async () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'transformation',
        system: {
          embeddedCombatPowers: [{ id: 'power-1' }],
        },
      };
      mockEmbeddedItemExporter.exportEmbeddedCombatPowers.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });

      // Act
      const result = await ExportActionHandler.executeExport(
        'exportEmbeddedCombatPowers',
        mockItem,
      );

      // Assert
      expect(mockEmbeddedItemExporter.exportEmbeddedCombatPowers).toHaveBeenCalledWith(
        mockItem,
      );
      expect(result).toEqual({ success: 1, failed: 0, errors: [] });
    });

    test('should return null for unknown export action key', async () => {
      // Arrange
      const mockItem = { id: 'item-1', type: 'transformation' };

      // Act
      const result = await ExportActionHandler.executeExport('unknownAction', mockItem);

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unknown export action key: unknownAction',
        { exportActionKey: 'unknownAction' },
        'EXPORT_ACTION_HANDLER',
      );
    });

    test('should return null when item type is not applicable', async () => {
      // Arrange
      const mockItem = { id: 'item-1', type: 'gear' };

      // Act
      const result = await ExportActionHandler.executeExport(
        'exportEmbeddedCombatPowers',
        mockItem,
      );

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Export action 'exportEmbeddedCombatPowers' is not applicable to item type 'gear'",
        { exportActionKey: 'exportEmbeddedCombatPowers', itemType: 'gear' },
        'EXPORT_ACTION_HANDLER',
      );
    });

    test('should return null when service method throws error', async () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'transformation',
        system: {
          embeddedCombatPowers: [{ id: 'power-1' }],
        },
      };
      mockEmbeddedItemExporter.exportEmbeddedCombatPowers.mockRejectedValue(
        new Error('Export failed'),
      );

      // Act
      const result = await ExportActionHandler.executeExport(
        'exportEmbeddedCombatPowers',
        mockItem,
      );

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to execute export action 'exportEmbeddedCombatPowers'",
        { error: expect.any(Error), itemId: 'item-1' },
        'EXPORT_ACTION_HANDLER',
      );
    });

    test('should log debug message on successful export', async () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'transformation',
        system: {
          embeddedCombatPowers: [{ id: 'power-1' }],
        },
      };
      const mockResult = { success: 1, failed: 0, errors: [] };
      mockEmbeddedItemExporter.exportEmbeddedCombatPowers.mockResolvedValue(mockResult);

      // Act
      await ExportActionHandler.executeExport('exportEmbeddedCombatPowers', mockItem);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Export action 'exportEmbeddedCombatPowers' completed",
        { results: mockResult, itemId: 'item-1' },
        'EXPORT_ACTION_HANDLER',
      );
    });

    test('should handle exportEmbeddedActionCards action', async () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'transformation',
        system: {
          embeddedActionCards: [{ id: 'card-1' }],
        },
      };
      mockEmbeddedItemExporter.exportEmbeddedActionCards.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });

      // Act
      const result = await ExportActionHandler.executeExport(
        'exportEmbeddedActionCards',
        mockItem,
      );

      // Assert
      expect(mockEmbeddedItemExporter.exportEmbeddedActionCards).toHaveBeenCalledWith(
        mockItem,
      );
      expect(result).toEqual({ success: 1, failed: 0, errors: [] });
    });

    test('should handle exportEmbeddedActionItem action', async () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'actionCard',
        getEmbeddedItem: vi.fn(() => ({ id: 'embedded-1' })),
      };
      mockEmbeddedItemExporter.exportEmbeddedActionItem.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });

      // Act
      const result = await ExportActionHandler.executeExport(
        'exportEmbeddedActionItem',
        mockItem,
      );

      // Assert
      expect(mockEmbeddedItemExporter.exportEmbeddedActionItem).toHaveBeenCalledWith(
        mockItem,
      );
      expect(result).toEqual({ success: 1, failed: 0, errors: [] });
    });

    test('should handle exportEmbeddedEffects action', async () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'actionCard',
        getEmbeddedEffects: vi.fn(() => [{ id: 'effect-1' }]),
      };
      mockEmbeddedItemExporter.exportEmbeddedEffects.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });

      // Act
      const result = await ExportActionHandler.executeExport(
        'exportEmbeddedEffects',
        mockItem,
      );

      // Assert
      expect(mockEmbeddedItemExporter.exportEmbeddedEffects).toHaveBeenCalledWith(
        mockItem,
      );
      expect(result).toEqual({ success: 1, failed: 0, errors: [] });
    });

    test('should handle exportEmbeddedTransformations action', async () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'actionCard',
        system: {
          embeddedTransformations: [{ id: 'trans-1' }],
        },
      };
      mockEmbeddedItemExporter.exportEmbeddedTransformations.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });

      // Act
      const result = await ExportActionHandler.executeExport(
        'exportEmbeddedTransformations',
        mockItem,
      );

      // Assert
      expect(mockEmbeddedItemExporter.exportEmbeddedTransformations).toHaveBeenCalledWith(
        mockItem,
      );
      expect(result).toEqual({ success: 1, failed: 0, errors: [] });
    });

    test('should handle exportAllEmbeddedItems action', async () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'transformation',
        system: {
          embeddedCombatPowers: [{ id: 'power-1' }],
        },
      };
      mockEmbeddedItemExporter.exportAllEmbeddedItems.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });

      // Act
      const result = await ExportActionHandler.executeExport(
        'exportAllEmbeddedItems',
        mockItem,
      );

      // Assert
      expect(mockEmbeddedItemExporter.exportAllEmbeddedItems).toHaveBeenCalledWith(
        mockItem,
      );
      expect(result).toEqual({ success: 1, failed: 0, errors: [] });
    });
  });

  describe('getHeaderControls()', () => {
    test('should return empty array for non-GM users', () => {
      // Arrange
      mockGame.user.isGM = false;
      const mockItem = { id: 'item-1', type: 'transformation' };

      // Act
      const controls = ExportActionHandler.getHeaderControls(mockItem);

      // Assert
      expect(controls).toEqual([]);
    });

    test('should return controls for applicable export actions', () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'transformation',
        system: {
          embeddedCombatPowers: [{ id: 'power-1' }],
          embeddedActionCards: [{ id: 'card-1' }],
        },
      };

      // Act
      const controls = ExportActionHandler.getHeaderControls(mockItem);

      // Assert
      expect(controls).toHaveLength(3); // combatPowers, actionCards, allEmbeddedItems
      expect(controls[0]).toEqual({
        action: 'exportEmbeddedCombatPowers',
        icon: 'fas fa-swords',
        label: 'EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedCombatPowers',
        ownership: 2,
      });
    });

    test('should filter out actions that fail content check', () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'transformation',
        system: {
          embeddedCombatPowers: [],
          embeddedActionCards: [],
        },
      };

      // Act
      const controls = ExportActionHandler.getHeaderControls(mockItem);

      // Assert
      expect(controls).toHaveLength(0);
    });

    test('should return controls for actionCard type', () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'actionCard',
        getEmbeddedItem: vi.fn(() => ({ id: 'embedded-1' })),
        getEmbeddedEffects: vi.fn(() => [{ id: 'effect-1' }]),
        system: {
          embeddedTransformations: [{ id: 'trans-1' }],
        },
      };

      // Act
      const controls = ExportActionHandler.getHeaderControls(mockItem);

      // Assert
      expect(controls).toHaveLength(4); // actionItem, effects, transformations, allEmbeddedItems
    });

    test('should localize control labels', () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'transformation',
        system: {
          embeddedCombatPowers: [{ id: 'power-1' }],
        },
      };
      mockGame.i18n.localize.mockImplementation((key) => `Localized: ${key}`);

      // Act
      const controls = ExportActionHandler.getHeaderControls(mockItem);

      // Assert
      expect(controls[0].label).toBe(
        'Localized: EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedCombatPowers',
      );
    });

    test('should set ownership to 2 (GM only) for all controls', () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'transformation',
        system: {
          embeddedCombatPowers: [{ id: 'power-1' }],
        },
      };

      // Act
      const controls = ExportActionHandler.getHeaderControls(mockItem);

      // Assert
      controls.forEach((control) => {
        expect(control.ownership).toBe(2);
      });
    });

    test('should include exportAllEmbeddedItems when transformation has content', () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'transformation',
        system: {
          embeddedCombatPowers: [{ id: 'power-1' }],
          embeddedActionCards: [],
        },
      };

      // Act
      const controls = ExportActionHandler.getHeaderControls(mockItem);

      // Assert
      const allItemsControl = controls.find((c) => c.action === 'exportAllEmbeddedItems');
      expect(allItemsControl).toBeDefined();
    });

    test('should include exportAllEmbeddedItems when actionCard has content', () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        type: 'actionCard',
        getEmbeddedItem: vi.fn(() => ({ id: 'embedded-1' })),
        getEmbeddedEffects: vi.fn(() => []),
        system: {
          embeddedTransformations: [],
        },
      };

      // Act
      const controls = ExportActionHandler.getHeaderControls(mockItem);

      // Assert
      const allItemsControl = controls.find((c) => c.action === 'exportAllEmbeddedItems');
      expect(allItemsControl).toBeDefined();
    });

    test('should handle null game.user gracefully', () => {
      // Arrange
      mockGame.user = null;
      const mockItem = { id: 'item-1', type: 'transformation' };

      // Act
      const controls = ExportActionHandler.getHeaderControls(mockItem);

      // Assert
      expect(controls).toEqual([]);
    });
  });

  describe('getApplicableExports()', () => {
    test('should return applicable exports for transformation type', () => {
      // Act
      const exports = ExportActionHandler.getApplicableExports('transformation');

      // Assert
      expect(exports).toEqual([
        'exportEmbeddedCombatPowers',
        'exportEmbeddedActionCards',
        'exportAllEmbeddedItems',
      ]);
    });

    test('should return applicable exports for actionCard type', () => {
      // Act
      const exports = ExportActionHandler.getApplicableExports('actionCard');

      // Assert
      expect(exports).toEqual([
        'exportEmbeddedActionItem',
        'exportEmbeddedEffects',
        'exportEmbeddedTransformations',
        'exportAllEmbeddedItems',
      ]);
    });

    test('should return empty array for non-applicable item type', () => {
      // Act
      const exports = ExportActionHandler.getApplicableExports('gear');

      // Assert
      expect(exports).toEqual([]);
    });

    test('should return empty array for unknown item type', () => {
      // Act
      const exports = ExportActionHandler.getApplicableExports('unknownType');

      // Assert
      expect(exports).toEqual([]);
    });
  });

  describe('contentCheck functions', () => {
    test('exportEmbeddedCombatPowers contentCheck should return true when powers exist', () => {
      // Arrange
      const config = ExportActionHandler.EXPORT_ACTIONS.exportEmbeddedCombatPowers;
      const mockItem = {
        system: {
          embeddedCombatPowers: [{ id: 'power-1' }],
        },
      };

      // Act
      const result = config.contentCheck(mockItem);

      // Assert
      expect(result).toBe(true);
    });

    test('exportEmbeddedCombatPowers contentCheck should return false when no powers', () => {
      // Arrange
      const config = ExportActionHandler.EXPORT_ACTIONS.exportEmbeddedCombatPowers;
      const mockItem = {
        system: {
          embeddedCombatPowers: [],
        },
      };

      // Act
      const result = config.contentCheck(mockItem);

      // Assert
      expect(result).toBe(false);
    });

    test('exportEmbeddedActionCards contentCheck should return true when cards exist', () => {
      // Arrange
      const config = ExportActionHandler.EXPORT_ACTIONS.exportEmbeddedActionCards;
      const mockItem = {
        system: {
          embeddedActionCards: [{ id: 'card-1' }],
        },
      };

      // Act
      const result = config.contentCheck(mockItem);

      // Assert
      expect(result).toBe(true);
    });

    test('exportEmbeddedActionItem contentCheck should return true when embedded item exists', () => {
      // Arrange
      const config = ExportActionHandler.EXPORT_ACTIONS.exportEmbeddedActionItem;
      const mockItem = {
        getEmbeddedItem: vi.fn(() => ({ id: 'embedded-1' })),
      };

      // Act
      const result = config.contentCheck(mockItem);

      // Assert
      expect(result).toBe(true);
    });

    test('exportEmbeddedEffects contentCheck should return true when effects exist', () => {
      // Arrange
      const config = ExportActionHandler.EXPORT_ACTIONS.exportEmbeddedEffects;
      const mockItem = {
        getEmbeddedEffects: vi.fn(() => [{ id: 'effect-1' }]),
      };

      // Act
      const result = config.contentCheck(mockItem);

      // Assert
      expect(result).toBe(true);
    });

    test('exportEmbeddedTransformations contentCheck should return true when transformations exist', () => {
      // Arrange
      const config = ExportActionHandler.EXPORT_ACTIONS.exportEmbeddedTransformations;
      const mockItem = {
        system: {
          embeddedTransformations: [{ id: 'trans-1' }],
        },
      };

      // Act
      const result = config.contentCheck(mockItem);

      // Assert
      expect(result).toBe(true);
    });

    test('exportAllEmbeddedItems contentCheck should return true for transformation with powers', () => {
      // Arrange
      const config = ExportActionHandler.EXPORT_ACTIONS.exportAllEmbeddedItems;
      const mockItem = {
        type: 'transformation',
        system: {
          embeddedCombatPowers: [{ id: 'power-1' }],
          embeddedActionCards: [],
        },
      };

      // Act
      const result = config.contentCheck(mockItem);

      // Assert
      expect(result).toBe(true);
    });

    test('exportAllEmbeddedItems contentCheck should return true for transformation with cards', () => {
      // Arrange
      const config = ExportActionHandler.EXPORT_ACTIONS.exportAllEmbeddedItems;
      const mockItem = {
        type: 'transformation',
        system: {
          embeddedCombatPowers: [],
          embeddedActionCards: [{ id: 'card-1' }],
        },
      };

      // Act
      const result = config.contentCheck(mockItem);

      // Assert
      expect(result).toBe(true);
    });

    test('exportAllEmbeddedItems contentCheck should return true for actionCard with embedded item', () => {
      // Arrange
      const config = ExportActionHandler.EXPORT_ACTIONS.exportAllEmbeddedItems;
      const mockItem = {
        type: 'actionCard',
        getEmbeddedItem: vi.fn(() => ({ id: 'embedded-1' })),
        getEmbeddedEffects: vi.fn(() => []),
        system: {
          embeddedTransformations: [],
        },
      };

      // Act
      const result = config.contentCheck(mockItem);

      // Assert
      expect(result).toBe(true);
    });

    test('exportAllEmbeddedItems contentCheck should return false for item with no content', () => {
      // Arrange
      const config = ExportActionHandler.EXPORT_ACTIONS.exportAllEmbeddedItems;
      const mockItem = {
        type: 'transformation',
        system: {
          embeddedCombatPowers: [],
          embeddedActionCards: [],
        },
      };

      // Act
      const result = config.contentCheck(mockItem);

      // Assert
      expect(result).toBe(false);
    });
  });
});
