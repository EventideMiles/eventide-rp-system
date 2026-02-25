/**
 * PermissionValidator Service
 *
 * Provides centralized permission validation for item sheet actions.
 * Eliminates duplicated permission check patterns across embedded item methods.
 *
 * @module PermissionValidator
 */

import { Logger } from "./logger.mjs";

/**
 * PermissionValidator class for centralized permission checking
 *
 * @class PermissionValidator
 */
export class PermissionValidator {
  /**
   * Check if user has permission to modify an item
   *
   * @static
   * @param {Item|null|undefined} item - The item to check permissions for
   * @param {object} options - Options for permission check
   * @param {string} [options.permissionType="update"] - The type of permission: update, delete
   * @param {string} [options.actionName] - The action being attempted for logging
   * @returns {{hasPermission: boolean, errorKey: string|null}} Result object with permission status
   */
  static checkItemPermission(item, options = {}) {
    const { permissionType = "update", actionName = "Permission check" } =
      options;

    // Handle null/undefined item gracefully
    if (!item) {
      Logger.warn(
        `${actionName} called with null or undefined item`,
        {},
        "PERMISSION",
      );
      return {
        hasPermission: false,
        errorKey: "ERPS.Errors.NullItem",
      };
    }

    // Check permission: owner, can modify, or GM
    const hasPermission =
      item.isOwner ||
      item.canUserModify(game.user, permissionType) ||
      game.user.isGM;

    if (!hasPermission) {
      Logger.warn(
        `Permission denied for ${actionName}`,
        { item: item.name, itemType: item.type, user: game.user.name },
        "PERMISSION",
      );
      return {
        hasPermission: false,
        errorKey: "ERPS.Errors.PermissionDenied",
      };
    }

    return {
      hasPermission: true,
      errorKey: null,
    };
  }

  /**
   * Validate that an item is of the expected type
   *
   * @static
   * @param {Item|null|undefined} item - The item to validate
   * @param {string} expectedType - The expected item type (e.g., "actionCard", "transformation")
   * @param {string} actionName - The action being attempted for logging
   * @returns {{isValid: boolean, errorKey: string|null}} Result object with validation status
   */
  static validateItemType(item, expectedType, actionName) {
    // Handle null/undefined item gracefully
    if (!item) {
      Logger.warn(
        `${actionName} called with null or undefined item`,
        {},
        "VALIDATION",
      );
      return {
        isValid: false,
        errorKey: "ERPS.Errors.NullItem",
      };
    }

    // Check item type
    if (item.type !== expectedType) {
      Logger.warn(
        `${actionName} called on wrong item type`,
        { expectedType, actualType: item.type, itemName: item.name },
        "VALIDATION",
      );
      return {
        isValid: false,
        errorKey: "ERPS.Errors.InvalidItemType",
      };
    }

    return {
      isValid: true,
      errorKey: null,
    };
  }

  /**
   * Combined permission and type validation check
   *
   * Performs both permission check and type validation in a single call.
   * Returns on first failure (permission checked before type).
   *
   * @static
   * @param {Item|null|undefined} item - The item to check
   * @param {string} expectedType - The expected item type (e.g., "actionCard", "transformation")
   * @param {string} actionName - The action being attempted for logging
   * @param {object} [options] - Additional options
   * @param {string} [options.permissionType="update"] - The type of permission: update, delete
   * @returns {{isValid: boolean, errorKey: string|null}} Result object with validation status
   */
  static checkPermissionAndType(item, expectedType, actionName, options = {}) {
    // First check permission
    const permissionResult = PermissionValidator.checkItemPermission(item, {
      actionName,
      ...options,
    });

    if (!permissionResult.hasPermission) {
      return {
        isValid: false,
        errorKey: permissionResult.errorKey,
      };
    }

    // Then validate type
    const typeResult = PermissionValidator.validateItemType(
      item,
      expectedType,
      actionName,
    );

    return {
      isValid: typeResult.isValid,
      errorKey: typeResult.errorKey,
    };
  }

  /**
   * Check if user has elevated permission for transformation operations
   * Uses alternative permission check: isOwner || isGM || getUserLevel >= 2
   *
   * @static
   * @param {Item|null|undefined} item - The item to check permissions for
   * @returns {boolean} True if user has elevated permission
   */
  static hasElevatedPermission(item) {
    if (!item) {
      return false;
    }

    return item.isOwner || game.user.isGM || item.getUserLevel() >= 2;
  }

  /**
   * Simple permission check without logging
   * Useful for conditional UI rendering where logging would be noisy
   *
   * @static
   * @param {Item|null|undefined} item - The item to check permissions for
   * @param {string} [permissionType="update"] - The type of permission: update, delete
   * @returns {boolean} True if user has permission
   */
  static hasPermission(item, permissionType = "update") {
    if (!item) {
      return false;
    }

    return (
      item.isOwner ||
      item.canUserModify(game.user, permissionType) ||
      game.user.isGM
    );
  }
}
