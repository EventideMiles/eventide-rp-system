/**
 * ItemSelectorManager Service
 *
 * Provides centralized management for item selector combo boxes in item sheets.
 * Handles initialization, cleanup, and configuration of all selector types.
 *
 * This service uses the delegation pattern - item sheets delegate selector
 * management to this service rather than handling it inline.
 *
 * @module ItemSelectorManager
 * @see module:item-sheet
 */

import { ItemSelectorComboBox } from "../ui/components/item-selector-combo-box.mjs";
import { ItemSourceCollector } from "../helpers/item-source-collector.mjs";
import { Logger } from "./logger.mjs";

/**
 * ItemSelectorManager class for handling item selector operations
 *
 * This service provides methods for creating and managing item selector
 * combo boxes in item sheets. All methods accept a `sheet` parameter
 * to access the sheet's context (item, element, etc.).
 *
 * @class ItemSelectorManager
 */
export class ItemSelectorManager {
  /**
   * Configuration object for all selector types
   *
   * Each selector type defines:
   * - itemTypes: Array of item types or function returning array
   * - handlerName: Name of the handler method on the sheet
   * - placeholderKey: i18n key for the placeholder text
   * - selectorType: Type identifier for the selector
   * - itemTypeFilter: (optional) Only initialize for this item type
   *
   * @static
   * @type {Object<string, SelectorConfig>}
   */
  static SELECTOR_CONFIGS = {
    "action-item": {
      itemTypes: () => ItemSourceCollector.getActionItemTypes(),
      handlerName: "_onActionItemSelected",
      placeholderKey: "EVENTIDE_RP_SYSTEM.Forms.ActionItemSelector.Placeholder",
      selectorType: "action-item",
    },
    effects: {
      itemTypes: () => ItemSourceCollector.getEffectItemTypes(),
      handlerName: "_onEffectSelected",
      placeholderKey: "EVENTIDE_RP_SYSTEM.Forms.EffectsSelector.Placeholder",
      selectorType: "effects",
    },
    transformations: {
      itemTypes: ["transformation"],
      handlerName: "_onTransformationSelected",
      placeholderKey:
        "EVENTIDE_RP_SYSTEM.Forms.TransformationsSelector.Placeholder",
      selectorType: "transformations",
    },
    "combat-powers": {
      itemTypes: ["combatPower"],
      handlerName: "_onCombatPowerSelected",
      placeholderKey:
        "EVENTIDE_RP_SYSTEM.Forms.CombatPowersSelector.Placeholder",
      selectorType: "combat-powers",
      itemTypeFilter: "transformation",
    },
    "action-cards": {
      itemTypes: ["actionCard"],
      handlerName: "_onActionCardSelected",
      placeholderKey:
        "EVENTIDE_RP_SYSTEM.Forms.ActionCardsSelector.Placeholder",
      selectorType: "action-cards",
      itemTypeFilter: "transformation",
    },
  };

  /**
   * Initialize item selectors for a sheet
   *
   * Creates ItemSelectorComboBox instances for the specified selector types.
   * Each selector is only initialized if:
   * 1. The container element exists in the DOM
   * 2. The itemTypeFilter (if specified) matches the current item type
   *
   * Selectors are stored in the sheet's private fields using the pattern
   * `#${selectorName}Selector` (e.g., #actionItemSelector).
   *
   * @param {Object} sheet - The item sheet instance
   * @param {Item} sheet.item - The parent item
   * @param {HTMLElement} sheet.element - The sheet element
   * @param {string[]} selectorTypes - Array of selector type keys to initialize
   * @returns {Object<string, ItemSelectorComboBox>} Map of selector names to instances
   * @static
   *
   * @example
   * const selectors = ItemSelectorManager.initializeSelectors(
   *   this,
   *   ['action-item', 'effects', 'transformations']
   * );
   */
  static initializeSelectors(sheet, selectorTypes) {
    const selectors = {};

    try {
      for (const selectorType of selectorTypes) {
        const config = this.SELECTOR_CONFIGS[selectorType];

        if (!config) {
          Logger.warn(
            `Unknown selector type: ${selectorType}`,
            null,
            "ItemSelectorManager",
          );
          continue;
        }

        // Check if this selector should be filtered by item type
        if (
          config.itemTypeFilter &&
          sheet.item.type !== config.itemTypeFilter
        ) {
          continue;
        }

        // Find the container element
        const container = sheet.element.querySelector(
          `[data-selector="${selectorType}"]`,
        );

        if (!container) {
          Logger.debug(
            `Container not found for selector: ${selectorType}`,
            null,
            "ItemSelectorManager",
          );
          continue;
        }

        // Get item types (call function if needed)
        const itemTypes =
          typeof config.itemTypes === "function"
            ? config.itemTypes()
            : config.itemTypes;

        // Create the selector instance
        const selector = new ItemSelectorComboBox({
          container,
          itemTypes,
          onSelect: this.createHandler(sheet, config.handlerName),
          placeholder: game.i18n.localize(config.placeholderKey),
          selectorType: config.selectorType,
        });

        // Store in the returned object
        selectors[selectorType] = selector;

        // Also store in sheet's private field for backward compatibility
        const privateFieldName = `#${this._toCamelCase(selectorType)}Selector`;
        if (typeof sheet._setPrivate === "function") {
          sheet._setPrivate(privateFieldName, selector);
        }

        Logger.debug(
          `Initialized selector: ${selectorType}`,
          { selectorType, itemTypes },
          "ItemSelectorManager",
        );
      }
    } catch (error) {
      Logger.error(
        "Failed to initialize item selectors",
        error,
        "ItemSelectorManager",
      );
    }

    return selectors;
  }

  /**
   * Clean up item selector instances
   *
   * Calls destroy() on each selector and sets it to null.
   * This should be called when the sheet is closed or re-rendered.
   *
   * @param {Object} sheet - The item sheet instance
   * @param {Object<string, ItemSelectorComboBox>} selectorInstances - Map of selector instances
   * @returns {void}
   * @static
   *
   * @example
   * ItemSelectorManager.cleanupSelectors(this, this._selectors);
   */
  static cleanupSelectors(sheet, selectorInstances) {
    try {
      for (const [selectorType, selector] of Object.entries(
        selectorInstances,
      )) {
        if (selector && typeof selector.destroy === "function") {
          selector.destroy();
        }

        // Clear the sheet's private field
        const privateFieldName = `#${this._toCamelCase(selectorType)}Selector`;
        if (typeof sheet._setPrivate === "function") {
          sheet._setPrivate(privateFieldName, null);
        }
      }

      Logger.debug(
        "Cleaned up item selectors",
        { count: Object.keys(selectorInstances).length },
        "ItemSelectorManager",
      );
    } catch (error) {
      Logger.warn(
        "Error cleaning up item selectors",
        error,
        "ItemSelectorManager",
      );
    }
  }

  /**
   * Create a bound handler function for a selector
   *
   * Returns a function that calls the sheet's method with error handling.
   * The handler is bound to the sheet instance and wrapped in try-catch.
   *
   * @param {Object} sheet - The item sheet instance
   * @param {string} handlerName - Name of the handler method on the sheet
   * @returns {Function} Bound handler function
   * @static
   *
   * @example
   * const handler = ItemSelectorManager.createHandler(this, '_onActionItemSelected');
   */
  static createHandler(sheet, handlerName) {
    return async (droppedItem) => {
      try {
        if (typeof sheet[handlerName] === "function") {
          await sheet[handlerName](droppedItem);
        } else {
          Logger.warn(
            `Handler method not found: ${handlerName}`,
            { sheet, handlerName },
            "ItemSelectorManager",
          );
        }
      } catch (error) {
        Logger.error(
          `Error in selector handler: ${handlerName}`,
          error,
          "ItemSelectorManager",
        );
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GenericError"),
        );
      }
    };
  }

  /**
   * Convert kebab-case string to camelCase
   *
   * @param {string} str - The kebab-case string
   * @returns {string} The camelCase string
   * @private
   * @static
   *
   * @example
   * ItemSelectorManager._toCamelCase('action-item'); // 'actionItem'
   */
  static _toCamelCase(str) {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Get configuration for a specific selector type
   *
   * @param {string} selectorType - The selector type key
   * @returns {SelectorConfig|undefined} The selector configuration
   * @static
   */
  static getSelectorConfig(selectorType) {
    return this.SELECTOR_CONFIGS[selectorType];
  }

  /**
   * Get all available selector type keys
   *
   * @returns {string[]} Array of selector type keys
   * @static
   */
  static getAvailableSelectorTypes() {
    return Object.keys(this.SELECTOR_CONFIGS);
  }
}

/**
 * @typedef {Object} SelectorConfig
 * @property {string[]|Function} itemTypes - Array of item types or function returning array
 * @property {string} handlerName - Name of the handler method on the sheet
 * @property {string} placeholderKey - i18n key for the placeholder text
 * @property {string} selectorType - Type identifier for the selector
 * @property {string} [itemTypeFilter] - Only initialize for this item type
 */
