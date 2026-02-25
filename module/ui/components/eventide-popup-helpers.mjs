const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { TextEditor } = foundry.applications.ux;
import { WindowSizingFixMixin } from "./_module.mjs";

export class EventidePopupHelpers extends WindowSizingFixMixin(
  HandlebarsApplicationMixin(ApplicationV2),
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
    const enrichedDescription = await this._enrichDescription();
    const context = {
      item: this.item,
      effects: Array.from(this.item.effects),
      mainEffect: Array.from(this.item.effects)[0],
      isGM: game.user.isGM,
      enrichedDescription,
    };

    this.problems = await this.checkEligibility();
    context.callouts = await this._prepareCallouts();
    context.footerButtons = await this._prepareFooterButtons();

    return context;
  }

  /**
   * Enriches an item description for safe HTML rendering
   * @private
   * @returns {Promise<string>} The enriched and sanitized HTML
   */
  async _enrichDescription() {
    if (!this.item?.system?.description) {
      return "";
    }

    try {
      return await TextEditor.implementation.enrichHTML(
        this.item.system.description,
        {
          secrets: this.item.isOwner ?? false,
          rollData: this.item.getRollData?.() ?? {},
          relativeTo: this.item,
        },
      );
    } catch {
      return this.item.system.description;
    }
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
        cssClass: "erps-button erps-button--primary",
      });
    }

    buttons.push({
      label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Close"),
      type: "button",
      cssClass: "erps-button",
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
   * @param {Object} [options={}] - Options for the eligibility check
   * @param {boolean} [options.skipTargetingCheck] - Skip the targeting eligibility check
   * @returns {Object} An object containing the eligibility status for each check.
   */
  async checkEligibility(options = {}) {
    const problems = {
      targeting: false,
      power: false,
      quantity: false,
      equipped: false,
    };

    if (!options.skipTargetingCheck && this.item.system.targeted) {
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

  /**
   * Clean up resources before closing the application
   * @param {Object} options - The options for closing
   * @returns {Promise<void>}
   * @override
   */
  async _preClose(options) {
    // Call mixin cleanup first
    await super._preClose(options);
  }
}
