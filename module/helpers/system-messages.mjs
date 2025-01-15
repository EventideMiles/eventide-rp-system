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
    speaker: ChatMessage.getSpeaker({ actor: item.parent }),
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

export { createStatusMessage, deleteStatusMessage, restoreMessage };
