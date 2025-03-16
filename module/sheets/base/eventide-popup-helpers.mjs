const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class EventidePopupHelpers extends HandlebarsApplicationMixin(
  ApplicationV2
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

  async _prepareContext(options) {
    const context = {
      item: this.item,
      effects: Array.from(this.item.effects),
    };

    return context;
  }

  async _preparePartContext(partId, context, options) {
    context.partId = `${this.id}-${partId}`;
    return context;
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

    if (this.item.system.cost > (this.item.system.quantity || 0)) {
      problems.quantity = true;
    }
    if (this.item.system.cost > this.item.actor?.system?.power?.value) {
      problems.power = true;
    }
    if (!this.item?.system?.equipped) {
      problems.equipped = true;
    }

    return problems;
  }
}
