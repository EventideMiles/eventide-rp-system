const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class EventidePopupHelpers extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  static DEFAULT_OPTIONS = {
    id: "popup",
    tag: "form",
    form: {
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  constructor({ item }) {
    super();
    this.item = item;
  }

  async _prepareContext(_options) {
    const context = {
      item: this.item,
      effects: Array.from(this.item.effects),
      mainEffect: Array.from(this.item.effects)[0],
      isGM: game.user.isGM,
    };

    this.problems = await this.checkEligibility();
    context.callouts = await this._prepareCallouts();
    context.footerButtons = await this._prepareFooterButtons();

    return context;
  }

  async _preparePartContext(partId, context, _options) {
    context.partId = `${this.id}-${partId}`;
    return context;
  }

  async _prepareCallouts() {
    const callouts = [];

    if (this.type === "power" && this.problems.targeting) {
      callouts.push({
        type: "warning",
        faIcon: "fas fa-exclamation-triangle",
        text: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Power.TargetPower",
        ),
      });
    }

    if (this.type === "gear" && this.problems.targeting) {
      callouts.push({
        type: "warning",
        faIcon: "fas fa-exclamation-triangle",
        text: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Gear.TargetGear",
        ),
      });
    }

    if (this.problems.quantity) {
      callouts.push({
        type: "warning",
        faIcon: "fas fa-exclamation-triangle",
        text: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Gear.InsufficientQuantity",
          {
            cost: this.item.system.cost,
            quantity: this.item.system.quantity,
          },
        ),
      });
    }

    if (this.problems.equipped) {
      callouts.push({
        type: "warning",
        faIcon: "fas fa-exclamation-triangle",
        text: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Gear.NotEquipped",
        ),
      });
    }

    if (this.problems.power) {
      callouts.push({
        type: "warning",
        faIcon: "fas fa-exclamation-triangle",
        text: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Power.InsufficientPower",
          {
            cost: this.item.system.cost,
            actorPower: this.item.actor.system.power.value,
          },
        ),
      });
    }

    return callouts;
  }

  async _prepareFooterButtons() {
    const buttons = [];
    const actionLabel = {
      gear: "EVENTIDE_RP_SYSTEM.Forms.Buttons.UseItem",
      power: "EVENTIDE_RP_SYSTEM.Forms.Buttons.UsePower",
      feature: "EVENTIDE_RP_SYSTEM.Forms.Buttons.SendToChat",
      status: "EVENTIDE_RP_SYSTEM.Forms.Buttons.SendToChat",
    };

    if (
      !this.problems ||
      !Object.values(this.problems).some((value) => value)
    ) {
      buttons.push({
        label: game.i18n.localize(actionLabel[this.type]),
        type: "submit",
        cssClass: "popup-form__button popup-form__button--primary",
      });
    }

    buttons.push({
      label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Close"),
      type: "button",
      cssClass: "popup-form__button",
      action: "close",
    });

    return buttons;
  }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
  }

  /**
   * Checks if the item is eligible for use based on targeting, power, and quantity.
   * @returns {Object} An object containing the eligibility status for each check.
   */
  async checkEligibility() {
    const problems = {
      targeting: false,
      power: false,
      quantity: false,
      equipped: false,
    };

    if (this.item.system.targeted) {
      const targetArray = await erps.utils.getTargetArray();
      if (targetArray.length === 0) problems.targeting = true;
    }

    if (this.type === "gear") {
      if (this.item.system.cost > (this.item.system.quantity || 0)) {
        problems.quantity = true;
      }

      if (!this.item?.system?.equipped) {
        problems.equipped = true;
      }
    }

    if (this.type === "power") {
      if (this.item.system.cost > this.item.actor?.system?.power?.value) {
        problems.power = true;
      }
    }

    return problems;
  }
}
