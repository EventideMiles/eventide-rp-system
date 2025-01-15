const Acrobatics = async () => {
  const tokenArray = erps.utils.getSelectedArray();

  if (!tokenArray.length)
    return ui.notifications.error("Please select a token.");

  for (const token of tokenArray) {
    token.actor.rollAbility({ ability: "acro" });
  }
};

const Physical = async () => {
  const tokenArray = erps.utils.getSelectedArray();

  if (!tokenArray.length)
    return ui.notifications.error("Please select a token.");

  for (const token of tokenArray) {
    token.actor.rollAbility({ ability: "phys" });
  }
};
const Fortitude = async () => {
  const tokenArray = erps.utils.getSelectedArray();

  if (!tokenArray.length)
    return ui.notifications.error("Please select a token.");

  for (const token of tokenArray) {
    token.actor.rollAbility({ ability: "fort" });
  }
};
const Will = async () => {
  const tokenArray = erps.utils.getSelectedArray();

  if (!tokenArray.length)
    return ui.notifications.error("Please select a token.");

  for (const token of tokenArray) {
    token.actor.rollAbility({ ability: "will" });
  }
};
const Wits = async () => {
  const tokenArray = erps.utils.getSelectedArray();

  if (!tokenArray.length)
    return ui.notifications.error("Please select a token.");

  for (const token of tokenArray) {
    token.actor.rollAbility({ ability: "wits" });
  }
};
