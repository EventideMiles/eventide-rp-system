/**
 * ChatMessageBuilder Service
 *
 * Provides centralized chat message building for action card execution.
 * Handles failure messages, resource failure messages, and other common
 * chat message patterns used throughout the system.
 *
 * @module ChatMessageBuilder
 * @see module:item-action-card-execution
 * @see module:resource-validator
 */

import { Logger } from "./logger.mjs";

// Import renderTemplate from Foundry
const { renderTemplate } = foundry.applications.handlebars;

/**
 * @typedef {Object} ResourceCheckResult
 * @property {boolean} canExecute - Whether execution can proceed
 * @property {string} [reason] - Failure reason code
 * @property {number} [required] - Required resource amount
 * @property {number} [available] - Available resource amount
 */

/**
 * @typedef {Object} CardDisplayData
 * @property {string} name - Card name
 * @property {string} img - Card image URL
 * @property {string} [textColor] - Text color
 * @property {string} [bgColor] - Background color
 * @property {boolean} [rollActorName] - Whether to show actor name
 */

/**
 * @typedef {Object} FailureMessageOptions
 * @property {Actor} actor - The executing actor
 * @property {ResourceCheckResult} resourceCheck - The validation result
 * @property {Item} embeddedItem - The embedded item that failed
 * @property {number} repetitionIndex - Current repetition index (0-based)
 * @property {number|null} [repetitionCount] - Total repetitions (optional)
 * @property {CardDisplayData} cardData - Action card display data
 */

/**
 * @typedef {Object} RepetitionFailureOptions
 * @property {Actor} actor - The actor that attempted to execute
 * @property {string} cardName - The action card name
 * @property {number} repetitionCount - The failed repetition count
 * @property {Roll} repetitionsRoll - The roll that determined the count
 * @property {boolean} [rollActorName] - Whether to show actor name
 */

/**
 * @typedef {Object} RepetitionInfo
 * @property {number} current - Current repetition (1-based)
 * @property {number} total - Total repetitions
 * @property {number} completed - Completed repetitions
 */

/**
 * ChatMessageBuilder class for building chat messages
 *
 * @class ChatMessageBuilder
 */
export class ChatMessageBuilder {
  /**
   * Template path for action card failure messages
   * @static
   * @type {string}
   */
  static FAILURE_TEMPLATE =
    "systems/eventide-rp-system/templates/chat/action-card-failure-message.hbs";

  /**
   * Send a resource failure message to chat
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
      const failureContent = ChatMessageBuilder._buildResourceFailureContent(
        resourceCheck,
        embeddedItem,
      );

      const templateData = ChatMessageBuilder._buildResourceFailureTemplateData(
        cardData,
        repetitionIndex,
        repetitionCount,
        resourceCheck,
        failureContent,
      );

      const content = await renderTemplate(
        ChatMessageBuilder.FAILURE_TEMPLATE,
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

  /**
   * Send a repetition failure message to chat
   *
   * @static
   * @param {RepetitionFailureOptions} options - Message options
   * @returns {Promise<void>}
   */
  static async sendRepetitionFailureMessage(options) {
    const { actor, cardName, repetitionCount, repetitionsRoll, rollActorName } =
      options;

    try {
      const displayName = rollActorName !== false ? cardName : "Action Card";
      const messageData = {
        speaker: ChatMessage.getSpeaker({ actor }),
        content: ChatMessageBuilder._buildRepetitionFailureContent(
          displayName,
          repetitionCount,
          repetitionsRoll,
        ),
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      };

      await ChatMessage.create(messageData);
    } catch (error) {
      Logger.error("Failed to send failure message", error, "ACTION_CARD");
    }
  }

  /**
   * Build the content for a resource failure message
   *
   * @private
   * @static
   * @param {ResourceCheckResult} resourceCheck - The validation result
   * @param {Item} embeddedItem - The embedded item
   * @returns {{title: string, message: string}} Failure content
   */
  static _buildResourceFailureContent(resourceCheck, embeddedItem) {
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

    return { title: failureTitle, message: failureMessage };
  }

  /**
   * Build template data for resource failure message
   *
   * @private
   * @static
   * @param {CardDisplayData} cardData - Card display data
   * @param {number} repetitionIndex - Current repetition index
   * @param {number|null} repetitionCount - Total repetitions
   * @param {ResourceCheckResult} resourceCheck - Resource check result
   * @param {{title: string, message: string}} failureContent - Failure content
   * @returns {Object} Template data
   */
  static _buildResourceFailureTemplateData(
    cardData,
    repetitionIndex,
    repetitionCount,
    resourceCheck,
    failureContent,
  ) {
    return {
      actionCard: {
        name: cardData.rollActorName !== false ? cardData.name : "",
        img: cardData.img,
      },
      style: cardData.textColor
        ? `color: ${cardData.textColor}; background-color: ${cardData.bgColor || "#8B0000"}`
        : "background-color: #8B0000",
      repetitionInfo: repetitionCount
        ? ChatMessageBuilder._buildRepetitionInfo(
            repetitionIndex,
            repetitionCount,
          )
        : null,
      failureTitle: failureContent.title,
      failureMessage: failureContent.message,
      resourceInfo: {
        required: resourceCheck.required,
        available: resourceCheck.available,
      },
    };
  }

  /**
   * Build repetition info object
   *
   * @private
   * @static
   * @param {number} repetitionIndex - Current repetition index (0-based)
   * @param {number} repetitionCount - Total repetitions
   * @returns {RepetitionInfo} Repetition info object
   */
  static _buildRepetitionInfo(repetitionIndex, repetitionCount) {
    return {
      current: repetitionIndex + 1,
      total: repetitionCount,
      completed: repetitionIndex,
    };
  }

  /**
   * Build HTML content for repetition failure message
   *
   * @private
   * @static
   * @param {string} displayName - The display name for the card
   * @param {number} repetitionCount - The failed repetition count
   * @param {Roll} repetitionsRoll - The roll that determined the count
   * @returns {string} HTML content string
   */
  static _buildRepetitionFailureContent(
    displayName,
    repetitionCount,
    repetitionsRoll,
  ) {
    return `
      <div class="action-card-failure">
        <h3>${displayName} - Execution Failed</h3>
        <p><strong>Repetitions Roll:</strong> ${repetitionsRoll.formula} = ${repetitionCount}</p>
        <p class="failure-reason">Action failed due to insufficient repetitions (${repetitionCount} ≤ 0)</p>
      </div>
    `;
  }
}
