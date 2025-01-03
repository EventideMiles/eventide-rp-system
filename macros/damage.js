/*
 * Custom Damage
 * This script is designed to take damage and pass it to
 * the _damage_handler script. Its a middle man for this
 * script.
 *
 */
const tokenArray = await game.eventiderpsystem.getTargetArray();

if (!tokenArray) return ui.notifications.error(`Please target a token first`);

const defaultOptions = {
  // options
  tokenArray: tokenArray,
  storageKeys: ["damage_label", "damage_description", "damage_formula"],
};

const main = async (options) => {
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
      const storedData = await game.eventiderpsystem.retrieveLocal(
        options.storageKeys
      );

      html
        .find(`[name="label"]`)[0]
        .setAttribute("value", storedData.damage_label);
      html
        .find(`[name="description"]`)[0]
        .setAttribute("value", storedData.damage_description);
      html
        .find(`[name="formula"]`)[0]
        .setAttribute("value", storedData.damage_formula);
    },
    close: async (html) => {
      const label = html.find(`[name="label"]`)[0].value || "Damage";
      const description = html.find(`[name="description"]`)[0].value || "";
      const formula = html.find(`[name="formula"]`)[0].value || "1";

      if (applyChanges) {
        for (const token of options.tokenArray) {
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
          damage_label: label,
          damage_description: description,
          damage_formula: formula,
        };

        game.eventiderpsystem.storeLocal(storageObject);
      }
    },
  }).render(true);
};

return await main({ ...defaultOptions });
