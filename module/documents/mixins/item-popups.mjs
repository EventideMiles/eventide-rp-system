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
     * @param {Event|Object} [eventOrOptions] - The triggering click event or options object
     * @returns {Promise<Application|null>} The opened application or null if no handler
     */
    async roll(eventOrOptions) {
      const options =
        eventOrOptions &&
        typeof eventOrOptions === "object" &&
        !eventOrOptions.type
          ? eventOrOptions
          : {};
      const bypass = options.bypass || false;

      Logger.methodEntry("ItemPopupsMixin", "roll", {
        itemName: this.name,
        itemType: this.type,
        bypass,
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

        // If bypass is true, execute the popup logic directly without UI
        if (bypass) {
          Logger.debug(
            `Bypassing popup UI for ${this.type} item "${this.name}"`,
            { itemType: this.type },
            "ITEM_POPUPS",
          );

          // Check if the item has a custom bypass handler
          Logger.debug(
            "Checking for custom bypass handler",
            {
              itemType: this.type,
              itemName: this.name,
              hasHandleBypass: typeof this.handleBypass === "function",
              handleBypassType: typeof this.handleBypass,
              itemConstructorName: this.constructor.name,
            },
            "ITEM_POPUPS",
          );

          if (typeof this.handleBypass === "function") {
            Logger.debug(
              `Using custom bypass handler for ${this.type} item "${this.name}"`,
              { itemType: this.type },
              "ITEM_POPUPS",
            );
            return await this.handleBypass(popupConfig, options);
          }

          return await this._executePopupLogicDirectly(popupConfig);
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
        actionCard: {
          type: "actionCard",
          className: "ActionCardPopup",
          requiresFormula: false,
        },
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
          requiresFormula: this.canRoll ? this.canRoll() : false,
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
          ActionCardPopup: async () => {
            const m = await import("../../ui/_module.mjs");
            return m.ActionCardPopup;
          },
          CombatPowerPopup: async () => {
            const m = await import("../../ui/_module.mjs");
            return m.CombatPowerPopup;
          },
          GearPopup: async () => {
            const m = await import("../../ui/_module.mjs");
            return m.GearPopup;
          },
          StatusPopup: async () => {
            const m = await import("../../ui/_module.mjs");
            return m.StatusPopup;
          },
          FeaturePopup: async () => {
            const m = await import("../../ui/_module.mjs");
            return m.FeaturePopup;
          },
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
      const supportedTypes = [
        "actionCard",
        "combatPower",
        "gear",
        "status",
        "feature",
      ];
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
     * Execute the popup logic directly without showing UI (for bypass mode)
     *
     * @private
     * @param {Object} popupConfig - The popup configuration
     * @returns {Promise<Object>} Result of the execution
     */
    async _executePopupLogicDirectly(popupConfig) {
      Logger.methodEntry("ItemPopupsMixin", "_executePopupLogicDirectly", {
        className: popupConfig.className,
        itemType: this.type,
        itemName: this.name,
      });

      try {
        // Dynamically import the required popup class
        const popupClass = await this._importPopupClass(popupConfig.className);

        if (!popupClass) {
          const error = new Error(
            `Failed to import popup class: ${popupConfig.className}`,
          );
          Logger.error(
            "Popup class import failed in bypass mode",
            error,
            "ITEM_POPUPS",
          );
          ui.notifications.error(
            game.i18n.format(
              "EVENTIDE_RP_SYSTEM.Errors.PopupClassImportError",
              {
                className: popupConfig.className,
                itemName: this.name,
              },
            ),
          );
          throw error;
        }

        // Create a temporary popup instance for validation and execution
        const tempPopup = new popupClass({ item: this });

        // Check eligibility using the popup's validation logic
        const problems = await tempPopup.checkEligibility();
        
        // Use the popup's own validation method if it exists, otherwise use generic check
        let hasProblems;
        if (typeof tempPopup._hasValidationProblems === 'function') {
          hasProblems = tempPopup._hasValidationProblems(problems);
        } else if (typeof popupClass._hasValidationProblems === 'function') {
          hasProblems = popupClass._hasValidationProblems(problems);
        } else {
          // Generic validation check - handle gearValidation array properly
          hasProblems = Object.entries(problems).some(([key, value]) => {
            if (key === "gearValidation") {
              return Array.isArray(value) && value.length > 0;
            }
            return value;
          });
        }

        if (hasProblems) {
          const problemDetails = Object.entries(problems)
            .filter(([key, value]) => {
              if (key === "gearValidation") {
                return Array.isArray(value) && value.length > 0;
              }
              return value;
            })
            .map(([key, value]) => {
              if (key === "gearValidation" && Array.isArray(value)) {
                return `${key}: ${value.join(", ")}`;
              }
              return `${key}: ${value}`;
            })
            .join(", ");

          Logger.warn(
            "Item failed eligibility check in bypass mode",
            { problems, itemType: this.type, itemName: this.name },
            "ITEM_POPUPS",
          );

          // Show user-friendly error message based on item type
          const errorKey = this._getEligibilityErrorKey();
          ui.notifications.error(
            game.i18n.format(errorKey, {
              itemName: this.name,
              details: problemDetails,
            }),
          );

          const error = new Error(
            `Item failed eligibility check: ${problemDetails}`,
          );
          error.problems = problems;
          throw error;
        }

        // Prepare item data if needed (for formula generation, etc.)
        await this._prepareItemForPopup(popupConfig);

        // Execute the appropriate action based on item type
        let result = null;

        try {
          result = await this._executeBypassActionForType();

          Logger.debug(
            `Successfully executed ${popupConfig.className} logic directly`,
            {
              result: result ? "success" : "no result",
              itemType: this.type,
              itemName: this.name,
            },
            "ITEM_POPUPS",
          );
        } catch (actionError) {
          Logger.error(
            `Failed to execute bypass action for ${this.type}`,
            actionError,
            "ITEM_POPUPS",
          );

          ui.notifications.error(
            game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.BypassExecutionError", {
              itemName: this.name,
              itemType: this.type,
              error: actionError.message,
            }),
          );

          throw actionError;
        }

        Logger.methodExit(
          "ItemPopupsMixin",
          "_executePopupLogicDirectly",
          result,
        );
        return result;
      } catch (error) {
        Logger.error(
          `Failed to execute popup logic directly: ${popupConfig.className}`,
          error,
          "ITEM_POPUPS",
        );

        // Don't show additional notifications if we already showed one above
        if (
          !error.problems &&
          !error.message.includes("Failed to execute bypass action")
        ) {
          ui.notifications.error(
            game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.BypassError", {
              itemName: this.name,
              error: error.message,
            }),
          );
        }

        Logger.methodExit(
          "ItemPopupsMixin",
          "_executePopupLogicDirectly",
          null,
        );
        throw error;
      }
    }

    /**
     * Execute the bypass action for the specific item type
     *
     * @private
     * @returns {Promise<Object>} Result of the execution
     */
    async _executeBypassActionForType() {
      Logger.methodEntry("ItemPopupsMixin", "_executeBypassActionForType", {
        itemType: this.type,
      });

      let result = null;

      switch (this.type) {
        case "combatPower":
          // Handle power cost and create combat power message
          this.actor.addPower(-this.system.cost);
          result = await erps.messages.createCombatPowerMessage(this);
          break;

        case "gear":
          // Handle quantity cost and create combat power message (gear uses same message type)
          Logger.debug(
            "Using default gear bypass logic (handleBypass not found)",
            {
              itemName: this.name,
              currentQuantity: this.system.quantity,
              cost: this.system.cost,
              actorName: this.actor?.name,
              itemId: this.id,
            },
            "ITEM_POPUPS",
          );

          await this.update({
            "system.quantity": Math.max(
              0,
              (this.system.quantity || 0) - (this.system.cost || 1),
            ),
          });
          result = await erps.messages.createCombatPowerMessage(this);
          break;

        case "feature":
          // Features just send to chat
          result = await erps.messages.createFeatureMessage(this);
          break;

        case "status":
          // Status items just send to chat
          result = await erps.messages.createStatusMessage(this, null);
          break;

        case "actionCard":
          // Action cards should not be bypassed - they handle their own flow
          throw new Error(
            "Action cards cannot be bypassed - they manage their own execution flow",
          );

        default:
          throw new Error(`Unsupported item type for bypass: ${this.type}`);
      }

      Logger.debug(
        `Executed bypass action for ${this.type}`,
        { hasResult: !!result },
        "ITEM_POPUPS",
      );

      Logger.methodExit(
        "ItemPopupsMixin",
        "_executeBypassActionForType",
        result,
      );
      return result;
    }

    /**
     * Get the appropriate error message key for eligibility failures
     *
     * @private
     * @returns {string} The localization key for the error message
     */
    _getEligibilityErrorKey() {
      const errorKeys = {
        combatPower: "EVENTIDE_RP_SYSTEM.Errors.CombatPowerError",
        gear: "EVENTIDE_RP_SYSTEM.Errors.GearError",
        feature: "EVENTIDE_RP_SYSTEM.Errors.FeatureError",
        status: "EVENTIDE_RP_SYSTEM.Errors.StatusError",
        actionCard: "EVENTIDE_RP_SYSTEM.Errors.ActionCardError",
      };

      return errorKeys[this.type] || "EVENTIDE_RP_SYSTEM.Errors.ItemError";
    }

    /**
     * Custom bypass handler - override this method in item data models to provide
     * custom bypass logic for specific item types.
     *
     * This method will be called instead of the default bypass logic when:
     * 1. The item's roll() method is called with { bypass: true }
     * 2. The item implements this method
     *
     * @param {Object} popupConfig - The popup configuration object
     * @param {Object} options - The options passed to roll() method
     * @returns {Promise<Object>} Result of the bypass execution
     *
     * @example
     * // In your item data model:
     * async handleBypass(popupConfig, options) {
     *   // Custom validation
     *   if (!this.canExecute()) {
     *     throw new Error("Cannot execute this item");
     *   }
     *
     *   // Custom execution logic
     *   const result = await this.customExecution();
     *
     *   // Return result for action card chain processing
     *   return result;
     * }
     */
    // handleBypass(popupConfig, options) {
    //   // Override this method in item data models for custom bypass handling
    // }

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
