/**
 * Creates a chat message for the given status effect item, including its name, description, and active effects.
 * @param {Item} item - The status effect item to generate the message for.
 * @returns {Promise<ChatMessage>} The created chat message.
 */
const createStatusMessage = async (item) => {
  const effects = item.effects.toObject();
  const style = `background-color: ${item.system.bgColor.css}; color: ${item.system.textColor.css};`;

  let content = `<div class="eventide-roll-card eventide-status-card" style="${style}">
    <img src="${item.img}" class="eventide-card-primary-image" /> ${item.name}</div>
    <div class="eventide-card-description">
      <div class="eventide-card-name">${item.actor.name}. . . </div> 
      ${item.system.description}</div>
    <hr class="eventide-card-hr" />`;

  if (effects.length > 0) {
    content += "<h3>Effects</h3>";
    for (const effect of effects) {
      content += `<div class="eventide-card-effects-title"><img src="${effect.img}" class="eventide-card-secondary-image" /> ${effect.name}</div>`;
      if (effect.changes.length > 0) {
        for (const change in effect.changes) {
          const set = effect.changes[change];
          const name = set.key.split(".")[2];

          content += `<span class="eventide-card-effects"><b>${name}:</b> 
        ${set.mode === 5 ? "set to" : ""} ${set.value}</span><br>`;
        }
      }
    }
  }

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
  let content = `<div class="eventide-status-delete-card">
    <img src="${item.img}" class="eventide-card-primary-image" /> ${
    item.name
  } : Removed</div>
    <div class="eventide-card-description">
      <div class="eventide-card-name">${item.parent.name}. . . </div> 
      ${
        options?.description
          ? options.description
          : "had a status effect removed"
      }</div>`;

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.parent }),
    content: content,
  });
};

/**
 * Creates a chat message for the restoration of an actor's status, including resolve, power,
 * and status effects restored.
 * @param {Object} options - The restoration options
 * @param {boolean} options.all - Whether all resources and status effects are restored
 * @param {boolean} options.resolve - Whether resolve is restored
 * @param {boolean} options.power - Whether power is restored
 * @param {Array} options.statuses - Array of status effects that are restored
 * @param {Actor} options.actor - The actor whose status is being restored
 * @returns {Promise<ChatMessage>} The created chat message
 */

const restoreMessage = async ({ all, resolve, power, statuses, actor }) => {
  let content = `<div class="eventide-restore-card">
  <i class="fa-solid fa-notes-medical"></i> Restoration </div>
  <div class="eventide-card-description"><div class="eventide-card-name">${actor.name}. . . </div>
  is getting their status restored!</div><hr class="eventide-card-hr" />
  <h3>Restored:</h3><div class="eventide-card-effects">`;

  if (resolve)
    content = `${content}<div><i class="fa-regular fa-heart-pulse"></i> Resolve</div>`;
  if (power)
    content = `${content}<div><i class="fa-duotone fa-solid fa-bolt-lightning"></i> Power</div>`;

  if (all) {
    content = `${content}<div><i class="fa-solid fa-globe"></i> All</div>`;
  } else if (statuses && statuses.length) {
    for (const status of statuses) {
      content = `${content}<div><img src="${status.img}" class="eventide-card-secondary-image" /> ${status.name}</div>`;
    }
  }

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: content,
  });
};

export { createStatusMessage, deleteStatusMessage, restoreMessage };
