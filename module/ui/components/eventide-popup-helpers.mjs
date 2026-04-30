const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { TextEditor } = foundry.applications.ux;
import { WindowSizingFixMixin } from "./window-sizing-fix-mixin.mjs";

/**
 * Eventide Popup Helpers
 * 
 * Base class for popup applications providing:
 * - Keyboard navigation and focus management
 * - Form submission handling
 * - Eligibility checking
 * 
 * @extends {WindowSizingFixMixin(HandlebarsApplicationMixin(ApplicationV2))}
 */
export class EventidePopupHelpers extends WindowSizingFixMixin(
  HandlebarsApplicationMixin(ApplicationV2),
) {
  static DEFAULT_OPTIONS = {
    id: "popup",
    tag: "form",
    form: {
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  constructor({ item }) {
    super();
    this.item = item;
    /** @type {HTMLFormElement|null} - Cached form element */
    this._formElement = null;
    /** @type {AbortController|null} - Controller for keyboard event listeners */
    this._keyboardAbortController = null;
  }

  async _prepareContext(_options) {
    const enrichedDescription = await this._enrichDescription();
    const context = {
      item: this.item,
      effects: Array.from(this.item.effects),
      mainEffect: Array.from(this.item.effects)[0],
      isGM: game.user.isGM,
      enrichedDescription,
    };

    this.problems = await this.checkEligibility();
    context.callouts = await this._prepareCallouts();
    context.footerButtons = await this._prepareFooterButtons();

    return context;
  }

  /**
   * Enriches an item description for safe HTML rendering
   * @private
   * @returns {Promise<string>} The enriched and sanitized HTML
   */
  async _enrichDescription() {
    if (!this.item?.system?.description) {
      return "";
    }

    try {
      return await TextEditor.implementation.enrichHTML(
        this.item.system.description,
        {
          secrets: this.item.isOwner ?? false,
          rollData: this.item.getRollData?.() ?? {},
          relativeTo: this.item,
        },
      );
    } catch {
      return this.item.system.description;
    }
  }

  async _preparePartContext(partId, context, _options) {
    context.partId = `${this.id}-${partId}`;
    return context;
  }

  async _prepareCallouts() {
    const callouts = [];

    if (this.type === "power" && this.problems.targeting) {
      callouts.push({
        type: "warning",
        faIcon: "fas fa-exclamation-triangle",
        text: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Power.TargetPower",
        ),
      });
    }

    if (this.type === "gear" && this.problems.targeting) {
      callouts.push({
        type: "warning",
        faIcon: "fas fa-exclamation-triangle",
        text: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Gear.TargetGear",
        ),
      });
    }

    if (this.problems.quantity) {
      callouts.push({
        type: "warning",
        faIcon: "fas fa-exclamation-triangle",
        text: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Gear.InsufficientQuantity",
          {
            cost: this.item.system.cost,
            quantity: this.item.system.quantity,
          },
        ),
      });
    }

    if (this.problems.equipped) {
      callouts.push({
        type: "warning",
        faIcon: "fas fa-exclamation-triangle",
        text: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Gear.NotEquipped",
        ),
      });
    }

    if (this.problems.power) {
      callouts.push({
        type: "warning",
        faIcon: "fas fa-exclamation-triangle",
        text: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Power.InsufficientPower",
          {
            cost: this.item.system.cost,
            actorPower: this.item.actor.system.power.value,
          },
        ),
      });
    }

    return callouts;
  }

  async _prepareFooterButtons() {
    const buttons = [];
    const actionLabel = {
      gear: "EVENTIDE_RP_SYSTEM.Forms.Buttons.UseItem",
      power: "EVENTIDE_RP_SYSTEM.Forms.Buttons.UsePower",
      feature: "EVENTIDE_RP_SYSTEM.Forms.Buttons.SendToChat",
      status: "EVENTIDE_RP_SYSTEM.Forms.Buttons.SendToChat",
    };

    if (
      !this.problems ||
      !Object.values(this.problems).some((value) => value)
    ) {
      buttons.push({
        label: game.i18n.localize(actionLabel[this.type]),
        type: "submit",
        cssClass: "erps-button erps-button--primary",
      });
    }

    buttons.push({
      label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Close"),
      type: "button",
      cssClass: "erps-button",
      action: "close",
    });

    return buttons;
  }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
  }

  /**
   * Checks if the item is eligible for use based on targeting, power, and quantity.
   * @param {Object} [options={}] - Options for the eligibility check
   * @param {boolean} [options.skipTargetingCheck] - Skip the targeting eligibility check
   * @returns {Object} An object containing the eligibility status for each check.
   */
  async checkEligibility(options = {}) {
    const problems = {
      targeting: false,
      power: false,
      quantity: false,
      equipped: false,
    };

    if (!options.skipTargetingCheck && this.item.system.targeted) {
      const targetArray = await erps.utils.getTargetArray();
      if (targetArray.length === 0) problems.targeting = true;
    }

    if (this.type === "gear") {
      if (this.item.system.cost > (this.item.system.quantity || 0)) {
        problems.quantity = true;
      }

      if (!this.item?.system?.equipped) {
        problems.equipped = true;
      }
    }

    if (this.type === "power") {
      if (this.item.system.cost > this.item.actor?.system?.power?.value) {
        problems.power = true;
      }
    }

    return problems;
  }

  /**
   * Handle first render - set up focus management
   * @param {ApplicationRenderContext} context - Prepared context data
   * @param {RenderOptions} options - Provided render options
   * @returns {Promise<void>}
   * @override
   * @protected
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    
    // Store form element reference
    this._formElement = this.element;
    
    // Focus the appropriate button based on eligibility
    this._focusDefaultButton();
  }

  /**
   * Handle render - attach keyboard event listeners
   * Use capture phase to intercept events before Foundry's global handlers
   * @param {ApplicationRenderContext} context - Prepared context data
   * @param {RenderOptions} options - Provided render options
   * @override
   * @protected
   */
  _onRender(context, options) {
    super._onRender(context, options);
    
    // Set up keyboard event listener with AbortController for easy cleanup
    // Use capture phase (true) to intercept events before Foundry's handlers
    this._keyboardAbortController = new AbortController();
    this.element.addEventListener('keydown', this._onKeyDown.bind(this), {
      signal: this._keyboardAbortController.signal,
      capture: true,
    });
  }

  /**
   * Clean up resources before closing the application
   * @param {Object} options - The options for closing
   * @returns {Promise<void>}
   * @override
   */
  async _preClose(options) {
    // Clean up keyboard listeners
    if (this._keyboardAbortController) {
      this._keyboardAbortController.abort();
      this._keyboardAbortController = null;
    }
    
    this._formElement = null;
    
    // Call mixin cleanup
    await super._preClose(options);
  }

  /**
   * Handle keydown events for keyboard navigation
   * @param {KeyboardEvent} event - The keyboard event
   * @protected
   */
  _onKeyDown(event) {
    // Don't handle events if the popup is closing
    if (!this.element) return;
    
    const key = event.key;
    
    // Escape: Let Foundry's dismiss handler work (don't stop propagation)
    if (key === 'Escape') {
      // Foundry VTT handles this via the DISMISS keybinding
      return;
    }
    
    // Enter: Submit the form if we have a submit button and no validation problems
    if (key === 'Enter') {
      // Don't submit if the user is in a textarea (they may want newlines)
      if (event.target.tagName === 'TEXTAREA') return;
      
      // Don't submit if we're on a checkbox or radio input (let Space handle selection)
      if (event.target.type === 'checkbox' || event.target.type === 'radio') {
        return;
      }
      
      // If focused on a transformation row (role="radio"), let the row's own handler process it
      // The row has its own keydown handler that will handle selection
      if (event.target.getAttribute('role') === 'radio') {
        return;
      }
      
      // Try to find and click the submit button
      const submitButton = this.element.querySelector('button[type="submit"]');
      if (submitButton && !submitButton.disabled) {
        event.preventDefault();
        event.stopPropagation();
        submitButton.click();
        return;
      }
    }
    
    // Tab: Handle focus trapping
    if (key === 'Tab') {
      this._handleTabKey(event);
      // Always stop propagation for Tab to prevent Foundry from switching characters
      event.stopPropagation();
      return;
    }
    
    // For all other keys, stop propagation to prevent Foundry's global handlers
    // This prevents things like WASD canvas movement while popup is focused
    event.stopPropagation();
  }

  /**
   * Handle Tab key for focus trapping within the popup
   * @param {KeyboardEvent} event - The keyboard event
   * @private
   */
  _handleTabKey(event) {
    const focusableElements = this._getFocusableElements();
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const currentElement = document.activeElement;
    
    // If shift+tab on first element, wrap to last
    if (event.shiftKey && currentElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }
    
    // If tab on last element, wrap to first
    if (!event.shiftKey && currentElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
      
    }
    
    // Let normal tab behavior work
  }

  /**
   * Get all focusable elements within the popup
   * @returns {HTMLElement[]} Array of focusable elements
   * @private
   */
  _getFocusableElements() {
    if (!this.element) return [];
    
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');
    
    return Array.from(this.element.querySelectorAll(selector))
      .filter((el) => el.offsetParent !== null); // Exclude hidden elements
  }

  /**
   * Focus the default button based on eligibility
   * If the popup is eligible for execution, focus the submit button.
   * Otherwise, focus the close button.
   * @protected
   */
  _focusDefaultButton() {
    if (!this.element) return;
    
    // Check if we have validation problems
    const hasProblems = this.problems && Object.values(this.problems).some((value) => {
      // Handle gearValidation array
      if (Array.isArray(value)) return value.length > 0;
      return value;
    });
    
    // Try to focus submit button if no problems
    if (!hasProblems) {
      const submitButton = this.element.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.focus();
        return;
      }
    }
    
    // Fall back to close button
    const closeButton = this.element.querySelector('button[data-action="close"]');
    if (closeButton) {
      closeButton.focus();
      return;
    }
    
    // Final fallback: focus the first focusable element
    const focusableElements = this._getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }
}
