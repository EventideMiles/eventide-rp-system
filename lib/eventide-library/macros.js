const { DialogV2 } = foundry.applications.api;

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
  try {
    const tokenArray = await game.erps.getTargetArray();
    if (!tokenArray || !tokenArray.length)
      return ui.notifications.error(`Please target a token first`);

    // Ensure number is a valid integer
    const safeNumber = Math.floor(number);

    const storageKeys = [
      `damage_${safeNumber}_label`,
      `damage_${safeNumber}_description`,
      `damage_${safeNumber}_formula`,
    ];

    const storedData = (await game.erps.retrieveLocal(storageKeys)) || {};

    const templateData = {
      storedData,
      storageKeys,
    };

    const content = await renderTemplate(
      "/systems/eventide-rp-system/templates/macros/damage.hbs",
      templateData
    );

    const dialog = new DialogV2({
      window: { title: `Custom Damage` },
      content: content,
      modal: true,
      buttons: [
        {
          action: "attack",
          icon: "<i class='fas fa-bolt'></i>",
          label: `Attack`,
          default: true,
          callback: (event, button, dialog) => {
            return {
              action: "attack",
              elements: button.form.elements,
            };
          },
        },
        {
          action: "store",
          icon: "<i class='fas fa-hourglass'></i>",
          label: `Store`,
          callback: (event, button, dialog) => {
            return {
              action: "store",
              elements: button.form.elements,
            };
          },
        },
        {
          action: "cancel",
          icon: "<i class='fas fa-times'></i>",
          label: `Cancel`,
        },
      ],
      submit: async (result) => {
        if (!["attack", "store"].includes(result.action)) return;

        const html = result.elements;

        const label = html.label?.value || "Damage";
        const description = html.description?.value || "";
        const formula = html.formula?.value || "1";

        if (result.action === "attack") {
          const damageOptions = {
            label,
            formula,
            ...(description && { description }),
          };
          await Promise.all(
            tokenArray.map((token) => token.actor.damageResolve(damageOptions))
          );
        }

        const storageObject = {
          [storageKeys[0]]: label,
          [storageKeys[1]]: description,
          [storageKeys[2]]: formula,
        };
        game.erps.storeLocal(storageObject);
      },
    });

    dialog.render(true);
  } catch (error) {
    console.error("Error in damageTargets:", error);
    ui.notifications.error("An error occurred while applying damage.");
  }
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
  try {
    const targetTokens = await game.erps.getTargetArray();

    if (targetTokens.length === 0) {
      return ui.notifications.error(`Please target a token first!`);
    }

    if (targetTokens.length > 1) {
      return ui.notifications.error(`You can only target one token at a time!`);
    }

    const actor = targetTokens[0].actor;
    const statusEffects = actor?.items?.filter(
      (item) => item?.type === "status"
    );

    const defaultOptions = {
      restoreResolve: true,
      restorePower: true,
    };

    const templateData = {
      defaultOptions,
      statusEffects,
    };

    const content = await renderTemplate(
      "/systems/eventide-rp-system/templates/macros/restore-target.hbs",
      templateData
    );

    new DialogV2({
      title: `Restore Target`,
      content: content,
      buttons: [
        {
          action: "restore",
          icon: "<i class='fas fa-check'></i>",
          label: `Restore`,
          default: true,
          callback: (event, button, dialog) => {
            return {
              action: "restore",
              elements: button.form.elements,
            };
          },
        },
        {
          action: "cancel",
          icon: "<i class='fas fa-times'></i>",
          label: `Cancel`,
        },
      ],
      submit: async (result) => {
        if (result.action !== "restore") return;

        const html = result.elements;

        const selectedStatuses = statusEffects?.filter(
          (status) => html[status?.id]?.checked
        );
        const restoreOptions = {
          resolve: html.restoreResolve?.checked,
          power: html.restorePower?.checked,
          all: html.all?.checked,
          statuses: selectedStatuses,
        };

        await actor?.restore(restoreOptions);
      },
    }).render(true);
  } catch (error) {
    console.error("Error in restoreTarget:", error);
    ui.notifications.error("An error occurred while restoring the target.");
  }
};

const statusCreator = async () => {
  const targetArray = await game.erps.getTargetArray();

  if (targetArray.length === 0)
    ui.notifications.warn(
      `If you proceed status will only be created in compendium: not applied.`
    );

  const dialog = new game.erps.statusCreatorApplication().render(true);
};

const incrementTargetStatus = () => {};
