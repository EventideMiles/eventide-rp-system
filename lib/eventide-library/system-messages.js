const statusMessage = async (item) => {
  const effects = item.effects.toObject();
  const style = `background-color: ${item.system.bgColor.css}; color: ${item.system.textColor.css};`;
  const primarySize = "20px";
  const secondarySize = "13px";

  let content = `<div class="eventide-status-card" style="${style}">
    <img src="${item.img}" width="${primarySize}" height="${primarySize}" style="border: 0px solid black;" /> ${item.name}</div>
    <div class="eventide-card-description">
      <div class="eventide-card-name">${item.actor.name}. . . </div> 
      ${item.system.description}</div>
    <hr style="border: none; border-top: 2px solid rgb(112, 142, 184);">`;

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

export { statusMessage };
