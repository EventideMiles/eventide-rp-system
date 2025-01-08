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
const damageTargets = async (number = 0) => {
  const tokenArray = await game.erps.getTargetArray();
  if (!tokenArray.length)
    return ui.notifications.error(`Please target a token first`);

  // Ensure number is a valid integer
  const safeNumber = Math.floor(number);

  const storageKeys = [
    `damage_${safeNumber}_label`,
    `damage_${safeNumber}_description`,
    `damage_${safeNumber}_formula`,
  ];

  const storedData = await game.erps.retrieveLocal(storageKeys);

  let applyChanges = false;
  let storeData = false;

  const templateData = {
    storedData,
    storageKeys,
  };

  const content = await renderTemplate(
    "/systems/eventide-rp-system/templates/macros/damage.hbs",
    templateData
  );

  new Dialog({
    title: `Custom Damage`,
    content: content,
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

/**
 * Initiates a dialog to restore resources and/or remove status effects from a targeted token.
 *
 * Checks if exactly one token is targeted. If no tokens or multiple tokens are selected,
 * an error notification is displayed. The user is presented with options to restore
 * resolve, power, or remove status effects through a dialog. The selected options are
 * applied to the targeted token upon confirmation.
 *
 * Utilizes `game.erps.getTargetArray` to get the list of targeted tokens.
 * Uses a Handlebars template for rendering the dialog content.
 */
const restoreTarget = async () => {
  const targetTokens = await game.erps.getTargetArray();

  if (targetTokens.length === 0) {
    return ui.notifications.error(`Please target a token first!`);
  }

  if (targetTokens.length > 1) {
    return ui.notifications.error(`You can only target one token at a time!`);
  }

  const actor = targetTokens[0].actor;
  const statusEffects = actor.items.filter((item) => item.type === "status");

  const defaultOptions = {
    restoreResolve: true,
    restorePower: true,
  };

  const templateData = {
    defaultOptions,
    statusEffects,
  };

  const content = await renderTemplate(
    "/systems/eventide-rp-system/templates/macros/restore.hbs",
    templateData
  );

  let applyChanges = false;

  new Dialog({
    title: `Restore Target`,
    content: content,
    buttons: {
      yes: {
        icon: "<i class='fas fa-check'></i>",
        label: `Restore`,
        callback: () => (applyChanges = true),
      },
      no: {
        icon: "<i class='fas fa-times'></i>",
        label: `Cancel`,
      },
    },
    default: "yes",
    close: async (html) => {
      if (applyChanges) {
        const selectedStatuses = statusEffects.filter(
          (status) => html.find(`[id="${status.id}"]`)[0].checked
        );
        const restoreOptions = {
          resolve: html.find(`[name="restoreResolve"]`)[0].checked,
          power: html.find(`[name="restorePower"]`)[0].checked,
          all: html.find(`[name="all"]`)[0].checked,
          statuses: selectedStatuses,
        };

        await actor.restore(restoreOptions);
      }
    },
  }).render(true);
};

/**
 * Initiates a dialog to create a status item with a custom name, description, image,
 * and effects. The user can select which abilities the status effects, and in what
 * manner (add, override). The dialog includes a preview of the status item's image.
 *
 * The created status item is created as an embedded document on the token's actor,
 * and is also stored in the "customstatuses" compendium.
 *
 * Utilizes `game.erps.getTargetArray` to get the list of targeted tokens.
 * Uses a Handlebars template for rendering the dialog content.
 */
const statusCreator = async () => {
  const targetArray = await game.erps.getTargetArray();
  let fileStatus;
  let createdItem;

  if (targetArray.length === 0) {
    return ui.notifications.error(`Please target a token first!`);
  }

  const abilities = ["Acro", "Phys", "Fort", "Will", "Wits"];
  const hiddenAbilities = ["Roll", "Cmin", "Cmax", "Fmin", "Fmax"];

  const templateData = {
    abilities,
    hiddenAbilities,
  };

  const content = await renderTemplate(
    "/systems/eventide-rp-system/templates/macros/status-creator.hbs",
    templateData
  );

  new Dialog({
    title: "Create Status Item",
    content: content,
    buttons: {
      yes: {
        label: "Create Status Item",
        callback: async (html) => {
          const name = html.find("#name").val();
          const description = html.find("#description").val();
          const img = html.find("#img").val();
          const bgColor = html.find("#bgColor").val();
          const textColor = html.find("#textColor").val();

          const effects = abilities
            .map((ability) => {
              const value = parseInt(
                html.find(`#${ability.toLowerCase()}`).val()
              );
              if (value === 0) return null;
              const mode = html.find(`#${ability.toLowerCase()}-mode`).val();

              return {
                key: `system.abilities.${ability.toLowerCase()}.${
                  mode === "add" ? "change" : "override"
                }`,
                mode:
                  mode === "add"
                    ? CONST.ACTIVE_EFFECT_MODES.ADD
                    : CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: value,
                priority: 0,
              };
            })
            .filter((e) => e !== null);

          const hiddenEffects = hiddenAbilities
            .map((ability) => {
              const value = parseInt(
                html.find(`#${ability.toLowerCase()}`).val()
              );
              if (value === 0) return null;
              const mode = html.find(`#${ability.toLowerCase()}-mode`).val();

              return {
                key: `system.hiddenAbilities.${ability.toLowerCase()}.${
                  mode === "add" ? "change" : "override"
                }`,
                mode:
                  mode === "add"
                    ? CONST.ACTIVE_EFFECT_MODES.ADD
                    : CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: value,
                priority: 0,
              };
            })
            .filter((e) => e !== null);

          const statusItem = {
            name,
            type: "status",
            system: {
              description,
              bgColor,
              textColor,
            },
            img,
            effects: [
              {
                _id: foundry.utils.randomID(),
                name,
                img,
                changes: [...effects, ...hiddenEffects],
                disabled: false,
                duration: {
                  startTime: null,
                  seconds: 18000,
                  combat: "",
                  rounds: 0,
                  turns: 0,
                  startRound: 0,
                  startTurn: 0,
                },
                description: "",
                origin: "",
                tint: bgColor,
                transfer: true,
                statuses: new Set(),
                flags: {},
              },
            ],
          };

          for (const token of targetArray) {
            const actor = token.actor;
            createdItem = await actor.createEmbeddedDocuments("Item", [
              statusItem,
            ]);
          }

          // Store the status item in the compendium, create pack if it doesn't exist
          let pack = game.packs.get("world.customstatuses");
          if (!pack) {
            pack = await CompendiumCollection.createCompendium({
              name: "customstatuses",
              label: "Custom Statuses",
              type: "Item",
            });
          }
          await pack.importDocument(createdItem[0]);
        },
      },
    },
    render: async (html) => {
      const inputImg = document.getElementById("img");
      const imgPreview = document.getElementById("image-preview");

      const previewUpdate = () => {
        imgPreview.src = inputImg.value;
      };

      inputImg.addEventListener("change", () => previewUpdate());

      fileStatus = await FilePicker.fromButton(html.find("#file-picker")[0]);

      html.find("#file-picker").on("click", async () => {
        const previous = html.find("#img").val();
        await fileStatus.browse(null, {
          callback: (result) => {
            if (typeof result === "object") {
              html.find("#img").val(previous);
            } else {
              html.find("#img").val(result);
              previewUpdate();
            }
          },
        });
      });

      html.find("#img").on("input", (event) => {
        imgPreview.src = event.target.value;
      });
    },
  }).render(true);
};

export { damageTargets, restoreTarget, statusCreator };
