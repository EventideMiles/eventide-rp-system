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
  static _createTempItem(itemData, parentItem, _isEffect = false) {
    // Create a temporary, un-parented Item document to represent the embedded item
    const tempItem = new CONFIG.Item.documentClass(itemData, {
      parent: null,
    });

    // Initialize effects collection if it doesn't exist
    if (!tempItem.effects) {
      tempItem.effects = new foundry.utils.Collection();
    }

    // Initialize active effects from stored data
    EmbeddedItemSheet._initializeActiveEffects(tempItem, itemData);

    // Set up permissions based on parent item
    EmbeddedItemSheet._setupPermissions(tempItem, parentItem);

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
        const tempEffect = new CONFIG.ActiveEffect.documentClass(effectData, {
          parent: tempItem,
        });
        tempItem.effects.set(effectData._id, tempEffect);
      }
    } else if (itemData.type === "status" || itemData.type === "gear") {
      // Create a default ActiveEffect for status effects and gear if none exists
      const defaultEffectData =
        EmbeddedItemSheet._createDefaultEffect(tempItem);

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
        onEditImage: EmbeddedItemSheet._onEditImage,
        newCharacterEffect: EmbeddedItemSheet._newEmbeddedCharacterEffect,
        deleteCharacterEffect: EmbeddedItemSheet._deleteEmbeddedCharacterEffect,
        toggleEffectDisplay: this._toggleEffectDisplay,
      },
    },
  );

  /** @override */
  static PARTS = {
    header: {
      template: "systems/eventide-rp-system/templates/item/header.hbs",
    },
    callouts: {
      template: "systems/eventide-rp-system/templates/item/callouts.hbs",
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
    options.parts = ["header", "callouts", "tabs", "description"];

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
      case "actionCard":
        options.parts.push(
          "attributesActionCard",
          "attributesActionCardConfig",
          "embeddedItems",
        );
        // Increase width for action cards due to additional content
        options.position = { ...options.position, width: 1000 };
        break;
    }
  }

  /** @override */
  async _prepareContext(options) {
    const context = {};

    // Set up active effect data for status effects and gear items
    if (this.document.type === "status" || this.document.type === "gear") {
      const firstEffect = this.document.effects.contents[0];
      context.activeEffect = firstEffect;
      context.iconTint = firstEffect?.tint;
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
    context.callouts = this._prepareCallouts();
    return context;
  }

  /**
   * Prepares callouts for the embedded item sheet
   * @returns {Array} Array of callout objects
   * @private
   */
  _prepareCallouts() {
    const callouts = [];

    // Check for action cards in attack chain mode without embedded item
    if (this.item.type === "actionCard") {
      if (
        this.item.system.mode === "attackChain" &&
        !this.item.system.embeddedItem?.type
      ) {
        callouts.push({
          type: "warning",
          faIcon: "fas fa-exclamation-triangle",
          text: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Forms.Callouts.ActionCard.NoEmbeddedItem",
          ),
        });
      }
    }

    return callouts;
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
        context.rollTypes = EventideSheetHelpers.rollTypeObject;
        context.abilities = {
          ...EventideSheetHelpers.abilityObject,
          unaugmented: "unaugmented",
        };
        break;
      case "attributesActionCard":
      case "attributesActionCardConfig":
        context.tab = context.tabs[partId];
        context.rollTypes = EventideSheetHelpers.rollTypeObject;
        context.abilities = {
          ...EventideSheetHelpers.abilityObject,
          unaugmented: "unaugmented",
        };
        context.sizeOptions = [0, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
        break;
      case "embeddedItems":
        context.tab = context.tabs[partId];
        context.embeddedItem = this.item.getEmbeddedItem();
        context.embeddedEffects = this.item.getEmbeddedEffects();
        context.embeddedTransformations =
          await this.item.getEmbeddedTransformations();
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
        case "callouts":
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
        case "attributesActionCard":
          tab.id = "attributes";
          tab.label += "Attributes";
          break;
        case "attributesActionCardConfig":
          tab.id = "config";
          tab.label += "Config";
          break;
        case "embeddedItems":
          tab.id = "embeddedItems";
          tab.label += "EmbeddedItems";
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = "active";
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /**
   * OVERRIDE: Completely override the _onEditImage method to prevent inheritance issues
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImage(event, target) {
    return EmbeddedItemSheet._onEditImageEmbedded.call(this, event, target);
  }

  /**
   * Wrapper method to ensure the correct embedded item image editing logic is called
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImageWrapper(event, target) {
    return this._onEditImageEmbedded(event, target);
  }

  /**
   * Handle changing a Document's image for embedded items.
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImageEmbedded(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } =
      this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};

    // Capture the sheet context to prevent context loss in callback
    const sheet = this;

    const fp = new FilePicker({
      current,
      type: "image",
      redirectToRoot: img ? [img] : [],
      callback: async (path) => {
        // Handle transformation items (embedded combat powers)
        if (sheet.parentItem.type === "transformation") {
          const powerIndex =
            sheet.parentItem.system.embeddedCombatPowers.findIndex(
              (p) => p._id === sheet.originalItemId,
            );
          if (powerIndex === -1) return;

          const powers = foundry.utils.deepClone(
            sheet.parentItem.system.embeddedCombatPowers,
          );
          const powerData = powers[powerIndex];
          foundry.utils.setProperty(powerData, attr, path);

          // Issue #127: Sync active effect icons when item image is updated
          // Update both 'icon' (standard Foundry) and 'img' (legacy) properties
          if (attr === "img" && powerData.effects && Array.isArray(powerData.effects)) {
            for (const activeEffect of powerData.effects) {
              activeEffect.icon = path;
              activeEffect.img = path;
            }
          }

          try {
            await sheet.parentItem.update(
              {
                "system.embeddedCombatPowers": powers,
              },
              { fromEmbeddedItem: true },
            );
            sheet.document.updateSource(powerData);
            sheet.render();
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
        } else if (sheet.isEffect) {
          // Handle action card embedded effects
          const effectIndex =
            sheet.parentItem.system.embeddedStatusEffects.findIndex(
              (s) => s._id === sheet.originalItemId,
            );
          if (effectIndex === -1) return;

          const statusEffects = foundry.utils.deepClone(
            sheet.parentItem.system.embeddedStatusEffects,
          );
          const effectData = statusEffects[effectIndex];
          foundry.utils.setProperty(effectData, attr, path);

          // Issue #127: Sync active effect icons when item image is updated
          // Update both 'icon' (standard Foundry) and 'img' (legacy) properties
          if (attr === "img" && effectData.effects && Array.isArray(effectData.effects)) {
            for (const activeEffect of effectData.effects) {
              activeEffect.icon = path;
              activeEffect.img = path;
            }
          }

          try {
            await sheet.parentItem.update(
              {
                "system.embeddedStatusEffects": statusEffects,
              },
              { fromEmbeddedItem: true },
            );
            sheet.document.updateSource(effectData);
            sheet.render();
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
        } else if (
          sheet.parentItem.type === "actionCard" &&
          sheet.parentItem.system.embeddedTransformations?.some(
            (t) => t._id === sheet.originalItemId,
          )
        ) {
          // Handle action card embedded transformations
          const transformationIndex =
            sheet.parentItem.system.embeddedTransformations.findIndex(
              (t) => t._id === sheet.originalItemId,
            );
          if (transformationIndex === -1) return;

          const transformations = foundry.utils.deepClone(
            sheet.parentItem.system.embeddedTransformations,
          );
          const transformationData = transformations[transformationIndex];
          foundry.utils.setProperty(transformationData, attr, path);

          try {
            await sheet.parentItem.update(
              {
                "system.embeddedTransformations": transformations,
              },
              { fromEmbeddedItem: true },
            );
            sheet.document.updateSource(transformationData);
            sheet.render();
          } catch (error) {
            Logger.error(
              "EmbeddedItemSheet | Failed to save transformation image",
              { error, transformations, transformationData },
              "EMBEDDED_ITEM_SHEET",
            );
            ui.notifications.error(
              "Failed to save transformation image. See console for details.",
            );
          }
        } else if (
          sheet.parentItem.type === "actionCard" &&
          sheet._isNestedInEmbeddedTransformation()
        ) {
          // Handle multi-level: items nested within transformations that are embedded within action cards
          // This covers: Action Card → embeddedTransformations → [transformation] → embeddedCombatPowers → [combat power]
          await sheet._handleNestedTransformationItemImageUpdate(attr, path);
        } else {
          // Handle action card embedded items
          const itemData = foundry.utils.deepClone(
            sheet.parentItem.system.embeddedItem,
          );
          foundry.utils.setProperty(itemData, attr, path);

          // Issue #127: Sync active effect icons when item image is updated
          // Update both 'icon' (standard Foundry) and 'img' (legacy) properties
          if (attr === "img" && itemData.effects && Array.isArray(itemData.effects)) {
            for (const activeEffect of itemData.effects) {
              activeEffect.icon = path;
              activeEffect.img = path;
            }
          }

          try {
            await sheet.parentItem.update(
              {
                "system.embeddedItem": itemData,
              },
              { fromEmbeddedItem: true },
            );
            sheet.document.updateSource(itemData);
            sheet.render();
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
      top: sheet.position.top + 40,
      left: sheet.position.left + 10,
    });
    return fp.browse();
  }

  /**
   * Pre-close lifecycle hook for cleanup and diagnostic logging
   * @param {Object} options - Close options
   * @returns {Promise<void>}
   * @protected
   * @override
   */
  async _preClose(options = {}) {
    await super._preClose(options);
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

    // Update the embedded item data in the parent item
    if (this.parentItem.type === "transformation") {
      // Handle transformation items - combat powers don't typically use effect display toggles
      // but we'll handle it for completeness
      const powerIndex = this.parentItem.system.embeddedCombatPowers.findIndex(
        (p) => p._id === this.originalItemId,
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

      if (activeEffectIndex >= 0) {
        // Update existing effect
        powerData.effects[activeEffectIndex].duration = duration;
      } else {
        // Create new effect from the temporary effect
        const newEffect = firstEffect.toObject();
        newEffect.duration = duration;
        powerData.effects.push(newEffect);
        activeEffectIndex = powerData.effects.length - 1;
      }

      try {
        // Step 1: Update the temporary document's effect directly
        firstEffect.updateSource({ duration });

        // Step 2: Update the transformation with the new data
        this.parentItem.update(
          {
            "system.embeddedCombatPowers": powers,
          },
          { fromEmbeddedItem: true },
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

      if (activeEffectIndex >= 0) {
        // Update existing effect
        statusData.effects[activeEffectIndex].duration = duration;
      } else {
        // Create new effect from the temporary effect
        const newEffect = firstEffect.toObject();
        newEffect.duration = duration;
        statusData.effects.push(newEffect);
        activeEffectIndex = statusData.effects.length - 1;
      }

      try {
        // Step 1: Update the temporary document's effect directly
        firstEffect.updateSource({ duration });

        // Step 2: Update the action card with the new data
        this.parentItem.update(
          {
            "system.embeddedStatusEffects": statusEffects,
          },
          { fromEmbeddedItem: true },
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

      // Ensure effects array exists
      if (!itemData.effects) itemData.effects = [];

      // Find or create the active effect in the stored data
      let activeEffectIndex = itemData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );

      if (activeEffectIndex >= 0) {
        // Update existing effect
        itemData.effects[activeEffectIndex].duration = duration;
      } else {
        // Create new effect from the temporary effect
        const newEffect = firstEffect.toObject();
        newEffect.duration = duration;
        itemData.effects.push(newEffect);
        activeEffectIndex = itemData.effects.length - 1;
      }

      try {
        // Step 1: Update the temporary document's effect directly
        firstEffect.updateSource({ duration });

        // Step 2: Update the action card with the new data
        this.parentItem.update(
          {
            "system.embeddedItem": itemData,
          },
          { fromEmbeddedItem: true },
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

  /**
   * Check if this item is nested within a transformation that's embedded in an action card
   * @returns {boolean} True if this item is nested in an embedded transformation
   * @private
   */
  _isNestedInEmbeddedTransformation() {
    // Must be an action card parent
    if (this.parentItem.type !== "actionCard") return false;

    // Must have embedded transformations
    if (!this.parentItem.system.embeddedTransformations?.length) return false;

    // Check if this item exists within any of the embedded transformations
    for (const transformation of this.parentItem.system
      .embeddedTransformations) {
      // Check embedded combat powers
      if (
        transformation.embeddedCombatPowers?.some(
          (p) => p._id === this.originalItemId,
        )
      ) {
        return true;
      }
      // Check embedded action cards
      if (
        transformation.embeddedActionCards?.some(
          (ac) => ac._id === this.originalItemId,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Handle image updates for items nested within transformations that are embedded within action cards
   * @param {string} attr - The attribute being updated
   * @param {string} path - The new image path
   * @private
   */
  async _handleNestedTransformationItemImageUpdate(attr, path) {
    const transformations = foundry.utils.deepClone(
      this.parentItem.system.embeddedTransformations,
    );

    let foundTransformationIndex = -1;
    let foundItemIndex = -1;
    let foundItemType = null;
    let foundTransformation = null;

    // Find which transformation contains this item
    for (
      let transformationIndex = 0;
      transformationIndex < transformations.length;
      transformationIndex++
    ) {
      const transformation = transformations[transformationIndex];

      // Check embedded combat powers
      if (transformation.embeddedCombatPowers?.length) {
        const powerIndex = transformation.embeddedCombatPowers.findIndex(
          (p) => p._id === this.originalItemId,
        );
        if (powerIndex !== -1) {
          foundTransformationIndex = transformationIndex;
          foundItemIndex = powerIndex;
          foundItemType = "embeddedCombatPowers";
          foundTransformation = transformation;
          break;
        }
      }

      // Check embedded action cards
      if (transformation.embeddedActionCards?.length) {
        const actionCardIndex = transformation.embeddedActionCards.findIndex(
          (ac) => ac._id === this.originalItemId,
        );
        if (actionCardIndex !== -1) {
          foundTransformationIndex = transformationIndex;
          foundItemIndex = actionCardIndex;
          foundItemType = "embeddedActionCards";
          foundTransformation = transformation;
          break;
        }
      }
    }

    if (
      foundTransformationIndex === -1 ||
      foundItemIndex === -1 ||
      !foundItemType ||
      !foundTransformation
    ) {
      return;
    }

    // Update the nested item's image
    const nestedItemData =
      transformations[foundTransformationIndex][foundItemType][foundItemIndex];
    foundry.utils.setProperty(nestedItemData, attr, path);

    try {
      // Find the temp transformation item that corresponds to this transformation
      // We need to call the temp transformation's update method, not the root action card's
      const tempTransformations =
        this.parentItem.getEmbeddedTransformations?.() || [];

      const tempTransformation = tempTransformations.find(
        (t) => t.id === foundTransformation._id,
      );

      if (tempTransformation) {
        // Update the temp transformation item using its embedded collection update
        // This should trigger the transformation's dual-override pattern
        const transformationUpdateData = {};
        transformationUpdateData[`system.${foundItemType}`] =
          foundTransformation[foundItemType];

        await tempTransformation.update(transformationUpdateData, {
          fromEmbeddedItem: true,
        });
      } else {
        // Fallback to direct update if temp transformation not found
        await this.parentItem.update(
          {
            "system.embeddedTransformations": transformations,
          },
          { fromEmbeddedItem: true },
        );
      }

      this.document.updateSource(nestedItemData);
      this.render();
    } catch (error) {
      Logger.error(
        "EmbeddedItemSheet | Failed to save nested transformation item image",
        {
          error,
          transformationIndex: foundTransformationIndex,
          itemIndex: foundItemIndex,
          itemType: foundItemType,
        },
        "EMBEDDED_ITEM_SHEET",
      );
      ui.notifications.error(
        "Failed to save nested transformation item image. See console for details.",
      );
    }
  }

  /**
   * Override editor options to disable collaborative editing for temporary documents
   * @param {string} target - The target field being edited
   * @returns {object} Editor configuration options
   * @override
   */
  _getEditorOptions(target) {
    const options = super._getEditorOptions?.(target) || {};

    // Disable collaborative editing for temporary documents (like embedded items)
    // since they don't exist in the database
    options.collaborative = false;

    return options;
  }
}
