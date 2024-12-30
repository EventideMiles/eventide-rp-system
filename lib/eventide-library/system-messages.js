const createStatusMessage = async (item) => {
  const effects = item.effects.toObject();
  const style = `background-color: ${item.system.bgColor.css}; color: ${item.system.textColor.css};`;
  // const primarySize = "20px";
  const secondarySize = "13px";

  let content = `<div class="eventide-status-card" style="${style}">
    <img src="${item.img}" class="eventide-card-primary-image" /> ${item.name}</div>
    <div class="eventide-card-description">
      <div class="eventide-card-name">${item.actor.name}. . . </div> 
      ${item.system.description}</div>
    <hr class="eventide-card-hr" />`;

  if (effects.length > 0) {
    content += "<h3>Effects</h3>";
    for (const effect of effects) {
      content += `<div class="eventide-card-effects-title"><img src="${effect.img}" width="${secondarySize}" height="${secondarySize}" style="border: 0px solid black;" /> ${effect.name}</div>`;
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

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.parent }),
    content: content,
  });
};

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

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.parent }),
    content: content,
  });
};

export { createStatusMessage, deleteStatusMessage };
