/*
 * This macro is designed to damage all targeted tokens.
 *
 */
const tokenArray = await game.erps.getTargetArray();

if (!tokenArray.length)
  return ui.notifications.error(`Please target a token first`);

const storageKeys = [
  "damage_2_label",
  "damage_2_description",
  "damage_2_formula",
];

const main = async () => {
  let applyChanges = false;
  let storeData = false;

  new Dialog({
    title: `Custom Damage`,
    content: `
  <form autocomplete="off">
    <div class="form-group">
      <p>This script is for creating a custom damage message
      and applying the damage to your targeted token.</p>
    </div>
    <div class="form-group">
      <label>Label:</label>
      <input name="label" value="">
    </div>
    <div class="form-group">
      <label>Description:</label>
      <input name="description" value="">
    </div>
    <div class="form-group">
      <label>Formula:</label>
      <input name="formula" value="">
    </div>
  </form>
  `,
    buttons: {
      yes: {
        icon: "<i class='fas fa-bolt'></i>",
        label: `Attack`,
        callback: () => ((applyChanges = true), (storeData = true)),
      },
      store: {
        icon: "<i class='fas fa-hourglass'></i>",
        label: `Store`,
        callback: () => (storeData = true),
      },
      no: {
        icon: "<i class='fas fa-times'></i>",
        label: `Cancel`,
      },
    },
    default: "yes",
    render: async (html) => {
      const storedData = await game.erps.retrieveLocal(storageKeys);

      html
        .find(`[name="label"]`)[0]
        .setAttribute("value", storedData.damage_2_label);
      html
        .find(`[name="description"]`)[0]
        .setAttribute("value", storedData.damage_2_description);
      html
        .find(`[name="formula"]`)[0]
        .setAttribute("value", storedData.damage_2_formula);
    },
    close: async (html) => {
      const label = html.find(`[name="label"]`)[0].value || "Damage";
      const description = html.find(`[name="description"]`)[0].value || "";
      const formula = html.find(`[name="formula"]`)[0].value || "1";

      if (applyChanges) {
        for (const token of tokenArray) {
          const damageOptions = {
            label,
            formula,
          };

          if (description) {
            damageOptions["description"] = description;
          }

          await token.actor.damageResolve(damageOptions);
        }
      }
      if (storeData) {
        const storageObject = {
          damage_2_label: label,
          damage_2_description: description,
          damage_2_formula: formula,
        };

        game.erps.storeLocal(storageObject);
      }
    },
  }).render(true);
};

return await main();
