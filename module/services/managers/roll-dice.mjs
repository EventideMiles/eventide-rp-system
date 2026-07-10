/**
 * Dice rolling service for the Eventide RP System
 *
 * @module services/managers/roll-dice
 */
import { getSetting } from "../_module.mjs";
import { ERPSRollUtilities } from "../../utils/_module.mjs";
import { Logger } from "../_module.mjs";

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
      messageMode: null, // Will use game setting if null
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
      "power-damage": [
        "chat-card__header--power-damage",
        "fa-solid fa-bolt",
      ],
      "power-heal": [
        "chat-card__header--power-heal",
        "fa-solid fa-wand-magic-sparkles",
      ],
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
   * @async
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
   * @returns {Promise<Object>} ChatMessage creation data
   */
  async _createMessageData({
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
    const { ChatMessageBuilder } = await import("../chat-message-builder.mjs");

    return ChatMessageBuilder.buildMessageData({
      content,
      speaker,
      sound,
      rolls,
      rollMode,
      soundKey,
      rollFlags: { type, formula, total },
    });
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

    // Apply additional roll data (e.g., overhealing) before message creation
    if (type === "heal" || type === "power-heal") {
      // Check the appropriate resource for overhealing
      const healResource =
        type === "power-heal" ? actor.system?.power : actor.system?.resolve;
      if (healResource) {
        const healRoom = healResource.override
          ? healResource.override - healResource.value
          : healResource.max - healResource.value;

        if (result.total > healRoom) {
          result.overhealing = result.total - healRoom;
          Logger.debug(
            `Overhealing calculated: ${result.overhealing} (roll total: ${result.total}, heal room: ${healRoom})`,
            { overhealingValue: result.overhealing, rollTotal: result.total, healRoom },
             "ROLL_DICE",
          );
        } else {
          result.overhealing = null;
        }
      }
    }

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
      overhealing: result.overhealing || null,
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
   * Process a damage bundle (resolve + power) and generate a combined chat message
   *
   * Evaluates both rolls (when present), computes overhealing/overcharge per
   * resource, renders a single roll-message card with both roll sections, and
   * creates one ChatMessage with both Roll objects attached. When only one
   * payload is present, a single-section card is rendered.
   *
   * @async
   * @param {Object} options - Bundle configuration
   * @param {Object|null} [options.resolveDamage=null] - Resolve damage payload
   * @param {string} [options.resolveDamage.formula] - Resolve damage formula
   * @param {string} [options.resolveDamage.type] - Resolve damage type ("damage"|"heal")
   * @param {Object|null} [options.powerDamage=null] - Power damage payload
   * @param {string} [options.powerDamage.formula] - Power damage formula
   * @param {string} [options.powerDamage.type] - Power damage type ("damage"|"heal")
   * @param {string} [options.label="Damage"] - Display label
   * @param {string} [options.description=""] - Description
   * @param {string} [options.img=null] - Image
   * @param {string} [options.bgColor=null] - Background color
   * @param {string} [options.textColor=null] - Text color
   * @param {Actor} actor - The actor performing the roll
   * @returns {Promise<Object>} { resolveRoll, powerRoll } The evaluated rolls
   */
  async handleDamageBundle(
    {
      resolveDamage = null,
      powerDamage = null,
      label = "Damage",
      description = "",
      img = null,
      bgColor = null,
      textColor = null,
    } = {},
    actor,
  ) {
    const rolls = [];
    let resolveSection = null;
    let powerSection = null;

    // Resolve damage roll
    if (resolveDamage) {
      const { roll, result } = await this._createAndEvaluateRoll(
        resolveDamage.formula,
        actor,
      );
      const pickedType = resolveDamage.type.toLowerCase();
      const [pickedCardClass, pickedIcon] = this._getCardStyling(pickedType);
      const overhealing =
        pickedType === "heal"
          ? this._computeOverhealing(result.total, actor.system?.resolve)
          : null;
      result.overhealing = overhealing;
      resolveSection = {
        roll: result,
        pickedType,
        pickedCardClass,
        pickedIcon,
        overhealing,
        hasRoll: true,
      };
      rolls.push(roll);
    }

    // Power damage roll
    if (powerDamage) {
      const { roll, result } = await this._createAndEvaluateRoll(
        powerDamage.formula,
        actor,
      );
      const pickedType =
        powerDamage.type === "heal" ? "power-heal" : "power-damage";
      const [pickedCardClass, pickedIcon] = this._getCardStyling(pickedType);
      const overhealing =
        powerDamage.type === "heal"
          ? this._computeOverhealing(result.total, actor.system?.power)
          : null;
      result.overhealing = overhealing;
      powerSection = {
        roll: result,
        pickedType,
        pickedCardClass,
        pickedIcon,
        overhealing,
        hasRoll: true,
      };
      rolls.push(roll);
    }

    // Primary styling for the card header (resolve takes precedence, else power)
    let primaryType;
    if (resolveDamage) {
      primaryType = resolveDamage.type.toLowerCase();
    } else if (powerDamage) {
      primaryType = powerDamage.type === "heal" ? "power-heal" : "power-damage";
    } else {
      primaryType = "damage";
    }
    const [pickedCardClass, pickedIcon] = this._getCardStyling(primaryType);

    const templateData = {
      rollData: actor.getRollData(),
      label,
      description,
      item: img ? { img, name: label } : null,
      bgColor,
      textColor,
      pickedCardClass,
      pickedIcon,
      pickedType: primaryType,
      resolveSection,
      powerSection,
      // Legacy compat for templates referencing root roll vars
      roll: resolveSection?.roll ?? powerSection?.roll ?? null,
      overhealing: resolveSection?.overhealing ?? null,
      actor,
      isGM: game.user.isGM,
      name: actor.name,
      hasRoll: true,
    };

    // Render template and create a single chat message with both rolls
    const content = await renderTemplate(this.templates.standard, templateData);
    const primaryRoll = resolveSection?.roll ?? powerSection?.roll;
    const messageData = await this._createMessageData({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      rolls,
      type: primaryType,
      formula: primaryRoll?.formula ?? "",
      total: primaryRoll?.total ?? 0,
      rollMode: "roll",
    });
    await ChatMessage.create(messageData);

    return {
      resolveRoll: resolveSection?.roll ?? null,
      powerRoll: powerSection?.roll ?? null,
    };
  }

  /**
   * Compute overhealing/overcharge for a heal roll against a resource pool
   *
   * Works for both resolve and power resources (both share value/max/override).
   *
   * @private
   * @param {number} total - The roll total
   * @param {Object} resource - The resource pool ({ value, max, override })
   * @returns {number|null} The overcharge amount, or null if none
   */
  _computeOverhealing(total, resource) {
    if (!resource) return null;
    const room =
      resource.override != null
        ? resource.override - resource.value
        : resource.max - resource.value;
    if (total > room) {
      return total - room;
    }
    return null;
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
    overhealing = null,
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
      // GM visibility for conditional displays
      isGM: game.user.isGM,
      // Overhealing for healing rolls (if applicable)
      overhealing,
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
    const messageData = await this._createMessageData({
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
      Logger.warn(
        "Error getting hideNpcInitiativeRolls setting",
        error,
        "ROLL_DICE",
      );
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
    const messageData = await this._createMessageData({
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
