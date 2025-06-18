const Acrobatics = async () => {
  const tokenArray = await erps.utils.getSelectedArray();

  if (!tokenArray.length)
    return ui.notifications.error(
      game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SelectFirst")
    );

  for (const token of tokenArray) {
    token.actor.rollAbility({ ability: "acro" });
  }
};

const Physical = async () => {
  const tokenArray = await erps.utils.getSelectedArray();

  if (!tokenArray.length)
    return ui.notifications.error(
      game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SelectFirst")
    );

  for (const token of tokenArray) {
    token.actor.rollAbility({ ability: "phys" });
  }
};
const Fortitude = async () => {
  const tokenArray = await erps.utils.getSelectedArray();

  if (!tokenArray.length)
    return ui.notifications.error(
      game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SelectFirst")
    );

  for (const token of tokenArray) {
    token.actor.rollAbility({ ability: "fort" });
  }
};
const Will = async () => {
  const tokenArray = await erps.utils.getSelectedArray();

  if (!tokenArray.length)
    return ui.notifications.error(
      game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SelectFirst")
    );

  for (const token of tokenArray) {
    token.actor.rollAbility({ ability: "will" });
  }
};
const Wits = async () => {
  const tokenArray = await erps.utils.getSelectedArray();

  if (!tokenArray.length)
    return ui.notifications.error(
      game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SelectFirst")
    );

  for (const token of tokenArray) {
    token.actor.rollAbility({ ability: "wits" });
  }
};
