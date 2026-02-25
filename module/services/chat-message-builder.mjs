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
import { erpsSoundManager } from "./managers/sound-manager.mjs";
import { ERPSRollUtilities } from "../utils/_module.mjs";

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

  /**
   * Render a Handlebars template and return the HTML content
   *
   * @static
   * @param {string} templatePath - Path to the Handlebars template
   * @param {Object} templateData - Data to pass to the template
   * @returns {Promise<string>} The rendered HTML content, or empty string on error
   */
  static async renderTemplateContent(templatePath, templateData) {
    try {
      return await renderTemplate(templatePath, templateData);
    } catch (error) {
      Logger.error(
        `Failed to render template: ${templatePath}`,
        error,
        "CHAT_MESSAGE_BUILDER",
      );
      return "";
    }
  }

  /**
   * Build speaker data for a chat message
   *
   * @static
   * @param {Actor|TokenDocument|null} speakerActor - Actor for speaker data
   * @param {string|null} [speakerHeaderKey=null] - i18n key for message header alias
   * @param {boolean} [useERPSRollUtilities=false] - Use ERPSRollUtilities.getSpeaker() instead of ChatMessage.getSpeaker()
   * @returns {ChatSpeakerData} Speaker data object
   */
  static buildSpeakerData(
    speakerActor,
    speakerHeaderKey = null,
    useERPSRollUtilities = false,
  ) {
    if (useERPSRollUtilities) {
      return ERPSRollUtilities.getSpeaker(speakerActor, speakerHeaderKey);
    }

    const speakerData = speakerActor ? { actor: speakerActor } : {};

    if (speakerHeaderKey && speakerActor?.name) {
      speakerData.alias = game.i18n.format(speakerHeaderKey, {
        name: speakerActor.name,
      });
    }

    return ChatMessage.getSpeaker(speakerData);
  }

  /**
   * Build message data object for ChatMessage.create()
   *
   * @static
   * @param {Object} options - Message data options
   * @param {string} options.content - HTML content for the message
   * @param {ChatSpeakerData} options.speaker - Speaker data
   * @param {string|null} [options.sound=null] - Built-in sound (usually null when using custom sounds)
   * @param {Roll[]} [options.rolls=[]] - Roll objects
   * @param {string} [options.rollMode=null] - Roll visibility mode
   * @param {string|null} [options.soundKey=null] - Custom sound key
   * @param {boolean} [options.forceSound=false] - Force sound playback
   * @param {Object|null} [options.rollFlags=null] - Roll data for flags
   * @param {Object|null} [options.customFlags=null] - Custom flags to merge
   * @returns {Object} Message data object for ChatMessage.create()
   */
  static buildMessageData({
    content,
    speaker,
    sound = null,
    rolls = [],
    rollMode = null,
    soundKey = null,
    forceSound = false,
    rollFlags = null,
    customFlags = null,
  }) {
    const messageData = {
      speaker,
      content,
      sound,
      rolls,
      flags: {
        "eventide-rp-system": {},
      },
    };

    // Add sound data if provided
    if (soundKey) {
      ChatMessageBuilder.addSoundToMessageData(
        messageData,
        soundKey,
        forceSound,
      );
    }

    // Add roll flags if provided
    if (rollFlags) {
      messageData.flags["eventide-rp-system"].roll = rollFlags;
    }

    // Apply roll mode settings
    if (rollMode) {
      ChatMessageBuilder.applyRollModeSettings(messageData, rollMode);
    }

    // Merge custom flags
    if (customFlags) {
      ChatMessageBuilder.mergeCustomFlags(messageData, customFlags);
    }

    return messageData;
  }

  /**
   * Apply roll mode visibility settings to message data
   *
   * @static
   * @param {Object} messageData - Message data object to modify
   * @param {string} rollMode - Roll mode to apply ("gmroll", "blindroll", "selfroll", etc.)
   * @returns {Object} Modified message data object
   */
  static applyRollModeSettings(messageData, rollMode) {
    if (rollMode !== "roll") {
      messageData.rollMode = rollMode;

      // Handle GM-only rolls
      if (rollMode === "gmroll" || rollMode === "blindroll") {
        messageData.whisper = game.users
          .filter((user) => user.isGM)
          .map((user) => user.id);
      } else if (rollMode === "selfroll") {
        // Handle self-only rolls
        messageData.whisper = [game.user.id];
      }
    }

    return messageData;
  }

  /**
   * Add sound data to message data
   *
   * @static
   * @param {Object} messageData - Message data object to modify
   * @param {string|null} soundKey - Sound key from erpsSoundManager
   * @param {boolean} [force=false] - Force sound playback even if recently played
   * @returns {Object} Modified message data object
   */
  static addSoundToMessageData(messageData, soundKey, force = false) {
    if (!soundKey) return messageData;

    // Play sound locally for immediate feedback
    erpsSoundManager._playLocalSound(soundKey, { force });

    // Set built-in sound to null since we're using our own system
    messageData.sound = null;

    // Add sound data to flags for remote playback
    messageData.flags["eventide-rp-system"].sound = {
      key: soundKey,
      force,
    };

    return messageData;
  }

  /**
   * Merge custom flags into message data
   *
   * @static
   * @param {Object} messageData - Message data object to modify
   * @param {Object|null} customFlags - Custom flags to merge into eventide-rp-system flags
   * @returns {Object} Modified message data object
   */
  static mergeCustomFlags(messageData, customFlags) {
    if (!customFlags) return messageData;

    // Deep merge custom flags into eventide-rp-system flags
    messageData.flags["eventide-rp-system"] = foundry.utils.mergeObject(
      messageData.flags["eventide-rp-system"],
      customFlags,
      { inplace: true },
    );

    return messageData;
  }

  /**
   * Create a chat message with template rendering and optional sound/roll support
   *
   * This is the main entry point for creating chat messages with the ChatMessageBuilder service.
   * It orchestrates the full message creation process including template rendering,
   * speaker data building, message data construction, and message creation.
   *
   * @static
   * @param {Object} options - Message creation options
   * @param {string} options.templatePath - Path to the Handlebars template
   * @param {Object} options.templateData - Data to pass to the template
   * @param {Object} [options.messageOptions={}] - Additional options to merge into ChatMessage.create()
   * @param {Actor|TokenDocument|null} [options.speakerActor=null] - Actor for speaker data
   * @param {string|null} [options.speakerHeaderKey=null] - i18n key for message header alias
   * @param {string|null} [options.soundKey=null] - Sound key from erpsSoundManager
   * @param {boolean} [options.forceSound=false] - Force sound playback even if recently played
   * @param {Roll[]} [options.rolls=[]] - Roll objects to include in the message
   * @param {string} [options.rollMode=null] - Roll visibility mode ("roll", "gmroll", "blindroll", "selfroll")
   * @param {Object|null} [options.rollFlags=null] - Roll data to include in flags
   * @param {Object|null} [options.customFlags=null] - Custom flags to merge into eventide-rp-system flags
   * @param {boolean} [options.useERPSRollUtilitiesSpeaker=false] - Use ERPSRollUtilities.getSpeaker() instead of ChatMessage.getSpeaker()
   * @returns {Promise<ChatMessage>} The created chat message
   * @throws {Error} If template rendering or message creation fails
   */
  static async createMessage({
    templatePath,
    templateData,
    messageOptions = {},
    speakerActor = null,
    speakerHeaderKey = null,
    soundKey = null,
    forceSound = false,
    rolls = [],
    rollMode = null,
    rollFlags = null,
    customFlags = null,
    useERPSRollUtilitiesSpeaker = false,
  }) {
    try {
      // Render template
      const content = await ChatMessageBuilder.renderTemplateContent(
        templatePath,
        templateData,
      );

      // Build speaker data
      const speaker = ChatMessageBuilder.buildSpeakerData(
        speakerActor,
        speakerHeaderKey,
        useERPSRollUtilitiesSpeaker,
      );

      // Build message data
      const messageData = ChatMessageBuilder.buildMessageData({
        content,
        speaker,
        sound: null, // Always null when using custom sounds
        rolls,
        rollMode,
        soundKey,
        forceSound,
        rollFlags,
        customFlags,
      });

      // Merge additional message options
      const finalMessageData = foundry.utils.mergeObject(
        messageData,
        messageOptions,
        {
          inplace: false,
        },
      );

      // Create and return the message
      return await ChatMessage.create(finalMessageData);
    } catch (error) {
      Logger.error(
        "Failed to create chat message",
        error,
        "CHAT_MESSAGE_BUILDER",
      );
      throw error;
    }
  }
}
