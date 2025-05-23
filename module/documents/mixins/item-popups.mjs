import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";

/**
 * Item Popups Mixin
 *
 * Provides popup and UI interaction functionality for items, including
 * displaying appropriate popups based on item type and handling click events.
 *
 * @param {class} BaseClass - The base item class to extend
 * @returns {class} Extended class with popup functionality
 */
export const ItemPopupsMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Handle a click event on the item, displaying appropriate popup based on item type.
     *
     * @param {Event} [event] - The triggering click event (optional)
     * @returns {Promise<Application|null>} The opened application or null if no handler
     */
    async roll(_event) {
      Logger.methodEntry("ItemPopupsMixin", "roll", {
        itemName: this.name,
        itemType: this.type,
      });

      try {
        // Validate item has required data
        if (!this.type) {
          Logger.warn(
            "Cannot determine popup type - item has no type",
            { itemId: this.id, itemName: this.name },
            "ITEM_POPUPS",
          );
          return null;
        }

        // Get the appropriate popup class and setup
        const popupConfig = this._getPopupConfig();

        if (!popupConfig) {
          Logger.warn(
            `No popup handler found for item type: ${this.type}`,
            { itemType: this.type },
            "ITEM_POPUPS",
          );
          return null;
        }

        // Prepare the item data for the popup
        await this._prepareItemForPopup(popupConfig);

        // Create and render the popup
        const application = await this._createAndRenderPopup(popupConfig);

        Logger.info(
          `Opened ${this.type} popup for item "${this.name}"`,
          { popupType: popupConfig.type },
          "ITEM_POPUPS",
        );

        Logger.methodExit("ItemPopupsMixin", "roll", application);
        return application;
      } catch (error) {
        const [, _handledError] = await ErrorHandler.handleAsync(
          Promise.reject(error),
          {
            context: `Open Popup for ${this.type} Item: ${this.name}`,
            errorType: ErrorHandler.ERROR_TYPES.UI,
            userMessage: game.i18n.format(
              "EVENTIDE_RP_SYSTEM.Errors.PopupError",
              {
                itemName: this.name,
              },
            ),
          },
        );

        Logger.methodExit("ItemPopupsMixin", "roll", null);
        return null;
      }
    }

    /**
     * Get the popup configuration for the current item type
     *
     * @private
     * @returns {Object|null} The popup configuration or null if not found
     */
    _getPopupConfig() {
      Logger.methodEntry("ItemPopupsMixin", "_getPopupConfig", {
        itemType: this.type,
      });

      const popupConfigs = {
        combatPower: {
          type: "combatPower",
          className: "CombatPowerPopup",
          requiresFormula: true,
        },
        gear: {
          type: "gear",
          className: "GearPopup",
          requiresFormula: true,
        },
        status: {
          type: "status",
          className: "StatusPopup",
          requiresFormula: false,
        },
        feature: {
          type: "feature",
          className: "FeaturePopup",
          requiresFormula: false,
        },
      };

      const config = popupConfigs[this.type] || null;

      Logger.debug(
        `Found popup config for ${this.type}`,
        config,
        "ITEM_POPUPS",
      );

      Logger.methodExit("ItemPopupsMixin", "_getPopupConfig", config);
      return config;
    }

    /**
     * Prepare the item data for popup display
     *
     * @private
     * @param {Object} popupConfig - The popup configuration
     * @returns {Promise<void>}
     */
    async _prepareItemForPopup(popupConfig) {
      Logger.methodEntry("ItemPopupsMixin", "_prepareItemForPopup", {
        requiresFormula: popupConfig.requiresFormula,
      });

      // Add roll formula if the popup type requires it
      if (popupConfig.requiresFormula && this.getCombatRollFormula) {
        try {
          const formula = this.getCombatRollFormula();

          // Store formula on the item for the popup to use
          this.formula = formula;

          Logger.debug(
            `Prepared roll formula for popup: ${formula}`,
            { formula },
            "ITEM_POPUPS",
          );
        } catch (error) {
          Logger.warn(
            "Failed to generate roll formula for popup",
            error,
            "ITEM_POPUPS",
          );

          // Set empty formula as fallback
          this.formula = "0";
        }
      }

      Logger.methodExit("ItemPopupsMixin", "_prepareItemForPopup");
    }

    /**
     * Create and render the appropriate popup application
     *
     * @private
     * @param {Object} popupConfig - The popup configuration
     * @returns {Promise<Application>} The created and rendered application
     */
    async _createAndRenderPopup(popupConfig) {
      Logger.methodEntry("ItemPopupsMixin", "_createAndRenderPopup", {
        className: popupConfig.className,
      });

      // Dynamically import the required popup class
      const popupClass = await this._importPopupClass(popupConfig.className);

      if (!popupClass) {
        throw new Error(
          `Failed to import popup class: ${popupConfig.className}`,
        );
      }

      // Create the popup instance
      const application = new popupClass({ item: this });

      // Render the popup
      const renderedApp = await application.render(true);

      Logger.debug(
        `Created and rendered ${popupConfig.className}`,
        { appId: application.id },
        "ITEM_POPUPS",
      );

      Logger.methodExit(
        "ItemPopupsMixin",
        "_createAndRenderPopup",
        renderedApp,
      );
      return renderedApp;
    }

    /**
     * Dynamically import the popup class
     *
     * @private
     * @param {string} className - The class name to import
     * @returns {Promise<class|null>} The imported class or null if failed
     */
    async _importPopupClass(className) {
      Logger.methodEntry("ItemPopupsMixin", "_importPopupClass", {
        className,
      });

      try {
        // Map class names to their import paths
        const classMap = {
          CombatPowerPopup: () =>
            import("../../ui/_module.mjs").then((m) => m.CombatPowerPopup),
          GearPopup: () =>
            import("../../ui/_module.mjs").then((m) => m.GearPopup),
          StatusPopup: () =>
            import("../../ui/_module.mjs").then((m) => m.StatusPopup),
          FeaturePopup: () =>
            import("../../ui/_module.mjs").then((m) => m.FeaturePopup),
        };

        const importFn = classMap[className];

        if (!importFn) {
          Logger.error(
            `Unknown popup class: ${className}`,
            { availableClasses: Object.keys(classMap) },
            "ITEM_POPUPS",
          );
          return null;
        }

        const popupClass = await importFn();

        Logger.debug(`Successfully imported ${className}`, null, "ITEM_POPUPS");

        Logger.methodExit("ItemPopupsMixin", "_importPopupClass", popupClass);
        return popupClass;
      } catch (error) {
        Logger.error(
          `Failed to import popup class: ${className}`,
          error,
          "ITEM_POPUPS",
        );

        Logger.methodExit("ItemPopupsMixin", "_importPopupClass", null);
        return null;
      }
    }

    /**
     * Check if the item type supports popups
     *
     * @returns {boolean} Whether the item type has popup support
     */
    hasPopupSupport() {
      const supportedTypes = ["combatPower", "gear", "status", "feature"];
      return supportedTypes.includes(this.type);
    }

    /**
     * Get the popup type for this item
     *
     * @returns {string|null} The popup type or null if not supported
     */
    getPopupType() {
      const config = this._getPopupConfig();
      return config?.type || null;
    }

    /**
     * Check if the item type requires a roll formula for its popup
     *
     * @returns {boolean} Whether the popup requires a formula
     */
    popupRequiresFormula() {
      const config = this._getPopupConfig();
      return config?.requiresFormula || false;
    }

    /**
     * Validate if the item is ready for popup display
     *
     * @returns {Object} Validation result with any issues
     */
    validateForPopup() {
      Logger.methodEntry("ItemPopupsMixin", "validateForPopup");

      const validation = {
        isValid: true,
        errors: [],
      };

      // Check if item type is supported
      if (!this.hasPopupSupport()) {
        validation.isValid = false;
        validation.errors.push(`Unsupported item type: ${this.type}`);
      }

      // Check if required data exists
      if (!this.name) {
        validation.isValid = false;
        validation.errors.push("Item missing name");
      }

      if (!this.system) {
        validation.isValid = false;
        validation.errors.push("Item missing system data");
      }

      // Check formula requirements for roll-based items
      if (this.popupRequiresFormula() && !this.canRoll?.()) {
        validation.errors.push("Item requires roll capability but cannot roll");
      }

      Logger.debug("Popup validation result", validation, "ITEM_POPUPS");

      Logger.methodExit("ItemPopupsMixin", "validateForPopup", validation);
      return validation;
    }
  };
