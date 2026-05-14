import { EventideSheetHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  applyThemeImmediate,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/logger.mjs";
import {
  CHOICE_SETS,
  getActionCardPreset,
  getPresetIds,
  getPresetKeyFields,
  mergePresetData,
} from "../../services/action-card-presets.mjs";

/**
 * Action Card Preset Dialog
 *
 * ApplicationV2 dialog for creating and reconfiguring action cards
 * from preset templates. Provides a two-step workflow:
 * 1. Select a preset from the library
 * 2. Customize key fields before creating or applying
 *
 * In "create" mode, the dialog creates a new action card item on the actor.
 * In "reconfigure" mode, it merges preset data onto an existing item,
 * preserving embedded content and other non-preset fields.
 *
 * @extends EventideSheetHelpers
 */
export class ActionCardPresetDialog extends EventideSheetHelpers {
  static PARTS = {
    actionCardPresetDialog: {
      template:
        "systems/eventide-rp-system/templates/macros/action-card-preset-dialog.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "action-card-preset-dialog",
    classes: [
      "eventide-sheet",
      "eventide-sheet--scrollbars",
      "action-card-preset-dialog",
    ],
    position: {
      width: 820,
      height: "auto",
    },
    tag: "form",
    window: {
      icon: "fa-solid fa-bolt",
    },
    form: {
      handler: ActionCardPresetDialog.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      selectPreset: ActionCardPresetDialog.prototype._onSelectPreset,
      cancel: ActionCardPresetDialog.prototype._onCancel,
    },
  };

  constructor(options = {}) {
    super();

    this._actor = options.actor || null;
    this._existingItem = options.existingItem || null;
    this._sourceActor = options.sourceActor || null;
    this._isReconfigure = !!this._existingItem;

    this._selectedPresetId = "";
    this._keyFieldValues = {};
    this._themeManager = null;

    // In reconfigure mode, pre-fill key fields from the existing item's data
    if (this._isReconfigure && this._existingItem) {
      this._preFillFromExistingItem();
    }
  }

  get title() {
    return this._isReconfigure
      ? game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.ActionCardPresets.ReconfigureTitle",
        )
      : game.i18n.localize("EVENTIDE_RP_SYSTEM.ActionCardPresets.Title");
  }

  // =================================
  // Context Preparation
  // =================================

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Get all preset info for display
    const presetIds = getPresetIds();
    const presets = presetIds.map((id) => {
      const preset = getActionCardPreset(id);
      return {
        id,
        label: game.i18n.localize(preset.label),
        description: game.i18n.localize(preset.description),
        icon: preset.icon,
        mode: preset.systemData.mode || "attackChain",
      };
    });

    // Get key fields for currently selected preset
    const keyFields = this._selectedPresetId
      ? getPresetKeyFields(this._selectedPresetId)
      : [];

    context.presets = presets;
    context.selectedPresetId = this._selectedPresetId;
    context.keyFields = this._keyFieldValues
      ? this._buildKeyFieldsContext(keyFields)
      : [];
    context.isReconfigure = this._isReconfigure;
    context.preserveEmbeddedInfo = this._isReconfigure;
    context.cssClass = ActionCardPresetDialog.DEFAULT_OPTIONS.classes.join(" ");

    // Footer buttons
    context.footerButtons = [
      {
        label: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.ActionCardPresets.CancelButton",
        ),
        type: "button",
        cssClass: "erps-button erps-button--secondary",
        action: "cancel",
      },
      {
        label: game.i18n.localize(
          this._isReconfigure
            ? "EVENTIDE_RP_SYSTEM.ActionCardPresets.ApplyButton"
            : "EVENTIDE_RP_SYSTEM.ActionCardPresets.CreateButton",
        ),
        type: "submit",
        cssClass: "erps-button erps-button--primary",
      },
    ];

    return context;
  }

  // =================================
  // Key Fields Context Builder
  // =================================

  /**
   * Build the template context for key fields, merging defaults with current values.
   *
   * @param {Object[]} keyFields - Array of key field descriptors from the preset
   * @returns {Object[]} Array of field context objects for the template
   * @private
   */
  _buildKeyFieldsContext(keyFields) {
    if (!keyFields) return [];

    return keyFields.map((field) => {
      const currentValue =
        this._keyFieldValues[field.path] ?? field.default ?? "";
      const fieldContext = {
        path: field.path,
        type: field.type,
        label: game.i18n.localize(field.label),
        value: currentValue,
        hint: field.hint ? game.i18n.localize(field.hint) : null,
      };

      // Resolve choice set for select fields
      if (field.type === "select" && field.choices) {
        const choiceValues = CHOICE_SETS[field.choices] || [];
        fieldContext.choices = choiceValues.map((value) => ({
          value,
          label: this._getChoiceLabel(field.choices, value),
          selected: value === currentValue,
        }));
      }

      return fieldContext;
    });
  }

  /**
   * Get a localized label for a choice value within a choice set.
   *
   * @param {string} choiceSetName - The choice set identifier
   * @param {string} value - The choice value
   * @returns {string} Localized label
   * @private
   */
  _getChoiceLabel(choiceSetName, value) {
    const prefixes = {
      STATS: "EVENTIDE_RP_SYSTEM.ActionCardPresets.StatLabels",
      DAMAGE_TYPE: "EVENTIDE_RP_SYSTEM.ActionCardPresets.DamageTypeLabels",
      CONDITION: "EVENTIDE_RP_SYSTEM.ActionCardPresets.ConditionLabels",
    };
    const prefix = prefixes[choiceSetName];
    if (!prefix) return value;
    return game.i18n.localize(`${prefix}.${value}`) || value;
  }

  // =================================
  // Action Handlers
  // =================================

  /**
   * Handle preset selection — update selected preset and pre-fill key fields.
   *
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The capturing element
   */
  _onSelectPreset(event, target) {
    const presetId = target.dataset.presetId;
    if (!presetId) return;

    this._selectedPresetId = presetId;

    // Update key field values with preset defaults
    const keyFields = getPresetKeyFields(presetId);
    const preset = getActionCardPreset(presetId);
    if (keyFields && preset) {
      this._keyFieldValues = {};
      for (const field of keyFields) {
        if (field.path === "name") {
          this._keyFieldValues[field.path] = field.default;
        } else {
          // Deep-merge: extract the value from the preset's systemData
          this._keyFieldValues[field.path] = this._getNestedValue(
            preset.systemData,
            field.path.replace("system.", ""),
          );
        }
      }
    }

    this.render();
  }

  /**
   * Handle cancel button — close the dialog.
   *
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The capturing element
   */
  _onCancel(_event, _target) {
    this.close();
  }

  // =================================
  // Form Submission
  // =================================

  /**
   * Handle form submission — create or reconfigure the action card.
   *
   * @param {Event} event - The submit event
   * @param {HTMLFormElement} form - The form element
   * @param {FormDataExtended} formData - The extended form data
   * @private
   */
  static async #onSubmit(event, form, formData) {
    // Get the form data
    const data = foundry.utils.expandObject(formData.object || formData);

    if (!this._selectedPresetId) {
      ui.notifications.warn(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.ActionCardPresets.SelectPreset"),
      );
      return;
    }

    // Build user overrides from form data
    // mergePresetData expects system-level paths (e.g. "statusApplicationLimit" not "system.statusApplicationLimit")
    // The "name" field is handled separately as it's not a system property
    const userOverrides = {};
    let itemName = null;
    for (const field of getPresetKeyFields(this._selectedPresetId)) {
      const formValue = foundry.utils.getProperty(data, field.path);
      if (formValue === undefined) continue;

      if (field.path === "name") {
        itemName = String(formValue);
        continue;
      }

      // Strip "system." prefix for mergePresetData compatibility
      const systemPath = field.path.startsWith("system.")
        ? field.path.slice(7)
        : field.path;
      const value = field.type === "number" ? Number(formValue) : formValue;
      foundry.utils.setProperty(userOverrides, systemPath, value);
    }

    // Merge preset data with user overrides
    const mergedSystemData = mergePresetData(
      this._selectedPresetId,
      userOverrides,
    );

    if (this._isReconfigure && this._existingItem) {
      // Reconfigure existing action card
      // Preserve embedded content and other non-preset fields
      const preservedFields = {
        embeddedItem: this._existingItem.system.embeddedItem,
        embeddedStatusEffects: this._existingItem.system.embeddedStatusEffects,
        embeddedTransformations:
          this._existingItem.system.embeddedTransformations,
        embeddedSelfEffects: this._existingItem.system.embeddedSelfEffects,
        groupId: this._existingItem.system.groupId,
        gmOnly: this._existingItem.system.gmOnly,
        bgColor: this._existingItem.system.bgColor,
        textColor: this._existingItem.system.textColor,
      };

      // Merge preserved fields on top
      const updateData = foundry.utils.mergeObject(
        mergedSystemData,
        preservedFields,
        { inplace: false },
      );

      // Also update item name if provided
      const nameUpdate = {};
      if (itemName) {
        nameUpdate.name = itemName;
      }

      await this._existingItem.update({
        system: updateData,
        ...nameUpdate,
      });

      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.ActionCardPresets.PresetApplied", {
          presetName: game.i18n.localize(
            getActionCardPreset(this._selectedPresetId).label,
          ),
        }),
      );
    } else if (this._actor) {
      // Create new action card on actor
      const name =
        itemName ||
        game.i18n.localize(getActionCardPreset(this._selectedPresetId).label);

      const itemData = {
        name,
        type: "actionCard",
        img: "icons/svg/item-bag.svg",
        system: mergedSystemData,
      };

      const created = await this._actor.createEmbeddedDocuments("Item", [
        itemData,
      ]);

      if (created && created[0]) {
        ui.notifications.info(
          game.i18n.format("EVENTIDE_RP_SYSTEM.ActionCardPresets.CardCreated", {
            cardName: name,
            presetName: game.i18n.localize(
              getActionCardPreset(this._selectedPresetId).label,
            ),
          }),
        );
        // Optionally open the item sheet for further editing
        created[0].sheet.render(true);
      }
    }
  }

  // =================================
  // Theme Management
  // =================================

  async _onFirstRender() {
    super._onFirstRender();
    applyThemeImmediate(this.element);

    if (!this.themeManager) {
      initThemeManager(this, THEME_PRESETS.CREATOR_APPLICATION)
        .then((manager) => {
          this.themeManager = manager;
        })
        .catch((error) => {
          Logger.error(
            "Failed to initialize theme manager for Action Card Preset Dialog",
            error,
            "THEME",
          );
        });
    }
  }

  async _onRender(_context, _options) {
    super._onRender(_context, _options);
    if (this.themeManager) {
      this.themeManager.applyThemes();
    }
  }

  async _preClose(options) {
    if (this.themeManager) {
      cleanupThemeManager(this);
      this.themeManager = null;
    }
    if (this.element) {
      erps.utils.cleanupNumberInputs(this.element);
    }
    await super._preClose(options);
  }

  // =================================
  // Helpers
  // =================================

  /**
   * Get a nested value from an object using a dot-separated path.
   *
   * @param {Object} obj - The object to traverse
   * @param {string} path - Dot-separated path (e.g. "attackChain.firstStat")
   * @returns {*} The value at the path, or undefined if not found
   * @private
   */
  _getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    const keys = path.split(".");
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    return current;
  }

  /**
   * Pre-fill key field values from an existing item's system data.
   * Used in reconfigure mode to show the current values.
   *
   * @private
   */
  _preFillFromExistingItem() {
    if (!this._existingItem) return;

    const item = this._existingItem;
    this._keyFieldValues = {};

    // Pre-fill from all available presets' key fields so any selection
    // can show current values where applicable
    for (const presetId of getPresetIds()) {
      const keyFields = getPresetKeyFields(presetId);
      if (!keyFields) continue;

      for (const field of keyFields) {
        if (field.path === "name") {
          this._keyFieldValues[field.path] = item.name;
        } else if (field.path.startsWith("system.")) {
          const systemPath = field.path.replace("system.", "");
          const value = this._getNestedValue(item.system, systemPath);
          if (value !== undefined) {
            this._keyFieldValues[field.path] = value;
          }
        }
      }
    }
  }
}

export default ActionCardPresetDialog;
