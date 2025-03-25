const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class BaseSettingsApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "eventide-settings",
    position: {
      width: 600,
      height: "auto",
    },
    tag: "form",
    form: {
      handler: this._onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  }

  async _prepareContext() {
    const context = await super._prepareContext();
    return context;
  }
}