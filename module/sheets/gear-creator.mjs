import { CreatorApplication } from "./base/creator-application.mjs";
/**
 * A form application for creating and managing gear items.
 * @extends {CreatorApplication}
 */
export class GearCreator extends CreatorApplication {
  static PARTS = {
    gearCreator: {
      template: "systems/eventide-rp-system/templates/macros/gear-creator.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["eventide-rp-system", "standard-form", "gear-creator"],
    window: {
      title: "Gear Creator",
      icon: "fa-solid fa-sack",
    },
    form: {
      handler: this._onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      onEditImage: super._onEditImage,
    },
  };

  constructor({ advanced = false, number = 0, playerMode = false } = {}) {
    super({ advanced, number, playerMode, keyType: "gear" });
  }

  /**
   * Prepares the main context data for the form.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context containing abilities, stored preferences, and target information
   * @throws {Error} Implicitly closes the form if a player has no selected tokens
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.storedData = {
      gear_img:
        this.storedData[this.storageKeys[0]] || "icons/svg/item-bag.svg",
      gear_bgColor: this.storedData[this.storageKeys[1]],
      gear_textColor: this.storedData[this.storageKeys[2]],
    };

    return context;
  }
}
