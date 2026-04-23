// @ts-nocheck
/**
 * @fileoverview Tests for PermissionValidator service
 *
 * Tests the centralized permission validation for item sheet actions.
 */

import { PermissionValidator } from '../../../module/services/permission-validator.mjs';
import { Logger } from '../../../module/services/logger.mjs';

// Mock Logger
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('PermissionValidator', () => {
  let mockItem;
  let mockUser;
  let mockGame;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock user
    mockUser = {
      id: 'user1',
      name: 'TestUser',
      isGM: false,
    };

    // Setup mock game
    mockGame = {
      user: mockUser,
    };

    // Assign to global
    global.game = mockGame;

    // Setup mock item
    mockItem = {
      id: 'item1',
      name: 'Test Item',
      type: 'actionCard',
      isOwner: false,
      canUserModify: vi.fn(() => false),
      getUserLevel: vi.fn(() => 1),
    };
  });

  describe('checkItemPermission()', () => {
    test('should return false and NullItem error for null item', () => {
      const result = PermissionValidator.checkItemPermission(null, {
        actionName: 'Test Action',
      });

      expect(result.hasPermission).toBe(false);
      expect(result.errorKey).toBe('ERPS.Errors.NullItem');
      expect(Logger.warn).toHaveBeenCalledWith(
        'Test Action called with null or undefined item',
        {},
        'PERMISSION',
      );
    });

    test('should return false and NullItem error for undefined item', () => {
      const result = PermissionValidator.checkItemPermission(undefined, {
        actionName: 'Delete Action',
      });

      expect(result.hasPermission).toBe(false);
      expect(result.errorKey).toBe('ERPS.Errors.NullItem');
      expect(Logger.warn).toHaveBeenCalledWith(
        'Delete Action called with null or undefined item',
        {},
        'PERMISSION',
      );
    });

    test('should return true for owner of the item', () => {
      mockItem.isOwner = true;

      const result = PermissionValidator.checkItemPermission(mockItem);

      expect(result.hasPermission).toBe(true);
      expect(result.errorKey).toBeNull();
      expect(Logger.warn).not.toHaveBeenCalled();
    });

    test('should return true for GM user', () => {
      mockUser.isGM = true;
      mockItem.isOwner = false;
      mockItem.canUserModify.mockReturnValue(false);

      const result = PermissionValidator.checkItemPermission(mockItem);

      expect(result.hasPermission).toBe(true);
      expect(result.errorKey).toBeNull();
      expect(Logger.warn).not.toHaveBeenCalled();
    });

    test('should return true when canUserModify returns true', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(true);

      const result = PermissionValidator.checkItemPermission(mockItem, {
        permissionType: 'update',
      });

      expect(result.hasPermission).toBe(true);
      expect(result.errorKey).toBeNull();
      expect(mockItem.canUserModify).toHaveBeenCalledWith(mockUser, 'update');
      expect(Logger.warn).not.toHaveBeenCalled();
    });

    test('should return false when user lacks all permissions', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(false);

      const result = PermissionValidator.checkItemPermission(mockItem, {
        actionName: 'Update Item',
      });

      expect(result.hasPermission).toBe(false);
      expect(result.errorKey).toBe('ERPS.Errors.PermissionDenied');
      expect(Logger.warn).toHaveBeenCalledWith(
        'Permission denied for Update Item',
        { item: mockItem.name, itemType: mockItem.type, user: mockUser.name },
        'PERMISSION',
      );
    });

    test('should use default permissionType of update', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(true);

      PermissionValidator.checkItemPermission(mockItem);

      expect(mockItem.canUserModify).toHaveBeenCalledWith(mockUser, 'update');
    });

    test('should use custom permissionType when provided', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(true);

      PermissionValidator.checkItemPermission(mockItem, {
        permissionType: 'delete',
      });

      expect(mockItem.canUserModify).toHaveBeenCalledWith(mockUser, 'delete');
    });

    test('should use default actionName when not provided', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(false);

      PermissionValidator.checkItemPermission(mockItem);

      expect(Logger.warn).toHaveBeenCalledWith(
        'Permission denied for Permission check',
        { item: mockItem.name, itemType: mockItem.type, user: mockUser.name },
        'PERMISSION',
      );
    });
  });

  describe('validateItemType()', () => {
    test('should return false and NullItem error for null item', () => {
      const result = PermissionValidator.validateItemType(
        null,
        'actionCard',
        'Test Action',
      );

      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe('ERPS.Errors.NullItem');
      expect(Logger.warn).toHaveBeenCalledWith(
        'Test Action called with null or undefined item',
        {},
        'VALIDATION',
      );
    });

    test('should return false and NullItem error for undefined item', () => {
      const result = PermissionValidator.validateItemType(
        undefined,
        'transformation',
        'Transform Item',
      );

      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe('ERPS.Errors.NullItem');
      expect(Logger.warn).toHaveBeenCalledWith(
        'Transform Item called with null or undefined item',
        {},
        'VALIDATION',
      );
    });

    test('should return true for matching item type', () => {
      mockItem.type = 'actionCard';

      const result = PermissionValidator.validateItemType(
        mockItem,
        'actionCard',
        'Execute Action',
      );

      expect(result.isValid).toBe(true);
      expect(result.errorKey).toBeNull();
      expect(Logger.warn).not.toHaveBeenCalled();
    });

    test('should return false and InvalidItemType for mismatched type', () => {
      mockItem.type = 'transformation';

      const result = PermissionValidator.validateItemType(
        mockItem,
        'actionCard',
        'Execute Action',
      );

      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe('ERPS.Errors.InvalidItemType');
      expect(Logger.warn).toHaveBeenCalledWith(
        'Execute Action called on wrong item type',
        { expectedType: 'actionCard', actualType: 'transformation', itemName: mockItem.name },
        'VALIDATION',
      );
    });

    test('should validate transformation type correctly', () => {
      mockItem.type = 'transformation';

      const result = PermissionValidator.validateItemType(
        mockItem,
        'transformation',
        'Apply Transformation',
      );

      expect(result.isValid).toBe(true);
      expect(result.errorKey).toBeNull();
      expect(Logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('checkPermissionAndType()', () => {
    test('should return false with NullItem error when item is null', () => {
      const result = PermissionValidator.checkPermissionAndType(
        null,
        'actionCard',
        'Test Action',
      );

      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe('ERPS.Errors.NullItem');
    });

    test('should return false with PermissionDenied when permission fails', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(false);
      mockItem.type = 'actionCard';

      const result = PermissionValidator.checkPermissionAndType(
        mockItem,
        'actionCard',
        'Execute Action',
      );

      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe('ERPS.Errors.PermissionDenied');
    });

    test('should return false with InvalidItemType when type mismatches', () => {
      mockItem.isOwner = true;
      mockItem.type = 'transformation';

      const result = PermissionValidator.checkPermissionAndType(
        mockItem,
        'actionCard',
        'Execute Action',
      );

      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe('ERPS.Errors.InvalidItemType');
    });

    test('should return true when both permission and type are valid', () => {
      mockItem.isOwner = true;
      mockItem.type = 'actionCard';

      const result = PermissionValidator.checkPermissionAndType(
        mockItem,
        'actionCard',
        'Execute Action',
      );

      expect(result.isValid).toBe(true);
      expect(result.errorKey).toBeNull();
    });

    test('should check permission before type validation', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(false);
      mockItem.type = 'wrongType';

      const result = PermissionValidator.checkPermissionAndType(
        mockItem,
        'actionCard',
        'Test Action',
      );

      // Permission check fails first, should return PermissionDenied not InvalidItemType
      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe('ERPS.Errors.PermissionDenied');
    });

    test('should pass custom options to checkItemPermission', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(false);
      mockItem.type = 'actionCard';

      PermissionValidator.checkPermissionAndType(
        mockItem,
        'actionCard',
        'Delete Action',
        { permissionType: 'delete' },
      );

      expect(mockItem.canUserModify).toHaveBeenCalledWith(mockUser, 'delete');
    });

    test('should use default permissionType when not provided', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(false);
      mockItem.type = 'actionCard';

      PermissionValidator.checkPermissionAndType(
        mockItem,
        'actionCard',
        'Update Action',
      );

      expect(mockItem.canUserModify).toHaveBeenCalledWith(mockUser, 'update');
    });
  });

  describe('hasElevatedPermission()', () => {
    test('should return false for null item', () => {
      const result = PermissionValidator.hasElevatedPermission(null);

      expect(result).toBe(false);
    });

    test('should return false for undefined item', () => {
      const result = PermissionValidator.hasElevatedPermission(undefined);

      expect(result).toBe(false);
    });

    test('should return true for owner of the item', () => {
      mockItem.isOwner = true;
      mockUser.isGM = false;
      mockItem.getUserLevel.mockReturnValue(0);

      const result = PermissionValidator.hasElevatedPermission(mockItem);

      expect(result).toBe(true);
      expect(mockItem.getUserLevel).not.toHaveBeenCalled();
    });

    test('should return true for GM user', () => {
      mockItem.isOwner = false;
      mockUser.isGM = true;
      mockItem.getUserLevel.mockReturnValue(0);

      const result = PermissionValidator.hasElevatedPermission(mockItem);

      expect(result).toBe(true);
      expect(mockItem.getUserLevel).not.toHaveBeenCalled();
    });

    test('should return true when getUserLevel >= 2', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.getUserLevel.mockReturnValue(2);

      const result = PermissionValidator.hasElevatedPermission(mockItem);

      expect(result).toBe(true);
      expect(mockItem.getUserLevel).toHaveBeenCalled();
    });

    test('should return true when getUserLevel > 2', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.getUserLevel.mockReturnValue(3);

      const result = PermissionValidator.hasElevatedPermission(mockItem);

      expect(result).toBe(true);
    });

    test('should return false when user lacks elevated permission', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.getUserLevel.mockReturnValue(1);

      const result = PermissionValidator.hasElevatedPermission(mockItem);

      expect(result).toBe(false);
    });

    test('should return false when getUserLevel < 2', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.getUserLevel.mockReturnValue(0);

      const result = PermissionValidator.hasElevatedPermission(mockItem);

      expect(result).toBe(false);
    });
  });

  describe('hasPermission()', () => {
    test('should return false for null item', () => {
      const result = PermissionValidator.hasPermission(null);

      expect(result).toBe(false);
    });

    test('should return false for undefined item', () => {
      const result = PermissionValidator.hasPermission(undefined);

      expect(result).toBe(false);
    });

    test('should return true for owner of the item', () => {
      mockItem.isOwner = true;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(false);

      const result = PermissionValidator.hasPermission(mockItem);

      expect(result).toBe(true);
      expect(mockItem.canUserModify).not.toHaveBeenCalled();
    });

    test('should return true for GM user', () => {
      mockItem.isOwner = false;
      mockUser.isGM = true;
      mockItem.canUserModify.mockReturnValue(false);

      const result = PermissionValidator.hasPermission(mockItem);

      expect(result).toBe(true);
    });

    test('should return true when canUserModify returns true', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(true);

      const result = PermissionValidator.hasPermission(mockItem, 'update');

      expect(result).toBe(true);
      expect(mockItem.canUserModify).toHaveBeenCalledWith(mockUser, 'update');
    });

    test('should return false when user lacks all permissions', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(false);

      const result = PermissionValidator.hasPermission(mockItem);

      expect(result).toBe(false);
    });

    test('should use default permissionType of update', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(true);

      PermissionValidator.hasPermission(mockItem);

      expect(mockItem.canUserModify).toHaveBeenCalledWith(mockUser, 'update');
    });

    test('should use custom permissionType when provided', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(true);

      PermissionValidator.hasPermission(mockItem, 'delete');

      expect(mockItem.canUserModify).toHaveBeenCalledWith(mockUser, 'delete');
    });

    test('should not log warnings (silent check)', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.canUserModify.mockReturnValue(false);

      PermissionValidator.hasPermission(mockItem);

      expect(Logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    test('should handle GM with all permissions', () => {
      mockUser.isGM = true;
      mockItem.type = 'actionCard';

      const permissionResult = PermissionValidator.checkItemPermission(mockItem, {
        actionName: 'GM Action',
      });
      const typeResult = PermissionValidator.validateItemType(
        mockItem,
        'actionCard',
        'GM Action',
      );
      const combinedResult = PermissionValidator.checkPermissionAndType(
        mockItem,
        'actionCard',
        'GM Action',
      );

      expect(permissionResult.hasPermission).toBe(true);
      expect(typeResult.isValid).toBe(true);
      expect(combinedResult.isValid).toBe(true);
    });

    test('should handle owner with correct type', () => {
      mockItem.isOwner = true;
      mockItem.type = 'transformation';

      const combinedResult = PermissionValidator.checkPermissionAndType(
        mockItem,
        'transformation',
        'Transform Action',
      );

      expect(combinedResult.isValid).toBe(true);
      expect(combinedResult.errorKey).toBeNull();
    });

    test('should handle player with elevated permission', () => {
      mockItem.isOwner = false;
      mockUser.isGM = false;
      mockItem.getUserLevel.mockReturnValue(2);
      mockItem.type = 'transformation';

      const elevatedResult = PermissionValidator.hasElevatedPermission(mockItem);

      expect(elevatedResult).toBe(true);
    });
  });
});