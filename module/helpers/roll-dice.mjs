import { getSetting } from "./settings.mjs";
import { erpsRollUtilities } from "./roll-utilities.mjs";

/**
 * ERPSRollHandler - Handles all dice rolling operations for the Eventide RP System
 * @class
 */
class ERPSRollHandler {
  constructor() {
    // Default roll templates
    this.templates = {
      standard: "systems/eventide-rp-system/templates/chat/roll-message.hbs",
      initiative:
        "systems/eventide-rp-system/templates/chat/initiative-roll.hbs",
    };

    // Default roll options
    this.defaults = {
      formula: "1",
      label: "unknown roll",
      type: "unknown",
      critAllowed: true,
      acCheck: true,
      description: "",
      toMessage: true,
      rollMode: null, // Will use game setting if null
    };

    // Roll type styling map - maps roll types to their styling classes and icons
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
   * @private
   * @param {string} type - The roll type
   * @returns {Array} An array containing [cardClass, icon]
   */
  _getCardStyling(type) {
    const lowerType = type.toLowerCase();
    return this.rollTypeStyles[lowerType] || this.rollTypeStyles.default;
  }

  /**
   * Create chat message data with proper visibility settings
   * @private
   * @param {Object} options - Message data options
   * @param {ChatSpeakerData} options.speaker - The message speaker
   * @param {string} options.content - The message content HTML
   * @param {Array<Roll>} options.rolls - Array of Roll objects
   * @param {string} [options.type="unknown"] - Roll type
   * @param {string} [options.formula=""] - Roll formula
   * @param {number} [options.total=0] - Roll total
   * @param {string} [options.rollMode="roll"] - Roll mode for visibility
   * @returns {Object} Chat message data object
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
  }) {
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

    // Apply roll mode if specified
    if (rollMode !== "roll") {
      messageData.rollMode = rollMode;
      if (rollMode === "gmroll" || rollMode === "blindroll") {
        messageData.whisper = game.users
          .filter((user) => user.isGM)
          .map((user) => user.id);
      }
    }

    return messageData;
  }

  /**
   * Process a roll and generate appropriate chat messages
   * @public
   * @param {Object} options - Roll options
   * @param {string} [options.formula="1"] - The dice formula to roll (e.g. "1d20+5")
   * @param {string} [options.label="unknown roll"] - Display name for the roll
   * @param {string} [options.type="unknown"] - Type of roll (e.g. "damage", "heal", ability code)
   * @param {boolean} [options.critAllowed=true] - Whether critical hits/misses are possible
   * @param {boolean} [options.acCheck=true] - Whether to check against target AC values
   * @param {string} [options.description=""] - Optional description of the roll
   * @param {boolean} [options.toMessage=true] - Whether to create a chat message
   * @param {Actor} actor - Actor performing the roll
   * @returns {Promise<Roll>} - Resolved promise containing the evaluated roll
   */
  async handleRoll(
    {
      formula = this.defaults.formula,
      label = this.defaults.label,
      type = this.defaults.type,
      critAllowed = this.defaults.critAllowed,
      acCheck = this.defaults.acCheck,
      description = this.defaults.description,
      toMessage = this.defaults.toMessage,
      rollMode = this.defaults.rollMode,
    } = {},
    actor
  ) {
    const rollData = actor.getRollData();
    const roll = new Roll(formula, rollData);
    const result = await roll.evaluate();
    const targetArray = await erps.utils.getTargetArray();
    const addCheck = (acCheck ?? true) && targetArray.length ? true : false;

    const pickedType = type.toLowerCase();

    // Determine critical states using the helper method
    const { critHit, critMiss, stolenCrit, savedMiss } =
      erpsRollUtilities.determineCriticalStates({
        roll: result,
        thresholds: rollData.hiddenAbilities,
        formula,
        critAllowed,
      });

    const targetRollData = addCheck
      ? targetArray.map((target) => ({
          name: target.actor.name,
          compare: result.total,
          ...target.actor.getRollData(),
        }))
      : [];

    const [pickedCardClass, pickedIcon] = this._getCardStyling(pickedType);

    const data = {
      rollData,
      roll,
      result,
      label,
      description,
      pickedCardClass,
      pickedIcon,
      pickedType,
      critAllowed,
      acCheck: addCheck,
      targetArray,
      targetRollData,
      actor,
      critHit: critHit ?? false,
      critMiss: critMiss ?? false,
      savedMiss: savedMiss ?? false,
      stolenCrit: stolenCrit ?? false,
      // Add these properties to match initiative roll template
      name: actor.name,
      total: result.total,
      formula: formula,
    };

    const content = await renderTemplate(this.templates.standard, data);

    if (toMessage) {
      // Create the chat message
      const messageData = this._createMessageData({
        speaker: ChatMessage.getSpeaker({ actor }),
        content,
        rolls: [roll],
        type: pickedType,
        formula,
        total: result.total,
        rollMode,
      });

      ChatMessage.create(messageData);
    }

    return roll;
  }

  /**
   * Handle initiative rolls with custom visibility
   * @public
   * @param {Object} options - Options for the initiative roll
   * @param {Combatant} options.combatant - The combatant rolling initiative
   * @param {boolean} [options.whisperMode=false] - Whether to whisper the roll to GMs only
   * @param {string} [options.description=""] - Optional description to include in the message
   * @param {string} [options.customFlavor=""] - Optional custom flavor text for the roll
   * @returns {Promise<Roll>} The evaluated roll
   */
  async rollInitiative({
    combatant,
    whisperMode = false,
    description = "",
    customFlavor = "",
  }) {
    // Get initiative settings
    let hideNpcInitiativeRolls = false;
    try {
      hideNpcInitiativeRolls = getSetting("hideNpcInitiativeRolls");
    } catch (error) {
      console.warn("Error getting hideNpcInitiativeRolls setting:", error);
      hideNpcInitiativeRolls = false;
    }

    // Determine if this is an NPC and should be whispered
    const isNpc = combatant.actor && !combatant.actor.hasPlayerOwner;
    const shouldWhisper = (hideNpcInitiativeRolls && isNpc) || whisperMode;

    // Get initiative formula from settings or combatant
    let formula = CONFIG.Combat.initiative.formula;

    // Create and evaluate the roll
    const roll = new Roll(formula, combatant.actor?.getRollData() || {});
    await roll.evaluate();

    // Set combatant initiative
    const combat = combatant.parent;
    await combat.updateEmbeddedDocuments("Combatant", [
      {
        _id: combatant.id,
        initiative: roll.total,
      },
    ]);

    // Prepare template data
    const data = {
      name: combatant.name,
      formula: roll.formula,
      total: roll.total.toFixed(2),
      description: description,
      roll: roll, // Pass the roll object to the template
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
    });

    ChatMessage.create(messageData);
    return roll;
  }
}

// Export a singleton instance
export const erpsRollHandler = new ERPSRollHandler();

// For backward compatibility
export const handleRoll = (options, actor) =>
  erpsRollHandler.handleRoll(options, actor);
export const rollInitiative = (options) =>
  erpsRollHandler.rollInitiative(options);
