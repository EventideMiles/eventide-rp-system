const tokenArray = await game.erps.getSelectedArray();

if (!tokenArray.length)
  return ui.notifications.error(`Please select a token first`);

const storageKeys = [
  "heal_label",
  "heal_description",
  "heal_formula",
  "heal_heal",
];

const main = async () => {
  let applyChanges = false;
  let storeData = false;

  new Dialog({
    title: `Self-Target`,
    content: `
  <form autocomplete="off">
    <div class="form-group">
      <p>This script is for creating a custom heal or damage message
      and applying the result to your selected tokens.</p>
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
    <div class="form-group">
      <label>Is Heal</label>
      <input type="checkbox" name="heal">
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

      console.log(storedData);

      html
        .find(`[name="label"]`)[0]
        .setAttribute("value", storedData.heal_label);
      html
        .find(`[name="description"]`)[0]
        .setAttribute("value", storedData.heal_description);
      html
        .find(`[name="formula"]`)[0]
        .setAttribute("value", storedData.heal_formula);
      html.find(`[name="heal"]`)[0].checked =
        storedData.heal_heal === "true" ? true : false;
    },
    close: async (html) => {
      const label = html.find(`[name="label"]`)[0].value || "Heal";
      const description = html.find(`[name="description"]`)[0].value || "";
      const formula = html.find(`[name="formula"]`)[0].value || "1";
      const heal = html.find(`[name="heal"]`)[0].checked;

      if (applyChanges) {
        for (const token of tokenArray) {
          const damageOptions = {
            label,
            formula,
            type: heal ? "heal" : "damage",
          };

          if (description) {
            damageOptions["description"] = description;
          }

          await token.actor.damageResolve(damageOptions);
        }
      }
      if (storeData) {
        const storageObject = {
          heal_label: label,
          heal_description: description,
          heal_formula: formula,
          heal_heal: heal,
        };

        game.erps.storeLocal(storageObject);
      }
    },
  }).render(true);
};

return await main();
