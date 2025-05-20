import { ERPSRollUtilities } from "../../utils/roll-utilities.mjs";
import { erpsSoundManager } from "./sound-manager.mjs";

const { renderTemplate } = foundry.applications.handlebars;

/**
 * ERPSMessageHandler - Handles all chat message creation for the Eventide RP System
 * @class
 */
class ERPSMessageHandler {
  constructor() {
    // Template paths for different message types
    this.templates = {
      status: "systems/eventide-rp-system/templates/chat/status-message.hbs",
      feature: "systems/eventide-rp-system/templates/chat/feature-message.hbs",
      deleteStatus:
        "systems/eventide-rp-system/templates/chat/delete-status-message.hbs",
      restore: "systems/eventide-rp-system/templates/chat/restore-message.hbs",
      combatPower:
        "systems/eventide-rp-system/templates/chat/combat-power-message.hbs",
      gearTransfer:
        "systems/eventide-rp-system/templates/chat/gear-transfer-message.hbs",
      gearEquip:
        "systems/eventide-rp-system/templates/chat/gear-equip-message.hbs",
      transformation:
        "systems/eventide-rp-system/templates/chat/transformation-message.hbs",
    };
  }

  /**
   * Helper method to render a template with data and create a chat message
   * @private
   * @param {string} templateKey - Key for the template in this.templates
   * @param {Object} data - Data to pass to the template
   * @param {Object} messageOptions - Options for ChatMessage.create
   * @param {Object} [soundOptions=null] - Sound options to include in the message
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async _createChatMessage(
    templateKey,
    data,
    messageOptions,
    soundOptions = null
  ) {
    const content = await renderTemplate(this.templates[templateKey], data);

    // Prepare message data
    const messageData = {
      ...messageOptions,
      content,
    };

    // Add sound flags if provided
    if (soundOptions && soundOptions.soundKey) {
      messageData.flags = messageData.flags || {};
      messageData.flags["eventide-rp-system"] =
        messageData.flags["eventide-rp-system"] || {};
      messageData.flags["eventide-rp-system"].sound = {
        key: soundOptions.soundKey,
        force: soundOptions.force || false,
      };
    }

    return ChatMessage.create(messageData);
  }

  /**
   * Creates a chat message for the given status effect item, including its name, description, and active effects.
   * @param {Item} item - The status effect item to generate the message for.
   * @returns {Promise<ChatMessage>} The created chat message.
   */
  async createStatusMessage(item) {
    const effects = item.effects.toObject();
    const style = ERPSRollUtilities.getItemStyle(item);

    const data = {
      item,
      effects,
      style,
    };

    // Play status apply sound locally
    await erpsSoundManager._playLocalSound("statusApply");

    return this._createChatMessage(
      "status",
      data,
      {
        speaker: ERPSRollUtilities.getSpeaker(
          item.parent,
          "EVENTIDE_RP_SYSTEM.MessageHeaders.Status"
        ),
      },
      { soundKey: "statusApply" }
    );
  }

  /**
   * Creates a chat message for the given feature item, including its name, description, and active effects.
   * @param {Item} item - The feature item to generate the message for.
   * @returns {Promise<ChatMessage>} The created chat message.
   */
  async createFeatureMessage(item) {
    const effects = item.effects.toObject();
    const style = ERPSRollUtilities.getItemStyle(item);

    const data = {
      item,
      effects,
      style,
    };

    return this._createChatMessage("feature", data, {
      speaker: ERPSRollUtilities.getSpeaker(
        item.parent,
        "EVENTIDE_RP_SYSTEM.MessageHeaders.Feature"
      ),
    });
  }

  /**
   * Creates a chat message indicating the deletion of a status effect.
   * @param {Item} item - The status effect item to be removed.
   * @param {Object} options - Additional options to customize the message.
   * @param {string} [options.description] - Custom description for the removal message.
   * @returns {Promise<ChatMessage>} The created chat message.
   */
  async createDeleteStatusMessage(item, options) {
    const data = {
      item,
      options,
    };

    // Play status remove sound locally
    await erpsSoundManager._playLocalSound("statusRemove");

    return this._createChatMessage(
      "deleteStatus",
      data,
      {
        speaker: ERPSRollUtilities.getSpeaker(item.parent),
      },
      { soundKey: "statusRemove" }
    );
  }

  /**
   * Creates a chat message detailing resource restoration and status effect removal.
   * @param {Object} options - Options for the restoration message
   * @param {boolean} options.all - Whether all status effects were removed
   * @param {boolean} options.resolve - Whether resolve was restored
   * @param {boolean} options.power - Whether power was restored
   * @param {Item[]} options.statuses - Array of status effects that were removed
   * @param {Actor} options.actor - The actor being restored
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async createRestoreMessage({ all, resolve, power, statuses, actor }) {
    const data = { all, resolve, power, statuses, actor };

    // Play status remove sound locally
    await erpsSoundManager._playLocalSound("statusRemove");

    return this._createChatMessage(
      "restore",
      data,
      {
        speaker: ERPSRollUtilities.getSpeaker(
          actor,
          "EVENTIDE_RP_SYSTEM.MessageHeaders.Restore"
        ),
      },
      { soundKey: "statusRemove" }
    );
  }

  /**
   * Creates a chat message for a combat power, handling both roll and non-roll cases.
   * @param {Item} item - The combat power item to create a message for
   * @param {Object} [options={}] - Additional options for the message
   * @param {string} [options.rollMode] - The roll mode to use for the message
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async createCombatPowerMessage(item, options = {}) {
    // Early return if the item doesn't have the necessary data
    if (!item || !item.system) return null;

    // Get the roll type from the item
    const rollType = item.system.roll?.type || "none";
    const style = ERPSRollUtilities.getItemStyle(item);
    const isRoll = rollType !== "none";

    // Get the roll mode from options or use the default game setting
    const rollMode = options.rollMode || game.settings.get("core", "rollMode");

    // Get the actor
    const actor = item.parent;

    // If this is a non-roll item
    if (!isRoll) {
      const data = {
        img: item.img,
        name: item.name,
        system: item.system,
        style,
        isGear: item.type === "gear",
        className: item.system.className || "",
        description: item.system.description,
        hasRoll: false,
        actor: actor,
      };

      // Play combat power sound locally and add to message
      await erpsSoundManager._playLocalSound("combatPower");
      return this._createChatMessage(
        "combatPower",
        data,
        {
          speaker: ERPSRollUtilities.getSpeaker(
            actor,
            "EVENTIDE_RP_SYSTEM.MessageHeaders.CombatPower"
          ),
          rollMode,
        },
        { soundKey: "combatPower" }
      );
    }

    // For roll-type items
    try {
      // Get the formula using the item's getCombatRollFormula method
      const formula = item.getCombatRollFormula();

      // Check if formula exists and is valid
      if (!formula || typeof formula !== "string" || formula.trim() === "") {
        throw new Error("Invalid roll formula");
      }

      // Get the actor's roll data
      const rollData = actor.getRollData();

      // Create the roll
      const roll = new Roll(formula, rollData);
      const result = await roll.evaluate();

      // Check if we need to do AC checks
      const targetArray = await erps.utils.getTargetArray();
      const addCheck =
        item.system.targeted && targetArray.length ? true : false;

      // Determine critical states
      const { critHit, critMiss, stolenCrit, savedMiss } =
        ERPSRollUtilities.determineCriticalStates({
          roll: result,
          thresholds: rollData.hiddenAbilities,
          formula: formula,
          critAllowed: true,
        });

      // Prepare target data if needed
      const targetRollData = addCheck
        ? targetArray.map((target) => ({
            name: target.actor.name,
            compare: result.total,
            ...target.actor.getRollData(),
          }))
        : [];

      // Prepare the template data
      const data = {
        img: item.img,
        name: item.name,
        system: item.system,
        description: item.system.description,
        isGear: item.type === "gear",
        className: item.system.className || "",
        roll: result,
        rollData,
        hasRoll: true,
        style,
        pickedType: rollType.toLowerCase(),
        critHit: critHit ?? false,
        critMiss: critMiss ?? false,
        savedMiss: savedMiss ?? false,
        stolenCrit: stolenCrit ?? false,
        acCheck: addCheck,
        targetArray,
        targetRollData,
        critAllowed: true,
        actor: actor,
      };

      // Play combat power sound locally and add to message
      await erpsSoundManager._playLocalSound("combatPower");
      return this._createChatMessage(
        "combatPower",
        data,
        {
          speaker: ERPSRollUtilities.getSpeaker(
            actor,
            "EVENTIDE_RP_SYSTEM.MessageHeaders.CombatPower"
          ),
          rolls: [roll],
          rollMode,
        },
        { soundKey: "combatPower" }
      );
    } catch (error) {
      console.error("Error creating combat power roll:", error);

      // Create a non-roll message as fallback
      const data = {
        img: item.img,
        name: item.name,
        system: item.system,
        style,
        rollError: true,
        errorMessage: error.message,
        description: item.system.description,
        hasRoll: false,
        isGear: item.type === "gear",
        actor: actor,
      };

      // Play combat power sound locally and add to message
      await erpsSoundManager._playLocalSound("combatPower");
      return this._createChatMessage(
        "combatPower",
        data,
        {
          speaker: ERPSRollUtilities.getSpeaker(
            actor,
            "EVENTIDE_RP_SYSTEM.MessageHeaders.CombatPower"
          ),
          rollMode,
        },
        { soundKey: "combatPower" }
      );
    }
  }

  /**
   * Creates a chat message for gear transfer between actors
   * @param {Item} item - The gear item being transferred
   * @param {Actor} sourceActor - The actor transferring the gear
   * @param {Actor} destActor - The actor receiving the gear
   * @param {number} quantity - The quantity being transferred
   * @param {string} [description] - Optional description of the transfer
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async createGearTransferMessage(
    item,
    sourceActor,
    destActor,
    quantity,
    description = ""
  ) {
    const data = {
      item,
      sourceActor,
      destActor,
      quantity,
      description,
    };

    // Play gear transfer sound locally and add to message
    await erpsSoundManager._playLocalSound("gearTransfer");
    return this._createChatMessage(
      "gearTransfer",
      data,
      {
        speaker: ERPSRollUtilities.getSpeaker(
          sourceActor,
          "EVENTIDE_RP_SYSTEM.MessageHeaders.GearTransfer"
        ),
      },
      { soundKey: "gearTransfer" }
    );
  }

  /**
   * Creates a chat message for gear equip/unequip events
   * @param {Item} item - The gear item being equipped/unequipped
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async createGearEquipMessage(item) {
    // Check if gear equip messages are enabled in settings
    if (!game.settings.get("eventide-rp-system", "showGearEquipMessages"))
      return;

    const data = {
      item,
      actor: item.parent,
      equipped: item.system.equipped,
    };

    // Play appropriate sound locally and add to message
    if (item.system.equipped) {
      await erpsSoundManager._playLocalSound("gearEquip");
      return this._createChatMessage(
        "gearEquip",
        data,
        {
          speaker: ERPSRollUtilities.getSpeaker(
            item.parent,
            "EVENTIDE_RP_SYSTEM.MessageHeaders.GearEquip"
          ),
        },
        { soundKey: "gearEquip" }
      );
    } else {
      await erpsSoundManager._playLocalSound("gearUnequip");
      return this._createChatMessage(
        "gearEquip",
        data,
        {
          speaker: ERPSRollUtilities.getSpeaker(
            item.parent,
            "EVENTIDE_RP_SYSTEM.MessageHeaders.GearEquip"
          ),
        },
        { soundKey: "gearUnequip" }
      );
    }
  }

  /**
   * Creates a chat message for transformation application or removal
   * @param {Object} options - Options for the transformation message
   * @param {Actor} options.actor - The actor being transformed
   * @param {Item} options.transformation - The transformation item
   * @param {boolean} options.isApplying - Whether the transformation is being applied (true) or removed (false)
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async createTransformationMessage({ actor, transformation, isApplying }) {
    // console.log("createTransformationMessage", { actor, transformation, isApplying });
    const data = {
      actor,
      transformation,
      isApplying,
      embeddedPowers: transformation.system.getEmbeddedCombatPowers()
    };
    
    // Play appropriate sound locally and add to message
    const soundKey = isApplying ? "combatPower" : "statusRemove";
    await erpsSoundManager._playLocalSound(soundKey);
    
    return this._createChatMessage(
      "transformation",
      data,
      {
        speaker: ERPSRollUtilities.getSpeaker(
          actor,
          "EVENTIDE_RP_SYSTEM.MessageHeaders.Transformation"
        )
      },
      { soundKey }
    );
  }
}

// Create a singleton instance
export const erpsMessageHandler = new ERPSMessageHandler();

// Add proxy methods to match the names of the individual functions
// erpsMessageHandler.deleteStatusMessage = erpsMessageHandler.createDeleteStatusMessage;
// erpsMessageHandler.restoreMessage = erpsMessageHandler.createRestoreMessage;
// erpsMessageHandler.featureMessage = erpsMessageHandler.createFeatureMessage;
// erpsMessageHandler.combatPowerMessage = erpsMessageHandler.createCombatPowerMessage;
// erpsMessageHandler.gearTransferMessage = erpsMessageHandler.createGearTransferMessage;
// erpsMessageHandler.gearEquipMessage = erpsMessageHandler.createGearEquipMessage;
// erpsMessageHandler.statusMessage = erpsMessageHandler.createStatusMessage;

// Export individual functions for backward compatibility
export const createStatusMessage = (item) =>
  erpsMessageHandler.createStatusMessage(item);
export const featureMessage = (item) =>
  erpsMessageHandler.createFeatureMessage(item);
export const deleteStatusMessage = (item, options) =>
  erpsMessageHandler.createDeleteStatusMessage(item, options);
export const createRestoreMessage = (options) =>
  erpsMessageHandler.createRestoreMessage(options);
// Keep the old name for backward compatibility with macros
export const restoreMessage = (options) =>
  erpsMessageHandler.createRestoreMessage(options);
export const combatPowerMessage = (item, options) =>
  erpsMessageHandler.createCombatPowerMessage(item, options);
export const gearTransferMessage = (
  item,
  sourceActor,
  destActor,
  quantity,
  description
) =>
  erpsMessageHandler.createGearTransferMessage(
    item,
    sourceActor,
    destActor,
    quantity,
    description
  );
export const gearEquipMessage = (item) =>
  erpsMessageHandler.createGearEquipMessage(item);
export const transformationMessage = (options) =>
  erpsMessageHandler.createTransformationMessage(options);
