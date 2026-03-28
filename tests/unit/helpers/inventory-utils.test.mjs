// @ts-nocheck
/**
 * @fileoverview Tests for InventoryUtils Helper
 *
 * Unit tests for the InventoryUtils helper which provides utility functions
 * for inventory management, gear validation, and item matching for action
 * card execution.
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

// Import the helper after setting up mocks
import { InventoryUtils } from '../../../module/helpers/inventory-utils.mjs';
import { Logger } from '../../../module/services/logger.mjs';

describe('InventoryUtils', () => {
  let mockActor;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock actor with gear items
    mockActor = global.testUtils.createMockActor({
      name: 'Test Actor',
      id: 'actor-123',
      type: 'character',
      items: [
        global.testUtils.createMockItem({
          name: 'Longsword',
          type: 'gear',
          id: 'gear-1',
          system: {
            equipped: true,
            quantity: 5,
            cost: 1
          }
        }),
        global.testUtils.createMockItem({
          name: 'Shield',
          type: 'gear',
          id: 'gear-2',
          system: {
            equipped: false,
            quantity: 3,
            cost: 2
          }
        }),
        global.testUtils.createMockItem({
          name: 'Potion',
          type: 'gear',
          id: 'gear-3',
          system: {
            equipped: true,
            quantity: 10,
            cost: 0
          }
        }),
        global.testUtils.createMockItem({
          name: 'Combat Power',
          type: 'combatPower',
          id: 'power-1'
        })
      ]
    });
  });

  describe('isGearEquipped()', () => {
    test('returns true when gear item is equipped', () => {
      // Arrange
      const itemName = 'Longsword';

      // Act
      const result = InventoryUtils.isGearEquipped(mockActor, itemName);

      // Assert
      expect(result).toBe(true);
      expect(Logger.debug).toHaveBeenCalled();
    });

    test('returns false when gear item is not equipped', () => {
      // Arrange
      const itemName = 'Shield';

      // Act
      const result = InventoryUtils.isGearEquipped(mockActor, itemName);

      // Assert
      expect(result).toBe(false);
      expect(Logger.debug).toHaveBeenCalled();
    });

    test('returns false when gear item is not found', () => {
      // Arrange
      const itemName = 'Nonexistent Item';

      // Act
      const result = InventoryUtils.isGearEquipped(mockActor, itemName);

      // Assert
      expect(result).toBe(false);
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
        expect.objectContaining({ itemName: 'Nonexistent Item' })
      );
    });

    test('returns false when actor is null', () => {
      // Act
      const result = InventoryUtils.isGearEquipped(null, 'Longsword');

      // Assert
      expect(result).toBe(false);
      expect(Logger.warn).toHaveBeenCalled();
    });

    test('returns false when actor is undefined', () => {
      // Act
      const result = InventoryUtils.isGearEquipped(undefined, 'Longsword');

      // Assert
      expect(result).toBe(false);
      expect(Logger.warn).toHaveBeenCalled();
    });

    test('returns false when itemName is null', () => {
      // Act
      const result = InventoryUtils.isGearEquipped(mockActor, null);

      // Assert
      expect(result).toBe(false);
      expect(Logger.warn).toHaveBeenCalled();
    });

    test('returns false when itemName is undefined', () => {
      // Act
      const result = InventoryUtils.isGearEquipped(mockActor, undefined);

      // Assert
      expect(result).toBe(false);
      expect(Logger.warn).toHaveBeenCalled();
    });

    test('finds correct gear item when multiple items have same name', () => {
      // Arrange - Add duplicate item with different equipped status
      const actorWithDuplicate = global.testUtils.createMockActor({
        name: 'Test Actor',
        type: 'character',
        items: [
          global.testUtils.createMockItem({
            name: 'Longsword',
            type: 'gear',
            id: 'gear-1a',
            system: { equipped: false, quantity: 2, cost: 1 }
          }),
          global.testUtils.createMockItem({
            name: 'Longsword',
            type: 'gear',
            id: 'gear-1b',
            system: { equipped: true, quantity: 5, cost: 1 }
          })
        ]
      });

      // Act - The function finds the first match, which is not equipped
      const result = InventoryUtils.isGearEquipped(actorWithDuplicate, 'Longsword');

      // Assert - Returns false based on first match
      expect(result).toBe(false);
    });

    test('returns false and logs error when actor.items.find throws an error', () => {
      // Arrange - Create actor that throws error on items.find
      const mockActorWithFindError = global.testUtils.createMockActor({
        name: 'Test Actor',
        type: 'character',
        items: {
          find: vi.fn(() => { throw new Error('Test error'); })
        }
      });

      // Act
      const result = InventoryUtils.isGearEquipped(mockActorWithFindError, 'Longsword');

      // Assert
      expect(result).toBe(false);
      expect(Logger.error).toHaveBeenCalledWith(
        'Error checking gear equipped status',
        expect.any(Error)
      );
    });

    test('logs debug information correctly', () => {
      // Act
      InventoryUtils.isGearEquipped(mockActor, 'Longsword');

      // Assert
      expect(Logger.methodEntry).toHaveBeenCalledWith(
        'InventoryUtils',
        'isGearEquipped',
        expect.objectContaining({ actorName: 'Test Actor', itemName: 'Longsword' })
      );
      expect(Logger.methodExit).toHaveBeenCalled();
    });
  });

  describe('hasSufficientQuantity()', () => {
    test('returns true when actor has sufficient quantity', () => {
      // Arrange
      const itemName = 'Longsword';
      const requiredQuantity = 3;

      // Act
      const result = InventoryUtils.hasSufficientQuantity(mockActor, itemName, requiredQuantity);

      // Assert
      expect(result).toBe(true);
      expect(Logger.debug).toHaveBeenCalled();
    });

    test('returns false when actor has insufficient quantity', () => {
      // Arrange
      const itemName = 'Longsword';
      const requiredQuantity = 10;

      // Act
      const result = InventoryUtils.hasSufficientQuantity(mockActor, itemName, requiredQuantity);

      // Assert
      expect(result).toBe(false);
    });

    test('returns true with exact quantity match', () => {
      // Arrange
      const itemName = 'Longsword';
      const requiredQuantity = 5;

      // Act
      const result = InventoryUtils.hasSufficientQuantity(mockActor, itemName, requiredQuantity);

      // Assert
      expect(result).toBe(true);
    });

    test('returns true for zero-cost item (cost: 0) when requiring 0 quantity', () => {
      // Arrange
      const itemName = 'Potion';
      const requiredQuantity = 0;

      // Act
      const result = InventoryUtils.hasSufficientQuantity(mockActor, itemName, requiredQuantity);

      // Assert
      expect(result).toBe(true);
    });

    test('uses item cost when requiredQuantity not specified', () => {
      // Arrange - Shield has cost of 2
      const itemName = 'Shield';

      // Act
      const result = InventoryUtils.hasSufficientQuantity(mockActor, itemName, null);

      // Assert - Has 3 quantity, cost is 2, so should be true
      expect(result).toBe(true);
    });

    test('returns false when gear item not found', () => {
      // Arrange
      const itemName = 'Nonexistent Item';

      // Act
      const result = InventoryUtils.hasSufficientQuantity(mockActor, itemName, 5);

      // Assert
      expect(result).toBe(false);
    });

    test('returns false when actor is null', () => {
      // Act
      const result = InventoryUtils.hasSufficientQuantity(null, 'Longsword', 5);

      // Assert
      expect(result).toBe(false);
    });

    test('returns false when itemName is null', () => {
      // Act
      const result = InventoryUtils.hasSufficientQuantity(mockActor, null, 5);

      // Assert
      expect(result).toBe(false);
    });

    test('uses custom requiredQuantity parameter when provided', () => {
      // Arrange
      const itemName = 'Shield'; // Has 3 quantity
      const requiredQuantity = 4;

      // Act
      const result = InventoryUtils.hasSufficientQuantity(mockActor, itemName, requiredQuantity);

      // Assert
      expect(result).toBe(false);
    });

    test('handles missing quantity property (treats as 0)', () => {
      // Arrange - Create item with missing quantity
      const actorWithMissingQuantity = global.testUtils.createMockActor({
        name: 'Test Actor',
        type: 'character',
        items: [
          global.testUtils.createMockItem({
            name: 'Broken Gear',
            type: 'gear',
            id: 'gear-4',
            system: { equipped: true, cost: 1 } // Missing quantity
          })
        ]
      });

      // Act
      const result = InventoryUtils.hasSufficientQuantity(actorWithMissingQuantity, 'Broken Gear', 1);

      // Assert
      expect(result).toBe(false);
    });

    test('returns false and logs error when actor.items.find throws an error', () => {
      // Arrange - Create actor that throws error on items.find
      const mockActorWithFindError = global.testUtils.createMockActor({
        name: 'Test Actor',
        type: 'character',
        items: {
          find: vi.fn(() => { throw new Error('Test error'); })
        }
      });

      // Act
      const result = InventoryUtils.hasSufficientQuantity(mockActorWithFindError, 'Longsword', 5);

      // Assert
      expect(result).toBe(false);
      expect(Logger.error).toHaveBeenCalledWith(
        'Error checking gear quantity',
        expect.any(Error)
      );
    });

    test('logs debug information correctly', () => {
      // Act
      InventoryUtils.hasSufficientQuantity(mockActor, 'Longsword', 3);

      // Assert
      expect(Logger.methodEntry).toHaveBeenCalledWith(
        'InventoryUtils',
        'hasSufficientQuantity',
        expect.objectContaining({ actorName: 'Test Actor', itemName: 'Longsword', requiredQuantity: 3 })
      );
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Quantity check result'),
        expect.anything()
      );
    });
  });

  describe('findGearByName()', () => {
    test('returns matching gear item when single match found', () => {
      // Act
      const result = InventoryUtils.findGearByName(mockActor, 'Longsword');

      // Assert
      expect(result).not.toBeNull();
      expect(result.name).toBe('Longsword');
      expect(result.id).toBe('gear-1');
    });

    test('returns null when no matching gear items found', () => {
      // Act
      const result = InventoryUtils.findGearByName(mockActor, 'Nonexistent Item');

      // Assert
      expect(result).toBeNull();
    });

    test('returns best gear item when multiple items match by name', () => {
      // Arrange - Add multiple items with same name
      const actorWithDuplicates = global.testUtils.createMockActor({
        name: 'Test Actor',
        type: 'character',
        items: [
          global.testUtils.createMockItem({
            name: 'Longsword',
            type: 'gear',
            id: 'gear-1a',
            system: { equipped: false, quantity: 2, cost: 1 }
          }),
          global.testUtils.createMockItem({
            name: 'Longsword',
            type: 'gear',
            id: 'gear-1b',
            system: { equipped: true, quantity: 5, cost: 1 }
          }),
          global.testUtils.createMockItem({
            name: 'Longsword',
            type: 'gear',
            id: 'gear-1c',
            system: { equipped: true, quantity: 3, cost: 1 }
          })
        ]
      });

      // Act
      const result = InventoryUtils.findGearByName(actorWithDuplicates, 'Longsword', 1);

      // Assert - Should return equipped item with higher quantity
      expect(result).not.toBeNull();
      expect(result.id).toBe('gear-1b');
    });

    test('prioritizes items that can fulfill cost requirement', () => {
      // Arrange
      const actorWithDuplicates = global.testUtils.createMockActor({
        name: 'Test Actor',
        type: 'character',
        items: [
          global.testUtils.createMockItem({
            name: 'Sword',
            type: 'gear',
            id: 'gear-a',
            system: { equipped: true, quantity: 2, cost: 3 }
          }),
          global.testUtils.createMockItem({
            name: 'Sword',
            type: 'gear',
            id: 'gear-b',
            system: { equipped: true, quantity: 5, cost: 3 }
          })
        ]
      });

      // Act - require 1 quantity
      const result = InventoryUtils.findGearByName(actorWithDuplicates, 'Sword', 1);

      // Assert - Both can fulfill, but gear-b has higher quantity
      expect(result.id).toBe('gear-b');
    });

    test('prioritizes equipped items over unequipped when both can fulfill', () => {
      // Arrange
      const actorWithDuplicates = global.testUtils.createMockActor({
        name: 'Test Actor',
        type: 'character',
        items: [
          global.testUtils.createMockItem({
            name: 'Sword',
            type: 'gear',
            id: 'gear-a',
            system: { equipped: false, quantity: 5, cost: 1 }
          }),
          global.testUtils.createMockItem({
            name: 'Sword',
            type: 'gear',
            id: 'gear-b',
            system: { equipped: true, quantity: 5, cost: 1 }
          })
        ]
      });

      // Act
      const result = InventoryUtils.findGearByName(actorWithDuplicates, 'Sword', 1);

      // Assert
      expect(result.id).toBe('gear-b');
    });

    test('prioritizes higher quantity items when equipped status is same', () => {
      // Arrange
      const actorWithDuplicates = global.testUtils.createMockActor({
        name: 'Test Actor',
        type: 'character',
        items: [
          global.testUtils.createMockItem({
            name: 'Sword',
            type: 'gear',
            id: 'gear-a',
            system: { equipped: true, quantity: 3, cost: 1 }
          }),
          global.testUtils.createMockItem({
            name: 'Sword',
            type: 'gear',
            id: 'gear-b',
            system: { equipped: true, quantity: 10, cost: 1 }
          })
        ]
      });

      // Act
      const result = InventoryUtils.findGearByName(actorWithDuplicates, 'Sword', 1);

      // Assert
      expect(result.id).toBe('gear-b');
    });

    test('returns null when actor is null', () => {
      // Act
      const result = InventoryUtils.findGearByName(null, 'Longsword');

      // Assert
      expect(result).toBeNull();
    });

    test('returns null when itemName is null', () => {
      // Act
      const result = InventoryUtils.findGearByName(mockActor, null);

      // Assert
      expect(result).toBeNull();
    });

    test('returns null when actor has no items', () => {
      // Arrange
      const emptyActor = global.testUtils.createMockActor({
        name: 'Empty Actor',
        type: 'character',
        items: []
      });

      // Act
      const result = InventoryUtils.findGearByName(emptyActor, 'Longsword');

      // Assert
      expect(result).toBeNull();
    });

    test('uses custom requiredQuantity parameter for prioritization', () => {
      // Arrange
      const actorWithDuplicates = global.testUtils.createMockActor({
        name: 'Test Actor',
        type: 'character',
        items: [
          global.testUtils.createMockItem({
            name: 'Sword',
            type: 'gear',
            id: 'gear-a',
            system: { equipped: true, quantity: 7, cost: 5 }
          }),
          global.testUtils.createMockItem({
            name: 'Sword',
            type: 'gear',
            id: 'gear-b',
            system: { equipped: false, quantity: 10, cost: 5 }
          })
        ]
      });

      // Act - Require 8 quantity (gear-b can fulfill, gear-a cannot)
      const result = InventoryUtils.findGearByName(actorWithDuplicates, 'Sword', 8);

      // Assert
      expect(result.id).toBe('gear-b');
    });

    test('returns null and logs error when actor.items.filter throws an error', () => {
      // Arrange - Create actor that throws error on items.filter
      const mockActorWithFilterError = global.testUtils.createMockActor({
        name: 'Test Actor',
        type: 'character',
        items: {
          filter: vi.fn(() => { throw new Error('Test error'); })
        }
      });

      // Act
      const result = InventoryUtils.findGearByName(mockActorWithFilterError, 'Longsword');

      // Assert
      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalledWith(
        'Error finding gear by name',
        expect.any(Error)
      );
    });

    test('logs debug information correctly', () => {
      // Act
      InventoryUtils.findGearByName(mockActor, 'Longsword');

      // Assert
      expect(Logger.methodEntry).toHaveBeenCalledWith(
        'InventoryUtils',
        'findGearByName',
        expect.anything()
      );
      expect(Logger.methodExit).toHaveBeenCalled();
    });
  });

  describe('validateActionCardGearRequirements()', () => {
    let mockActionCard;

    beforeEach(() => {
      mockActionCard = global.testUtils.createMockItem({
        name: 'Test Action Card',
        type: 'actionCard',
        id: 'action-1',
        getEmbeddedItem: vi.fn()
      });
    });

    test('returns isValid: true with valid embedded gear item', () => {
      // Arrange
      const mockEmbeddedGear = global.testUtils.createMockItem({
        name: 'Longsword',
        type: 'gear',
        id: 'embedded-1',
        system: { equipped: true, quantity: 5, cost: 1 }
      });
      mockActionCard.getEmbeddedItem.mockReturnValue(mockEmbeddedGear);

      // Act
      const result = InventoryUtils.validateActionCardGearRequirements(mockActor, mockActionCard);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.gearChecks).toHaveLength(1);
      expect(result.gearChecks[0].isValid).toBe(true);
    });

    test('returns isValid: false when gear item is not equipped', () => {
      // Arrange
      const mockEmbeddedGear = global.testUtils.createMockItem({
        name: 'Shield',
        type: 'gear',
        id: 'embedded-2',
        system: { equipped: false, quantity: 3, cost: 1 }
      });
      mockActionCard.getEmbeddedItem.mockReturnValue(mockEmbeddedGear);

      // Act
      const result = InventoryUtils.validateActionCardGearRequirements(mockActor, mockActionCard);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.gearChecks[0].isValid).toBe(false);
      expect(result.errors.some(e => e.includes('not equipped'))).toBe(true);
    });

    test('returns isValid: false when gear has insufficient quantity', () => {
      // Arrange
      const mockEmbeddedGear = global.testUtils.createMockItem({
        name: 'Longsword',
        type: 'gear',
        id: 'embedded-3',
        system: { equipped: true, quantity: 5, cost: 10 }
      });
      mockActionCard.getEmbeddedItem.mockReturnValue(mockEmbeddedGear);

      // Act
      const result = InventoryUtils.validateActionCardGearRequirements(mockActor, mockActionCard);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.gearChecks[0].isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Insufficient quantity'))).toBe(true);
    });

    test('returns isValid: true when no embedded item exists', () => {
      // Arrange
      mockActionCard.getEmbeddedItem.mockReturnValue(null);

      // Act
      const result = InventoryUtils.validateActionCardGearRequirements(mockActor, mockActionCard);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.gearChecks).toHaveLength(0);
    });

    test('returns isValid: true when embedded item is not gear type', () => {
      // Arrange
      const mockEmbeddedPower = global.testUtils.createMockItem({
        name: 'Test Power',
        type: 'combatPower',
        id: 'embedded-power'
      });
      mockActionCard.getEmbeddedItem.mockReturnValue(mockEmbeddedPower);

      // Act
      const result = InventoryUtils.validateActionCardGearRequirements(mockActor, mockActionCard);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.gearChecks).toHaveLength(0);
    });

    test('returns isValid: false when actor is null', () => {
      // Act
      const result = InventoryUtils.validateActionCardGearRequirements(null, mockActionCard);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid actor or action card provided');
    });

    test('returns isValid: false when actionCard is null', () => {
      // Act
      const result = InventoryUtils.validateActionCardGearRequirements(mockActor, null);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid actor or action card provided');
    });

    test('returns gearChecks array with validation details', () => {
      // Arrange
      const mockEmbeddedGear = global.testUtils.createMockItem({
        name: 'Longsword',
        type: 'gear',
        id: 'embedded-1',
        system: { equipped: true, quantity: 5, cost: 1 }
      });
      mockActionCard.getEmbeddedItem.mockReturnValue(mockEmbeddedGear);

      // Act
      const result = InventoryUtils.validateActionCardGearRequirements(mockActor, mockActionCard);

      // Assert
      expect(result.gearChecks).toHaveLength(1);
      expect(result.gearChecks[0]).toHaveProperty('itemName');
      expect(result.gearChecks[0]).toHaveProperty('itemId');
      expect(result.gearChecks[0]).toHaveProperty('isValid');
      expect(result.gearChecks[0]).toHaveProperty('errors');
      expect(result.gearChecks[0].itemName).toBe('Longsword');
    });

    test('logs debug information correctly', () => {
      // Arrange
      mockActionCard.getEmbeddedItem.mockReturnValue(null);

      // Act
      InventoryUtils.validateActionCardGearRequirements(mockActor, mockActionCard);

      // Assert
      expect(Logger.methodEntry).toHaveBeenCalledWith(
        'InventoryUtils',
        'validateActionCardGearRequirements',
        expect.anything()
      );
      expect(Logger.debug).toHaveBeenCalled();
    });

    test('returns isValid: false with error when an exception occurs', () => {
      // Arrange - Mock action card that throws error during validation
      const mockEmbeddedGear = global.testUtils.createMockItem({
        name: 'Trouble Gear',
        type: 'gear',
        id: 'embedded-trouble',
        system: { equipped: true, quantity: 5, cost: 1 }
      });
      mockActionCard.getEmbeddedItem.mockReturnValue(mockEmbeddedGear);

      // Mock findGearByName to throw an error
      vi.spyOn(InventoryUtils, 'findGearByName').mockImplementation(() => {
        throw new Error('Find gear error');
      });

      // Act
      const result = InventoryUtils.validateActionCardGearRequirements(mockActor, mockActionCard);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Validation error'))).toBe(true);

      // Cleanup
      vi.restoreAllMocks();
    });

    test('logs debug message for zero-cost gear items', () => {
      // Arrange - Use existing Potion item which has cost: 0
      const mockEmbeddedGear = global.testUtils.createMockItem({
        name: 'Potion',
        type: 'gear',
        id: 'embedded-free',
        system: { equipped: true, quantity: 10, cost: 0 }
      });
      mockActionCard.getEmbeddedItem.mockReturnValue(mockEmbeddedGear);

      // Act
      const result = InventoryUtils.validateActionCardGearRequirements(mockActor, mockActionCard);

      // Assert
      expect(result.isValid).toBe(true);
      expect(Logger.debug).toHaveBeenCalledWith(
        'Zero-cost gear item detected: Potion',
        expect.objectContaining({ itemName: 'Potion', cost: 0 })
      );
    });

    test('returns error when embedded gear is not in actor inventory', () => {
      // Arrange
      const mockEmbeddedGear = global.testUtils.createMockItem({
        name: 'Missing Gear',
        type: 'gear',
        id: 'embedded-missing',
        system: { equipped: true, quantity: 5, cost: 1 }
      });
      mockActionCard.getEmbeddedItem.mockReturnValue(mockEmbeddedGear);

      // Act
      const result = InventoryUtils.validateActionCardGearRequirements(mockActor, mockActionCard);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.gearChecks).toHaveLength(1);
      expect(result.gearChecks[0].isValid).toBe(false);
      expect(result.gearChecks[0].errors.some(e => e.includes('not found in inventory'))).toBe(true);
    });

    test('logs error and returns validation error when gear validation throws exception', () => {
      // Arrange
      const mockEmbeddedGear = global.testUtils.createMockItem({
        name: 'Trouble Gear',
        type: 'gear',
        id: 'embedded-trouble',
        system: { equipped: true, quantity: 5, cost: 1 }
      });
      mockActionCard.getEmbeddedItem.mockReturnValue(mockEmbeddedGear);

      // Mock findGearByName to throw an error
      vi.spyOn(InventoryUtils, 'findGearByName').mockImplementation(() => {
        throw new Error('Find gear error');
      });

      // Act
      const result = InventoryUtils.validateActionCardGearRequirements(mockActor, mockActionCard);

      // Assert
      expect(result.isValid).toBe(false);
      expect(Logger.error).toHaveBeenCalledWith(
        'Error validating gear item Trouble Gear',
        expect.any(Error)
      );

      // Cleanup
      vi.restoreAllMocks();
    });
  });

  describe('getGearStatus()', () => {
    test('returns complete status object for existing gear item', () => {
      // Act
      const result = InventoryUtils.getGearStatus(mockActor, 'Longsword');

      // Assert
      expect(result.exists).toBe(true);
      expect(result.equipped).toBe(true);
      expect(result.quantity).toBe(5);
      expect(result.cost).toBe(1);
      expect(result.canUse).toBe(true);
      expect(result.item).not.toBeNull();
      expect(result.item.name).toBe('Longsword');
    });

    test('returns status with exists: false when gear not found', () => {
      // Act
      const result = InventoryUtils.getGearStatus(mockActor, 'Nonexistent Item');

      // Assert
      expect(result.exists).toBe(false);
      expect(result.equipped).toBe(false);
      expect(result.quantity).toBe(0);
      expect(result.cost).toBe(0);
      expect(result.canUse).toBe(false);
      expect(result.item).toBeNull();
    });

    test('returns default status object when actor is null', () => {
      // Act
      const result = InventoryUtils.getGearStatus(null, 'Longsword');

      // Assert
      expect(result.exists).toBe(false);
      expect(result.equipped).toBe(false);
      expect(result.quantity).toBe(0);
      expect(result.cost).toBe(0);
      expect(result.canUse).toBe(false);
      expect(result.item).toBeNull();
    });

    test('returns default status object when itemName is null', () => {
      // Act
      const result = InventoryUtils.getGearStatus(mockActor, null);

      // Assert
      expect(result.exists).toBe(false);
      expect(result.equipped).toBe(false);
      expect(result.quantity).toBe(0);
      expect(result.cost).toBe(0);
      expect(result.canUse).toBe(false);
      expect(result.item).toBeNull();
    });

    test('verifies canUse is true when equipped and sufficient quantity', () => {
      // Act
      const result = InventoryUtils.getGearStatus(mockActor, 'Longsword');

      // Assert - Has 5 quantity, cost is 1, equipped is true
      expect(result.canUse).toBe(true);
      expect(result.equipped).toBe(true);
      expect(result.quantity).toBeGreaterThanOrEqual(result.cost);
    });

    test('verifies canUse is false when not equipped', () => {
      // Act
      const result = InventoryUtils.getGearStatus(mockActor, 'Shield');

      // Assert - Shield has quantity 3, cost 2, but equipped is false
      expect(result.canUse).toBe(false);
      expect(result.equipped).toBe(false);
    });

    test('verifies canUse is false when insufficient quantity', () => {
      // Arrange - Modify actor's sword to have insufficient quantity
      const modifiedActor = global.testUtils.createMockActor({
        name: 'Test Actor',
        type: 'character',
        items: [
          global.testUtils.createMockItem({
            name: 'Longsword',
            type: 'gear',
            id: 'gear-1',
            system: { equipped: true, quantity: 1, cost: 5 }
          })
        ]
      });

      // Act
      const result = InventoryUtils.getGearStatus(modifiedActor, 'Longsword');

      // Assert
      expect(result.canUse).toBe(false);
      expect(result.equipped).toBe(true);
      expect(result.quantity).toBeLessThan(result.cost);
    });

    test('returns item reference in status', () => {
      // Act
      const result = InventoryUtils.getGearStatus(mockActor, 'Longsword');

      // Assert
      expect(result.item).not.toBeNull();
      expect(result.item.name).toBe('Longsword');
      expect(result.item.id).toBe('gear-1');
      expect(result.item.type).toBe('gear');
    });

    test('logs debug information correctly', () => {
      // Act
      InventoryUtils.getGearStatus(mockActor, 'Longsword');

      // Assert
      expect(Logger.methodEntry).toHaveBeenCalledWith(
        'InventoryUtils',
        'getGearStatus',
        expect.anything()
      );
      expect(Logger.debug).toHaveBeenCalled();
      expect(Logger.methodExit).toHaveBeenCalled();
    });

    test('returns default status object when findGearByName throws an error', () => {
      // Arrange - Mock findGearByName to throw an error
      vi.spyOn(InventoryUtils, 'findGearByName').mockImplementation(() => {
        throw new Error('Find gear error');
      });

      // Act
      const result = InventoryUtils.getGearStatus(mockActor, 'Longsword');

      // Assert - Should return default status object
      expect(result.exists).toBe(false);
      expect(result.equipped).toBe(false);
      expect(result.quantity).toBe(0);
      expect(result.cost).toBe(0);
      expect(result.canUse).toBe(false);
      expect(result.item).toBeNull();
      expect(Logger.error).toHaveBeenCalledWith(
        'Error getting gear status',
        expect.any(Error)
      );

      // Cleanup
      vi.restoreAllMocks();
    });
  });
});