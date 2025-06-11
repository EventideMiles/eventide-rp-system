/**
 * Dice rolling service for the Eventide RP System
 *
 * @module services/managers/roll-dice
 */
import { getSetting } from "../_module.mjs";
import { ERPSRollUtilities } from "../../utils/_module.mjs";
import { erpsSoundManager } from "../_module.mjs";

const { renderTemplate } = foundry.applications.handlebars;

/**
 * Handles all dice rolling operations for the Eventide RP System
 *
 * This class is responsible for creating, evaluating, and displaying roll results
 * in chat messages, including handling critical hits/misses and custom styling.
 * It provides methods for standard rolls, initiative rolls, and roll styling.
 *
 * @class ERPSRollHandler
 */
class ERPSRollHandler {
  /**
   * Create a new ERPSRollHandler instance
   *
   * Initializes template paths, default options, and styling definitions for rolls.
   */
  constructor() {
    /**
     * Default roll templates for different roll types
     * @type {Object<string, string>}
     */
    this.templates = {
      standard: "systems/eventide-rp-system/templates/chat/roll-message.hbs",
      initiative:
        "systems/eventide-rp-system/templates/chat/initiative-roll.hbs",
    };

    /**
     * Default options for all rolls
     * @type {Object}
     */
    this.defaults = {
      formula: "1",
      label: "unknown roll",
      type: "unknown",
      className: "",
      critAllowed: true,
      acCheck: true,
      description: "",
      toMessage: true,
      rollMode: null, // Will use game setting if null
      soundKey: null, // Optional sound key for the sound manager
    };

    /**
     * Style definitions for roll types
     * Maps roll types to their styling classes and icons
     * @type {Object<string, string[]>}
     */
    this.rollTypeStyles = {
      acro: ["chat-card__header--acrobatics", "fa-solid fa-feather-pointed"],
      phys: ["chat-card__header--physical", "fa-solid fa-dragon"],
      fort: ["chat-card__header--fortitude", "fa-solid fa-shield"],
      will: ["chat-card__header--will", "fa-solid fa-fire-flame-curved"],
      wits: ["chat-card__header--wits", "fa-solid fa-chess"],
      gear: ["chat-card__header--gear", "fa-solid fa-toolbox"],
      damage: [
        "chat-card__header--damage",
        "fa-sharp-duotone fa-light fa-claw-marks",
      ],
      heal: ["chat-card__header--heal", "fa-regular fa-wave-pulse"],
      initiative: [
        "chat-card__header--initiative",
        "fa-solid fa-hourglass-start",
      ],
      default: ["chat-card__header--unknown", "fa-solid fa-question"],
    };
  }

  /**
   * Determine the appropriate card styling based on roll type
   *
   * @private
   * @param {string} type - The roll type identifier
   * @returns {string[]} An array containing [cardClass, icon]
   */
  _getCardStyling(type) {
    const lowerType = type.toLowerCase();
    return this.rollTypeStyles[lowerType] || this.rollTypeStyles.default;
  }

  /**
   * Create chat message data with proper visibility settings
   *
   * @private
   * @param {Object} options - Message configuration options
   * @param {ChatSpeakerData} options.speaker - The message speaker
   * @param {string} options.content - The message content HTML
   * @param {string} [options.sound=CONFIG.sounds.dice] - Sound to play
   * @param {Roll[]} options.rolls - Array of Roll objects
   * @param {string} [options.type="unknown"] - Roll type identifier
   * @param {string} [options.formula=""] - Roll formula
   * @param {number} [options.total=0] - Roll total
   * @param {string} [options.rollMode="roll"] - Roll visibility mode
   * @param {string} [options.soundKey=null] - Optional custom sound key
   * @returns {Object} ChatMessage creation data
   */
  _createMessageData({
    speaker,
    content,
    sound = CONFIG.sounds.dice,
    rolls,
    type = "unknown",
    formula = "",
    total = 0,
    rollMode = "roll",
    soundKey = null,
  }) {
    // Create the message data structure
    const messageData = {
      speaker,
      content,
      sound,
      rolls,
      flags: {
        "eventide-rp-system": {
          roll: {
            type,
            formula,
            total,
          },
        },
      },
    };

    // Handle custom sounds
    this._addSoundToMessageData(messageData, soundKey);

    // Apply roll mode visibility settings
    this._applyRollModeSettings(messageData, rollMode);

    return messageData;
  }

  /**
   * Add sound data to message data
   *
   * @private
   * @param {Object} messageData - The message data object to modify
   * @param {string|null} soundKey - The sound key to add
   */
  _addSoundToMessageData(messageData, soundKey) {
    if (!soundKey) return;

    // Play sound locally for immediate feedback
    erpsSoundManager._playLocalSound(soundKey);

    // Set built-in sound to null since we're using our own system
    messageData.sound = null;

    // Add sound data to flags for remote playback
    messageData.flags["eventide-rp-system"].sound = {
      key: soundKey,
      force: false,
    };
  }

  /**
   * Apply roll mode visibility settings to message data
   *
   * @private
   * @param {Object} messageData - The message data object to modify
   * @param {string} rollMode - The roll mode to apply
   */
  _applyRollModeSettings(messageData, rollMode) {
    if (rollMode !== "roll") {
      messageData.rollMode = rollMode;

      // Handle GM-only rolls
      if (rollMode === "gmroll" || rollMode === "blindroll") {
        messageData.whisper = game.users
          .filter((user) => user.isGM)
          .map((user) => user.id);
      }
    }
  }

  /**
   * Process a roll and generate appropriate chat messages
   *
   * @async
   * @param {Object} options - Roll configuration options
   * @param {string} [options.formula="1"] - The dice formula to roll
   * @param {string} [options.label="unknown roll"] - Display name for the roll
   * @param {string} [options.type="unknown"] - Type of roll (ability code, "damage", etc.)
   * @param {string} [options.className=""] - Additional CSS class for styling
   * @param {boolean} [options.critAllowed=true] - Whether critical hits/misses are possible
   * @param {boolean} [options.acCheck=true] - Whether to check against target AC values
   * @param {string} [options.description=""] - Optional description text
   * @param {boolean} [options.toMessage=true] - Whether to create a chat message
   * @param {string} [options.rollMode=null] - Roll visibility mode
   * @param {string} [options.soundKey=null] - Optional sound key
   * @param {Actor} actor - Actor performing the roll
   * @returns {Promise<Roll>} The evaluated roll
   */
  async handleRoll(
    {
      formula = this.defaults.formula,
      label = this.defaults.label,
      type = this.defaults.type,
      className = this.defaults.className,
      critAllowed = this.defaults.critAllowed,
      acCheck = this.defaults.acCheck,
      description = this.defaults.description,
      toMessage = this.defaults.toMessage,
      rollMode = this.defaults.rollMode,
      soundKey = this.defaults.soundKey,
      img = null,
      bgColor = null,
      textColor = null,
    } = {},
    actor,
  ) {
    // Create and evaluate the roll
    const { roll, result } = await this._createAndEvaluateRoll(formula, actor);

    // Get targets and check data
    const { addCheck, targetArray, targetRollData } = await this._getTargetData(
      acCheck,
      result,
    );

    // Determine critical states
    const criticalStates = this._determineCriticalStates(
      result,
      actor,
      formula,
      critAllowed,
    );

    // Prepare template data
    const templateData = this._prepareRollTemplateData({
      actor,
      roll: result,
      formula,
      label,
      description,
      type,
      className,
      critAllowed,
      addCheck,
      targetArray,
      targetRollData,
      criticalStates,
      img,
      bgColor,
      textColor,
    });

    // Render the template and create chat message if requested
    if (toMessage) {
      await this._createRollChatMessage({
        actor,
        roll: result,
        formula,
        type,
        templateData,
        rollMode,
        soundKey,
      });
    }

    return roll;
  }

  /**
   * Create and evaluate a roll
   *
   * @private
   * @param {string} formula - The dice formula to roll
   * @param {Actor} actor - The actor performing the roll
   * @returns {Promise<Object>} Object containing the roll and result
   */
  async _createAndEvaluateRoll(formula, actor) {
    // Get actor data and create the roll
    const rollData = actor.getRollData();
    const roll = new Roll(formula, rollData);

    // Evaluate the roll
    const result = await roll.evaluate();

    return { roll, result, rollData };
  }

  /**
   * Get target data for AC checks
   *
   * @private
   * @param {boolean} acCheck - Whether to check against AC
   * @param {Object} result - The roll result
   * @returns {Promise<Object>} Object containing target data
   */
  async _getTargetData(acCheck, result) {
    // Get targets if needed for AC checks
    const targetArray = await erps.utils.getTargetArray();
    const addCheck = (acCheck ?? true) && targetArray.length ? true : false;

    // Get target data for AC checks if applicable
    const targetRollData = addCheck
      ? targetArray.map((target) => ({
          name: target.actor.name,
          compare: result.total,
          ...target.actor.getRollData(),
        }))
      : [];

    return { addCheck, targetArray, targetRollData };
  }

  /**
   * Determine critical hit/miss states
   *
   * @private
   * @param {Object} result - The roll result
   * @param {Actor} actor - The actor performing the roll
   * @param {string} formula - The dice formula
   * @param {boolean} critAllowed - Whether critical hits/misses are allowed
   * @returns {Object} Object containing critical state flags
   */
  _determineCriticalStates(result, actor, formula, critAllowed) {
    // Normalize roll type
    const rollData = actor.getRollData();

    // Determine critical hit/miss states
    return ERPSRollUtilities.determineCriticalStates({
      roll: result,
      thresholds: rollData.hiddenAbilities,
      formula,
      critAllowed,
    });
  }

  /**
   * Prepare data for roll template
   *
   * @private
   * @param {Object} options - Template data options
   * @returns {Object} Prepared template data
   */
  _prepareRollTemplateData({
    actor,
    roll,
    formula,
    label,
    description,
    type,
    className,
    critAllowed,
    addCheck,
    targetArray,
    targetRollData,
    criticalStates,
    img,
    bgColor,
    textColor,
  }) {
    // Get styling for this roll type
    const pickedType = type.toLowerCase();
    const [pickedCardClass, pickedIcon] = this._getCardStyling(pickedType);

    // Prepare template data
    return {
      rollData: actor.getRollData(),
      roll,
      result: roll,
      label,
      description,
      pickedCardClass,
      pickedIcon,
      pickedType,
      className,
      critAllowed,
      hasRoll: true,
      acCheck: addCheck,
      targetArray,
      targetRollData,
      actor,
      critHit: criticalStates.critHit ?? false,
      critMiss: criticalStates.critMiss ?? false,
      savedMiss: criticalStates.savedMiss ?? false,
      stolenCrit: criticalStates.stolenCrit ?? false,
      // Add these properties for initiative template compatibility
      name: actor.name,
      total: roll.total,
      formula,
      // Add image and styling data
      item: img ? { img, name: label } : null,
      bgColor,
      textColor,
    };
  }

  /**
   * Create a chat message for the roll
   *
   * @private
   * @param {Object} options - Options for creating the chat message
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async _createRollChatMessage({
    actor,
    roll,
    formula,
    type,
    templateData,
    rollMode,
    soundKey,
  }) {
    // Render the appropriate template
    const content = await renderTemplate(this.templates.standard, templateData);

    // Create chat message
    const messageData = this._createMessageData({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      rolls: [roll],
      type: type.toLowerCase(),
      formula,
      total: roll.total,
      rollMode,
      soundKey,
    });

    return await ChatMessage.create(messageData);
  }

  /**
   * Handle initiative rolls with custom visibility
   *
   * Creates a special initiative-specific roll with additional styling
   * and handles visibility based on settings and combatant type.
   *
   * @public
   * @param {Object} options - Options for the initiative roll
   * @param {Combatant} options.combatant - The combatant rolling initiative
   * @param {boolean} [options.npc=false] - Whether the combatant is an NPC
   * @param {boolean} [options.whisperMode=false] - Whether to whisper the roll to GMs only
   * @param {string} [options.description=""] - Optional description to include in the message
   * @param {string} [options.customFlavor=""] - Optional custom flavor text for the roll
   * @param {string} [options.soundKey=null] - Optional sound key for the sound manager
   * @returns {Promise<Roll>} The evaluated roll
   */
  async rollInitiative({
    combatant,
    whisperMode = false,
    description = "",
    customFlavor = "",
  }) {
    // Get initiative settings
    const hideNpcInitiativeRolls = this._getInitiativeSettings();

    // Determine if this is an NPC and should be whispered
    const isNpc = combatant.actor && !combatant.actor.hasPlayerOwner;
    const shouldWhisper = (hideNpcInitiativeRolls && isNpc) || whisperMode;

    // Create and evaluate the initiative roll
    const roll = await this._createInitiativeRoll(combatant);

    // Update combatant initiative value
    await this._updateCombatantInitiative(combatant, roll);

    // Create initiative message
    await this._createInitiativeMessage({
      combatant,
      roll,
      isNpc,
      shouldWhisper,
      description,
      customFlavor,
    });

    return roll;
  }

  /**
   * Get initiative settings
   *
   * @private
   * @returns {boolean} Whether to hide NPC initiative rolls
   */
  _getInitiativeSettings() {
    try {
      return getSetting("hideNpcInitiativeRolls");
    } catch (error) {
      console.warn("Error getting hideNpcInitiativeRolls setting:", error);
      return false;
    }
  }

  /**
   * Create and evaluate an initiative roll
   *
   * @private
   * @param {Combatant} combatant - The combatant rolling initiative
   * @returns {Promise<Roll>} The evaluated roll
   */
  async _createInitiativeRoll(combatant) {
    // Get initiative formula from settings or combatant
    const formula = CONFIG.Combat.initiative.formula;

    // Create and evaluate the roll
    const roll = new Roll(formula, combatant.actor?.getRollData() || {});
    await roll.evaluate();

    return roll;
  }

  /**
   * Update combatant initiative value
   *
   * @private
   * @param {Combatant} combatant - The combatant to update
   * @param {Roll} roll - The initiative roll result
   * @returns {Promise<void>}
   */
  async _updateCombatantInitiative(combatant, roll) {
    const combat = combatant.parent;
    await combat.updateEmbeddedDocuments("Combatant", [
      {
        _id: combatant.id,
        initiative: roll.total,
      },
    ]);
  }

  /**
   * Create initiative chat message
   *
   * @private
   * @param {Object} options - Options for creating the message
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async _createInitiativeMessage({
    combatant,
    roll,
    isNpc,
    shouldWhisper,
    description,
  }) {
    // Prepare template data
    const data = {
      name: combatant.name,
      formula: roll.formula,
      npc: isNpc,
      total: roll.total.toFixed(2),
      description,
      roll, // Pass the roll object to the template
    };

    // Render the template
    const content = await renderTemplate(this.templates.initiative, data);

    // Prepare the message data
    const messageData = this._createMessageData({
      speaker: ChatMessage.getSpeaker({ actor: combatant.actor }),
      content,
      rolls: [roll],
      type: "initiative",
      formula: roll.formula,
      total: roll.total,
      rollMode: shouldWhisper ? "gmroll" : "roll",
      soundKey: "initiative",
    });

    return await ChatMessage.create(messageData);
  }
}

// Export a singleton instance
export const erpsRollHandler = new ERPSRollHandler();

/**
 * Handle a roll for an actor (backward compatibility function)
 * @param {Object} options - Roll options
 * @param {Actor} actor - The actor performing the roll
 * @returns {Promise<ChatMessage>} The created chat message
 */
export const handleRoll = (options, actor) =>
  erpsRollHandler.handleRoll(options, actor);

/**
 * Roll initiative for a combatant (backward compatibility function)
 * @param {Object} options - Initiative roll options
 * @param {Combatant} options.combatant - The combatant rolling initiative
 * @param {boolean} [options.whisperMode=false] - Whether to whisper the roll
 * @param {string} [options.description=""] - Optional description
 * @param {string} [options.customFlavor=""] - Optional custom flavor text
 * @returns {Promise<Roll>} The evaluated roll
 */
export const rollInitiative = (options) =>
  erpsRollHandler.rollInitiative(options);
