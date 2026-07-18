import { EventidePopupHelpers } from "../components/_module.mjs";
import { ThemeManagedPopupMixin } from "../mixins/_module.mjs";
import { Logger } from "../../services/logger.mjs";
import { DefaultDataFactory } from "../../services/default-data-factory.mjs";

const FilePicker = foundry.applications.apps.FilePicker.implementation;

/**
 * Multi-Image Selector Popup Application
 *
 * Provides a unified interface for managing images and colors across all
 * visual components of an action card.
 *
 * @extends {ThemeManagedPopupMixin(EventidePopupHelpers)}
 */
export class MultiImageSelector extends ThemeManagedPopupMixin(
  EventidePopupHelpers,
) {
  /** @override */
  static PARTS = {
    multiImageSelector: {
      template:
        "systems/eventide-rp-system/templates/macros/popups/multi-image-selector.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: [
      "eventide-sheet",
      "eventide-sheet--scrollbars",
      "multi-image-selector",
    ],
    position: {
      width: 700,
      height: "auto",
    },
    window: {
      icon: "fas fa-images",
    },
    form: {
      handler: this.#onSubmit,
    },
    actions: {
      onEditImage: MultiImageSelector.prototype._onEditImage,
      addCombatPower: MultiImageSelector.prototype._addCombatPower,
      addStatusEffect: MultiImageSelector.prototype._addStatusEffect,
      addSelfEffect: MultiImageSelector.prototype._addSelfEffect,
    },
  };

  /**
   * Get the localized window title
   * @returns {string}
   */
  get title() {
    return game.i18n.localize(
      "EVENTIDE_RP_SYSTEM.Item.ActionCard.MultiImageSelector.Title",
    );
  }

  constructor({ item }) {
    super({ item });
    this.type = "multiImageSelector";
    this._savedFormData = null;
    this._syncToggleHandlers = new WeakMap();
  }

  /**
   * Get the action card's current img path for sync operations
   * @returns {string}
   */
  get actionCardImg() {
    const raw = this.element?.querySelector('input[name="img"]');
    return raw?.value || this.item.img || "";
  }

  /**
   * Get the action card's current bgColor for sync operations
   * @returns {string}
   */
  get actionCardBg() {
    const raw = this.element?.querySelector('input[name="system.bgColor"]');
    return raw?.value || this.item.system?.bgColor || "";
  }

  /**
   * Get the action card's current textColor for sync operations
   * @returns {string}
   */
  get actionCardTc() {
    const raw = this.element?.querySelector('input[name="system.textColor"]');
    return raw?.value || this.item.system?.textColor || "";
  }

  /**
   * Called after each render
   * @override
   */
  _onRender(context, options) {
    super._onRender(context, options);
    this._setupSyncToggleListeners();
    this._setupFormChangeDelegation();
    this._applySyncDisabledStates();
  }

  /**
   * Attach change listeners to sync toggles so they update the dialog
   * inputs immediately when checked/unchecked.
   * @private
   */
  _setupSyncToggleListeners() {
    if (!this.element) return;

    const checkboxes = this.element.querySelectorAll(
      'input[type="checkbox"][name^="syncImage-"], input[type="checkbox"][name^="syncColors-"]',
    );

    checkboxes.forEach((cb) => {
      const old = this._syncToggleHandlers.get(cb);
      if (old) cb.removeEventListener("change", old);
      const handler = this._onSyncToggleChange.bind(this);
      this._syncToggleHandlers.set(cb, handler);
      cb.addEventListener("change", handler);
    });
  }

  /**
   * Set up a single change listener on the form to propagate action card
   * input changes to rows with checked sync toggles.
   * @private
   */
  _setupFormChangeDelegation() {
    if (!this.element) return;
    const form = this.element.tagName === "FORM" ? this.element : this.element.querySelector("form");
    if (!form) return;

    if (this._boundFormChangeHandler) {
      form.removeEventListener("change", this._boundFormChangeHandler);
    }
    this._boundFormChangeHandler = (event) => this._onFormChange(event);
    form.addEventListener("change", this._boundFormChangeHandler);
  }

  /**
   * Handle a change event on the form — if it's an action card source input,
   * propagate the new value to all rows with checked sync toggles.
   * @param {Event} event
   * @private
   */
  _onFormChange(event) {
    const target = event.target;
    if (!target || !target.name) return;

    let value, syncPrefix, isImage, isBg;

    if (target.name === "img") {
      isImage = true;
      value = target.value;
      syncPrefix = "syncImage-";
    } else if (target.name === "system.bgColor" || target.name === "system.bgColor-hex") {
      isBg = true;
      value = this.element.querySelector('input[name="system.bgColor"]')?.value || "";
      syncPrefix = "syncColors-";
    } else if (target.name === "system.textColor" || target.name === "system.textColor-hex") {
      value = this.element.querySelector('input[name="system.textColor"]')?.value || "";
      syncPrefix = "syncColors-";
    } else {
      return;
    }

    if (!value) return;

    this.element.querySelectorAll(`input[type="checkbox"][name^="${syncPrefix}"]:checked`).forEach((cb) => {
      const prefix = cb.name.slice(syncPrefix.length);
      if (isImage) {
        const targetName = `${prefix}.img`;
        const input = this.element.querySelector(`input[name="${targetName}"]`);
        const img = this.element.querySelector(`img[data-target="${targetName}"]`);
        if (input) input.value = value;
        if (img) img.src = value;
      } else {
        const colorField = isBg ? "system.bgColor" : "system.textColor";
        const fieldName = `${prefix}.${colorField}`;
        const input = this.element.querySelector(`input[name="${fieldName}"]`);
        const hex = this.element.querySelector(`input[name="${fieldName}-hex"]`);
        if (input) {
          input.value = value;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (hex) {
          hex.value = value;
          hex.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    });
  }

  /**
   * Handle a sync toggle change — update the corresponding inputs visually
   * @param {Event} event
   * @private
   */
  _onSyncToggleChange(event) {
    const cb = event.target;
    const checked = cb.checked;
    const name = cb.name;

    let prefix, isImage;
    if (name.startsWith("syncImage-")) {
      prefix = name.slice("syncImage-".length);
      isImage = true;
    } else if (name.startsWith("syncColors-")) {
      prefix = name.slice("syncColors-".length);
      isImage = false;
    } else {
      return;
    }

    if (isImage) {
      const targetName = `${prefix}.img`;
      const input = this.element.querySelector(`input[name="${targetName}"]`);
      const img = this.element.querySelector(
        `img[data-target="${targetName}"]`,
      );
      if (checked) {
        cb.dataset.original = input?.value || "";
        const src = this.actionCardImg;
        if (input) input.value = src;
        if (img) img.src = src;
      } else {
        const orig = cb.dataset.original || "";
        if (input) input.value = orig;
        if (img) img.src = orig;
      }
      this._applySyncDisabledStates();
      return;
    }

    const bgName = `${prefix}.system.bgColor`;
    const tcName = `${prefix}.system.textColor`;
    const bgInput = this.element.querySelector(`input[name="${bgName}"]`);
    const tcInput = this.element.querySelector(`input[name="${tcName}"]`);
    const bgHex = this.element.querySelector(`input[name="${bgName}-hex"]`);
    const tcHex = this.element.querySelector(`input[name="${tcName}-hex"]`);

    if (checked) {
      cb.dataset.originalBg = bgInput?.value || "";
      cb.dataset.originalTc = tcInput?.value || "";
      const bg = this.actionCardBg;
      const tc = this.actionCardTc;
      const set = (el, val) => {
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      };
      set(bgInput, bg);
      set(tcInput, tc);
      set(bgHex, bg);
      set(tcHex, tc);
    } else {
      const origBg = cb.dataset.originalBg || "";
      const origTc = cb.dataset.originalTc || "";
      const set = (el, val) => {
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      };
      set(bgInput, origBg);
      set(tcInput, origTc);
      set(bgHex, origBg);
      set(tcHex, origTc);
    }
    this._applySyncDisabledStates();
  }

  /**
   * Apply disabled states to inputs based on sync toggle states.
   * When sync is on, the corresponding inputs are non-interactive.
   * @private
   */
  _applySyncDisabledStates() {
    if (!this.element) return;

    this.element.querySelectorAll('input[type="checkbox"][name^="syncImage-"]').forEach((cb) => {
      const prefix = cb.name.slice("syncImage-".length);
      const targetName = `${prefix}.img`;
      const input = this.element.querySelector(`input[name="${targetName}"]`);
      const img = this.element.querySelector(`img[data-target="${targetName}"]`);

      if (cb.checked) {
        if (input) input.disabled = true;
        if (img) img.classList.add("erps-image-picker--disabled");
      } else {
        if (input) input.disabled = false;
        if (img) img.classList.remove("erps-image-picker--disabled");
      }
    });

    this.element.querySelectorAll('input[type="checkbox"][name^="syncColors-"]').forEach((cb) => {
      const prefix = cb.name.slice("syncColors-".length);
      const bgInput = this.element.querySelector(`input[name="${prefix}.system.bgColor"]`);
      const bgHex = this.element.querySelector(`input[name="${prefix}.system.bgColor-hex"]`);
      const tcInput = this.element.querySelector(`input[name="${prefix}.system.textColor"]`);
      const tcHex = this.element.querySelector(`input[name="${prefix}.system.textColor-hex"]`);
      const disabled = cb.checked;

      [bgInput, tcInput].forEach((el) => { if (el) el.disabled = disabled; });
      [bgHex, tcHex].forEach((el) => { if (el) el.disabled = disabled; });
    });
  }

  /**
   * Prepare context data for the template
   * @override
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = MultiImageSelector.DEFAULT_OPTIONS.classes.join(" ");

    context.showOriginalImageLabel = true;
    context.itemImg = this.item.img;
    context.bgColor = this.item.system.bgColor;
    context.textColor = this.item.system.textColor;
    context.isSavedDamage = this.item.system.mode === "savedDamage";

    const embeddedItem = this.item.system.embeddedItem;
    if (embeddedItem && embeddedItem._id) {
      context.embeddedItem = {
        img: embeddedItem.img || "",
        bgColor: embeddedItem.system?.bgColor || "",
        textColor: embeddedItem.system?.textColor || "",
      };
    } else {
      context.embeddedItem = null;
    }

    const buildEntries = (array, arrayName) =>
      array.map((entry, index) => ({
        index,
        name: entry.name || `${arrayName} ${index + 1}`,
        img: entry.img || "",
        bgColor: entry.system?.bgColor || "",
        textColor: entry.system?.textColor || "",
        imgField: `${arrayName}.${index}.img`,
        bgColorField: `${arrayName}.${index}.system.bgColor`,
        textColorField: `${arrayName}.${index}.system.textColor`,
        syncImageField: `syncImage-${arrayName}.${index}`,
        syncColorsField: `syncColors-${arrayName}.${index}`,
      }));

    context.statusEffects = buildEntries(
      this.item.system.embeddedStatusEffects || [],
      "embeddedStatusEffects",
    );
    context.transformations = buildEntries(
      this.item.system.embeddedTransformations || [],
      "embeddedTransformations",
    );
    context.selfEffects = buildEntries(
      this.item.system.embeddedSelfEffects || [],
      "embeddedSelfEffects",
    );

    return context;
  }

  /**
   * Handle image editing via FilePicker for any image in the popup
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  async _onEditImage(event, target) {
    event.preventDefault();
    if (target.classList.contains("erps-image-picker--disabled")) return;
    const targetField = target.dataset.target;
    if (!targetField) return;

    try {
      const input = this.element.querySelector(
        `input[name="${targetField}"]`,
      );
      const currentPath = input?.value || "";

      const fp = new FilePicker({
        type: "image",
        current: currentPath,
        callback: (path) => {
          const cleanPath = path.replace(/^\/+/, "");
          target.src = cleanPath;
          if (input) {
            input.value = cleanPath;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
        },
        top: this.position?.top + 40 || 40,
        left: this.position?.left + 10 || 10,
      });

      return fp.browse();
    } catch (error) {
      Logger.error("Failed to open image picker", error, "MULTI_IMAGE");
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.EditImage"),
      );
    }
  }

  /**
   * Save form data before re-render to preserve unsaved changes
   * @param {MultiImageSelector} app
   * @returns {Object}
   * @protected
   */
  static _saveFormData(app) {
    if (!app?.element) return {};

    const form = app.element.tagName === "FORM" ? app.element : app.element.querySelector("form");
    if (!form) return {};

    const savedData = {};
    const formData = new FormData(form);

    for (const [key, value] of formData.entries()) {
      savedData[key] = value;
    }

    const contentElement = app.element.querySelector(".erps-form__content");
    if (contentElement) {
      savedData._scrollTop = contentElement.scrollTop;
    }

    return savedData;
  }

  /**
   * Restore saved form data after re-render
   * @param {MultiImageSelector} app
   * @param {Object} savedData
   * @protected
   */
  static _restoreFormData(app, savedData) {
    if (!app?.element || !savedData) return;

    // Restore input values
    for (const [key, value] of Object.entries(savedData)) {
      if (key === "_scrollTop") continue;

      const input = app.element.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === "checkbox") {
          input.checked = value !== "null" && value !== "";
        } else {
          input.value = value;
        }
      }

      if (key.endsWith(".img")) {
        const img = app.element.querySelector(`img[data-target="${key}"]`);
        if (img) img.src = value;
      }
    }

    // Restore scroll position
    if (savedData._scrollTop !== undefined) {
      const contentElement = app.element.querySelector(".erps-form__content");
      if (contentElement) {
        contentElement.scrollTop = savedData._scrollTop;
      }
    }
  }

  /**
   * Add a blank combat power, defaulting to the action card's image and colors
   * @param {PointerEvent} event
   */
  async _addCombatPower(event) {
    event.preventDefault();
    try {
      const savedData = MultiImageSelector._saveFormData(this);

      const templateData = DefaultDataFactory.getCombatPowerData(
        this.item,
        "actionCard",
      );
      templateData.img = savedData["img"] || this.item.img;
      templateData.system.bgColor = savedData["system.bgColor"] || this.item.system?.bgColor || "";
      templateData.system.textColor = savedData["system.textColor"] || this.item.system?.textColor || "";

      const tempItem = new CONFIG.Item.documentClass(templateData, {
        parent: null,
      });
      await this.item.setEmbeddedItem(tempItem);
      this._savedFormData = savedData;
      await this.render();
      MultiImageSelector._restoreFormData(this, savedData);
      this._applySyncDisabledStates();
    } catch (error) {
      Logger.error("Failed to add combat power", error, "MULTI_IMAGE");
      ui.notifications.error("Failed to add combat power");
    }
  }

  /**
   * Add a blank status effect, defaulting to the action card's image and colors
   * @param {PointerEvent} event
   */
  async _addStatusEffect(event) {
    event.preventDefault();
    try {
      const savedData = MultiImageSelector._saveFormData(this);

      const templateData = DefaultDataFactory.getStatusData(this.item);
      templateData.img = savedData["img"] || this.item.img;
      templateData.system.bgColor = savedData["system.bgColor"] || this.item.system?.bgColor || "";
      templateData.system.textColor = savedData["system.textColor"] || this.item.system?.textColor || "";
      if (templateData.effects && Array.isArray(templateData.effects)) {
        for (const effect of templateData.effects) {
          effect.img = templateData.img;
        }
      }

      const tempItem = new CONFIG.Item.documentClass(templateData, {
        parent: null,
      });
      await this.item.addEmbeddedEffect(tempItem);
      this._savedFormData = savedData;
      await this.render();
      MultiImageSelector._restoreFormData(this, savedData);
      this._applySyncDisabledStates();
    } catch (error) {
      Logger.error("Failed to add status effect", error, "MULTI_IMAGE");
      ui.notifications.error("Failed to add status effect");
    }
  }

  /**
   * Add a blank self-effect, defaulting to the action card's image and colors
   * @param {PointerEvent} event
   */
  async _addSelfEffect(event) {
    event.preventDefault();
    try {
      const savedData = MultiImageSelector._saveFormData(this);

      const templateData = DefaultDataFactory.getStatusData(this.item);
      templateData.img = savedData["img"] || this.item.img;
      templateData.system.bgColor = savedData["system.bgColor"] || this.item.system?.bgColor || "";
      templateData.system.textColor = savedData["system.textColor"] || this.item.system?.textColor || "";
      if (templateData.effects && Array.isArray(templateData.effects)) {
        for (const effect of templateData.effects) {
          effect.img = templateData.img;
        }
      }

      const tempItem = new CONFIG.Item.documentClass(templateData, {
        parent: null,
      });
      await this.item.addEmbeddedSelfEffect(tempItem);
      this._savedFormData = savedData;
      await this.render();
      MultiImageSelector._restoreFormData(this, savedData);
      this._applySyncDisabledStates();
    } catch (error) {
      Logger.error("Failed to add self-effect", error, "MULTI_IMAGE");
      ui.notifications.error("Failed to add self-effect");
    }
  }

  /**
   * Handle form submission - save all changes and close
   * @param {Event} event
   * @param {HTMLFormElement} form
   * @param {FormData} formData
   * @private
   */
  static async #onSubmit(event, form, _formData) {
    event.preventDefault();

    try {
      const actionCard = this.item;
      // Read form values directly from DOM to avoid FormDataExtended processing quirks
      const raw = {};
      for (const el of form.elements) {
        if (!el.name) continue;
        if (el.type === "checkbox") {
          raw[el.name] = el.checked ? (el.value || "on") : "null";
        } else {
          raw[el.name] = el.value;
        }
      }
      const actionCardUpdates = {};
      const embeddedUpdates = [];

      const checked = (value) => value && value !== "null";

      if (raw.img) actionCardUpdates.img = raw.img;
      if (raw["system.bgColor"]) actionCardUpdates["system.bgColor"] = raw["system.bgColor"];
      if (raw["system.textColor"]) actionCardUpdates["system.textColor"] = raw["system.textColor"];

      // Helper: check if a form value actually differs from current data
      const changed = (formVal, currentVal) =>
        formVal !== undefined && formVal !== currentVal;

      const currentBg = actionCard.system.bgColor || "";
      const currentTc = actionCard.system.textColor || "";

      // Process embedded item (combat power)
      const currentEmbedded = actionCard.system.embeddedItem;
      if (currentEmbedded && currentEmbedded._id) {
        const updatedEmbedded = foundry.utils.deepClone(currentEmbedded);
        const sourceItemUpdates = {}; // Track changes to apply to linked source

        const eImg = raw["embeddedItem.img"];
        if (changed(eImg, currentEmbedded.img)) {
          updatedEmbedded.img = eImg;
          sourceItemUpdates.img = eImg;
        }
        if (checked(raw["syncImage-embeddedItem"])) {
          updatedEmbedded.img = raw.img || actionCard.img;
          sourceItemUpdates.img = updatedEmbedded.img;
        }

        const eBg = raw["embeddedItem.system.bgColor"];
        if (changed(eBg, currentEmbedded.system?.bgColor || "")) {
          if (!updatedEmbedded.system) updatedEmbedded.system = {};
          updatedEmbedded.system.bgColor = eBg;
          sourceItemUpdates["system.bgColor"] = eBg;
        }
        const eTc = raw["embeddedItem.system.textColor"];
        if (changed(eTc, currentEmbedded.system?.textColor || "")) {
          if (!updatedEmbedded.system) updatedEmbedded.system = {};
          updatedEmbedded.system.textColor = eTc;
          sourceItemUpdates["system.textColor"] = eTc;
        }

        if (checked(raw["syncColors-embeddedItem"])) {
          if (!updatedEmbedded.system) updatedEmbedded.system = {};
          updatedEmbedded.system.bgColor = raw["system.bgColor"] || currentBg;
          updatedEmbedded.system.textColor = raw["system.textColor"] || currentTc;
          sourceItemUpdates["system.bgColor"] = updatedEmbedded.system.bgColor;
          sourceItemUpdates["system.textColor"] = updatedEmbedded.system.textColor;
        }

        // Always sync effect.img to item.img
        if (updatedEmbedded.img && updatedEmbedded.effects && Array.isArray(updatedEmbedded.effects)) {
          for (const activeEffect of updatedEmbedded.effects) {
            if (activeEffect.img !== updatedEmbedded.img) {
              activeEffect.img = updatedEmbedded.img;
            }
          }
        }

        // If linked to a source item on the actor, update the source too
        // so the change propagates to all cards referencing it
        if (
          actionCard.system.embeddedItemRef &&
          Object.keys(sourceItemUpdates).length > 0 &&
          actionCard.isOwned &&
          actionCard.parent
        ) {
          const sourceItem = actionCard.parent.items.get(
            actionCard.system.embeddedItemRef,
          );
          if (sourceItem) {
            await sourceItem.update(sourceItemUpdates);
          }
        }

        // Always write back to ensure effect sync is persisted even if no other change
        embeddedUpdates.push({ "system.embeddedItem": updatedEmbedded });
      }

      // Process array-based embedded items
      const processArray = (arrayName) => {
        const currentItems = foundry.utils.deepClone(
          foundry.utils.getProperty(actionCard.system, arrayName) || [],
        );

        currentItems.forEach((item, index) => {
          const prefix = `${arrayName}.${index}`;

          const fImg = raw[`${prefix}.img`];
          const fBg = raw[`${prefix}.system.bgColor`];
          const fTc = raw[`${prefix}.system.textColor`];
          const syncImg = checked(raw[`syncImage-${prefix}`]);
          const syncCol = checked(raw[`syncColors-${prefix}`]);

          if (changed(fImg, item.img || "")) {
            item.img = fImg;
          }
          if (changed(fBg, item.system?.bgColor || "")) {
            if (!item.system) item.system = {};
            item.system.bgColor = fBg;
          }
          if (changed(fTc, item.system?.textColor || "")) {
            if (!item.system) item.system = {};
            item.system.textColor = fTc;
          }

          if (syncImg) {
            item.img = raw.img || actionCard.img;
          }
          if (syncCol) {
            if (!item.system) item.system = {};
            item.system.bgColor = raw["system.bgColor"] || currentBg;
            item.system.textColor = raw["system.textColor"] || currentTc;
          }
        });

        // Always sync effect.img to item.img
        for (const item of currentItems) {
          if (item.img && item.effects && Array.isArray(item.effects)) {
            for (const activeEffect of item.effects) {
              if (activeEffect.img !== item.img) {
                activeEffect.img = item.img;
              }
            }
          }
        }

        // Always write back to ensure effect sync is persisted even if no other change
        embeddedUpdates.push({ [`system.${arrayName}`]: currentItems });
      };

      processArray("embeddedStatusEffects");
      processArray("embeddedTransformations");
      processArray("embeddedSelfEffects");

      // Apply action card-level updates first
      if (Object.keys(actionCardUpdates).length > 0) {
        await actionCard.update(actionCardUpdates);
      }

      // Apply each embedded data update separately (matching EmbeddedItemSheet pattern)
      for (const update of embeddedUpdates) {
        await actionCard.update(update, { fromEmbeddedItem: true, diff: false });
      }

      this.close();
      if (actionCard.sheet?.rendered) {
        actionCard.sheet.render(true);
      }
    } catch (error) {
      Logger.error(
        "Failed to save multi-image selector changes",
        error,
        "MULTI_IMAGE",
      );
      ui.notifications.error("Failed to save changes");
    }
  }

  /**
   * Prepare footer buttons for the popup
   * @override
   */
  async _prepareFooterButtons() {
    return [
      {
        label: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.MultiImageSelector.Apply",
        ),
        type: "submit",
        cssClass: "erps-button erps-button--primary",
      },
      {
        label: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.MultiImageSelector.Cancel",
        ),
        type: "button",
        cssClass: "erps-button",
        action: "close",
      },
    ];
  }
}
