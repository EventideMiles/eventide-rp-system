import { EventideSheetHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  applyThemeImmediate,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { Logger, DamageProcessor } from "../../services/_module.mjs";

// new place for FormDataExtended
const FormDataExtended = foundry.applications.ux.FormDataExtended;

/**
 * Application for managing damage to targeted tokens.
 * @extends {EventideSheetHelpers}
 */
export class DamageTargets extends EventideSheetHelpers {
  /** @override */
  static PARTS = {
    damageTargets: {
      template:
        "systems/eventide-rp-system/templates/macros/damage-targets.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "damage-targets",
    classes: ["eventide-sheet", "eventide-sheet--scrollbars", "damage-targets"],
    position: {
      width: 500,
      height: "auto",
    },
    tag: "form",
    window: {
      icon: "fa-solid fa-claw-marks",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      store: this.#store,
    },
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format("EVENTIDE_RP_SYSTEM.WindowTitles.DamageTargets");
  }

  /**
   * @constructor
   * @param {number} [number=0] - Damage instance number for multiple damage applications
   */
  constructor(number = 0) {
    super();
    this.number = Math.floor(number);
  }

  /**
   * Prepare the main context data for damaging targets.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context
   */
  async _prepareContext(_options) {
    this.gmCheck = await EventideSheetHelpers._gmCheck({
      playerMode: true,
    });

    this.storageKeys = [
      `damage_${this.number}_label`,
      `damage_${this.number}_description`,
      `damage_${this.number}_formula`,
      `damage_${this.number}_isHeal`,
    ];

    const context = {
      gmCheck: this.gmCheck,
      cssClass: DamageTargets.DEFAULT_OPTIONS.classes.join(" "),
      storageKeys: this.storageKeys,
    };

    context.storedData = await erps.utils.retrieveMultipleUserFlags(
      context.storageKeys,
    );
    context.targetArray = await erps.utils.getTargetArray();
    context.selectedArray = await erps.utils.getSelectedArray();

    this.targetArray = context.targetArray;
    this.selectedArray = context.selectedArray;

    if (
      context.storedData[this.storageKeys[3]] === null ||
      context.storedData[this.storageKeys[3]] === "false"
    ) {
      context.heal = false;
    } else {
      context.heal = true;
    }

    if (
      context.targetArray.length === 0 &&
      context.selectedArray.length === 0
    ) {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.TargetOrSelectFirst"),
      );
      return this.close();
    }

    if (context.selectedArray.length === 0 && this.gmCheck === "player") {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.OnlyGmDamageTarget"),
      );
      return this.close();
    }

    context.callouts = [];
    if (context.targetArray.length > 0 && this.gmCheck === "gm") {
      context.callouts.push({
        type: "information",
        faIcon: "fas fa-info-circle",
        text: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Damage.TargetMode",
          { count: context.targetArray.length },
        ),
      });
    } else {
      context.callouts.push({
        type: "information",
        faIcon: "fas fa-info-circle",
        text: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Damage.SelectMode",
          { count: context.selectedArray.length },
        ),
      });
    }

    context.footerButtons = [
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Damage"),
        type: "submit",
        cssClass: "erps-button erps-button--primary",
      },
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Store"),
        type: "button",
        cssClass: "erps-button erps-button--secondary",
        action: "store",
      },
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Close"),
        type: "button",
        cssClass: "erps-button",
        action: "close",
      },
    ];

    return context;
  }

  /**
   * Handle rendering of the damage targets application
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  _onRender(_context, _options) {
    super._onRender(_context, _options);

    // Re-apply themes on re-render (but don't reinitialize)
    if (this.themeManager) {
      this.themeManager.applyThemes();
    }
  }

  /**
   * Handle the first render of the damage targets application
   * @override
   * @protected
   */
  async _onFirstRender() {
    super._onFirstRender();

    // Apply theme immediately to prevent flashing
    applyThemeImmediate(this.element);

    // Initialize theme management only on first render (non-blocking like actor/item sheets)
    if (!this.themeManager) {
      initThemeManager(this, THEME_PRESETS.CREATOR_APPLICATION)
        .then((manager) => {
          this.themeManager = manager;
          Logger.debug(
            "Theme management initialized asynchronously for damage targets",
            {
              hasThemeManager: !!this.themeManager,
              sheetId: this.id,
            },
            "THEME",
          );
        })
        .catch((error) => {
          Logger.error(
            "Failed to initialize theme manager for damage targets",
            error,
            "THEME",
          );
        });
    }
  }

  /**
   * Clean up resources before closing the application
   * @param {Object} options - The options for closing
   * @returns {Promise<void>}
   * @override
   */
  async _preClose(options) {
    // Clean up theme management for this specific instance
    if (this.themeManager) {
      cleanupThemeManager(this);
      this.themeManager = null;
    }

    // Clear references to arrays and objects
    this.targetArray = null;
    this.selectedArray = null;
    this.storageKeys = null;

    await super._preClose(options);
  }

  /**
   * Handle form submission to apply damage to targets.
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The processed form data
   * @returns {Promise<void>}
   * @protected
   */
  static async #onSubmit(event, form, formData) {
    const damageOptions = {
      label: formData.get("label") || "Damage",
      formula: formData.get("formula") || "1",
      description: formData.get("description") || "",
      type: formData.get("isHeal") === "true" ? "heal" : "damage",
      soundKey: formData.get("isHeal") === "true" ? "healing" : "damage",
    };
    const originalFormula = damageOptions.formula;
    if (
      (damageOptions.type === "heal" && this.selectedArray.length > 0) ||
      (this.selectedArray.length > 0 && this.targetArray.length === 0) ||
      (this.selectedArray.length > 0 && this.gmCheck === "player")
    ) {
      await Promise.all(
        this.selectedArray.map((token) => {
          damageOptions.formula = DamageProcessor.applyVulnerabilityModifier(
            originalFormula,
            damageOptions.type,
            token.actor,
          );
          token.actor.damageResolve(damageOptions);
        }),
      );
    } else {
      await Promise.all(
        this.targetArray.map((token) => {
          damageOptions.formula = DamageProcessor.applyVulnerabilityModifier(
            originalFormula,
            damageOptions.type,
            token.actor,
          );
          token.actor.damageResolve(damageOptions);
        }),
      );
    }

    DamageTargets.#storeData(this, form);
  }

  /**
   * Store damage preferences in local storage.
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   * @static
   */
  static async #store(event, _target) {
    DamageTargets.#storeData(this, _target.form);

    this.close();
  }

  /**
   * Store damage preferences in local storage.
   * @param {DamageTargets} instance - The DamageTargets instance
   * @param {HTMLFormElement} form - The form element
   * @private
   */
  static async #storeData(instance, form) {
    const formData = new FormDataExtended(form);
    const storageObject = {
      [instance.storageKeys[0]]: formData.get("label"),
      [instance.storageKeys[1]]: formData.get("description"),
      [instance.storageKeys[2]]: formData.get("formula"),
      [instance.storageKeys[3]]: formData.get("isHeal"),
    };
    await erps.utils.storeMultipleUserFlags(storageObject);
  }
}
