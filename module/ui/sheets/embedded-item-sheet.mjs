import { BaselineSheetMixins } from "../components/_module.mjs";
import { EventideSheetHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  cleanupThemeManager,
  THEME_PRESETS,
  prepareCharacterEffects,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/_module.mjs";
import { CommonFoundryTasks } from "../../utils/_module.mjs";

const { api, sheets } = foundry.applications;
const { TextEditor, FormDataExtended } = foundry.applications.ux;
const FilePicker = foundry.applications.apps.FilePicker.implementation;

/**
 * A specialized item sheet for editing items embedded within Action Card items.
 * Based on the working embedded-combat-power-sheet.mjs pattern.
 */
export class EmbeddedItemSheet extends BaselineSheetMixins(
  api.HandlebarsApplicationMixin(sheets.ItemSheetV2),
) {
  /**
   * @param {object} itemData          The raw data of the item to edit.
   * @param {Item} actionCardItem      The parent action card item document.
   * @param {object} [options={}]      Additional sheet options.
   * @param {boolean} [isEffect=false] Whether this is an embedded effect (vs main embedded item).
   */
  constructor(itemData, actionCardItem, options = {}, isEffect = false) {
    Logger.methodEntry("EmbeddedItemSheet", "constructor", {
      itemData,
      actionCardItem,
      options,
    });

    // Create a temporary, un-parented Item document to represent the embedded item.
    const tempItem = new CONFIG.Item.documentClass(itemData, {
      parent: null,
    });

    // Initialize effects collection if it doesn't exist
    if (!tempItem.effects) {
      tempItem.effects = new foundry.utils.Collection();
    }

    Logger.debug(
      "EmbeddedItemSheet | Constructor - processing item data",
      {
        itemType: itemData.type,
        itemName: itemData.name,
        hasEffectsData: !!(itemData.effects && Array.isArray(itemData.effects)),
        effectsCount: itemData.effects?.length || 0,
        effectsData: itemData.effects,
      },
      "EMBEDDED_ITEM_SHEET",
    );

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
      const defaultEffectData = {
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

    // Set permissions based on the containing action card item
    Object.defineProperty(tempItem, "isOwner", {
      value: actionCardItem.isOwner,
      configurable: true,
    });
    Object.defineProperty(tempItem, "isEditable", {
      value: actionCardItem.isEditable,
      configurable: true,
    });

    const sheetOptions = foundry.utils.mergeObject(options, {
      document: tempItem,
      title: `${game.i18n.localize("EVENTIDE_RP_SYSTEM.UI.Edit")}: ${
        tempItem.name
      }`,
    });

    super(sheetOptions);

    // Store the original embedded item ID for lookups (must be after super() call)
    this.originalItemId = itemData._id;
    this.actionCardItem = actionCardItem;
    this.isEffect = isEffect;
    this.isStatusEffect = itemData.type === "status";
    Logger.methodExit("EmbeddedItemSheet", "constructor", this);
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
        newCharacterEffect: this._newCharacterEffect,
        deleteCharacterEffect: this._deleteCharacterEffect,
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
              rollData: this.actionCardItem.getRollData(),
              relativeTo: this.actionCardItem,
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
        if (this.isEffect) {
          // Find the effect in the action card's embedded effects
          const effectIndex =
            this.actionCardItem.system.embeddedStatusEffects.findIndex(
              (s) => s._id === this.originalItemId,
            );
          if (effectIndex === -1) return;

          const statusEffects = foundry.utils.deepClone(
            this.actionCardItem.system.embeddedStatusEffects,
          );
          const effectData = statusEffects[effectIndex];
          foundry.utils.setProperty(effectData, attr, path);

          try {
            await this.actionCardItem.update({
              "system.embeddedStatusEffects": statusEffects,
            });
            this.render();
          } catch (error) {
            Logger.error(
              "EmbeddedItemSheet | Failed to save effect image",
              { error, statusEffects, effectData },
              "EMBEDDED_ITEM_SHEET",
            );
            ui.notifications.error("Failed to save effect image.");
          }
        } else {
          // Update the embedded item in the action card
          const itemData = foundry.utils.deepClone(
            this.actionCardItem.system.embeddedItem,
          );
          foundry.utils.setProperty(itemData, attr, path);

          try {
            await this.actionCardItem.update({
              "system.embeddedItem": itemData,
            });
            this.render();
          } catch (error) {
            Logger.error(
              "EmbeddedItemSheet | Failed to save image",
              { error, itemData },
              "EMBEDDED_ITEM_SHEET",
            );
            ui.notifications.error("Failed to save item image.");
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
    if (this.themeManager) {
      cleanupThemeManager(this);
      this.themeManager = null;
    }
  }

  /** @override */
  async _onFirstRender(context, options) {
    super._onFirstRender(context, options);

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
    if (!this.themeManager) {
      this.themeManager = initThemeManager(this, THEME_PRESETS.ITEM_SHEET);
    } else {
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
    if (this.isEffect) {
      // Find the effect in the action card's embedded effects
      const effectIndex =
        this.actionCardItem.system.embeddedStatusEffects.findIndex(
          (s) => s._id === this.originalItemId,
        );
      if (effectIndex === -1) return;

      const statusEffects = foundry.utils.deepClone(
        this.actionCardItem.system.embeddedStatusEffects,
      );
      const effectData = statusEffects[effectIndex];
      foundry.utils.setProperty(effectData, target, content);

      try {
        // Update the temporary document's source data first
        this.document.updateSource(effectData);

        await this.actionCardItem.update({
          "system.embeddedStatusEffects": statusEffects,
        });

        ui.notifications.info("Effect description saved.");
      } catch (error) {
        Logger.error(
          "EmbeddedItemSheet | Failed to save effect description",
          { error, statusEffects, effectData },
          "EMBEDDED_ITEM_SHEET",
        );
        ui.notifications.error(
          "Failed to save effect. See console for details.",
        );
      }
    } else {
      const itemData = foundry.utils.deepClone(
        this.actionCardItem.system.embeddedItem,
      );
      foundry.utils.setProperty(itemData, target, content);

      try {
        // Update the temporary document's source data first
        this.document.updateSource(itemData);

        await this.actionCardItem.update({
          "system.embeddedItem": itemData,
        });

        ui.notifications.info("Item description saved.");
      } catch (error) {
        Logger.error(
          "EmbeddedItemSheet | Failed to save description",
          { error, itemData },
          "EMBEDDED_ITEM_SHEET",
        );
        ui.notifications.error("Failed to save item. See console for details.");
      }
    }
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
      await this._updateCharacterEffects();
      event.target.focus();
      return;
    }

    // Handle icon tint changes for status effects and gear
    if (event.target.name.includes("iconTint")) {
      const firstEffect = this.document.effects.contents[0];
      if (firstEffect) {
        // Update the embedded item data in the action card
        if (this.isEffect) {
          const effectIndex =
            this.actionCardItem.system.embeddedStatusEffects.findIndex(
              (s) => s._id === this.originalItemId,
            );
          if (effectIndex >= 0) {
            const statusEffects = foundry.utils.deepClone(
              this.actionCardItem.system.embeddedStatusEffects,
            );
            const effectData = statusEffects[effectIndex];

            if (!effectData.effects) effectData.effects = [];
            const activeEffectIndex = effectData.effects.findIndex(
              (e) => e._id === firstEffect.id,
            );
            if (activeEffectIndex >= 0) {
              effectData.effects[activeEffectIndex].tint = event.target.value;
            }

            try {
              // Update the temporary document's source data first
              this.document.updateSource(effectData);

              await this.actionCardItem.update({
                "system.embeddedStatusEffects": statusEffects,
              });
            } catch (error) {
              Logger.error(
                "EmbeddedItemSheet | Failed to save effect icon tint",
                { error, statusEffects, effectData },
                "EMBEDDED_ITEM_SHEET",
              );
              ui.notifications.error("Failed to save effect icon tint.");
            }
          }
        } else {
          const itemData = foundry.utils.deepClone(
            this.actionCardItem.system.embeddedItem,
          );

          if (!itemData.effects) itemData.effects = [];
          const effectIndex = itemData.effects.findIndex(
            (e) => e._id === firstEffect.id,
          );
          if (effectIndex >= 0) {
            itemData.effects[effectIndex].tint = event.target.value;
          }

          try {
            // Update the temporary document's source data first
            this.document.updateSource(itemData);

            await this.actionCardItem.update({
              "system.embeddedItem": itemData,
            });
          } catch (error) {
            Logger.error(
              "EmbeddedItemSheet | Failed to save item icon tint",
              { error, itemData },
              "EMBEDDED_ITEM_SHEET",
            );
            ui.notifications.error("Failed to save item icon tint.");
          }
        }
      }
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
  async _onSubmitForm(_formConfig, _event) {
    Logger.methodEntry("EmbeddedItemSheet", "_onSubmitForm");
    const formData = new FormDataExtended(this.form).object;

    if (this.isEffect) {
      // Find the effect in the action card's embedded effects
      const effectIndex =
        this.actionCardItem.system.embeddedStatusEffects.findIndex(
          (s) => s._id === this.originalItemId,
        );
      if (effectIndex === -1) {
        Logger.methodExit("EmbeddedItemSheet", "_onSubmitForm", {
          reason: "Effect not found",
        });
        return;
      }

      const statusEffects = foundry.utils.deepClone(
        this.actionCardItem.system.embeddedStatusEffects,
      );
      const effectData = statusEffects[effectIndex];
      foundry.utils.mergeObject(effectData, formData);

      try {
        // Update the temporary document's source data first
        this.document.updateSource(effectData);

        await this.actionCardItem.update({
          "system.embeddedStatusEffects": statusEffects,
        });
        this.render();
      } catch (error) {
        Logger.error(
          "EmbeddedItemSheet | Failed to save effect form data",
          { error, statusEffects, effectData, formData },
          "EMBEDDED_ITEM_SHEET",
        );
        ui.notifications.error(
          "Failed to save effect. See console for details.",
        );
        Logger.methodExit("EmbeddedItemSheet", "_onSubmitForm", { error });
        return;
      }
    } else {
      // Find the embedded item in the action card
      const itemData = foundry.utils.deepClone(
        this.actionCardItem.system.embeddedItem,
      );
      foundry.utils.mergeObject(itemData, formData);

      try {
        // Update the temporary document's source data first
        this.document.updateSource(itemData);

        await this.actionCardItem.update({
          "system.embeddedItem": itemData,
        });
        this.render();
      } catch (error) {
        Logger.error(
          "EmbeddedItemSheet | Failed to save form data",
          { error, itemData, formData },
          "EMBEDDED_ITEM_SHEET",
        );
        ui.notifications.error("Failed to save item. See console for details.");
        Logger.methodExit("EmbeddedItemSheet", "_onSubmitForm", { error });
        return;
      }
    }
    Logger.methodExit("EmbeddedItemSheet", "_onSubmitForm");
  }

  /**
   * Handle adding a new character effect
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   * @private
   */
  static async _newCharacterEffect(event, target) {
    const { type, ability } = target.dataset;
    const newEffect = {
      type,
      ability,
    };
    await this._updateCharacterEffects({ newEffect });
    this.render();
    event.target.focus();
  }

  /**
   * Handle deleting a character effect
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   * @private
   */
  static async _deleteCharacterEffect(_event, target) {
    const index = target.dataset.index;
    const type = target.dataset.type;
    await this._updateCharacterEffects({ remove: { index, type } });
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

    // Update the embedded item data in the action card
    if (this.isEffect) {
      const effectIndex =
        this.actionCardItem.system.embeddedStatusEffects.findIndex(
          (s) => s._id === this.originalItemId,
        );

      Logger.debug(
        "EmbeddedItemSheet | Processing embedded effect",
        {
          effectIndex,
          totalEffects: this.actionCardItem.system.embeddedStatusEffects.length,
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
        this.actionCardItem.system.embeddedStatusEffects,
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
        this.actionCardItem.update({
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
        ui.notifications.error("Failed to toggle effect display.");
      }
    } else {
      const itemData = foundry.utils.deepClone(
        this.actionCardItem.system.embeddedItem,
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
        this.actionCardItem.update({
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
        ui.notifications.error("Failed to toggle effect display.");
      }
    }

    event.target.focus();
  }

  /**
   * Update character effects for embedded items
   * @param {Object} options - Update options
   * @param {Object} [options.newEffect] - Configuration for a new effect to add
   * @param {Object} [options.remove] - Configuration for removing an existing effect
   * @returns {Promise<void>}
   * @private
   */
  async _updateCharacterEffects({
    newEffect = { type: null, ability: null },
    remove = { index: null, type: null },
  } = {}) {
    // Get all form elements that include "characterEffects" in their name
    let formElements = this.form.querySelectorAll('[name*="characterEffects"]');

    if (remove.type && remove.index) {
      formElements = Array.from(formElements).filter(
        (el) => !el.name.includes(`${remove.type}.${remove.index}`),
      );
    }

    // Create an object to store the values
    const characterEffects = {
      regularEffects: [],
      hiddenEffects: [],
    };

    // Process each form element
    for (const element of formElements) {
      const name = element.name;
      const value = element.value;

      if (!name.includes("regularEffects") && !name.includes("hiddenEffects")) {
        continue;
      }

      const parts = name.split(".");
      if (parts.length < 3) continue;

      const type = parts[1]; // regularEffects or hiddenEffects
      const index = parseInt(parts[2], 10);
      const property = parts[3]; // ability, mode, value, etc.

      // Ensure the array has an object at this index
      if (!characterEffects[type][index]) {
        characterEffects[type][index] = {};
      }

      // Set the property value
      characterEffects[type][index][property] = value;
    }

    // Clean up the arrays
    characterEffects.regularEffects = characterEffects.regularEffects.filter(
      (e) => e,
    );
    characterEffects.hiddenEffects = characterEffects.hiddenEffects.filter(
      (e) => e,
    );

    const processEffects = async (effects, isRegular) => {
      return effects.map((effect) => {
        let key;

        if (isRegular) {
          key = `system.abilities.${effect.ability}.${
            effect.mode === "add"
              ? "change"
              : effect.mode === "override"
                ? "override"
                : effect.mode === "advantage"
                  ? "diceAdjustments.advantage"
                  : effect.mode === "disadvantage"
                    ? "diceAdjustments.disadvantage"
                    : "transform"
          }`;
        } else {
          key = `system.hiddenAbilities.${effect.ability}.${
            effect.mode === "add" ? "change" : "override"
          }`;
        }

        const mode =
          (isRegular && effect.mode !== "override") ||
          (!isRegular && effect.mode === "add")
            ? CONST.ACTIVE_EFFECT_MODES.ADD
            : CONST.ACTIVE_EFFECT_MODES.OVERRIDE;

        return { key, mode, value: effect.value };
      });
    };

    const newEffects = [
      ...(await processEffects(characterEffects.regularEffects, true)),
      ...(await processEffects(characterEffects.hiddenEffects, false)),
    ];

    if (newEffect.type && newEffect.ability) {
      newEffects.push({
        key: `system.${newEffect.type}.${newEffect.ability}.change`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: 0,
      });
    }

    // Get the first effect from the temporary item, or create one if needed
    let firstEffect = this.document.effects.contents[0];
    if (
      !firstEffect &&
      (this.document.type === "status" || this.document.type === "gear")
    ) {
      // Create a default ActiveEffect if none exists for status effects and gear
      const defaultEffectData = {
        _id: foundry.utils.randomID(),
        name: this.document.name,
        icon: this.document.img,
        changes: [],
        disabled: false,
        duration: {},
        flags: {},
        tint: "#ffffff",
        transfer: true,
        statuses: [],
      };

      firstEffect = new CONFIG.ActiveEffect.documentClass(defaultEffectData, {
        parent: this.document,
      });
      this.document.effects.set(defaultEffectData._id, firstEffect);

      // Also update the source data
      if (!this.document._source.effects) {
        this.document._source.effects = [];
      }
      this.document._source.effects.push(defaultEffectData);
    }

    if (!firstEffect) {
      Logger.warn(
        "No active effect found and could not create one for embedded item",
        null,
        "EMBEDDED_ITEM_SHEET",
      );
      return;
    }

    // Update the effect data
    const effectData = {
      _id: firstEffect.id,
      changes: newEffects,
    };

    // Update the embedded item data in the action card
    if (this.isEffect) {
      const effectIndex =
        this.actionCardItem.system.embeddedStatusEffects.findIndex(
          (s) => s._id === this.originalItemId,
        );
      if (effectIndex === -1) return;

      const statusEffects = foundry.utils.deepClone(
        this.actionCardItem.system.embeddedStatusEffects,
      );
      const statusData = statusEffects[effectIndex];

      // Update the effects array in the status data
      if (!statusData.effects) statusData.effects = [];
      const activeEffectIndex = statusData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );
      if (activeEffectIndex >= 0) {
        statusData.effects[activeEffectIndex] = foundry.utils.mergeObject(
          statusData.effects[activeEffectIndex],
          effectData,
        );
      } else {
        // Add the effect if it doesn't exist yet
        statusData.effects.push(
          foundry.utils.mergeObject(firstEffect.toObject(), effectData),
        );
      }

      try {
        // Update the temporary document's source data first
        this.document.updateSource(statusData);

        await this.actionCardItem.update({
          "system.embeddedStatusEffects": statusEffects,
        });
        this.render();
      } catch (error) {
        Logger.error(
          "EmbeddedItemSheet | Failed to save effect character effects",
          { error, statusEffects, statusData },
          "EMBEDDED_ITEM_SHEET",
        );
        ui.notifications.error("Failed to save effect character effects.");
      }
    } else {
      const itemData = foundry.utils.deepClone(
        this.actionCardItem.system.embeddedItem,
      );

      // Update the effects array in the item data
      if (!itemData.effects) itemData.effects = [];
      const activeEffectIndex = itemData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );
      if (activeEffectIndex >= 0) {
        itemData.effects[activeEffectIndex] = foundry.utils.mergeObject(
          itemData.effects[activeEffectIndex],
          effectData,
        );
      } else {
        // Add the effect if it doesn't exist yet
        itemData.effects.push(
          foundry.utils.mergeObject(firstEffect.toObject(), effectData),
        );
      }

      try {
        // Update the temporary document's source data first
        this.document.updateSource(itemData);

        await this.actionCardItem.update({
          "system.embeddedItem": itemData,
        });
        this.render();
      } catch (error) {
        Logger.error(
          "EmbeddedItemSheet | Failed to save item character effects",
          { error, itemData },
          "EMBEDDED_ITEM_SHEET",
        );
        ui.notifications.error("Failed to save item character effects.");
      }
    }
  }
}
