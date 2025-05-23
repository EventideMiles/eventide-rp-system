import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";

/**
 * Item Utilities Mixin
 *
 * Provides general utility functionality for items, including quantity management,
 * data serialization, and common item operations.
 *
 * @param {class} BaseClass - The base item class to extend
 * @returns {class} Extended class with utility functionality
 */
export const ItemUtilitiesMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Convert the item document to a plain object for export or serialization.
     *
     * @returns {Object} Plain object representation of the item
     */
    toPlainObject() {
      Logger.methodEntry("ItemUtilitiesMixin", "toPlainObject", {
        itemName: this.name,
        itemType: this.type,
      });

      try {
        const result = { ...this };

        // Simplify system data using the system's own toPlainObject if available
        if (
          this.system?.toPlainObject &&
          typeof this.system.toPlainObject === "function"
        ) {
          result.system = this.system.toPlainObject();
        } else {
          // Fallback to simple copy
          result.system = { ...this.system };
        }

        // Add effects if they exist
        result.effects = this.effects?.size > 0 ? this.effects.contents : [];

        Logger.debug(
          "Converted item to plain object",
          {
            hasSystemData: !!result.system,
            effectCount: result.effects.length,
            systemKeys: Object.keys(result.system || {}),
          },
          "ITEM_UTILITIES",
        );

        Logger.methodExit("ItemUtilitiesMixin", "toPlainObject", result);
        return result;
      } catch (error) {
        Logger.error(
          "Error converting item to plain object",
          error,
          "ITEM_UTILITIES",
        );

        // Return minimal fallback object
        const fallback = {
          id: this.id,
          name: this.name || "Unknown",
          type: this.type || "unknown",
          system: {},
          effects: [],
        };

        Logger.methodExit("ItemUtilitiesMixin", "toPlainObject", fallback);
        return fallback;
      }
    }

    /**
     * Update the item's quantity
     *
     * @param {number} value - The amount to add (positive) or subtract (negative)
     * @returns {Promise<Item>} The updated item
     */
    async addQuantity(value) {
      Logger.methodEntry("ItemUtilitiesMixin", "addQuantity", {
        currentQuantity: this.system?.quantity,
        addValue: value,
      });

      // Validate input
      if (typeof value !== "number" || !Number.isFinite(value)) {
        const error = new Error(
          `Invalid quantity value: ${value}. Must be a finite number.`,
        );
        Logger.error(
          "Invalid quantity value provided",
          error,
          "ITEM_UTILITIES",
        );
        throw error;
      }

      // Check if this item type supports quantity
      if (!this.hasQuantity()) {
        Logger.warn(
          "Attempted to modify quantity on item that doesn't support it",
          { itemType: this.type, value },
          "ITEM_UTILITIES",
        );
        return this;
      }

      try {
        const currentQuantity = this.system.quantity || 0;
        const newQuantity = Math.max(0, currentQuantity + value); // Prevent negative quantities

        const [updatedItem, error] = await ErrorHandler.handleDocumentOperation(
          this.update({ "system.quantity": newQuantity }),
          "update item quantity",
          "item",
        );

        if (error) {
          Logger.methodExit("ItemUtilitiesMixin", "addQuantity", this);
          return this;
        }

        Logger.info(
          `Updated item quantity: ${currentQuantity} -> ${newQuantity}`,
          {
            itemName: this.name,
            oldQuantity: currentQuantity,
            newQuantity,
            change: value,
          },
          "ITEM_UTILITIES",
        );

        Logger.methodExit("ItemUtilitiesMixin", "addQuantity", updatedItem);
        return updatedItem;
      } catch (error) {
        const [, _handledError] = await ErrorHandler.handleAsync(
          Promise.reject(error),
          {
            context: `Update Quantity for Item: ${this.name}`,
            errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          },
        );

        Logger.methodExit("ItemUtilitiesMixin", "addQuantity", this);
        return this;
      }
    }

    /**
     * Set the item's quantity to a specific value
     *
     * @param {number} quantity - The new quantity value
     * @returns {Promise<Item>} The updated item
     */
    async setQuantity(quantity) {
      Logger.methodEntry("ItemUtilitiesMixin", "setQuantity", {
        currentQuantity: this.system?.quantity,
        newQuantity: quantity,
      });

      // Validate input
      if (
        typeof quantity !== "number" ||
        !Number.isFinite(quantity) ||
        quantity < 0
      ) {
        const error = new Error(
          `Invalid quantity value: ${quantity}. Must be a non-negative finite number.`,
        );
        Logger.error(
          "Invalid quantity value provided",
          error,
          "ITEM_UTILITIES",
        );
        throw error;
      }

      const currentQuantity = this.system?.quantity || 0;
      const difference = quantity - currentQuantity;

      const result = await this.addQuantity(difference);
      Logger.methodExit("ItemUtilitiesMixin", "setQuantity", result);
      return result;
    }

    /**
     * Check if this item type supports quantity tracking
     *
     * @returns {boolean} Whether the item supports quantity
     */
    hasQuantity() {
      // Most item types support quantity, but some may not
      const quantitySupport = {
        gear: true,
        combatPower: false, // Usually tracked as "uses" or similar
        feature: false,
        status: false,
        transformation: false,
      };

      const supported = quantitySupport[this.type] ?? false;

      Logger.debug(
        `Quantity support check for ${this.type}: ${supported}`,
        { itemType: this.type, supported },
        "ITEM_UTILITIES",
      );

      return supported;
    }

    /**
     * Get the item's current quantity
     *
     * @returns {number} The current quantity or 0 if not applicable
     */
    getQuantity() {
      if (!this.hasQuantity()) {
        return 0;
      }

      return this.system?.quantity || 0;
    }

    /**
     * Check if the item has any quantity remaining
     *
     * @returns {boolean} Whether the item has quantity > 0
     */
    hasQuantityRemaining() {
      return this.getQuantity() > 0;
    }

    /**
     * Get a summary of the item's key properties
     *
     * @returns {Object} Summary object with key item information
     */
    getSummary() {
      Logger.methodEntry("ItemUtilitiesMixin", "getSummary");

      try {
        const summary = {
          id: this.id,
          name: this.name,
          type: this.type,
          hasActor: !!this.actor,
          actorName: this.actor?.name || null,

          // Quantity info
          hasQuantity: this.hasQuantity(),
          quantity: this.getQuantity(),

          // Roll info
          canRoll: this.canRoll?.() || false,
          rollType: this.getRollType?.() || "none",
          rollAbility: this.getRollAbility?.() || null,

          // Popup info
          hasPopupSupport: this.hasPopupSupport?.() || false,
          popupType: this.getPopupType?.() || null,

          // System data summary
          hasSystemData: !!this.system,
          systemDataKeys: this.system ? Object.keys(this.system) : [],

          // Effects summary
          effectCount: this.effects?.size || 0,
        };

        Logger.debug("Generated item summary", summary, "ITEM_UTILITIES");

        Logger.methodExit("ItemUtilitiesMixin", "getSummary", summary);
        return summary;
      } catch (error) {
        Logger.error("Error generating item summary", error, "ITEM_UTILITIES");

        // Return minimal summary
        const fallback = {
          id: this.id || "unknown",
          name: this.name || "Unknown Item",
          type: this.type || "unknown",
          hasError: true,
        };

        Logger.methodExit("ItemUtilitiesMixin", "getSummary", fallback);
        return fallback;
      }
    }

    /**
     * Validate the item's data integrity
     *
     * @returns {Object} Validation result with any issues found
     */
    validateData() {
      Logger.methodEntry("ItemUtilitiesMixin", "validateData");

      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      // Check required properties
      if (
        !this.name ||
        typeof this.name !== "string" ||
        this.name.trim() === ""
      ) {
        validation.isValid = false;
        validation.errors.push("Item must have a valid name");
      }

      if (!this.type || typeof this.type !== "string") {
        validation.isValid = false;
        validation.errors.push("Item must have a valid type");
      }

      if (!this.system || typeof this.system !== "object") {
        validation.isValid = false;
        validation.errors.push("Item must have valid system data");
      }

      // Check type-specific requirements
      if (this.hasQuantity() && this.system?.quantity != null) {
        const quantity = this.system.quantity;
        if (typeof quantity !== "number" || quantity < 0) {
          validation.errors.push("Quantity must be a non-negative number");
        }
      }

      // Check roll data if present
      if (this.system?.roll) {
        const rollData = this.system.roll;

        if (
          rollData.type &&
          !["roll", "flat", "none"].includes(rollData.type)
        ) {
          validation.errors.push(`Invalid roll type: ${rollData.type}`);
        }

        if (rollData.bonus != null && typeof rollData.bonus !== "number") {
          validation.errors.push("Roll bonus must be a number");
        }
      }

      Logger.debug("Item validation result", validation, "ITEM_UTILITIES");

      Logger.methodExit("ItemUtilitiesMixin", "validateData", validation);
      return validation;
    }

    /**
     * Check if the item is in a valid state for operations
     *
     * @returns {boolean} Whether the item is valid
     */
    isValid() {
      const validation = this.validateData();
      return validation.isValid;
    }

    /**
     * Get the item's display name with any relevant status indicators
     *
     * @returns {string} Formatted display name
     */
    getDisplayName() {
      let displayName = this.name || "Unknown Item";

      // Add quantity indicator if applicable
      if (this.hasQuantity()) {
        const quantity = this.getQuantity();
        displayName += ` (${quantity})`;
      }

      // Add roll type indicator if applicable
      if (this.canRoll?.()) {
        const rollType = this.getRollType?.();
        if (rollType && rollType !== "none") {
          displayName += ` [${rollType.toUpperCase()}]`;
        }
      }

      return displayName;
    }
  };
