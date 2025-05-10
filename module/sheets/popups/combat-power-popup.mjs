import { EventidePopupHelpers } from "../base/eventide-popup-helpers.mjs";

/**
 * Application for displaying combat power information including roll formulas and prerequisites.
 * @extends {EventidePopupHelpers}
 */
export class CombatPowerPopup extends EventidePopupHelpers {
  /** @override */
  static PARTS = {
    combatPowerPopup: {
      template:
        "systems/eventide-rp-system/templates/macros/popups/combat-power-popup.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["eventide-rp-system", "standard-form", "combat-power-popup"],
    position: {
      width: 600, // Slightly wider to accommodate roll formulas
      height: "auto",
    },
    window: {
      icon: "fa-solid fa-dice-d20",
    },
    form: {
      handler: this.#onSubmit,
    },
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format("EVENTIDE_RP_SYSTEM.WindowTitles.CombatPowerPopup");
  }

  constructor({ item }) {
    super({ item });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = CombatPowerPopup.DEFAULT_OPTIONS.classes.join(" ");
    context.problems = await this.checkEligibility();

    context.footerButtons = [
      context.problems.targeting || context.problems.power
        ? null
        : {
            label: game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Forms.Buttons.UsePower"
            ),
            type: "submit",
            cssClass: "popup-form__button popup-form__button--primary",
          },
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Close"),
        type: "button",
        cssClass: "popup-form__button",
        action: "close",
      },
    ];

    return context;
  }

  /**
   * Handle form submission.
   * @param {Event} event - The form submission event
   * @param {HTMLElement} form - The form element
   * @private
   */
  static async #onSubmit(event, form, formData) {
    const problems = await this.checkEligibility();

    if (problems.targeting || problems.power)
      return ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.CombatPowerError")
      );

    this.item.actor.addPower(-this.item.system.cost);

    // Send to chat
    erps.messages.createCombatPowerMessage(this.item);
    this.close();
  }
}
