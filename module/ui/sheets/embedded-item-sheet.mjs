import { BaselineSheetMixins } from "../components/_module.mjs";
import { EventideSheetHelpers } from "../components/_module.mjs";
import { EmbeddedItemAllMixins } from "../mixins/_module.mjs";
import { prepareCharacterEffects } from "../../helpers/_module.mjs";
import { Logger } from "../../services/_module.mjs";
import { CommonFoundryTasks } from "../../utils/_module.mjs";

const { api, sheets } = foundry.applications;
const { TextEditor } = foundry.applications.ux;
const FilePicker = foundry.applications.apps.FilePicker.implementation;

/**
 * A specialized item sheet for editing items embedded within Action Card items.
 * Based on the working embedded-combat-power-sheet.mjs pattern.
 */
export class EmbeddedItemSheet extends EmbeddedItemAllMixins(
  BaselineSheetMixins(api.HandlebarsApplicationMixin(sheets.ItemSheetV2)),
) {
  /**
   * @param {object} itemData          The raw data of the item to edit.
   * @param {Item} parentItem          The parent item document (action card or transformation).
   * @param {object} [options={}]      Additional sheet options.
   * @param {boolean} [isEffect=false] Whether this is an embedded effect (vs main embedded item).
   */
  constructor(itemData, parentItem, options = {}, isEffect = false) {
    Logger.methodEntry("EmbeddedItemSheet", "constructor", {
      itemData,
      parentItem,
      options,
    });

    // Create the temporary item using static method to avoid 'this' before super()
    const tempItem = EmbeddedItemSheet._createTempItem(
      itemData,
      parentItem,
      isEffect,
    );

    const sheetOptions = foundry.utils.mergeObject(options, {
      document: tempItem,
      title: `${game.i18n.localize("EVENTIDE_RP_SYSTEM.UI.Edit")}: ${
        tempItem.name
      }`,
    });

    super(sheetOptions);

    // Store the original embedded item ID for lookups (must be after super() call)
    this.originalItemId = itemData._id;
    this.parentItem = parentItem;
    this.isEffect = isEffect;
    this.isStatusEffect = itemData.type === "status";
    Logger.methodExit("EmbeddedItemSheet", "constructor", this);
  }

  /**
   * Static method to create a temporary item document for embedded item editing
   * This is static to avoid 'this' before super() issues in the constructor
   * @param {object} itemData - The raw data of the item to edit
   * @param {Item} parentItem - The parent item document (action card or transformation)
   * @param {boolean} isEffect - Whether this is an embedded effect (vs main embedded item)
   * @returns {Item} The temporary item document
   * @static
   * @private
   */
  static _createTempItem(itemData, parentItem, isEffect = false) {
    Logger.methodEntry("EmbeddedItemSheet", "_createTempItem", {
      itemData,
      parentItem: parentItem?.name,
      isEffect,
    });

    // Create a temporary, un-parented Item document to represent the embedded item
    const tempItem = new CONFIG.Item.documentClass(itemData, {
      parent: null,
    });

    // Initialize effects collection if it doesn't exist
    if (!tempItem.effects) {
      tempItem.effects = new foundry.utils.Collection();
    }

    Logger.debug(
      "EmbeddedItemSheet | Processing item data",
      {
        itemType: itemData.type,
        itemName: itemData.name,
        hasEffectsData: !!(itemData.effects && Array.isArray(itemData.effects)),
        effectsCount: itemData.effects?.length || 0,
      },
      "EMBEDDED_ITEM_SHEET",
    );

    // Initialize active effects from stored data
    EmbeddedItemSheet._initializeActiveEffects(tempItem, itemData);

    // Set up permissions based on parent item
    EmbeddedItemSheet._setupPermissions(tempItem, parentItem);

    Logger.methodExit("EmbeddedItemSheet", "_createTempItem", tempItem);
    return tempItem;
  }

  /**
   * Initialize active effects for the temporary item
   * @param {Item} tempItem - The temporary item document
   * @param {object} itemData - The raw item data
   * @static
   * @private
   */
  static _initializeActiveEffects(tempItem, itemData) {
    // If the item data has effects, create temporary ActiveEffect documents
    if (itemData.effects && Array.isArray(itemData.effects)) {
      for (const effectData of itemData.effects) {
        Logger.debug(
          "EmbeddedItemSheet | Creating temp effect from stored data",
          {
            effectId: effectData._id,
            effectName: effectData.name,
            duration: effectData.duration,
            durationSeconds: effectData.duration?.seconds,
          },
          "EMBEDDED_ITEM_SHEET",
        );

        const tempEffect = new CONFIG.ActiveEffect.documentClass(effectData, {
          parent: tempItem,
        });
        tempItem.effects.set(effectData._id, tempEffect);
      }
    } else if (itemData.type === "status" || itemData.type === "gear") {
      // Create a default ActiveEffect for status effects and gear if none exists
      const defaultEffectData =
        EmbeddedItemSheet._createDefaultEffect(tempItem);

      Logger.debug(
        "EmbeddedItemSheet | Creating default effect for status/gear",
        {
          itemType: itemData.type,
          defaultEffectData,
        },
        "EMBEDDED_ITEM_SHEET",
      );

      const tempEffect = new CONFIG.ActiveEffect.documentClass(
        defaultEffectData,
        {
          parent: tempItem,
        },
      );
      tempItem.effects.set(defaultEffectData._id, tempEffect);

      // Also add the effect to the item data so it gets saved
      if (!itemData.effects) {
        itemData.effects = [];
      }
      itemData.effects.push(defaultEffectData);
    }
  }

  /**
   * Create a default active effect for status and gear items
   * @param {Item} tempItem - The temporary item document
   * @returns {object} Default effect data
   * @static
   * @private
   */
  static _createDefaultEffect(tempItem) {
    return {
      _id: foundry.utils.randomID(),
      name: tempItem.name,
      icon: tempItem.img,
      changes: [],
      disabled: false,
      duration: {
        seconds: 0,
        startTime: null,
        combat: "",
        rounds: 0,
        turns: 0,
        startRound: 0,
        startTurn: 0,
      },
      flags: {},
      tint: "#ffffff",
      transfer: true,
      statuses: [],
    };
  }

  /**
   * Set up permissions for the temporary item based on the parent item
   * @param {Item} tempItem - The temporary item document
   * @param {Item} parentItem - The parent item document
   * @static
   * @private
   */
  static _setupPermissions(tempItem, parentItem) {
    // Set permissions based on the containing parent item
    Object.defineProperty(tempItem, "isOwner", {
      value: parentItem.isOwner,
      configurable: true,
    });
    Object.defineProperty(tempItem, "isEditable", {
      value: parentItem.isEditable,
      configurable: true,
    });

    // Copy ownership from the parent item to ensure proper permissions
    Object.defineProperty(tempItem, "ownership", {
      value: parentItem.ownership,
      configurable: true,
    });

    // Override permission methods to use parent item permissions
    tempItem.canUserModify = function (user, action) {
      return parentItem.canUserModify(user, action);
    };

    tempItem.testUserPermission = function (user, permission, options) {
      return parentItem.testUserPermission(user, permission, options);
    };

    Logger.debug(
      "EmbeddedItemSheet | Permissions set up",
      {
        isOwner: tempItem.isOwner,
        isEditable: tempItem.isEditable,
        parentName: parentItem.name,
      },
      "EMBEDDED_ITEM_SHEET",
    );
  }

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    sheets.ItemSheetV2.DEFAULT_OPTIONS,
    {
      classes: [
        "eventide-sheet",
        "eventide-sheet--scrollbars",
        "embedded-item-sheet",
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
        newCharacterEffect: this._newEmbeddedCharacterEffect,
        deleteCharacterEffect: this._deleteEmbeddedCharacterEffect,
        toggleEffectDisplay: this._toggleEffectDisplay,
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
    characterEffects: {
      template:
        "systems/eventide-rp-system/templates/item/character-effects.hbs",
    },
    attributesCombatPower: {
      template:
        "systems/eventide-rp-system/templates/item/attribute-parts/combat-power.hbs",
    },
    attributesGear: {
      template:
        "systems/eventide-rp-system/templates/item/attribute-parts/gear.hbs",
    },
    attributesFeature: {
      template:
        "systems/eventide-rp-system/templates/item/attribute-parts/feature.hbs",
    },
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["header", "tabs", "description"];

    // Add type-specific parts
    switch (this.document.type) {
      case "combatPower":
        options.parts.push("attributesCombatPower", "prerequisites");
        break;
      case "gear":
        options.parts.push("attributesGear", "characterEffects");
        break;
      case "feature":
        options.parts.push("attributesFeature");
        break;
      case "status":
        options.parts.push("characterEffects");
        break;
    }
  }

  /** @override */
  async _prepareContext(options) {
    Logger.methodEntry("EmbeddedItemSheet", "_prepareContext", {
      options,
    });
    const context = {};

    // Set up active effect data for status effects and gear items
    if (this.document.type === "status" || this.document.type === "gear") {
      const firstEffect = this.document.effects.contents[0];
      context.activeEffect = firstEffect;
      context.iconTint = firstEffect?.tint;

      // Debug logging for toggle state
      Logger.debug(
        "EmbeddedItemSheet | _prepareContext activeEffect data",
        {
          hasActiveEffect: !!firstEffect,
          effectId: firstEffect?.id,
          effectName: firstEffect?.name,
          duration: firstEffect?.duration,
          durationSeconds: firstEffect?.duration?.seconds,
          toggleShouldBeChecked: !!firstEffect?.duration?.seconds,
          documentType: this.document.type,
        },
        "EMBEDDED_ITEM_SHEET",
      );
    }

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
    context.isEmbedded = true;
    Logger.methodExit("EmbeddedItemSheet", "_prepareContext", context);
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
      case "attributesGear":
        context.tab = context.tabs[partId];
        context.rollTypes = EventideSheetHelpers.rollTypeObject;
        context.abilities = {
          ...EventideSheetHelpers.abilityObject,
          unaugmented: "unaugmented",
        };
        break;
      case "attributesFeature":
        context.tab = context.tabs[partId];
        break;
      case "description":
        context.tab = context.tabs[partId];
        context.enrichedDescription =
          await TextEditor.implementation.enrichHTML(
            this.document.system.description,
            {
              secrets: this.document.isOwner,
              rollData: this.parentItem.getRollData(),
              relativeTo: this.parentItem,
            },
          );
        break;
      case "prerequisites":
        context.prerequisites = this.document.system.prerequisites;
        context.tab = context.tabs[partId];
        break;
      case "characterEffects": {
        context.tab = context.tabs[partId];
        const firstEffect = this.document.effects.contents[0];
        if (firstEffect) {
          context.characterEffects = await prepareCharacterEffects(firstEffect);
        } else {
          context.characterEffects = {
            fullEffects: [],
            regularEffects: [],
            hiddenEffects: [],
          };
        }
        break;
      }
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
        case "characterEffects":
          tab.id = "characterEffects";
          tab.label += "CharacterEffects";
          break;
        case "attributesCombatPower":
        case "attributesGear":
        case "attributesFeature":
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
        // Handle transformation items (embedded combat powers)
        if (this.parentItem.type === "transformation") {
          const powerIndex =
            this.parentItem.system.embeddedCombatPowers.findIndex(
              (p) => p._id === this.originalItemId,
            );
          if (powerIndex === -1) return;

          const powers = foundry.utils.deepClone(
            this.parentItem.system.embeddedCombatPowers,
          );
          const powerData = powers[powerIndex];
          foundry.utils.setProperty(powerData, attr, path);

          try {
            await this.parentItem.update({
              "system.embeddedCombatPowers": powers,
            });
            this.document.updateSource(powerData);
            this.render();
          } catch (error) {
            Logger.error(
              "EmbeddedItemSheet | Failed to save combat power image",
              { error, powers, powerData },
              "EMBEDDED_ITEM_SHEET",
            );
            ui.notifications.error(
              "Failed to save Combat Power. See console for details.",
            );
          }
        } else if (this.isEffect) {
          // Handle action card embedded effects
          const effectIndex =
            this.parentItem.system.embeddedStatusEffects.findIndex(
              (s) => s._id === this.originalItemId,
            );
          if (effectIndex === -1) return;

          const statusEffects = foundry.utils.deepClone(
            this.parentItem.system.embeddedStatusEffects,
          );
          const effectData = statusEffects[effectIndex];
          foundry.utils.setProperty(effectData, attr, path);

          try {
            await this.parentItem.update({
              "system.embeddedStatusEffects": statusEffects,
            });
            this.render();
          } catch (error) {
            Logger.error(
              "EmbeddedItemSheet | Failed to save effect image",
              { error, statusEffects, effectData },
              "EMBEDDED_ITEM_SHEET",
            );
            ui.notifications.error(
              game.i18n.localize(
                "EVENTIDE_RP_SYSTEM.Errors.SaveEffectImageFailed",
              ),
            );
          }
        } else {
          // Handle action card embedded items
          const itemData = foundry.utils.deepClone(
            this.parentItem.system.embeddedItem,
          );
          foundry.utils.setProperty(itemData, attr, path);

          try {
            await this.parentItem.update({
              "system.embeddedItem": itemData,
            });
            this.render();
          } catch (error) {
            Logger.error(
              "EmbeddedItemSheet | Failed to save image",
              { error, itemData },
              "EMBEDDED_ITEM_SHEET",
            );
            ui.notifications.error(
              game.i18n.localize(
                "EVENTIDE_RP_SYSTEM.Errors.SaveItemImageFailed",
              ),
            );
          }
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
    this._cleanupThemeManagement();
  }

  /** @override */
  async _onFirstRender(context, options) {
    super._onFirstRender(context, options);

    // Initialize theme management using the mixin
    this._initThemeManagement();

    if (this.element) {
      this.element.addEventListener("save", (event) => {
        if (!event.target.matches("prose-mirror")) return;
        Logger.debug(
          "EmbeddedItemSheet | Delegated save event | Event triggered",
          { event },
          "EMBEDDED_ITEM_SHEET",
        );
        this._onProseMirrorSave(event);
      });
    }
  }

  /** @override */
  async _onRender(context, options) {
    super._onRender(context, options);

    // Re-apply themes on re-render using the mixin
    this._initThemeManagement();
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
        "EmbeddedItemSheet | _onProseMirrorSave | Could not extract target name or content value from editor element",
        { editorElement },
        "EMBEDDED_ITEM_SHEET",
      );
    }
  }

  /**
   * Override of the default editor save behavior for embedded items.
   * @param {string} target     - The data path of the property to update (e.g., "system.description").
   * @param {string} content    - The new HTML content to save.
   * @override
   * @protected
   */
  async _onEditorSave(target, content) {
    await this._saveEmbeddedEditorContent(target, content);
  }

  /**
   * Handles form change events.
   * @param {Object} formConfig - The form configuration
   * @param {Event} event - The form change event
   * @returns {Promise<void>}
   * @protected
   */
  async _onChangeForm(formConfig, event) {
    if (event.target.name.includes("characterEffects")) {
      await this._updateEmbeddedCharacterEffects();
      event.target.focus();
      return;
    }

    // Handle icon tint changes for status effects and gear
    if (event.target.name.includes("iconTint")) {
      await this._handleIconTintChange(event);
      return;
    }

    await super._onChangeForm(formConfig, event);
  }

  /**
   * Processes form data for submission.
   * @param {object} formConfig   - The form configuration.
   * @param {Event} event         - The submission event.
   * @override
   * @protected
   */
  async _onSubmitForm(formConfig, event) {
    await this._submitEmbeddedForm(formConfig, event);
  }

  /**
   * Handle toggling effect display on token
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   * @private
   */
  static _toggleEffectDisplay(event, target) {
    Logger.debug(
      "EmbeddedItemSheet | Toggle effect display triggered",
      {
        checked: target.checked,
        isEffect: this.isEffect,
        originalItemId: this.originalItemId,
        documentType: this.document.type,
      },
      "EMBEDDED_ITEM_SHEET",
    );

    // Create proper duration structure - ON = 604800 seconds, OFF = 0 seconds
    const duration = target.checked
      ? {
          seconds: 604800,
          startTime: null,
          combat: "",
          rounds: 0,
          turns: 0,
          startRound: 0,
          startTurn: 0,
        }
      : {
          seconds: 0,
          startTime: null,
          combat: "",
          rounds: 0,
          turns: 0,
          startRound: 0,
          startTurn: 0,
        };

    const firstEffect = this.document.effects.contents[0];

    if (!firstEffect) {
      Logger.warn(
        "No active effect found for toggle display",
        null,
        "EMBEDDED_ITEM_SHEET",
      );
      return;
    }

    Logger.debug(
      "EmbeddedItemSheet | First effect found",
      {
        effectId: firstEffect.id,
        effectName: firstEffect.name,
        currentDuration: firstEffect.duration,
        newDuration: duration,
      },
      "EMBEDDED_ITEM_SHEET",
    );

    // Update the embedded item data in the parent item
    if (this.parentItem.type === "transformation") {
      // Handle transformation items - combat powers don't typically use effect display toggles
      // but we'll handle it for completeness
      const powerIndex = this.parentItem.system.embeddedCombatPowers.findIndex(
        (p) => p._id === this.originalItemId,
      );

      Logger.debug(
        "EmbeddedItemSheet | Processing embedded combat power",
        {
          powerIndex,
          totalPowers: this.parentItem.system.embeddedCombatPowers.length,
          originalItemId: this.originalItemId,
        },
        "EMBEDDED_ITEM_SHEET",
      );

      if (powerIndex === -1) {
        Logger.error(
          "EmbeddedItemSheet | Combat power not found in transformation",
          null,
          "EMBEDDED_ITEM_SHEET",
        );
        return;
      }

      const powers = foundry.utils.deepClone(
        this.parentItem.system.embeddedCombatPowers,
      );
      const powerData = powers[powerIndex];

      // Ensure effects array exists
      if (!powerData.effects) powerData.effects = [];

      // Find or create the active effect in the stored data
      let activeEffectIndex = powerData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );

      Logger.debug(
        "EmbeddedItemSheet | Combat power data before update",
        {
          powerData,
          activeEffectIndex,
          totalActiveEffects: powerData.effects.length,
          firstEffectId: firstEffect.id,
        },
        "EMBEDDED_ITEM_SHEET",
      );

      if (activeEffectIndex >= 0) {
        // Update existing effect
        powerData.effects[activeEffectIndex].duration = duration;
        Logger.debug(
          "EmbeddedItemSheet | Updated existing combat power effect",
          {
            activeEffectIndex,
            updatedEffect: powerData.effects[activeEffectIndex],
          },
          "EMBEDDED_ITEM_SHEET",
        );
      } else {
        // Create new effect from the temporary effect
        const newEffect = firstEffect.toObject();
        newEffect.duration = duration;
        powerData.effects.push(newEffect);
        activeEffectIndex = powerData.effects.length - 1;
        Logger.debug(
          "EmbeddedItemSheet | Created new combat power effect",
          {
            newEffect,
            activeEffectIndex,
          },
          "EMBEDDED_ITEM_SHEET",
        );
      }

      Logger.debug(
        "EmbeddedItemSheet | Final combat power data to save",
        {
          powers,
          updatedPowerData: powerData,
          effectDuration: powerData.effects[activeEffectIndex].duration,
        },
        "EMBEDDED_ITEM_SHEET",
      );

      try {
        // Step 1: Update the temporary document's effect directly
        firstEffect.updateSource({ duration });
        Logger.debug(
          "EmbeddedItemSheet | Updated temporary document effect",
          {
            effectId: firstEffect.id,
            newDuration: firstEffect.duration,
          },
          "EMBEDDED_ITEM_SHEET",
        );

        // Step 2: Update the transformation with the new data
        this.parentItem.update({
          "system.embeddedCombatPowers": powers,
        });

        Logger.debug(
          "EmbeddedItemSheet | Successfully updated transformation",
          null,
          "EMBEDDED_ITEM_SHEET",
        );

        // Step 3: Re-render the sheet
        this.render();
      } catch (error) {
        Logger.error(
          "EmbeddedItemSheet | Failed to toggle combat power effect display",
          { error, powers, powerData },
          "EMBEDDED_ITEM_SHEET",
        );
        ui.notifications.error(
          "Failed to save Combat Power. See console for details.",
        );
      }
    } else if (this.isEffect) {
      const effectIndex =
        this.parentItem.system.embeddedStatusEffects.findIndex(
          (s) => s._id === this.originalItemId,
        );

      Logger.debug(
        "EmbeddedItemSheet | Processing embedded effect",
        {
          effectIndex,
          totalEffects: this.parentItem.system.embeddedStatusEffects.length,
          originalItemId: this.originalItemId,
        },
        "EMBEDDED_ITEM_SHEET",
      );

      if (effectIndex === -1) {
        Logger.error(
          "EmbeddedItemSheet | Effect not found in action card",
          null,
          "EMBEDDED_ITEM_SHEET",
        );
        return;
      }

      const statusEffects = foundry.utils.deepClone(
        this.parentItem.system.embeddedStatusEffects,
      );
      const statusData = statusEffects[effectIndex];

      // Ensure effects array exists
      if (!statusData.effects) statusData.effects = [];

      // Find or create the active effect in the stored data
      let activeEffectIndex = statusData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );

      Logger.debug(
        "EmbeddedItemSheet | Status data before update",
        {
          statusData,
          activeEffectIndex,
          totalActiveEffects: statusData.effects.length,
          firstEffectId: firstEffect.id,
        },
        "EMBEDDED_ITEM_SHEET",
      );

      if (activeEffectIndex >= 0) {
        // Update existing effect
        statusData.effects[activeEffectIndex].duration = duration;
        Logger.debug(
          "EmbeddedItemSheet | Updated existing active effect",
          {
            activeEffectIndex,
            updatedEffect: statusData.effects[activeEffectIndex],
          },
          "EMBEDDED_ITEM_SHEET",
        );
      } else {
        // Create new effect from the temporary effect
        const newEffect = firstEffect.toObject();
        newEffect.duration = duration;
        statusData.effects.push(newEffect);
        activeEffectIndex = statusData.effects.length - 1;
        Logger.debug(
          "EmbeddedItemSheet | Created new active effect",
          {
            newEffect,
            activeEffectIndex,
          },
          "EMBEDDED_ITEM_SHEET",
        );
      }

      Logger.debug(
        "EmbeddedItemSheet | Final status effects data to save",
        {
          statusEffects,
          updatedStatusData: statusData,
          effectDuration: statusData.effects[activeEffectIndex].duration,
        },
        "EMBEDDED_ITEM_SHEET",
      );

      try {
        // Step 1: Update the temporary document's effect directly
        firstEffect.updateSource({ duration });
        Logger.debug(
          "EmbeddedItemSheet | Updated temporary document effect",
          {
            effectId: firstEffect.id,
            newDuration: firstEffect.duration,
          },
          "EMBEDDED_ITEM_SHEET",
        );

        // Step 2: Update the action card with the new data
        this.parentItem.update({
          "system.embeddedStatusEffects": statusEffects,
        });

        Logger.debug(
          "EmbeddedItemSheet | Successfully updated action card",
          null,
          "EMBEDDED_ITEM_SHEET",
        );

        // Step 3: Re-render the sheet
        this.render();
      } catch (error) {
        Logger.error(
          "EmbeddedItemSheet | Failed to toggle effect display",
          { error, statusEffects, statusData },
          "EMBEDDED_ITEM_SHEET",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ToggleEffectDisplayFailed",
          ),
        );
      }
    } else {
      const itemData = foundry.utils.deepClone(
        this.parentItem.system.embeddedItem,
      );

      Logger.debug(
        "EmbeddedItemSheet | Processing embedded item",
        {
          itemType: itemData.type,
          itemName: itemData.name,
          hasEffects: !!itemData.effects,
          effectsCount: itemData.effects?.length || 0,
        },
        "EMBEDDED_ITEM_SHEET",
      );

      // Ensure effects array exists
      if (!itemData.effects) itemData.effects = [];

      // Find or create the active effect in the stored data
      let activeEffectIndex = itemData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );

      Logger.debug(
        "EmbeddedItemSheet | Item data before update",
        {
          activeEffectIndex,
          totalActiveEffects: itemData.effects.length,
          firstEffectId: firstEffect.id,
          itemEffects: itemData.effects,
        },
        "EMBEDDED_ITEM_SHEET",
      );

      if (activeEffectIndex >= 0) {
        // Update existing effect
        itemData.effects[activeEffectIndex].duration = duration;
        Logger.debug(
          "EmbeddedItemSheet | Updated existing item effect",
          {
            activeEffectIndex,
            updatedEffect: itemData.effects[activeEffectIndex],
          },
          "EMBEDDED_ITEM_SHEET",
        );
      } else {
        // Create new effect from the temporary effect
        const newEffect = firstEffect.toObject();
        newEffect.duration = duration;
        itemData.effects.push(newEffect);
        activeEffectIndex = itemData.effects.length - 1;
        Logger.debug(
          "EmbeddedItemSheet | Created new item effect",
          {
            newEffect,
            activeEffectIndex,
          },
          "EMBEDDED_ITEM_SHEET",
        );
      }

      Logger.debug(
        "EmbeddedItemSheet | Final item data to save",
        {
          itemData,
          effectDuration: itemData.effects[activeEffectIndex].duration,
        },
        "EMBEDDED_ITEM_SHEET",
      );

      try {
        // Step 1: Update the temporary document's effect directly
        firstEffect.updateSource({ duration });
        Logger.debug(
          "EmbeddedItemSheet | Updated temporary document effect",
          {
            effectId: firstEffect.id,
            newDuration: firstEffect.duration,
          },
          "EMBEDDED_ITEM_SHEET",
        );

        // Step 2: Update the action card with the new data
        this.parentItem.update({
          "system.embeddedItem": itemData,
        });

        Logger.debug(
          "EmbeddedItemSheet | Successfully updated action card",
          null,
          "EMBEDDED_ITEM_SHEET",
        );

        // Step 3: Re-render the sheet
        this.render();
      } catch (error) {
        Logger.error(
          "EmbeddedItemSheet | Failed to toggle effect display",
          { error, itemData },
          "EMBEDDED_ITEM_SHEET",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ToggleEffectDisplayFailed",
          ),
        );
      }
    }

    event.target.focus();
  }
}
