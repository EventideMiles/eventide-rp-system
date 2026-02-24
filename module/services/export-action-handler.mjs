import { EmbeddedItemExporter } from "./embedded-item-exporter.mjs";
import { Logger } from "./logger.mjs";

/**
 * Service for handling export actions on items using a delegation pattern.
 *
 * This service consolidates export functionality from item sheets, providing
 * a centralized way to execute exports and generate header controls dynamically.
 * It uses a configuration-driven approach to define export actions, making it
 * easy to add new export types without modifying the item sheet.
 *
 * @example
 * // Execute an export
 * const results = await ExportActionHandler.executeExport('exportEmbeddedCombatPowers', item);
 *
 * // Get header controls for an item
 * const controls = ExportActionHandler.getHeaderControls(item);
 *
 * @module services/export-action-handler
 */
export class ExportActionHandler {
  /**
   * Configuration object defining all available export actions.
   *
   * Each export action configuration includes:
   * - `serviceMethod`: The method name on EmbeddedItemExporter to call
   * - `icon`: Font Awesome icon class for the header button
   * - `labelKey`: i18n localization key for the button label
   * - `applicableItemTypes`: Array of item types this export applies to
   * - `contentCheck`: Function that returns true if the item has exportable content
   *
   * @type {Object<string, ExportActionConfig>}
   */
  static EXPORT_ACTIONS = {
    exportEmbeddedCombatPowers: {
      serviceMethod: "exportEmbeddedCombatPowers",
      icon: "fas fa-swords",
      labelKey: "EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedCombatPowers",
      applicableItemTypes: ["transformation"],
      contentCheck: (item) => item.system?.embeddedCombatPowers?.length > 0,
    },
    exportEmbeddedActionCards: {
      serviceMethod: "exportEmbeddedActionCards",
      icon: "fas fa-cards-blank",
      labelKey: "EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedActionCards",
      applicableItemTypes: ["transformation"],
      contentCheck: (item) => item.system?.embeddedActionCards?.length > 0,
    },
    exportEmbeddedActionItem: {
      serviceMethod: "exportEmbeddedActionItem",
      icon: "fas fa-magic",
      labelKey: "EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedActionItem",
      applicableItemTypes: ["actionCard"],
      contentCheck: (item) => !!item.getEmbeddedItem(),
    },
    exportEmbeddedEffects: {
      serviceMethod: "exportEmbeddedEffects",
      icon: "fas fa-sparkles",
      labelKey: "EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedEffects",
      applicableItemTypes: ["actionCard"],
      contentCheck: (item) => item.getEmbeddedEffects()?.length > 0,
    },
    exportEmbeddedTransformations: {
      serviceMethod: "exportEmbeddedTransformations",
      icon: "fas fa-exchange-alt",
      labelKey: "EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedTransformations",
      applicableItemTypes: ["actionCard"],
      contentCheck: (item) => item.system?.embeddedTransformations?.length > 0,
    },
    exportAllEmbeddedItems: {
      serviceMethod: "exportAllEmbeddedItems",
      icon: "fas fa-file-export",
      labelKey: "EVENTIDE_RP_SYSTEM.UI.ExportAllEmbeddedItems",
      applicableItemTypes: ["transformation", "actionCard"],
      contentCheck: (item) => {
        if (item.type === "transformation") {
          return (
            item.system?.embeddedCombatPowers?.length > 0 ||
            item.system?.embeddedActionCards?.length > 0
          );
        }
        if (item.type === "actionCard") {
          return (
            !!item.getEmbeddedItem() ||
            item.getEmbeddedEffects()?.length > 0 ||
            item.system?.embeddedTransformations?.length > 0
          );
        }
        return false;
      },
    },
  };

  /**
   * Execute an export action for a given item.
   *
   * This method looks up the export action configuration, validates that the
   * item type is applicable, and calls the appropriate EmbeddedItemExporter method.
   * Errors are logged and null is returned on failure.
   *
   * @param {string} exportActionKey - The key identifying the export action
   * @param {Item} item - The item instance to export from
   * @returns {Promise<{success: number, failed: number, errors: Array}|null>} Export results or null on error
   *
   * @example
   * const results = await ExportActionHandler.executeExport('exportEmbeddedCombatPowers', transformationItem);
   */
  static async executeExport(exportActionKey, item) {
    const config = this.EXPORT_ACTIONS[exportActionKey];
    if (!config) {
      Logger.error(
        `Unknown export action key: ${exportActionKey}`,
        { exportActionKey },
        "EXPORT_ACTION_HANDLER",
      );
      return null;
    }

    // Validate item type is applicable
    if (!config.applicableItemTypes.includes(item.type)) {
      Logger.warn(
        `Export action '${exportActionKey}' is not applicable to item type '${item.type}'`,
        { exportActionKey, itemType: item.type },
        "EXPORT_ACTION_HANDLER",
      );
      return null;
    }

    try {
      const results = await EmbeddedItemExporter[config.serviceMethod](item);
      Logger.debug(
        `Export action '${exportActionKey}' completed`,
        { results, itemId: item.id },
        "EXPORT_ACTION_HANDLER",
      );
      return results;
    } catch (error) {
      Logger.error(
        `Failed to execute export action '${exportActionKey}'`,
        { error, itemId: item.id },
        "EXPORT_ACTION_HANDLER",
      );
      return null;
    }
  }

  /**
   * Get header control objects for applicable export actions on an item.
   *
   * This method generates an array of header control objects that can be used
   * to dynamically add export buttons to item sheet headers. Only controls that
   * pass the content check and are for GM users are included.
   *
   * @param {Item} item - The item instance to get controls for
   * @returns {Array<HeaderControl>} Array of header control objects
   *
   * @example
   * const controls = ExportActionHandler.getHeaderControls(item);
   * // Returns: [{ action: 'exportEmbeddedCombatPowers', icon: 'fas fa-swords', label: '...', ownership: 2 }]
   */
  static getHeaderControls(item) {
    if (!game.user?.isGM) {
      return [];
    }

    const controls = [];

    for (const [actionKey, config] of Object.entries(this.EXPORT_ACTIONS)) {
      // Check if this export action is applicable to the item type
      if (!config.applicableItemTypes.includes(item.type)) {
        continue;
      }

      // Check if the item has content to export
      try {
        if (!config.contentCheck(item)) {
          continue;
        }
      } catch (error) {
        Logger.warn(
          `Content check failed for export action '${actionKey}'`,
          { error, itemId: item.id },
          "EXPORT_ACTION_HANDLER",
        );
        continue;
      }

      controls.push({
        action: actionKey,
        icon: config.icon,
        label: game.i18n.localize(config.labelKey),
        ownership: 2, // GM only
      });
    }

    return controls;
  }

  /**
   * Get an array of export action keys applicable to a given item type.
   *
   * This is useful for filtering or validating export actions based on item type.
   *
   * @param {string} itemType - The item type to get applicable exports for
   * @returns {Array<string>} Array of export action keys
   *
   * @example
   * const exports = ExportActionHandler.getApplicableExports('transformation');
   * // Returns: ['exportEmbeddedCombatPowers', 'exportEmbeddedActionCards', 'exportAllEmbeddedItems']
   */
  static getApplicableExports(itemType) {
    return Object.entries(this.EXPORT_ACTIONS)
      .filter(([, config]) => config.applicableItemTypes.includes(itemType))
      .map(([actionKey]) => actionKey);
  }
}

/**
 * @typedef {Object} ExportActionConfig
 * @property {string} serviceMethod - The method name on EmbeddedItemExporter to call
 * @property {string} icon - Font Awesome icon class for the header button
 * @property {string} labelKey - i18n localization key for the button label
 * @property {Array<string>} applicableItemTypes - Array of item types this export applies to
 * @property {Function} contentCheck - Function that returns true if the item has exportable content
 */

/**
 * @typedef {Object} HeaderControl
 * @property {string} action - The export action key to execute when clicked
 * @property {string} icon - Font Awesome icon class for the button
 * @property {string} label - Localized label for the button
 * @property {number} ownership - Ownership level (2 = GM only)
 */
