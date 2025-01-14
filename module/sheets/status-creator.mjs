const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class StatusCreator extends HandlebarsApplicationMixin(ApplicationV2) {
  static PARTS = {
    statusCreator: {
      template:
        "/systems/eventide-rp-system/templates/macros/status-creator.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "status-creator",
    classes: ["eventide-rp-system", "standard-form", "status-creator"],
    position: {
      width: 640,
      height: 600,
    },
    tag: "form",
    window: {
      title: "Status Creator",
      icon: "fa-solid fa-message-plus",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  // todo: implement local storage for img value on context.

  static abilities = ["Acro", "Phys", "Fort", "Will", "Wits"];
  static hiddenAbilities = ["Dice", "Cmin", "Cmax", "Fmin", "Fmax"];
  static storageKeys = ["status_img", "status_bgColor", "status_textColor"];

  async _prepareContext(options) {
    const context = {};

    context.cssClass = StatusCreator.DEFAULT_OPTIONS.classes.join(" ");
    context.abilities = StatusCreator.abilities;
    context.hiddenAbilities = StatusCreator.hiddenAbilities;
    context.targetArray = await game.erps.getTargetArray();

    if (context.targetArray.length === 0)
      ui.notifications.warn(
        `If you proceed status will only be created in compendium: not applied.`
      );

    context.storedData = await game.erps.retrieveLocal(
      StatusCreator.storageKeys
    );

    context.returnedData = context.storedData.img;
    return context;
  }

  static async #onSubmit(event, form, formData) {
    const abilities = StatusCreator.abilities;
    const hiddenAbilities = StatusCreator.hiddenAbilities;

    const targetArray = await game.erps.getTargetArray();

    let createdItem;

    const html = form;
    const name = html.name.value;
    const description = html.description.value;
    const img = html.img.value;
    const bgColor = html.bgColor.value;
    const textColor = html.textColor.value;

    if ((!name, !description, !img, !bgColor, !textColor))
      return ui.notifications.error("Missing data!");

    const effects = abilities
      .map((ability) => {
        const value = parseInt(html[ability.toLowerCase()].value);
        if (value === 0) return null;
        const mode = html[`${ability.toLowerCase()}-mode`].value;

        return {
          key: `system.abilities.${ability.toLowerCase()}.${
            ["downgrade", "upgrade"].includes(mode)
              ? "total"
              : mode === "add"
              ? "change"
              : "override"
          }`,
          mode:
            mode === "add"
              ? CONST.ACTIVE_EFFECT_MODES.ADD
              : mode === "override"
              ? CONST.ACTIVE_EFFECT_MODES.OVERRIDE
              : mode === "downgrade"
              ? CONST.ACTIVE_EFFECT_MODES.DOWNGRADE
              : CONST.ACTIVE_EFFECT_MODES.UPGRADE,
          value: value,
          priority: 0,
        };
      })
      .filter((e) => e !== null);

    const hiddenEffects = hiddenAbilities
      .map((ability) => {
        const value = parseInt(html[ability.toLowerCase()].value);
        if (value === 0) return null;
        const mode = html[`${ability.toLowerCase()}-mode`].value;

        return {
          key: `system.hiddenAbilities.${ability.toLowerCase()}.${
            ["downgrade", "upgrade"].includes(mode)
              ? "total"
              : mode === "add"
              ? "change"
              : "override"
          }`,
          mode:
            mode === "add"
              ? CONST.ACTIVE_EFFECT_MODES.ADD
              : mode === "override"
              ? CONST.ACTIVE_EFFECT_MODES.OVERRIDE
              : mode === "downgrade"
              ? CONST.ACTIVE_EFFECT_MODES.DOWNGRADE
              : CONST.ACTIVE_EFFECT_MODES.UPGRADE,
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
          description: description || "",
          origin: "",
          tint: bgColor,
          transfer: true,
          statuses: new Set(),
          flags: {},
        },
      ],
    };

    if (targetArray.length > 0) {
      for (const token of targetArray) {
        const actor = token.actor;
        createdItem = await actor.createEmbeddedDocuments("Item", [statusItem]);
      }
    } else {
      createdItem = await game.items.createDocument(statusItem);
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

    if (createdItem) {
      await pack.importDocument(createdItem[0] ? createdItem[0] : createdItem);
    }

    // store the data in localStorage
    const storageObject = {
      [StatusCreator.storageKeys[0]]: img,
      [StatusCreator.storageKeys[1]]: bgColor,
      [StatusCreator.storageKeys[2]]: textColor,
    };

    game.erps.storeLocal(storageObject);
  }
}
