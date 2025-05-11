import { CreatorApplication } from "./base/creator-application.mjs";
/**
 * A form application for creating and managing status effects and features.
 * @extends {CreatorApplication}
 */
export class EffectCreator extends CreatorApplication {
  static PARTS = {
    effectCreator: {
      template:
        "/systems/eventide-rp-system/templates/macros/effect-creator.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["eventide-rp-system", "standard-form", "effect-creator"],
    window: {
      icon: "fa-solid fa-message-plus",
    },
    form: {
      handler: super._onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format("EVENTIDE_RP_SYSTEM.WindowTitles.EffectCreator");
  }

  constructor({ advanced = false, number = 0, playerMode = false } = {}) {
    super({ advanced, number, playerMode, keyType: "effect" });
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
      effect_img:
        this.storedData[this.storageKeys[0]] || "icons/svg/stoned.svg",
      effect_bgColor: this.storedData[this.storageKeys[1]],
      effect_textColor: this.storedData[this.storageKeys[2]],
      effect_iconTint: this.storedData[this.storageKeys[3]],
      effect_displayOnToken: this.storedData[this.storageKeys[4]],
      effect_type:
        this.storedData[this.storageKeys[5]] === "feature" || context.playerMode
          ? "feature"
          : "status",
    };

    context.callouts = [];

    if (context.playerMode) {
      context.callouts.push({
        type: "information",
        icon: "fas fa-info-circle",
        text: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Effect.PlayerMode",
          { count: context.selectedArray.length }
        ),
      });
    } else {
      if (context.targetArray.length === 0) {
        context.callouts.push({
          type: "information",
          faIcon: "fas fa-info-circle",
          text: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Forms.Callouts.Effect.NoTargets"
          ),
        });
      } else {
        context.callouts.push({
          type: "information",
          faIcon: "fas fa-info-circle",
          text: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Forms.Callouts.Effect.WithTargets",
            { count: context.targetArray.length }
          ),
        });
      }
    }

    //   <header class="base-form__callout-box">
    //   {{#if (eq playerMode true)}}
    //     <div`` class="base-form__callout base-form__callout--information">
    //       <i class="fas fa-info-circle"></i>
    //       {{{localize "EVENTIDE_RP_SYSTEM.Forms.Callouts.Effect.PlayerMode" count=selectedArray.length}}}
    //     </div>
    //   {{/if}}
    //   {{#if (eq playerMode false)}}
    //     {{#if (eq targetArray.length 0)}}
    //       <div class="base-form__callout base-form__callout--information">
    //         <i class="fas fa-info-circle"></i>
    //         {{{localize "EVENTIDE_RP_SYSTEM.Forms.Callouts.Effect.NoTargets"}}}
    //       </div>
    //     {{else}}
    //       <div class="base-form__callout base-form__callout--information">
    //         <i class="fas fa-info-circle"></i>
    //         {{{localize "EVENTIDE_RP_SYSTEM.Forms.Callouts.Effect.WithTargets" count=targetArray.length}}}
    //       </div>
    //     {{/if}}
    //   {{/if}}
    // </header>

    context.footerButtons = [
      {
        label:
          context.playerMode || context.targetArray.length > 0
            ? game.i18n.localize(
                "EVENTIDE_RP_SYSTEM.Forms.Buttons.CreateAndApply"
              )
            : game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Create"),
        type: "submit",
        cssClass: "base-form__button base-form__button--primary",
      },
    ];

    return context;
  }
}
