import { ERPSRollUtilities } from "../../utils/_module.mjs";
import { erpsSoundManager } from "./sound-manager.mjs";
import { Logger } from "../logger.mjs";
import { TargetResolver } from "../target-resolver.mjs";

const { renderTemplate } = foundry.applications.handlebars;
const { TextEditor } = foundry.applications.ux;

/**
 * ERPSMessageHandler - Handles all chat message creation for the Eventide RP System
 * @class
 */
class ERPSMessageHandler {
  constructor() {
    // Template paths for different message types
    this.templates = {
      status: "systems/eventide-rp-system/templates/chat/status-message.hbs",
      gear: "systems/eventide-rp-system/templates/chat/gear-message.hbs",
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
      playerActionApproval:
        "systems/eventide-rp-system/templates/chat/player-action-approval.hbs",
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
    soundOptions = null,
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
   * Enriches an item description for safe HTML rendering
   * @private
   * @param {Item} item - The item whose description should be enriched
   * @returns {Promise<string>} The enriched and sanitized HTML
   */
  async _enrichDescription(item) {
    if (!item?.system?.description) {
      return "";
    }

    try {
      return await TextEditor.implementation.enrichHTML(
        item.system.description,
        {
          secrets: item.isOwner ?? false,
          rollData: item.getRollData?.() ?? {},
          relativeTo: item,
        },
      );
    } catch (error) {
      Logger.warn("Failed to enrich description", error, "SYSTEM_MESSAGES");
      return item.system.description;
    }
  }

  /**
   * Creates a chat message for the given status effect item, including its name, description, and active effects.
   * @param {Item} item - The status effect item to generate the message for.
   * @param {string} [context] - Optional context message to display
   * @returns {Promise<ChatMessage>} The created chat message.
   */
  async createStatusMessage(item, context = null) {
    const effects = item.effects.toObject();
    const style = ERPSRollUtilities.getItemStyle(item);
    const enrichedDescription = await this._enrichDescription(item);

    const data = {
      item,
      effects,
      style,
      context,
      enrichedDescription,
    };

    // Play status apply sound locally
    await erpsSoundManager._playLocalSound("statusApply");

    return this._createChatMessage(
      "status",
      data,
      {
        speaker: ERPSRollUtilities.getSpeaker(
          item.parent,
          "EVENTIDE_RP_SYSTEM.MessageHeaders.Status",
        ),
      },
      { soundKey: "statusApply" },
    );
  }

  /**
   * Creates a chat message for the given gear item, including its name, description, and active effects.
   * @param {Item} item - The gear item to generate the message for.
   * @param {string} [context] - Optional context message to display
   * @returns {Promise<ChatMessage>} The created chat message.
   */
  async createGearMessage(item, context = null) {
    const effects = item.effects.toObject();
    const style = ERPSRollUtilities.getItemStyle(item);
    const enrichedDescription = await this._enrichDescription(item);

    const data = {
      item,
      effects,
      style,
      context,
      enrichedDescription,
    };

    // Play gear equip sound locally (similar to status apply)
    await erpsSoundManager._playLocalSound("gearEquip");

    return this._createChatMessage(
      "gear",
      data,
      {
        speaker: ERPSRollUtilities.getSpeaker(
          item.parent,
          "EVENTIDE_RP_SYSTEM.MessageHeaders.Gear",
        ),
      },
      { soundKey: "gearEquip" },
    );
  }

  /**
   * Creates a chat message for a feature item, handling both roll and non-roll cases.
   * @param {Item} item - The feature item to generate the message for.
   * @param {Object} [options={}] - Additional options for the message
   * @param {string} [options.rollMode] - The roll mode to use for the message
   * @returns {Promise<ChatMessage>} The created chat message.
   */
  async createFeatureMessage(item, options = {}) {
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

    // If this is a non-roll feature
    if (!isRoll) {
      const effects = item.effects.toObject();
      const enrichedDescription = await this._enrichDescription(item);
      const data = {
        item,
        effects,
        style,
        hasRoll: false,
        actor,
        enrichedDescription,
      };

      return this._createChatMessage("feature", data, {
        speaker: ERPSRollUtilities.getSpeaker(
          actor,
          "EVENTIDE_RP_SYSTEM.MessageHeaders.Feature",
        ),
        rollMode,
      });
    }

    // For roll-type features
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

      // Features don't typically target, but we'll check if they have targeting capability
      const targetArray = await erps.utils.getTargetArray();
      const addCheck =
        item.system.targeted && targetArray.length ? true : false;

      // Determine critical states
      const { critHit, critMiss, stolenCrit, savedMiss } =
        ERPSRollUtilities.determineCriticalStates({
          roll: result,
          thresholds: rollData.hiddenAbilities,
          formula,
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
      const effects = item.effects.toObject();
      const enrichedDescription = await this._enrichDescription(item);
      const data = {
        item,
        effects,
        style,
        roll: result,
        rollData,
        hasRoll: true,
        pickedType: rollType.toLowerCase(),
        critHit: critHit ?? false,
        critMiss: critMiss ?? false,
        savedMiss: savedMiss ?? false,
        stolenCrit: stolenCrit ?? false,
        acCheck: addCheck,
        targetArray,
        targetRollData,
        critAllowed: true,
        actor,
        enrichedDescription,
      };

      // Play feature roll sound locally and add to message
      await erpsSoundManager._playLocalSound("featureRoll");
      return this._createChatMessage(
        "feature",
        data,
        {
          speaker: ERPSRollUtilities.getSpeaker(
            actor,
            "EVENTIDE_RP_SYSTEM.MessageHeaders.Feature",
          ),
          rollMode,
        },
        { soundKey: "featureRoll" },
      );
    } catch (error) {
      Logger.error(
        "Error creating feature roll message",
        error,
        "SYSTEM_MESSAGES",
      );

      // Fallback to non-roll message
      const effects = item.effects.toObject();
      const data = {
        item,
        effects,
        style,
        hasRoll: false,
        actor,
      };

      return this._createChatMessage("feature", data, {
        speaker: ERPSRollUtilities.getSpeaker(
          actor,
          "EVENTIDE_RP_SYSTEM.MessageHeaders.Feature",
        ),
        rollMode,
      });
    }
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
      { soundKey: "statusRemove" },
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
          "EVENTIDE_RP_SYSTEM.MessageHeaders.Restore",
        ),
      },
      { soundKey: "statusRemove" },
    );
  }

  /**
   * Creates a chat message for a combat power, handling both roll and non-roll cases.
   * @param {Item} item - The combat power item to create a message for
   * @param {Object} [options={}] - Additional options for the message
   * @param {string} [options.rollMode] - The roll mode to use for the message
   * @param {Array} [options.lockedTargets] - Locked targets to use for GM section (bypass mode)
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async createCombatPowerMessage(item, options = {}) {
    // Early return if the item doesn't have the necessary data
    if (!item || !item.system) return null;

    // Extract locked targets from options for GM section
    const lockedTargets = options.lockedTargets;

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
      const enrichedDescription = await this._enrichDescription(item);
      const data = {
        img: item.img,
        name: item.name,
        system: item.system,
        style,
        isGear: item.type === "gear",
        className: item.system.className || "",
        hasRoll: false,
        actor,
        enrichedDescription,
      };

      // Play combat power sound locally and add to message
      await erpsSoundManager._playLocalSound("combatPower");
      return this._createChatMessage(
        "combatPower",
        data,
        {
          speaker: ERPSRollUtilities.getSpeaker(
            actor,
            "EVENTIDE_RP_SYSTEM.MessageHeaders.CombatPower",
          ),
          rollMode,
        },
        { soundKey: "combatPower" },
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
      // Use locked targets if provided (from action card bypass mode), otherwise get current targets
      let targetArray;
      if (lockedTargets) {
        // resolveLockedTargets returns { valid: [...], invalid: [...] }
        const resolved = TargetResolver.resolveLockedTargets(lockedTargets);
        targetArray = resolved.valid;
      } else {
        targetArray = await erps.utils.getTargetArray();
      }
      const addCheck =
        item.system.targeted && targetArray.length ? true : false;

      // Determine critical states
      const { critHit, critMiss, stolenCrit, savedMiss } =
        ERPSRollUtilities.determineCriticalStates({
          roll: result,
          thresholds: rollData.hiddenAbilities,
          formula,
          critAllowed: true,
        });

      // Prepare target data if needed
      const targetRollData = addCheck
        ? targetArray.map((target) => {
            // Resolved targets have { token, actor, lockedTarget } structure
            // Regular targets from getTargetArray have just the token with .actor
            const targetActor = target.actor || target.token?.actor;
            return {
              name: targetActor?.name || "Unknown",
              compare: result.total,
              ...(targetActor?.getRollData() || {}),
            };
          })
        : [];

      // Prepare the template data
      const enrichedDescription = await this._enrichDescription(item);
      const data = {
        img: item.img,
        name: item.name,
        system: item.system,
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
        actor,
        enrichedDescription,
      };

      // Play combat power sound locally and add to message
      await erpsSoundManager._playLocalSound("combatPower");
      return this._createChatMessage(
        "combatPower",
        data,
        {
          speaker: ERPSRollUtilities.getSpeaker(
            actor,
            "EVENTIDE_RP_SYSTEM.MessageHeaders.CombatPower",
          ),
          rolls: [roll],
          rollMode,
        },
        { soundKey: "combatPower" },
      );
    } catch (error) {
      Logger.error(
        "Error creating combat power roll",
        error,
        "SYSTEM_MESSAGES",
      );

      // Create a non-roll message as fallback
      const data = {
        img: item.img,
        name: item.name,
        system: item.system,
        style,
        rollError: true,
        errorMessage: error.message,
        hasRoll: false,
        isGear: item.type === "gear",
        actor,
      };

      // Play combat power sound locally and add to message
      await erpsSoundManager._playLocalSound("combatPower");
      return this._createChatMessage(
        "combatPower",
        data,
        {
          speaker: ERPSRollUtilities.getSpeaker(
            actor,
            "EVENTIDE_RP_SYSTEM.MessageHeaders.CombatPower",
          ),
          rollMode,
        },
        { soundKey: "combatPower" },
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
    description = "",
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
          "EVENTIDE_RP_SYSTEM.MessageHeaders.GearTransfer",
        ),
      },
      { soundKey: "gearTransfer" },
    );
  }

  /**
   * Creates a chat message for gear equip/unequip events
   * @param {Item} item - The gear item being equipped/unequipped
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async createGearEquipMessage(item) {
    // Check if gear equip messages are enabled in settings
    if (!game.settings.get("eventide-rp-system", "showGearEquipMessages")) {
      return;
    }

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
            "EVENTIDE_RP_SYSTEM.MessageHeaders.GearEquip",
          ),
        },
        { soundKey: "gearEquip" },
      );
    } else {
      await erpsSoundManager._playLocalSound("gearUnequip");
      return this._createChatMessage(
        "gearEquip",
        data,
        {
          speaker: ERPSRollUtilities.getSpeaker(
            item.parent,
            "EVENTIDE_RP_SYSTEM.MessageHeaders.GearEquip",
          ),
        },
        { soundKey: "gearUnequip" },
      );
    }
  }

  /**
   * Creates a chat message for gear effects applied without cost deduction
   * @param {Item} item - The gear item being applied as an effect
   * @param {Actor} target - The target actor receiving the gear effect
   * @param {string} [context] - Optional context message to display
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async gearEffectMessage(item, target, context = null) {
    const effects = item.effects.toObject();
    const style = ERPSRollUtilities.getItemStyle(item);

    const data = {
      item,
      effects,
      style,
      context: context || "Applied as effect (no cost)",
      isEffect: true,
      target,
    };

    // Play gear effect sound locally (similar to gear equip but distinct)
    await erpsSoundManager._playLocalSound("gearEquip");

    return this._createChatMessage(
      "gear",
      data,
      {
        speaker: ERPSRollUtilities.getSpeaker(
          target,
          "EVENTIDE_RP_SYSTEM.MessageHeaders.GearEffect",
        ),
      },
      { soundKey: "gearEquip" },
    );
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
    const enrichedDescription = await this._enrichDescription(transformation);
    const data = {
      actor,
      transformation,
      isApplying,
      embeddedPowers: transformation.system.getEmbeddedCombatPowers(),
      enrichedDescription,
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
          "EVENTIDE_RP_SYSTEM.MessageHeaders.Transformation",
        ),
      },
      { soundKey },
    );
  }

  /**
   * Creates a private message to GMs requesting approval for a player action
   * @param {Object} options - Options for the approval request
   * @param {Actor} options.actor - The actor using the action card
   * @param {Item} options.actionCard - The action card being used
   * @param {string} options.playerId - ID of the player requesting approval
   * @param {string} options.playerName - Name of the player requesting approval
   * @param {Actor[]} options.targets - Array of target actors
   * @param {Object} options.rollResult - Roll result data
   * @param {Object[]} options.lockedTargets - Locked targets from popup
   * @param {Object} options.transformationSelections - Map of target IDs to selected transformation IDs
   * @param {string[]} options.selectedEffectIds - Array of selected status effect IDs
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async createPlayerActionApprovalRequest({
    actor,
    actionCard,
    playerId,
    playerName,
    targets,
    rollResult,
    lockedTargets,
    transformationSelections,
    selectedEffectIds,
  }) {
    Logger.methodEntry("SystemMessages", "createPlayerActionApprovalRequest", {
      actorId: actor.id,
      actionCardId: actionCard.id,
      playerId,
      targetCount: targets.length,
    });

    const { MessageFlags } = await import("../../helpers/message-flags.mjs");

    // Prepare target data with ownership information
    const targetData = targets.map((target) => ({
      id: target.id,
      name: target.name,
      img: target.img,
      isOwned: target.isOwner,
    }));

    // Create a lookup map for transformation names
    const transformationNameMap = new Map();
    if (actionCard.system.embeddedTransformations) {
      for (const transformation of actionCard.system.embeddedTransformations) {
        transformationNameMap.set(transformation.id, transformation.name);
        transformationNameMap.set(transformation._id, transformation.name);
      }
    }

    // Create formatted transformation selections with names
    const formattedTransformationSelections = {};
    if (transformationSelections) {
      for (const [targetId, transformationId] of transformationSelections) {
        const transformationName = transformationNameMap.get(transformationId) || transformationId;
        formattedTransformationSelections[targetId] = transformationName;
      }
    }

    const data = {
      playerName,
      actor: {
        id: actor.id,
        name: actor.name,
        img: actor.img,
      },
      actionCard: {
        id: actionCard.id,
        name: actionCard.name,
        img: actionCard.img,
        description: actionCard.system.description,
        repetitions: actionCard.system.repetitions,
        damageApplication: actionCard.system.damageApplication,
        statusApplicationLimit: actionCard.system.statusApplicationLimit,
        costOnRepetition: actionCard.system.costOnRepetition,
        failOnFirstMiss: actionCard.system.failOnFirstMiss,
        embeddedTransformations: actionCard.system.embeddedTransformations || [],
      },
      targets: targetData,
      rollResult,
      transformationSelections: formattedTransformationSelections,
      selectedEffectIds,
      processed: false,
      messageId: null, // Will be set after message creation
    };

    // Create player action approval flag
    const approvalFlag = MessageFlags.createPlayerActionApprovalFlag({
      actorId: actor.id,
      actionCardId: actionCard.id,
      actionCardData: actionCard.toObject(), // Store full action card data for transformation support
      playerId,
      playerName,
      targetIds: targets.map((t) => t.id),
      lockedTargets,
      rollResult,
      transformationSelections,
      selectedEffectIds,
    });

    // Create the private message to GMs
    const content = await renderTemplate(
      this.templates.playerActionApproval,
      data,
    );

    const messageData = {
      content,
      whisper: game.users.filter((u) => u.isGM).map((u) => u.id),
      speaker: {
        alias: `${game.i18n.localize("EVENTIDE_RP_SYSTEM.Chat.PlayerActionApproval.Title")} - ${playerName}`,
      },
      flags: {
        "eventide-rp-system": {
          playerActionApproval: approvalFlag,
        },
      },
    };

    const message = await ChatMessage.create(messageData);

    // Update the message data with the actual message ID for template context
    if (message) {
      const updatedData = { ...data, messageId: message.id };
      const updatedContent = await renderTemplate(
        this.templates.playerActionApproval,
        updatedData,
      );
      await message.update({ content: updatedContent });
    }

    Logger.methodExit(
      "SystemMessages",
      "createPlayerActionApprovalRequest",
      message,
    );
    return message;
  }

  /**
   * Notifies the player about the result of their action approval request
   * @param {string} playerId - ID of the player to notify
   * @param {string} playerName - Name of the player
   * @param {string} actionCardName - Name of the action card
   * @param {boolean} approved - Whether the action was approved
   * @param {string} gmName - Name of the GM who made the decision
   * @returns {Promise<ChatMessage>} The created notification message
   */
  async notifyPlayerActionResult(
    playerId,
    playerName,
    actionCardName,
    approved,
    gmName,
  ) {
    Logger.methodEntry("SystemMessages", "notifyPlayerActionResult", {
      playerId,
      actionCardName,
      approved,
      gmName,
    });

    const actorsInScene = await canvas.scene.tokens
      .map((token) => token.actor)
      .filter((actor) => actor !== null);
    let foundItem = null;

    for await (const actor of actorsInScene) {
      const item = actor.items.get(actionCardName);
      if (item) {
        foundItem = item;
        break;
      }
    }

    const resultKey = approved ? "Approved" : "Denied";
    const messageContent = game.i18n.format(
      `EVENTIDE_RP_SYSTEM.Chat.PlayerActionApproval.Result${resultKey}`,
      {
        actionCard: foundItem ? foundItem.name : actionCardName,
        gm: gmName,
      },
    );

    const messageData = {
      content: `<div class="chat-card">
        <div class="chat-card__header chat-card__header--${approved ? "approved" : "denied"}">
          <i class="fas fa-${approved ? "check-circle" : "times-circle"}"></i>
          ${messageContent}
        </div>
      </div>`,
      whisper: [playerId],
      speaker: {
        alias: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Chat.PlayerActionApproval.GMDecision",
        ),
      },
    };

    const message = await ChatMessage.create(messageData);
    Logger.methodExit("SystemMessages", "notifyPlayerActionResult", message);
    return message;
  }

  /**
   * Creates a targets exhausted message when all targets are removed during repetitions
   * @param {Object} options - Options for the targets exhausted message
   * @param {Actor} options.actor - The actor executing the action card
   * @param {Item} options.actionCard - The action card being executed
   * @param {Object} options.repetitionInfo - Repetition information
   * @param {number} options.repetitionInfo.current - Current repetition number
   * @param {number} options.repetitionInfo.total - Total repetitions
   * @param {number} options.repetitionInfo.completed - Completed repetitions
   * @param {string[]} options.exhaustedTargets - Names of exhausted targets
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async createTargetsExhaustedMessage({
    actor,
    actionCard,
    repetitionInfo,
    exhaustedTargets,
  }) {
    Logger.methodEntry("SystemMessages", "createTargetsExhaustedMessage", {
      actorId: actor.id,
      actionCardId: actionCard.id,
      repetitionInfo,
      exhaustedTargets,
    });

    const data = {
      actor: {
        id: actor.id,
        name: actor.name,
        img: actor.img,
      },
      actionCard: {
        id: actionCard.id,
        name: actionCard.name,
        img: actionCard.img,
        description: actionCard.system.description,
        textColor: actionCard.system.textColor,
        bgColor: actionCard.system.bgColor,
      },
      repetitionInfo,
      exhaustedTargets,
    };

    const messageData = {
      content: await renderTemplate(
        "systems/eventide-rp-system/templates/chat/targets-exhausted-message.hbs",
        data,
      ),
      speaker: {
        actor: actor.id,
        alias: actor.name,
      },
    };

    const message = await ChatMessage.create(messageData);
    Logger.methodExit("SystemMessages", "createTargetsExhaustedMessage", message);
    return message;
  }
}

// Create a singleton instance
export const erpsMessageHandler = new ERPSMessageHandler();

// Add the methods to the handler instance for erps.messages access
erpsMessageHandler.createStatusMessage =
  erpsMessageHandler.createStatusMessage.bind(erpsMessageHandler);
erpsMessageHandler.createGearMessage =
  erpsMessageHandler.createGearMessage.bind(erpsMessageHandler);
erpsMessageHandler.createFeatureMessage =
  erpsMessageHandler.createFeatureMessage.bind(erpsMessageHandler);
erpsMessageHandler.createDeleteStatusMessage =
  erpsMessageHandler.createDeleteStatusMessage.bind(erpsMessageHandler);
erpsMessageHandler.createRestoreMessage =
  erpsMessageHandler.createRestoreMessage.bind(erpsMessageHandler);
erpsMessageHandler.createCombatPowerMessage =
  erpsMessageHandler.createCombatPowerMessage.bind(erpsMessageHandler);
erpsMessageHandler.createGearTransferMessage =
  erpsMessageHandler.createGearTransferMessage.bind(erpsMessageHandler);
erpsMessageHandler.createGearEquipMessage =
  erpsMessageHandler.createGearEquipMessage.bind(erpsMessageHandler);
erpsMessageHandler.createTransformationMessage =
  erpsMessageHandler.createTransformationMessage.bind(erpsMessageHandler);
erpsMessageHandler.gearEffectMessage =
  erpsMessageHandler.gearEffectMessage.bind(erpsMessageHandler);
erpsMessageHandler.createPlayerActionApprovalRequest =
  erpsMessageHandler.createPlayerActionApprovalRequest.bind(erpsMessageHandler);
erpsMessageHandler.notifyPlayerActionResult =
  erpsMessageHandler.notifyPlayerActionResult.bind(erpsMessageHandler);
erpsMessageHandler.createTargetsExhaustedMessage =
  erpsMessageHandler.createTargetsExhaustedMessage.bind(erpsMessageHandler);

// Export individual functions for backward compatibility
/**
 * Creates a status message for an item
 * @param {Item} item - The status item
 * @param {string} [context] - Optional context message
 * @returns {Promise<ChatMessage>} The created chat message
 */
export const createStatusMessage = (item, context) =>
  erpsMessageHandler.createStatusMessage(item, context);

/**
 * Creates a gear message for an item
 * @param {Item} item - The gear item
 * @param {string} [context] - Optional context message
 * @returns {Promise<ChatMessage>} The created chat message
 */
export const createGearMessage = (item, context) =>
  erpsMessageHandler.createGearMessage(item, context);

/**
 * Creates a feature message for an item
 * @param {Item} item - The feature item
 * @returns {Promise<ChatMessage>} The created chat message
 */
export const featureMessage = (item) =>
  erpsMessageHandler.createFeatureMessage(item);

/**
 * Creates a delete status message for an item
 * @param {Item} item - The status item being deleted
 * @param {Object} [options] - Additional options for the message
 * @returns {Promise<ChatMessage>} The created chat message
 */
export const deleteStatusMessage = (item, options) =>
  erpsMessageHandler.createDeleteStatusMessage(item, options);

/**
 * Creates a restore message
 * @param {Object} options - Options for the restore message
 * @returns {Promise<ChatMessage>} The created chat message
 */
export const createRestoreMessage = (options) =>
  erpsMessageHandler.createRestoreMessage(options);

/**
 * Creates a restore message (legacy alias for createRestoreMessage)
 * @param {Object} options - Options for the restore message
 * @returns {Promise<ChatMessage>} The created chat message
 * @deprecated Use createRestoreMessage instead
 */
export const restoreMessage = (options) =>
  erpsMessageHandler.createRestoreMessage(options);

/**
 * Creates a combat power message for an item
 * @param {Item} item - The combat power item
 * @param {Object} [options] - Additional options for the message
 * @returns {Promise<ChatMessage>} The created chat message
 */
export const combatPowerMessage = (item, options) =>
  erpsMessageHandler.createCombatPowerMessage(item, options);

/**
 * Creates a gear transfer message
 * @param {Item} item - The gear item being transferred
 * @param {Actor} sourceActor - The actor transferring the gear
 * @param {Actor} destActor - The actor receiving the gear
 * @param {number} quantity - The quantity being transferred
 * @param {string} [description] - Optional description of the transfer
 * @returns {Promise<ChatMessage>} The created chat message
 */
export const gearTransferMessage = (
  item,
  sourceActor,
  destActor,
  quantity,
  description,
) =>
  erpsMessageHandler.createGearTransferMessage(
    item,
    sourceActor,
    destActor,
    quantity,
    description,
  );

/**
 * Creates a gear equip/unequip message for an item
 * @param {Item} item - The gear item being equipped/unequipped
 * @returns {Promise<ChatMessage>} The created chat message
 */
export const gearEquipMessage = (item) =>
  erpsMessageHandler.createGearEquipMessage(item);

/**
 * Creates a transformation message
 * @param {Object} options - Options for the transformation message
 * @param {Actor} options.actor - The actor being transformed
 * @param {Item} options.transformation - The transformation item
 * @param {boolean} options.isApplying - Whether the transformation is being applied
 * @returns {Promise<ChatMessage>} The created chat message
 */
export const transformationMessage = (options) =>
  erpsMessageHandler.createTransformationMessage(options);

/**
 * Creates a gear effect message for an item applied without cost
 * @param {Item} item - The gear item being applied as an effect
 * @param {Actor} target - The target actor receiving the gear effect
 * @param {string} [context] - Optional context message
 * @returns {Promise<ChatMessage>} The created chat message
 */
export const gearEffectMessage = (item, target, context) =>
  erpsMessageHandler.gearEffectMessage(item, target, context);

/**
 * Creates a private message to GMs requesting approval for a player action
 * @param {Object} options - Options for the approval request
 * @returns {Promise<ChatMessage>} The created chat message
 */
export const createPlayerActionApprovalRequest = (options) =>
  erpsMessageHandler.createPlayerActionApprovalRequest(options);

/**
 * Notifies the player about the result of their action approval request
 * @param {string} playerId - ID of the player to notify
 * @param {string} playerName - Name of the player
 * @param {string} actionCardName - Name of the action card
 * @param {boolean} approved - Whether the action was approved
 * @param {string} gmName - Name of the GM who made the decision
 * @returns {Promise<ChatMessage>} The created notification message
 */
export const notifyPlayerActionResult = (
  playerId,
  playerName,
  actionCardName,
  approved,
  gmName,
) =>
  erpsMessageHandler.notifyPlayerActionResult(
    playerId,
    playerName,
    actionCardName,
    approved,
    gmName,
  );

/**
 * Creates a targets exhausted message when all targets are removed during repetitions
 * @param {Object} options - Options for the targets exhausted message
 * @param {Actor} options.actor - The actor executing the action card
 * @param {Item} options.actionCard - The action card being executed
 * @param {Object} options.repetitionInfo - Repetition information
 * @param {string[]} options.exhaustedTargets - Names of exhausted targets
 * @returns {Promise<ChatMessage>} The created chat message
 */
export const createTargetsExhaustedMessage = (options) =>
  erpsMessageHandler.createTargetsExhaustedMessage(options);
