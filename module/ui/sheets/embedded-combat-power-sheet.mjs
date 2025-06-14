import { BaselineSheetMixins } from "../components/_module.mjs";
import { EventideSheetHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  cleanupThemeManager,
  applyThemeImmediate,
  THEME_PRESETS,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/_module.mjs";
import { CommonFoundryTasks } from "../../utils/_module.mjs";

const { api, sheets } = foundry.applications;
const { TextEditor, FormDataExtended } = foundry.applications.ux;
const FilePicker = foundry.applications.apps.FilePicker.implementation;

/**
 * A specialized item sheet for editing a combat power embedded within a Transformation item.
 */
export class EmbeddedCombatPowerSheet extends BaselineSheetMixins(
  api.HandlebarsApplicationMixin(sheets.ItemSheetV2),
) {
  /**
   * @param {object} powerData          The raw data of the combat power to edit.
   * @param {Item} transformationItem The parent transformation item document.
   * @param {object} [options={}]       Additional sheet options.
   */
  constructor(powerData, transformationItem, options = {}) {
    Logger.methodEntry("EmbeddedCombatPowerSheet", "constructor", {
      powerData,
      transformationItem,
      options,
    });
    // Create a temporary, un-parented Item document to represent the embedded power.
    // We do not give it a parent, as it does not truly belong to the actor in a
    // way that Foundry's data model would normally recognize.
    const tempItem = new CONFIG.Item.documentClass(powerData, {
      parent: null,
    });

    // To ensure the temporary item has the correct permissions for the current user,
    // we manually define its `isOwner` and `isEditable` properties based on the
    // containing transformation item. This is the key to making the sheet's
    // components (like the rich text editor) correctly reflect the user's permissions.
    Object.defineProperty(tempItem, "isOwner", {
      value: transformationItem.isOwner,
      configurable: true,
    });
    Object.defineProperty(tempItem, "isEditable", {
      value: transformationItem.isEditable,
      configurable: true,
    });

    const sheetOptions = foundry.utils.mergeObject(options, {
      document: tempItem,
      title: `${game.i18n.localize("EVENTIDE_RP_SYSTEM.UI.Edit")}: ${
        tempItem.name
      }`,
    });

    super(sheetOptions);
    this.transformationItem = transformationItem;
    Logger.methodExit("EmbeddedCombatPowerSheet", "constructor", this);
  }

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    sheets.ItemSheetV2.DEFAULT_OPTIONS,
    {
      classes: [
        "eventide-sheet",
        "eventide-sheet--scrollbars",
        "embedded-power-sheet",
      ],
      position: {
        width: 800,
        height: "auto",
      },
      form: {
        submitOnChange: true,
        closeOnSubmit: false,
      },
      actions: {
        onEditImage: this._onEditImage,
      },
    },
  );

  /** @override */
  static PARTS = {
    header: {
      template: "systems/eventide-rp-system/templates/item/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    description: {
      template: "systems/eventide-rp-system/templates/item/description.hbs",
    },
    prerequisites: {
      template: "systems/eventide-rp-system/templates/item/prerequisites.hbs",
    },
    attributesCombatPower: {
      template:
        "systems/eventide-rp-system/templates/item/attribute-parts/combat-power.hbs",
    },
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = [
      "header",
      "tabs",
      "description",
      "attributesCombatPower",
      "prerequisites",
    ];
  }

  /** @override */
  async _prepareContext(options) {
    Logger.methodEntry("EmbeddedCombatPowerSheet", "_prepareContext", {
      options,
    });
    const context = {};
    context.editable = this.isEditable;
    context.owner = this.document.isOwner;
    context.limited = this.document.limited;
    context.item = this.item;
    context.system = this.item.system;
    context.flags = this.item.flags;
    context.config = CONFIG.EVENTIDE_RP_SYSTEM;
    context.tabs = this._getTabs(options.parts);
    context.fields = this.document.schema.fields;
    context.systemFields = this.document.system.schema.fields;
    context.isGM = game.user.isGM;
    context.userSheetTheme = CommonFoundryTasks.retrieveSheetTheme();
    /**
     * A flag to indicate that this sheet is for an embedded document.
     * This is used by the template to render a non-collaborative editor.
     * @type {boolean}
     */
    context.isEmbedded = true;
    Logger.methodExit("EmbeddedCombatPowerSheet", "_prepareContext", context);
    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case "attributesCombatPower":
        context.tab = context.tabs[partId];
        context.rollTypes = EventideSheetHelpers.rollTypeObject;
        context.abilities = {
          ...EventideSheetHelpers.abilityObject,
          unaugmented: "unaugmented",
        };
        break;
      case "description":
        context.tab = context.tabs[partId];
        context.enrichedDescription =
          await TextEditor.implementation.enrichHTML(
            this.document.system.description,
            {
              secrets: this.document.isOwner,
              rollData: this.transformationItem.getRollData(),
              relativeTo: this.transformationItem,
            },
          );
        break;
      case "prerequisites":
        context.prerequisites = this.document.system.prerequisites;
        context.tab = context.tabs[partId];
        break;
    }
    return context;
  }

  /** @override */
  _getTabs(parts) {
    const tabGroup = "primary";
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = "description";
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: "",
        group: tabGroup,
        id: "",
        icon: "",
        label: "EVENTIDE_RP_SYSTEM.Item.Tabs.",
      };
      switch (partId) {
        case "header":
        case "tabs":
          return tabs;
        case "description":
          tab.id = "description";
          tab.label += "Description";
          break;
        case "prerequisites":
          tab.id = "prerequisites";
          tab.label += "Prerequisites";
          break;
        case "attributesCombatPower":
          tab.id = "attributes";
          tab.label += "Attributes";
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = "active";
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /**
   * Handle changing a Document's image.
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } =
      this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new FilePicker({
      current,
      type: "image",
      redirectToRoot: img ? [img] : [],
      callback: async (path) => {
        const powerIndex =
          this.transformationItem.system.embeddedCombatPowers.findIndex(
            (p) => p._id === this.document.id,
          );
        if (powerIndex === -1) return;

        const powers = foundry.utils.deepClone(
          this.transformationItem.system.embeddedCombatPowers,
        );
        const powerData = powers[powerIndex];
        foundry.utils.setProperty(powerData, attr, path);

        try {
          await this.transformationItem.update({
            "system.embeddedCombatPowers": powers,
          });
          this.document.updateSource(powerData);
          this.render();
        } catch (error) {
          Logger.error(
            "EmbeddedCombatPowerSheet | Failed to save image",
            { error, powers, powerData },
            "EMBEDDED_POWER_SHEET",
          );
          ui.notifications.error(
            "Failed to save Combat Power. See console for details.",
          );
        }
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  /** @override */
  async _preClose() {
    await super._preClose();
    if (this.themeManager) {
      cleanupThemeManager(this);
      this.themeManager = null;
    }
  }

  /** @override */
  async _onFirstRender(context, options) {
    super._onFirstRender(context, options);

    // Apply theme immediately to prevent flashing
    applyThemeImmediate(this.element);

    // Initialize theme management only on first render (non-blocking like actor/item sheets)
    if (!this.themeManager) {
      initThemeManager(this, THEME_PRESETS.ITEM_SHEET)
        .then((manager) => {
          this.themeManager = manager;
          Logger.debug(
            "Theme management initialized asynchronously for embedded combat power sheet",
            {
              hasThemeManager: !!this.themeManager,
              sheetId: this.id,
              itemName: this.document?.name,
              itemType: this.document?.type,
            },
            "THEME",
          );
        })
        .catch((error) => {
          Logger.error(
            "Failed to initialize theme manager for embedded combat power sheet",
            error,
            "THEME",
          );
        });
    }

    if (this.element) {
      this.element.addEventListener("save", (event) => {
        if (!event.target.matches("prose-mirror")) return;
        Logger.debug(
          "EmbeddedCombatPowerSheet | Delegated save event | Event triggered",
          { event },
          "EMBEDDED_POWER_SHEET",
        );
        this._onProseMirrorSave(event);
      });
    }
  }

  /** @override */
  async _onRender(context, options) {
    super._onRender(context, options);

    // Re-apply themes on re-render (but don't reinitialize)
    if (this.themeManager) {
      this.themeManager.applyThemes();
    }
  }

  /**
   * Handle the save event from the ProseMirror editor element.
   * @param {Event} event - The save event, which contains the editor element as its target.
   * @private
   */
  async _onProseMirrorSave(event) {
    const editorElement = event.target;
    const target = editorElement.name;
    const content = editorElement.value;

    if (target && typeof content !== "undefined") {
      await this._onEditorSave(target, content);
    } else {
      Logger.warn(
        "EmbeddedCombatPowerSheet | _onProseMirrorSave | Could not extract target name or content value from editor element",
        { editorElement },
        "EMBEDDED_POWER_SHEET",
      );
    }
  }

  /**
   * This is a special override of the default editor save behavior, tailored to handle
   * the complex state management of this embedded sheet.
   * @param {string} target     - The data path of the property to update (e.g., "system.description").
   * @param {string} content    - The new HTML content to save.
   * @override
   * @protected
   */
  async _onEditorSave(target, content) {
    const powerIndex =
      this.transformationItem.system.embeddedCombatPowers.findIndex(
        (p) => p._id === this.document.id,
      );
    if (powerIndex === -1) return;

    // Use the full array update, as it's the only data-safe method.
    const powers = foundry.utils.deepClone(
      this.transformationItem.system.embeddedCombatPowers,
    );
    const powerData = powers[powerIndex];
    foundry.utils.setProperty(powerData, target, content);

    try {
      // Pre-emptively update the local source to prevent a race condition.
      // This ensures our data is fresh before we send it to the database.
      this.transformationItem.updateSource({
        "system.embeddedCombatPowers": powers,
      });
      this.document.updateSource(powerData);

      await this.transformationItem.update({
        "system.embeddedCombatPowers": powers,
      });

      ui.notifications.info(
        game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Info.CombatPowerDescriptionSaved",
        ),
      );
    } catch (error) {
      Logger.error(
        "EmbeddedCombatPowerSheet | Failed to save description",
        { error, powers, powerData },
        "EMBEDDED_POWER_SHEET",
      );
      ui.notifications.error(
        "Failed to save Combat Power. See console for details.",
      );
    }
  }

  /**
   * Processes form data for submission, including handling of unchecked checkboxes.
   * This is triggered by the `submitOnChange` option in the sheet's configuration.
   * @param {object} formConfig   - The form configuration.
   * @param {Event} event         - The submission event.
   * @override
   * @protected
   */
  async _onSubmitForm(_formConfig, _event) {
    Logger.methodEntry("EmbeddedCombatPowerSheet", "_onSubmitForm");
    // FormDataExtended is a global Foundry class that correctly handles unchecked checkboxes.
    const formData = new FormDataExtended(this.form).object;

    const powerIndex =
      this.transformationItem.system.embeddedCombatPowers.findIndex(
        (p) => p._id === this.document.id,
      );
    if (powerIndex === -1) {
      Logger.methodExit("EmbeddedCombatPowerSheet", "_onSubmitForm", {
        reason: "Power not found",
      });
      return;
    }

    const powers = foundry.utils.deepClone(
      this.transformationItem.system.embeddedCombatPowers,
    );
    const powerData = powers[powerIndex];

    // Use mergeObject to apply the form changes to our copy of the power data.
    foundry.utils.mergeObject(powerData, formData);

    try {
      await this.transformationItem.update({
        "system.embeddedCombatPowers": powers,
      });
      this.document.updateSource(powerData);
      this.render();
    } catch (error) {
      Logger.error(
        "EmbeddedCombatPowerSheet | Failed to save form data",
        { error, powers, powerData, formData },
        "EMBEDDED_POWER_SHEET",
      );
      ui.notifications.error(
        "Failed to save Combat Power. See console for details.",
      );
      Logger.methodExit("EmbeddedCombatPowerSheet", "_onSubmitForm", { error });
      return;
    }
    Logger.methodExit("EmbeddedCombatPowerSheet", "_onSubmitForm");
  }
}
