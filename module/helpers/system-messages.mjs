import { rollHandler } from "./roll-dice.mjs";

/**
 * Creates a chat message for the given status effect item, including its name, description, and active effects.
 * @param {Item} item - The status effect item to generate the message for.
 * @returns {Promise<ChatMessage>} The created chat message.
 */
const createStatusMessage = async (item) => {
  const effects = item.effects.toObject();
  const style = `background-color: ${item.system.bgColor.css}; color: ${item.system.textColor.css};`;

  const data = {
    item,
    effects,
    style,
  };

  const content = await renderTemplate(
    `systems/eventide-rp-system/templates/chat/status-message.hbs`,
    data
  );

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({
      actor: item.parent,
      alias: `Status: ${item.parent.name}`,
    }),
    content: content,
  });
};

/**
 * Creates a chat message for the given feature item, including its name, description, and active effects.
 * @param {Item} item - The feature item to generate the message for.
 * @returns {Promise<ChatMessage>} The created chat message.
 */

const featureMessage = async (item) => {
  const effects = item.effects.toObject();
  const style = `background-color: ${item.system.bgColor.css}; color: ${item.system.textColor.css};`;

  const data = {
    item,
    effects,
    style,
  };

  const content = await renderTemplate(
    `systems/eventide-rp-system/templates/chat/feature-message.hbs`,
    data
  );

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({
      actor: item.parent,
      alias: `Feature: ${item.parent.name}`,
    }),
    content: content,
  });
};

/**
 * Creates a chat message indicating the deletion of a status effect.
 * @param {Item} item - The status effect item to be removed.
 * @param {Object} options - Additional options to customize the message.
 * @param {string} [options.description] - Custom description for the removal message.
 * @returns {Promise<ChatMessage>} The created chat message.
 */

const deleteStatusMessage = async (item, options) => {
  const data = {
    item,
    options,
  };

  const content = await renderTemplate(
    `systems/eventide-rp-system/templates/chat/delete-status-message.hbs`,
    data
  );

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.parent }),
    content: content,
  });
};

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
const restoreMessage = async ({ all, resolve, power, statuses, actor }) => {
  const data = { all, resolve, power, statuses, actor };

  const content = await renderTemplate(
    `systems/eventide-rp-system/templates/chat/restore-message.hbs`,
    data
  );

  return await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: content,
  });
};

/**
 * Creates a chat message for a combat power, handling both roll and non-roll cases.
 * For roll cases, it processes critical hits/misses and AC checks if targeted.
 * For non-roll cases, it creates a styled message with the power's description.
 * In both cases, the message header uses the power's custom background and text colors.
 *
 * @param {Item} item - The combat power item to create a message for
 * @param {object} item.system - The item's system data
 * @param {object} item.system.bgColor - Background color data for the power
 * @param {string} item.system.bgColor.css - CSS color string for the background
 * @param {object} item.system.textColor - Text color data for the power
 * @param {string} item.system.textColor.css - CSS color string for the text
 * @param {object} item.system.roll - Roll configuration for the power
 * @param {string} item.system.roll.type - Type of roll ("none" or a roll type)
 * @param {boolean} item.system.targeted - Whether the power targets other tokens
 * @param {string} item.formula - The roll formula (for roll cases)
 * @returns {Promise<ChatMessage>} The created chat message
 */
const combatPowerMessage = async (item) => {
  const itemData = {
    ...item,
    style: `background-color: ${item.system.bgColor.css}; color: ${item.system.textColor.css};`,
    actor: item.actor,
  };

  if (item.system.roll.type === "none") {
    const content = await renderTemplate(
      `systems/eventide-rp-system/templates/chat/combat-power-message.hbs`,
      itemData
    );
    return await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: item.actor }),
      content: content,
      sound: CONFIG.sounds.dice,
    });
  }

  // Handle roll case
  const rollData = item.actor.getRollData();
  const roll = new Roll(item.formula, rollData);
  const result = await roll.evaluate();
  const targetArray = await erps.utils.getTargetArray();

  // Handle critical hit/miss logic
  let critHit = false;
  let critMiss = false;
  let stolenCrit = false;
  let savedMiss = false;

  if (item.formula.includes("d")) {
    const dieArray = result.terms[0].results;

    critHit = dieArray.some(
      (die) =>
        die.result <= rollData.hiddenAbilities.cmax.total &&
        die.result >= rollData.hiddenAbilities.cmin.total
    );
    critMiss = dieArray.some(
      (die) =>
        die.result <= rollData.hiddenAbilities.fmax.total &&
        die.result >= rollData.hiddenAbilities.fmin.total
    );

    stolenCrit =
      dieArray.some(
        (die) =>
          die.result <= rollData.hiddenAbilities.cmax.total &&
          die.result >= rollData.hiddenAbilities.cmin.total &&
          item.formula.toLowerCase().includes("kl")
      ) &&
      !dieArray.every(
        (die) =>
          die.result <= rollData.hiddenAbilities.cmax.total &&
          die.result >= rollData.hiddenAbilities.cmin.total
      );

    savedMiss =
      dieArray.some(
        (die) =>
          die.result >= rollData.hiddenAbilities.fmin.total &&
          die.result <= rollData.hiddenAbilities.fmax.total &&
          item.formula.toLowerCase().includes("k") &&
          !item.formula.toLowerCase().includes("kl")
      ) &&
      !dieArray.every(
        (die) =>
          die.result >= rollData.hiddenAbilities.fmin.total &&
          die.result <= rollData.hiddenAbilities.fmax.total
      );

    if (stolenCrit && critHit) {
      critHit = false;
    }

    if (savedMiss && critMiss) {
      critMiss = false;
    }
  }

  // Handle AC check data if targeted
  let targetRollData = [];
  if (item.system.targeted && targetArray.length > 0) {
    for (const target of targetArray) {
      targetRollData.push({
        name: target.actor.name,
        compare: result.total,
        ...target.actor.getRollData(),
      });
    }
  }

  const templateData = {
    ...itemData,
    hasRoll: true,
    critHit,
    critMiss,
    stolenCrit,
    savedMiss,
    acCheck: item.system.targeted && targetArray.length > 0,
    targetRollData,
    roll: result,
  };

  const content = await renderTemplate(
    `systems/eventide-rp-system/templates/chat/combat-power-message.hbs`,
    templateData
  );

  return await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    flavor: content,
    rollMode: game.settings.get("core", "rollMode"),
  });
};

/**
 * Creates a chat message for gear transfer between actors
 * @param {Item} item - The gear item being transferred
 * @param {Actor} sourceActor - The actor transferring the gear
 * @param {Actor} destActor - The actor receiving the gear
 * @param {number} quantity - The quantity being transferred
 * @param {string} [description] - Optional description of the transfer
 * @returns {Promise<ChatMessage>} The created chat message
 */
const gearTransferMessage = async (
  item,
  sourceActor,
  destActor,
  quantity,
  description = ""
) => {
  const data = {
    item,
    sourceActor,
    destActor,
    quantity,
    description,
  };

  const content = await renderTemplate(
    `systems/eventide-rp-system/templates/chat/gear-transfer-message.hbs`,
    data
  );

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: sourceActor }),
    content: content,
  });
};

/**
 * Creates a chat message for gear equip/unequip events
 * @param {Item} item - The gear item being equipped/unequipped
 * @returns {Promise<ChatMessage>} The created chat message
 */
const gearEquipMessage = async (item) => {
  const data = {
    item,
    actor: item.actor,
    equipped: item.system.equipped,
  };

  const content = await renderTemplate(
    `systems/eventide-rp-system/templates/chat/gear-equip-message.hbs`,
    data
  );

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    content: content,
  });
};

export {
  createStatusMessage,
  featureMessage,
  deleteStatusMessage,
  restoreMessage,
  combatPowerMessage,
  gearTransferMessage,
  gearEquipMessage,
};
