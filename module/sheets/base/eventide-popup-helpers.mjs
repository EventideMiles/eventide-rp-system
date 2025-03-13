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
}
