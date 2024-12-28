const statusMessage = async (item) => {
  const effects = item.effects.toObject();
  const style = `background-color: ${item.system.bgColor.css}; color: ${item.system.textColor.css};`;

  let content = `<div class="eventide-status-card" style="${style}"><img src="${item.img}" width="20px" height="20px" style="border: 0px solid black;"></img> ${item.name}</div><div class="eventide-card-description"><span class="eventide-card-name">${item.actor.name}...</span> ${item.system.description}</div><hr style="border: none; border-top: 2px solid rgb(112, 142, 184);">`;

  if (effects.length > 0) {
    content += "<h3>Effects</h3>";
    for (const effect of effects) {
      content += `<span class="eventide-card-effects-title"><img src="${effect.img}" width="10px" height="10px" style="border: 0px solid black;"></img> ${effect.name}</span><br>`;
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

export { statusMessage };
