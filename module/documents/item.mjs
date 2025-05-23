import { Logger } from "../services/logger.mjs";
import {
  ItemRollsMixin,
  ItemPopupsMixin,
  ItemUtilitiesMixin,
} from "./mixins/_module.mjs";

/**
 * Extended Item document class for the Eventide RP System.
 *
 * Represents an item in the Eventide RP System, extending the base Foundry VTT Item class.
 * This class composes multiple mixins to provide comprehensive item functionality including
 * roll calculations, popup handling, and utility operations.
 *
 * @extends {foundry.documents.Item}
 */
export class EventideRpSystemItem extends ItemRollsMixin(
  ItemPopupsMixin(ItemUtilitiesMixin(Item)),
) {
  /**
   * Prepare base item data
   * @override
   */
  prepareData() {
    Logger.methodEntry("EventideRpSystemItem", "prepareData");

    // Call the parent class' prepareData method to handle the core
    // data preparation steps like applying active effects
    super.prepareData();

    // Any item-specific data preparation should be added here in the future
    Logger.debug(
      "Prepared data for item",
      {
        itemName: this.name,
        itemType: this.type,
        hasSystem: !!this.system,
      },
      "ITEM_DATA",
    );

    Logger.methodExit("EventideRpSystemItem", "prepareData");
  }

  /**
   * Prepare data to be used for roll calculations
   * @override
   * @returns {Object} The prepared roll data
   */
  getRollData() {
    Logger.methodEntry("EventideRpSystemItem", "getRollData");

    try {
      // Start with a shallow copy of the item's system data
      const rollData = { ...this.system };

      // If there's no parent actor, return early
      if (!this.actor) {
        Logger.debug(
          "No parent actor found for item roll data",
          { itemName: this.name },
          "ITEM_DATA",
        );
        Logger.methodExit("EventideRpSystemItem", "getRollData", rollData);
        return rollData;
      }

      // Add the actor's roll data to provide context for the item
      rollData.actor = this.actor.getRollData();

      Logger.debug(
        "Prepared roll data for item",
        {
          itemName: this.name,
          hasActorData: !!rollData.actor,
          rollDataKeys: Object.keys(rollData),
        },
        "ITEM_DATA",
      );

      Logger.methodExit("EventideRpSystemItem", "getRollData", rollData);
      return rollData;
    } catch (error) {
      Logger.error("Error preparing roll data for item", error, "ITEM_DATA");

      // Return minimal fallback
      const fallback = { ...this.system };
      Logger.methodExit("EventideRpSystemItem", "getRollData", fallback);
      return fallback;
    }
  }

  /**
   * Get a summary of the item's current state
   *
   * @returns {Object} Summary object with key item information
   */
  getItemSummary() {
    return this.getSummary();
  }

  /**
   * Check if the item has a specific capability
   *
   * @param {string} capability - The capability to check for
   * @returns {boolean} Whether the item has the capability
   */
  hasCapability(capability) {
    switch (capability) {
      case "roll":
        return this.canRoll();
      case "popup":
        return this.hasPopupSupport();
      case "quantity":
        return this.hasQuantity();
      case "effects":
        return this.effects?.size > 0;
      default:
        Logger.warn(`Unknown capability check: ${capability}`, null, "ITEM");
        return false;
    }
  }

  /**
   * Get the item's display icon based on type and state
   *
   * @returns {string} CSS class for the item icon
   */
  getDisplayIcon() {
    const iconMap = {
      gear: "fa-solid fa-shield",
      combatPower: "fa-solid fa-bolt",
      feature: "fa-solid fa-star",
      status: "fa-solid fa-circle-info",
      transformation: "fa-solid fa-exchange-alt",
    };

    return iconMap[this.type] || "fa-solid fa-question";
  }

  /**
   * Get the item's priority for sorting
   *
   * @returns {number} Priority value (lower = higher priority)
   */
  getSortPriority() {
    const priorityMap = {
      combatPower: 1,
      gear: 2,
      feature: 3,
      transformation: 4,
      status: 5,
    };

    return priorityMap[this.type] || 999;
  }
}
