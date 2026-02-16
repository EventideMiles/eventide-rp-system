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

// Import renderTemplate from Foundry
const { renderTemplate } = foundry.applications.handlebars;

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
    const {
      actor,
      resourceCheck,
      embeddedItem,
      repetitionIndex,
      repetitionCount = null,
      cardData,
    } = options;

    try {
      let failureTitle = "";
      let failureMessage = "";

      if (resourceCheck.reason === "insufficientPower") {
        failureTitle = game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.ResourceFailure.InsufficientPower.Title",
        );
        failureMessage = game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.ResourceFailure.InsufficientPower.Message",
          {
            itemName: embeddedItem.name,
            required: resourceCheck.required,
            available: resourceCheck.available,
          },
        );
      } else if (resourceCheck.reason === "insufficientQuantity") {
        failureTitle = game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.ResourceFailure.InsufficientQuantity.Title",
        );
        failureMessage = game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.ResourceFailure.InsufficientQuantity.Message",
          {
            itemName: embeddedItem.name,
            required: resourceCheck.required,
            available: resourceCheck.available,
          },
        );
      } else if (resourceCheck.reason === "noGearInInventory") {
        failureTitle = game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.ResourceFailure.GearNotFound.Title",
        );
        failureMessage = game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.ResourceFailure.GearNotFound.Message",
          {
            itemName: embeddedItem.name,
          },
        );
      } else {
        failureTitle = game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.ResourceFailure.Unknown.Title",
        );
        failureMessage = game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.ResourceFailure.Unknown.Message",
        );
      }

      // Issue #130: Respect rollActorName setting for template data
      const templateData = {
        actionCard: {
          name: cardData.rollActorName !== false ? cardData.name : "",
          img: cardData.img,
        },
        style: cardData.textColor
          ? `color: ${cardData.textColor}; background-color: ${cardData.bgColor || "#8B0000"}`
          : "background-color: #8B0000",
        repetitionInfo: repetitionCount
          ? {
              current: repetitionIndex + 1,
              total: repetitionCount,
              completed: repetitionIndex,
            }
          : null,
        failureTitle,
        failureMessage,
        resourceInfo: {
          required: resourceCheck.required,
          available: resourceCheck.available,
        },
      };

      const content = await renderTemplate(
        "systems/eventide-rp-system/templates/chat/action-card-failure-message.hbs",
        templateData,
      );

      const messageData = {
        speaker: ChatMessage.getSpeaker({ actor }),
        content,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      };

      await ChatMessage.create(messageData);
    } catch (error) {
      Logger.error(
        "Failed to send resource failure message",
        error,
        "ACTION_CARD",
      );
    }
  }
}
