/**
 * Displays a dialog to create and apply custom damage to targeted tokens.
 *
 * Retrieves stored damage information and pre-fills a form for custom damage
 * creation. Users can input a label, description, and formula for damage,
 * which can be applied immediately to targeted tokens or stored for future use.
 *
 * @param {number} [number=0] - An identifier for retrieving and storing specific damage data.
 *
 * Utilizes `game.erps.getTargetArray` to get the list of targeted tokens. If no tokens
 * are targeted, an error notification is displayed. On form submission, damage is
 * applied to targeted tokens using the specified options, and data can be stored
 * locally for future retrieval.
 */

const damage = async (number = 0) => {
  const tokenArray = await game.erps.getTargetArray();
  if (!tokenArray.length)
    return ui.notifications.error(`Please target a token first`);

  const storageKeys = [
    `damage_${number}_label`,
    `damage_${number}_description`,
    `damage_${number}_formula`,
  ];
  const storedData = await game.erps.retrieveLocal(storageKeys);

  let applyChanges = false;
  let storeData = false;

  new Dialog({
    title: `Custom Damage`,
    content: `
      <form autocomplete="off">
        <div class="form-group">
          <p>This script is for creating a custom damage message and applying the damage to your targeted token.</p>
        </div>
        <div class="form-group"><label>Label:</label><input name="label" value="${
          storedData[storageKeys[0]] || ""
        }"></div>
        <div class="form-group"><label>Description:</label><input name="description" value="${
          storedData[storageKeys[1]] || ""
        }"></div>
        <div class="form-group"><label>Formula:</label><input name="formula" value="${
          storedData[storageKeys[2]] || ""
        }"></div>
      </form>`,
    buttons: {
      yes: {
        icon: "<i class='fas fa-bolt'></i>",
        label: `Attack`,
        callback: () => {
          applyChanges = true;
          storeData = true;
        },
      },
      store: {
        icon: "<i class='fas fa-hourglass'></i>",
        label: `Store`,
        callback: () => {
          storeData = true;
        },
      },
      no: {
        icon: "<i class='fas fa-times'></i>",
        label: `Cancel`,
      },
    },
    default: "yes",
    close: async (html) => {
      const label = html.find(`[name="label"]`).val() || "Damage";
      const description = html.find(`[name="description"]`).val() || "";
      const formula = html.find(`[name="formula"]`).val() || "1";

      if (applyChanges) {
        const damageOptions = {
          label,
          formula,
          ...(description && { description }),
        };
        await Promise.all(
          tokenArray.map((token) => token.actor.damageResolve(damageOptions))
        );
      }
      if (storeData) {
        const storageObject = {
          [storageKeys[0]]: label,
          [storageKeys[1]]: description,
          [storageKeys[2]]: formula,
        };
        game.erps.storeLocal(storageObject);
      }
    },
  }).render(true);
};
