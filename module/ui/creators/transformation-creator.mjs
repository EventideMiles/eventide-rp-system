import { CreatorApplication } from "../_module.mjs";

const { DragDrop, TextEditor } = foundry.applications.ux;

/**
 * A form application for creating and managing transformation items.
 * @extends {CreatorApplication}
 */
export class TransformationCreator extends CreatorApplication {
  static PARTS = {
    transformationCreator: {
      template:
        "/systems/eventide-rp-system/templates/macros/transformation-creator.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["eventide-rp-system", "standard-form", "transformation-creator"],
    window: {
      icon: "fa-solid fa-mask",
    },
    form: {
      handler: super._onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    dragDrop: [{ dragSelector: ".item", dropSelector: null }],
    actions: {
      removeCombatPower: this._removeCombatPower,
      viewCombatPower: this._viewCombatPower,
    },
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format(
      "EVENTIDE_RP_SYSTEM.WindowTitles.TransformationCreator",
    );
  }

  constructor({ advanced = false, number = 0, playerMode = false } = {}) {
    super({ advanced, number, playerMode, keyType: "transformation" });
    this.calloutGroup = "Transformation";
    this.embeddedCombatPowers = [];
    this.#dragDrop = this.#createDragDropHandlers();
  }

  /**
   * Prepares the main context data for the transformation creator.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context containing abilities, stored preferences, and target information
   * @throws {Error} Implicitly closes the form if a player has no selected tokens
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.calloutGroup = this.calloutGroup;

    context.storedData = {
      transformation_img:
        this.storedData[this.storageKeys[0]] || "icons/svg/ice-aura.svg",
      transformation_bgColor: this.storedData[this.storageKeys[1]],
      transformation_textColor: this.storedData[this.storageKeys[2]],
      transformation_iconTint: this.storedData[this.storageKeys[3]],
      transformation_displayOnToken: this.storedData[this.storageKeys[4]],
      transformation_cursed: this.storedData[this.storageKeys[5]] || false,
      transformation_size: this.storedData[this.storageKeys[6]] || "1",
    };

    context.sizeOptions = [
      { value: "0.5", label: "Tiny (0.5x)" },
      { value: "0.75", label: "Small (0.75x)" },
      { value: "1", label: "Medium (1x)" },
      { value: "1.5", label: "Large (1.5x)" },
      { value: "2", label: "Large (2x)" },
      { value: "2.5", label: "Huge (2.5x)" },
      { value: "3", label: "Huge (3x)" },
      { value: "3.5", label: "Gargantuan (3.5x)" },
      { value: "4", label: "Gargantuan (4x)" },
      { value: "4.5", label: "Colossal (4.5x)" },
      { value: "5", label: "Colossal (5x)" },
    ];
    context.embeddedCombatPowers = this.embeddedCombatPowers;
    return context;
  }

  /**
   * Handle the first render of the application
   * @override
   * @protected
   */
  async _onFirstRender() {
    await super._onFirstRender();
    this.#dragDrop.forEach((d) => d.bind(this.element));
  }

  /**
   * Clean up resources before the application is closed
   * @param {Object} options - The options for closing
   * @returns {Promise<void>}
   * @override
   */
  _preClose() {
    super._preClose();
    // this.#dragDrop.forEach((d) => d.unbind());
  }

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(_selector) {
    return true;
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(_selector) {
    return true;
  }

  /**
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    const li = event.currentTarget;
    if ("link" in event.target.dataset) return;

    let dragData = null;

    // Active Effect
    if (li.dataset.effectId) {
      const effect = this.item.effects.get(li.dataset.effectId);
      dragData = effect.toDragData();
    }

    if (!dragData) return;

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    const formData = CreatorApplication._saveFormData(this);
    const data = TextEditor.implementation.getDragEventData(event);
    event.preventDefault();

    if (!data || data.type !== "Item") return;

    const combatPower = await Item.implementation.fromDropData(data);
    if (!combatPower || combatPower.type !== "combatPower") return;

    const oldPosition = this.position.height;
    this.embeddedCombatPowers.push(combatPower);
    await this.render();
    CreatorApplication._restoreFormData(this, formData);

    const contentElement = this.element.querySelector(".base-form__content");
    if (contentElement) {
      contentElement.scrollTop = oldPosition;
    }
  }

  /**
   * Handle removing a combat power from the transformation
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _removeCombatPower(event, target) {
    const formData = CreatorApplication._saveFormData(this);
    const powerId = target.dataset.powerId;
    if (!powerId) return;

    const index = this.embeddedCombatPowers.findIndex((p) => p.id === powerId);
    if (index === -1) return;

    this.embeddedCombatPowers.splice(index, 1);
    const oldPosition = this.position.height;
    await this.render();
    CreatorApplication._restoreFormData(this, formData);

    const contentElement = this.element.querySelector(".base-form__content");
    if (contentElement) {
      contentElement.scrollTop = oldPosition;
    }
  }

  /**
   * Handle viewing a combat power's details
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _viewCombatPower(_event, target) {
    const powerId = target.dataset.powerId;
    if (!powerId) return;

    const power = this.embeddedCombatPowers.find((p) => p.id === powerId);
    if (!power) return;

    power.sheet.render(true);
  }

  /** The following pieces set up drag handling and are unlikely to need modification  */

  /**
   * Returns an array of DragDrop instances
   * @type {DragDrop.implementation[]}
   */
  get dragDrop() {
    return this.#dragDrop;
  }

  // This is marked as private because there's no real need
  // for subclasses or external hooks to mess with it directly
  #dragDrop;

  /**
   * Creates drag-and-drop workflow handlers for this Application.
   *
   * @returns {DragDrop.implementation[]} An array of DragDrop handlers
   * @private
   */
  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new DragDrop.implementation(d);
    });
  }
}
