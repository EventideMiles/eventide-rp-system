import { Logger } from "../services/logger.mjs";

/**
 * Inventory Utilities
 *
 * Provides utility functions for inventory management, gear validation,
 * and item matching for action card execution.
 */
export class InventoryUtils {
  /**
   * Check if a gear item is equipped on the given actor
   * @param {Actor} actor - The actor to check
   * @param {string} itemName - The name of the gear item to check
   * @returns {boolean} True if the gear is equipped, false otherwise
   */
  static isGearEquipped(actor, itemName) {
    Logger.methodEntry("InventoryUtils", "isGearEquipped", {
      actorName: actor?.name,
      itemName,
    });

    if (!actor || !itemName) {
      Logger.warn("Invalid parameters for gear equipped check", {
        hasActor: !!actor,
        hasItemName: !!itemName,
      });
      return false;
    }

    try {
      // Find the gear item by name
      const gearItem = actor.items.find(
        (item) => item.type === "gear" && item.name === itemName,
      );

      if (!gearItem) {
        Logger.debug(`Gear item "${itemName}" not found in actor inventory`, {
          actorName: actor.name,
          itemName,
        });
        return false;
      }

      const isEquipped = gearItem.system.equipped === true;

      Logger.debug(`Gear equipped check result`, {
        actorName: actor.name,
        itemName,
        isEquipped,
        hasQuantity: gearItem.system.quantity > 0,
      });

      Logger.methodExit("InventoryUtils", "isGearEquipped", isEquipped);
      return isEquipped;
    } catch (error) {
      Logger.error("Error checking gear equipped status", error);
      Logger.methodExit("InventoryUtils", "isGearEquipped", false);
      return false;
    }
  }

  /**
   * Check if an actor has sufficient quantity of a gear item
   * @param {Actor} actor - The actor to check
   * @param {string} itemName - The name of the gear item to check
   * @param {number} requiredQuantity - The required quantity (defaults to item's cost)
   * @returns {boolean} True if sufficient quantity is available, false otherwise
   */
  static hasSufficientQuantity(actor, itemName, requiredQuantity = null) {
    Logger.methodEntry("InventoryUtils", "hasSufficientQuantity", {
      actorName: actor?.name,
      itemName,
      requiredQuantity,
    });

    if (!actor || !itemName) {
      Logger.warn("Invalid parameters for quantity check", {
        hasActor: !!actor,
        hasItemName: !!itemName,
      });
      return false;
    }

    try {
      // Find the gear item by name
      const gearItem = actor.items.find(
        (item) => item.type === "gear" && item.name === itemName,
      );

      if (!gearItem) {
        Logger.debug(`Gear item "${itemName}" not found in actor inventory`, {
          actorName: actor.name,
          itemName,
        });
        return false;
      }

      // Use the item's cost as required quantity if not specified
      // Zero-cost items should require 0 quantity, not 1
      const required =
        requiredQuantity !== null
          ? requiredQuantity
          : gearItem.system.cost || 0;
      const available = gearItem.system.quantity || 0;
      const hasSufficient = available >= required;

      Logger.debug(`Quantity check result`, {
        actorName: actor.name,
        itemName,
        required,
        available,
        hasSufficient,
      });

      Logger.methodExit(
        "InventoryUtils",
        "hasSufficientQuantity",
        hasSufficient,
      );
      return hasSufficient;
    } catch (error) {
      Logger.error("Error checking gear quantity", error);
      Logger.methodExit("InventoryUtils", "hasSufficientQuantity", false);
      return false;
    }
  }

  /**
   * Find a gear item in actor's inventory by name, prioritizing items that can fulfill the cost requirement
   * @param {Actor} actor - The actor to search
   * @param {string} itemName - The name of the gear item to find
   * @param {number} [requiredQuantity] - The required quantity (optional, for prioritization)
   * @returns {Item|null} The best available gear item or null if not found
   */
  static findGearByName(actor, itemName, requiredQuantity = null) {
    Logger.methodEntry("InventoryUtils", "findGearByName", {
      actorName: actor?.name,
      itemName,
      requiredQuantity,
    });

    if (!actor || !itemName) {
      Logger.warn("Invalid parameters for gear search", {
        hasActor: !!actor,
        hasItemName: !!itemName,
      });
      return null;
    }

    try {
      // Find all gear items with matching name
      const matchingGear = actor.items.filter(
        (item) => item.type === "gear" && item.name === itemName,
      );

      if (matchingGear.length === 0) {
        Logger.debug(`No gear items found with name "${itemName}"`, {
          actorName: actor.name,
          itemName,
        });
        Logger.methodExit("InventoryUtils", "findGearByName", null);
        return null;
      }

      if (matchingGear.length === 1) {
        // Only one item, return it
        const gearItem = matchingGear[0];
        Logger.debug(`Single gear item found`, {
          actorName: actor.name,
          itemName,
          itemId: gearItem.id,
          quantity: gearItem.system.quantity,
          equipped: gearItem.system.equipped,
        });
        Logger.methodExit("InventoryUtils", "findGearByName", gearItem);
        return gearItem;
      }

      // Multiple items with same name - prioritize the best one
      Logger.debug(`Multiple gear items found with name "${itemName}"`, {
        actorName: actor.name,
        itemName,
        count: matchingGear.length,
        requiredQuantity,
      });

      // If no required quantity specified, use the first item's cost as default
      const required =
        requiredQuantity !== null
          ? requiredQuantity
          : matchingGear[0].system.cost || 0;

      // Sort by priority:
      // 1. Items that can fulfill the cost requirement
      // 2. Equipped items over unequipped
      // 3. Higher quantity items
      const sortedGear = matchingGear.sort((a, b) => {
        const aQuantity = a.system.quantity || 0;
        const bQuantity = b.system.quantity || 0;
        const aCanFulfill = aQuantity >= required;
        const bCanFulfill = bQuantity >= required;
        const aEquipped = a.system.equipped === true;
        const bEquipped = b.system.equipped === true;

        // Priority 1: Can fulfill cost requirement
        if (aCanFulfill && !bCanFulfill) return -1;
        if (!aCanFulfill && bCanFulfill) return 1;

        // Priority 2: Equipped status (if both can or both can't fulfill)
        if (aEquipped && !bEquipped) return -1;
        if (!aEquipped && bEquipped) return 1;

        // Priority 3: Higher quantity
        return bQuantity - aQuantity;
      });

      const selectedGear = sortedGear[0];

      Logger.debug(`Selected best gear item`, {
        actorName: actor.name,
        itemName,
        selectedId: selectedGear.id,
        selectedQuantity: selectedGear.system.quantity,
        selectedEquipped: selectedGear.system.equipped,
        canFulfillCost: (selectedGear.system.quantity || 0) >= required,
        required,
        totalCandidates: matchingGear.length,
      });

      Logger.methodExit("InventoryUtils", "findGearByName", selectedGear);
      return selectedGear;
    } catch (error) {
      Logger.error("Error finding gear by name", error);
      Logger.methodExit("InventoryUtils", "findGearByName", null);
      return null;
    }
  }

  /**
   * Validate all gear requirements for an action card's action items
   * @param {Actor} actor - The actor executing the action card
   * @param {Item} actionCard - The action card to validate
   * @returns {Object} Validation result with details about any failures
   */
  static validateActionCardGearRequirements(actor, actionCard) {
    Logger.methodEntry("InventoryUtils", "validateActionCardGearRequirements", {
      actorName: actor?.name,
      actionCardName: actionCard?.name,
    });

    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      gearChecks: [],
    };

    if (!actor || !actionCard) {
      validation.isValid = false;
      validation.errors.push("Invalid actor or action card provided");
      Logger.methodExit(
        "InventoryUtils",
        "validateActionCardGearRequirements",
        validation,
      );
      return validation;
    }

    try {
      // Check embedded item if it's gear
      const embeddedItem = actionCard.getEmbeddedItem();
      if (embeddedItem && embeddedItem.type === "gear") {
        const gearCheck = this._validateSingleGearItem(actor, embeddedItem);
        validation.gearChecks.push(gearCheck);

        if (!gearCheck.isValid) {
          validation.isValid = false;
          validation.errors.push(...gearCheck.errors);
        }
      }

      // Note: Effects section gear validation is intentionally skipped here.
      // This will be implemented in future issues when the data model setting
      // for "attempt to reduce user inventory when transferring gear from effects column" is added.

      Logger.debug("Action card gear validation result", {
        actionCardName: actionCard.name,
        isValid: validation.isValid,
        errorCount: validation.errors.length,
        gearChecksCount: validation.gearChecks.length,
      });

      Logger.methodExit(
        "InventoryUtils",
        "validateActionCardGearRequirements",
        validation,
      );
      return validation;
    } catch (error) {
      Logger.error("Error validating action card gear requirements", error);
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error.message}`);
      Logger.methodExit(
        "InventoryUtils",
        "validateActionCardGearRequirements",
        validation,
      );
      return validation;
    }
  }

  /**
   * Validate a single gear item against actor's inventory
   * @param {Actor} actor - The actor to check
   * @param {Object} gearData - The gear item data to validate
   * @returns {Object} Validation result for this specific gear item
   * @private
   */
  static _validateSingleGearItem(actor, gearData) {
    const validation = {
      isValid: true,
      errors: [],
      itemName: gearData.name,
      itemId: gearData.id || gearData._id,
    };

    try {
      // Find the actual gear item in actor's inventory
      const actualGear = this.findGearByName(actor, gearData.name);

      if (!actualGear) {
        validation.isValid = false;
        validation.errors.push(
          `Gear "${gearData.name}" not found in inventory`,
        );
        return validation;
      }

      // Check if equipped
      if (!actualGear.system.equipped) {
        validation.isValid = false;
        validation.errors.push(`Gear "${gearData.name}" is not equipped`);
      }

      // Check quantity - read cost from embedded item first, then actual gear
      // Zero-cost items should require 0 quantity, not 1
      const requiredQuantity =
        gearData.system?.cost ?? actualGear.system.cost ?? 0;
      const availableQuantity = actualGear.system.quantity || 0;

      if (availableQuantity < requiredQuantity) {
        validation.isValid = false;
        validation.errors.push(
          `Insufficient quantity of "${gearData.name}": need ${requiredQuantity}, have ${availableQuantity}`,
        );
      }

      // Handle zero-cost items
      if (requiredQuantity === 0) {
        Logger.debug(`Zero-cost gear item detected: ${gearData.name}`, {
          itemName: gearData.name,
          cost: requiredQuantity,
        });
      }
    } catch (error) {
      Logger.error(`Error validating gear item ${gearData.name}`, error);
      validation.isValid = false;
      validation.errors.push(
        `Validation error for "${gearData.name}": ${error.message}`,
      );
    }

    return validation;
  }

  /**
   * Get detailed inventory status for a gear item
   * @param {Actor} actor - The actor to check
   * @param {string} itemName - The name of the gear item
   * @returns {Object} Detailed status information
   */
  static getGearStatus(actor, itemName) {
    Logger.methodEntry("InventoryUtils", "getGearStatus", {
      actorName: actor?.name,
      itemName,
    });

    const status = {
      exists: false,
      equipped: false,
      quantity: 0,
      cost: 0,
      canUse: false,
      item: null,
    };

    if (!actor || !itemName) {
      Logger.methodExit("InventoryUtils", "getGearStatus", status);
      return status;
    }

    try {
      const gearItem = this.findGearByName(actor, itemName);

      if (gearItem) {
        status.exists = true;
        status.equipped = gearItem.system.equipped === true;
        status.quantity = gearItem.system.quantity || 0;
        status.cost = gearItem.system.cost || 0;
        status.canUse = status.equipped && status.quantity >= status.cost;
        status.item = gearItem;
      }

      Logger.debug("Gear status result", {
        actorName: actor.name,
        itemName,
        status,
      });

      Logger.methodExit("InventoryUtils", "getGearStatus", status);
      return status;
    } catch (error) {
      Logger.error("Error getting gear status", error);
      Logger.methodExit("InventoryUtils", "getGearStatus", status);
      return status;
    }
  }
}
