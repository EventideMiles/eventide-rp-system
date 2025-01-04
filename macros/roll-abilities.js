const tokenArray = await game.erps.getSelectedArray();

if (!tokenArray.length) return ui.notifications.error("Please select a token.");

for (const token of tokenArray) {
  token.actor.rollAbility({ ability: "acro" });
}
