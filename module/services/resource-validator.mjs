/**
 * ResourceValidator Service
 *
 * Provides centralized resource validation for action card execution.
 * Validates if embedded items have sufficient resources (power for combatPowers,
 * quantity for gear) before execution.
 *
 * @module ResourceValidator
 * @see module:item-action-card-execution
 */

import { Logger } from "./logger.mjs";
import { InventoryUtils } from "../helpers/_module.mjs";
import { ChatMessageBuilder } from "./chat-message-builder.mjs";

/**
 * @typedef {Object} ResourceCheckResult
 * @property {boolean} canExecute - Whether execution can proceed
 * @property {string} [reason] - Failure reason code ("noEmbeddedItem" | "noGearInInventory" | "insufficientPower" | "insufficientQuantity")
 * @property {number} [required] - Required resource amount
 * @property {number} [available] - Available resource amount
 */

/**
 * @typedef {Object} FailureMessageOptions
 * @property {Actor} actor - The executing actor
 * @property {ResourceCheckResult} resourceCheck - The validation result
 * @property {Item} embeddedItem - The embedded item that failed
 * @property {number} repetitionIndex - Current repetition index (0-based)
 * @property {number|null} [repetitionCount] - Total repetitions (optional)
 * @property {Object} cardData - Action card display data
 * @property {string} cardData.name - Card name
 * @property {string} cardData.img - Card image URL
 * @property {string} [cardData.textColor] - Text color
 * @property {string} [cardData.bgColor] - Background color
 * @property {boolean} [cardData.rollActorName] - Whether to show actor name
 */

/**
 * ResourceValidator class for validating embedded item resources
 *
 * @class ResourceValidator
 */
export class ResourceValidator {
  /**
   * Check if embedded item has sufficient resources to execute
   *
   * @static
   * @param {Item} embeddedItem - The embedded item to check
   * @param {Actor} actor - The actor executing the action card
   * @param {boolean} [shouldConsumeCost=true] - Whether to check cost consumption
   * @returns {ResourceCheckResult} Validation result
   */
  static checkEmbeddedItemResources(
    embeddedItem,
    actor,
    shouldConsumeCost = true,
  ) {
    if (!embeddedItem) {
      return { canExecute: false, reason: "noEmbeddedItem" };
    }

    // Check combat power costs
    if (embeddedItem.type === "combatPower") {
      const powerCost = shouldConsumeCost ? embeddedItem.system.cost || 0 : 0;
      const currentPower = actor.system.power?.value || 0;

      if (powerCost > currentPower) {
        return {
          canExecute: false,
          reason: "insufficientPower",
          required: powerCost,
          available: currentPower,
        };
      }
    }

    // Check gear quantity costs
    // IMPORTANT: Must check the actual gear item in the actor's inventory,
    // not the embedded item data which is just a snapshot
    if (embeddedItem.type === "gear") {
      const gearCost = shouldConsumeCost ? embeddedItem.system.cost || 0 : 0;

      // DEBUG: Log gear validation details
      Logger.debug(
        "ResourceValidator.checkEmbeddedItemResources - Gear check",
        {
          embeddedItemName: embeddedItem.name,
          embeddedItemType: embeddedItem.type,
          embeddedItemCost: embeddedItem.system.cost,
          gearCost,
          shouldConsumeCost,
          actorName: actor?.name,
        },
      );

      // Find the actual gear item in the actor's inventory
      const actualGearItem = InventoryUtils.findGearByName(
        actor,
        embeddedItem.name,
        gearCost,
      );

      // DEBUG: Log found gear item
      Logger.debug(
        "ResourceValidator.checkEmbeddedItemResources - Found gear",
        {
          found: !!actualGearItem,
          actualGearItemId: actualGearItem?.id,
          actualGearItemName: actualGearItem?.name,
          actualGearItemQuantity: actualGearItem?.system?.quantity,
        },
      );

      if (!actualGearItem) {
        Logger.warn(
          "ResourceValidator.checkEmbeddedItemResources - Gear not found in inventory",
          {
            embeddedItemName: embeddedItem.name,
            gearCost,
          },
        );
        return {
          canExecute: false,
          reason: "noGearInInventory",
          required: gearCost,
          available: 0,
        };
      }

      const currentQuantity = actualGearItem.system.quantity || 0;

      // DEBUG: Log quantity comparison
      Logger.debug(
        "ResourceValidator.checkEmbeddedItemResources - Quantity check",
        {
          gearCost,
          currentQuantity,
          canFulfill: gearCost <= currentQuantity,
        },
      );

      if (gearCost > currentQuantity) {
        Logger.warn(
          "ResourceValidator.checkEmbeddedItemResources - Insufficient quantity",
          {
            gearCost,
            currentQuantity,
            embeddedItemName: embeddedItem.name,
          },
        );
        return {
          canExecute: false,
          reason: "insufficientQuantity",
          required: gearCost,
          available: currentQuantity,
        };
      }
    }

    return { canExecute: true };
  }

  /**
   * Send resource failure message to chat
   *
   * @static
   * @param {FailureMessageOptions} options - Message options
   * @returns {Promise<void>}
   */
  static async sendResourceFailureMessage(options) {
    return ChatMessageBuilder.sendResourceFailureMessage(options);
  }
}
