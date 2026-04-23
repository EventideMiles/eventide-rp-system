// @ts-nocheck
/**
 * @fileoverview ResourceValidator Service Tests
 *
 * Unit tests for the ResourceValidator service which handles
 * resource validation for embedded items (power for combatPowers,
 * quantity for gear) before action card execution.
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

vi.mock('../../../module/helpers/_module.mjs', () => ({
  InventoryUtils: {
    findGearByName: vi.fn()
  }
}));

vi.mock('../../../module/services/chat-message-builder.mjs', () => ({
  ChatMessageBuilder: {
    sendResourceFailureMessage: vi.fn()
  }
}));

// Import the service after setting up mocks
import { ResourceValidator } from '../../../module/services/resource-validator.mjs';
import { Logger } from '../../../module/services/logger.mjs';
import { InventoryUtils } from '../../../module/helpers/_module.mjs';
import { ChatMessageBuilder } from '../../../module/services/chat-message-builder.mjs';

describe('ResourceValidator', () => {
  let mockActor;
  let mockEmbeddedItem;
  let mockGearItem;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock actor
    mockActor = {
      id: 'actor-123',
      name: 'Test Actor',
      system: {
        power: {
          value: 10
        }
      }
    };

    // Create mock embedded combat power
    mockEmbeddedItem = {
      id: 'embedded-123',
      name: 'Test Power',
      type: 'combatPower',
      system: {
        cost: 3
      }
    };

    // Create mock gear item in inventory
    mockGearItem = {
      id: 'gear-123',
      name: 'Test Gear',
      type: 'gear',
      system: {
        quantity: 5
      }
    };
  });

  describe('checkEmbeddedItemResources()', () => {
    describe('when embeddedItem is null', () => {
      test('should return canExecute false with noEmbeddedItem reason', () => {
        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          null,
          mockActor
        );

        // Assert
        expect(result).toEqual({
          canExecute: false,
          reason: 'noEmbeddedItem'
        });
      });
    });

    describe('for combatPower type', () => {
      test('should return canExecute true when power is sufficient', () => {
        // Arrange
        mockActor.system.power.value = 10;
        mockEmbeddedItem.system.cost = 3;

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(result).toEqual({ canExecute: true });
      });

      test('should return canExecute true when power equals cost', () => {
        // Arrange
        mockActor.system.power.value = 5;
        mockEmbeddedItem.system.cost = 5;

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(result).toEqual({ canExecute: true });
      });

      test('should return canExecute false when power is insufficient', () => {
        // Arrange
        mockActor.system.power.value = 2;
        mockEmbeddedItem.system.cost = 5;

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(result).toEqual({
          canExecute: false,
          reason: 'insufficientPower',
          required: 5,
          available: 2
        });
      });

      test('should handle zero power cost', () => {
        // Arrange
        mockActor.system.power.value = 0;
        mockEmbeddedItem.system.cost = 0;

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(result).toEqual({ canExecute: true });
      });

      test('should handle missing power value on actor', () => {
        // Arrange
        mockActor.system.power = undefined;
        mockEmbeddedItem.system.cost = 3;

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(result).toEqual({
          canExecute: false,
          reason: 'insufficientPower',
          required: 3,
          available: 0
        });
      });

      test('should skip cost check when shouldConsumeCost is false', () => {
        // Arrange
        mockActor.system.power.value = 0;
        mockEmbeddedItem.system.cost = 5;

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor,
          false
        );

        // Assert
        expect(result).toEqual({ canExecute: true });
      });
    });

    describe('for gear type', () => {
      beforeEach(() => {
        mockEmbeddedItem = {
          id: 'embedded-123',
          name: 'Test Gear',
          type: 'gear',
          system: {
            cost: 2
          }
        };
      });

      test('should return canExecute true when quantity is sufficient', () => {
        // Arrange
        InventoryUtils.findGearByName.mockReturnValue(mockGearItem);

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(result).toEqual({ canExecute: true });
        expect(InventoryUtils.findGearByName).toHaveBeenCalledWith(
          mockActor,
          'Test Gear',
          2
        );
      });

      test('should return canExecute true when quantity equals cost', () => {
        // Arrange
        mockGearItem.system.quantity = 2;
        mockEmbeddedItem.system.cost = 2;
        InventoryUtils.findGearByName.mockReturnValue(mockGearItem);

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(result).toEqual({ canExecute: true });
      });

      test('should return canExecute false when gear not found in inventory', () => {
        // Arrange
        InventoryUtils.findGearByName.mockReturnValue(null);

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(result).toEqual({
          canExecute: false,
          reason: 'noGearInInventory',
          required: 2,
          available: 0
        });
        expect(Logger.warn).toHaveBeenCalledWith(
          'ResourceValidator.checkEmbeddedItemResources - Gear not found in inventory',
          expect.objectContaining({
            embeddedItemName: 'Test Gear',
            gearCost: 2
          })
        );
      });

      test('should return canExecute false when quantity is insufficient', () => {
        // Arrange
        mockGearItem.system.quantity = 1;
        mockEmbeddedItem.system.cost = 2;
        InventoryUtils.findGearByName.mockReturnValue(mockGearItem);

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(result).toEqual({
          canExecute: false,
          reason: 'insufficientQuantity',
          required: 2,
          available: 1
        });
        expect(Logger.warn).toHaveBeenCalledWith(
          'ResourceValidator.checkEmbeddedItemResources - Insufficient quantity',
          expect.objectContaining({
            gearCost: 2,
            currentQuantity: 1,
            embeddedItemName: 'Test Gear'
          })
        );
      });

      test('should handle zero gear cost', () => {
        // Arrange
        mockGearItem.system.quantity = 0;
        mockEmbeddedItem.system.cost = 0;
        InventoryUtils.findGearByName.mockReturnValue(mockGearItem);

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(result).toEqual({ canExecute: true });
      });

      test('should skip cost check when shouldConsumeCost is false', () => {
        // Arrange
        mockGearItem.system.quantity = 0;
        mockEmbeddedItem.system.cost = 5;
        InventoryUtils.findGearByName.mockReturnValue(mockGearItem);

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor,
          false
        );

        // Assert
        expect(result).toEqual({ canExecute: true });
      });

      test('should handle missing quantity on gear item', () => {
        // Arrange
        mockGearItem.system.quantity = undefined;
        mockEmbeddedItem.system.cost = 2;
        InventoryUtils.findGearByName.mockReturnValue(mockGearItem);

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(result).toEqual({
          canExecute: false,
          reason: 'insufficientQuantity',
          required: 2,
          available: 0
        });
      });

      test('should log debug information for gear check', () => {
        // Arrange
        InventoryUtils.findGearByName.mockReturnValue(mockGearItem);

        // Act
        ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(Logger.debug).toHaveBeenCalledWith(
          'ResourceValidator.checkEmbeddedItemResources - Gear check',
          expect.objectContaining({
            embeddedItemName: 'Test Gear',
            embeddedItemType: 'gear',
            embeddedItemCost: 2,
            gearCost: 2,
            shouldConsumeCost: true,
            actorName: 'Test Actor'
          })
        );
      });

      test('should log debug information for found gear', () => {
        // Arrange
        InventoryUtils.findGearByName.mockReturnValue(mockGearItem);

        // Act
        ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(Logger.debug).toHaveBeenCalledWith(
          'ResourceValidator.checkEmbeddedItemResources - Found gear',
          expect.objectContaining({
            found: true,
            actualGearItemId: 'gear-123',
            actualGearItemName: 'Test Gear',
            actualGearItemQuantity: 5
          })
        );
      });

      test('should log debug information for quantity check', () => {
        // Arrange
        InventoryUtils.findGearByName.mockReturnValue(mockGearItem);

        // Act
        ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(Logger.debug).toHaveBeenCalledWith(
          'ResourceValidator.checkEmbeddedItemResources - Quantity check',
          expect.objectContaining({
            gearCost: 2,
            currentQuantity: 5,
            canFulfill: true
          })
        );
      });
    });

    describe('for other item types', () => {
      test('should return canExecute true for non-resource consuming items', () => {
        // Arrange
        mockEmbeddedItem = {
          id: 'embedded-123',
          name: 'Test Feature',
          type: 'feature',
          system: {}
        };

        // Act
        const result = ResourceValidator.checkEmbeddedItemResources(
          mockEmbeddedItem,
          mockActor
        );

        // Assert
        expect(result).toEqual({ canExecute: true });
      });
    });
  });

  describe('sendResourceFailureMessage()', () => {
    test('should delegate to ChatMessageBuilder', async () => {
      // Arrange
      const options = {
        actor: mockActor,
        resourceCheck: { canExecute: false, reason: 'insufficientPower' },
        embeddedItem: mockEmbeddedItem,
        repetitionIndex: 0,
        repetitionCount: 3,
        cardData: {
          name: 'Test Card',
          img: 'test.png',
          textColor: '#ffffff',
          bgColor: '#000000',
          rollActorName: true
        }
      };

      // Act
      await ResourceValidator.sendResourceFailureMessage(options);

      // Assert
      expect(ChatMessageBuilder.sendResourceFailureMessage).toHaveBeenCalledWith(options);
    });
  });
});
