import { CreatorApplication } from "../_module.mjs";

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
    classes: ["eventide-sheet"],
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
    this.calloutGroup = "Effect";

    // Add roll-related storage keys for effects
    this.storageKeys = [
      ...this.storageKeys,
      `effect_${this.number}_rollType`,
      `effect_${this.number}_rollAbility`,
      `effect_${this.number}_rollBonus`,
      `effect_${this.number}_rollTargeted`,
      `effect_${this.number}_rollAdvantage`,
      `effect_${this.number}_rollDisadvantage`,
    ];
  }

  /**
   * Prepares the main context data for the effect creator.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context containing abilities, stored preferences, and target information
   * @throws {Error} Implicitly closes the form if a player has no selected tokens
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.calloutGroup = this.calloutGroup;

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
      effect_rollType: this.storedData[this.storageKeys[6]] || "none",
      effect_rollAbility: this.storedData[this.storageKeys[7]] || "unaugmented",
      effect_rollBonus: this.storedData[this.storageKeys[8]] || 0,
      effect_rollTargeted: this.storedData[this.storageKeys[9]] || false,
      effect_rollAdvantage: this.storedData[this.storageKeys[10]] || 0,
      effect_rollDisadvantage: this.storedData[this.storageKeys[11]] || 0,
    };

    return context;
  }

  /**
   * Actions performed after any render of the Application.
   * Sets up event listeners for dynamic form behavior.
   * @param {ApplicationRenderContext} context - Prepared context data
   * @param {RenderOptions} options - Provided render options
   * @protected
   */
  _onRender(context, options) {
    super._onRender(context, options);

    // Set up event listeners for dynamic form behavior
    const typeSelect = this.element.querySelector('#type');
    const rollTypeSelect = this.element.querySelector('#rollType');
    const featureRollSection = this.element.querySelector('.feature-roll-section');
    const rollDetails = this.element.querySelector('.roll-details');

    // Handle type change (show/hide roll section)
    if (typeSelect && featureRollSection) {
      typeSelect.addEventListener('change', (event) => {
        const isFeature = event.target.value === 'feature';
        featureRollSection.style.display = isFeature ? 'block' : 'none';
      });
    }

    // Handle roll type change (show/hide roll details)
    if (rollTypeSelect && rollDetails) {
      rollTypeSelect.addEventListener('change', (event) => {
        const showDetails = event.target.value !== 'none';
        rollDetails.style.display = showDetails ? 'block' : 'none';
      });

      // Set initial state based on current value
      const showDetails = rollTypeSelect.value !== 'none';
      rollDetails.style.display = showDetails ? 'block' : 'none';
    }
  }
}
