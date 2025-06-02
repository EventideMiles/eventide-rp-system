import { Logger } from "../../services/logger.mjs";

/**
 * Mixin to automatically handle form input states based on readOnly option
 *
 * This mixin automatically disables all form inputs, buttons, and interactive elements
 * when the readOnly option is set to true during rendering or when isEditable is false.
 * It handles various input types including text, number, select, textarea, checkboxes, etc.
 *
 * @param {Class} BaseClass - The ApplicationV2 class to extend
 * @returns {Class} Extended class with automatic read-only mode handling
 */
export function EditModeCheckMixin(BaseClass) {
  return class extends BaseClass {
    /**
     * Override render to capture the readOnly option
     * @param {Object} options - Render options
     * @param {boolean} [options.readOnly] - If true, disables all form inputs
     * @param {Object} _options - Additional options
     * @returns {Promise<void>}
     * @override
     */
    async render(options = {}, _options = {}) {
      // Capture the readOnly option if provided
      if (typeof options === "object" && options.readOnly !== undefined) {
        this._readOnlyMode = options.readOnly;
      } else if (typeof options === "boolean") {
        // Handle legacy boolean force parameter - don't set readOnly mode
        this._readOnlyMode = undefined;
      }

      const result = await super.render(options, _options);

      // Apply read-only state after a short delay to ensure DOM is ready
      setTimeout(() => {
        this._applyReadOnlyState();
      }, 10);

      return result;
    }

    /**
     * Apply read-only state to form elements after render
     * @param {ApplicationRenderContext} context - Prepared context data
     * @param {RenderOptions} options - Provided render options
     * @protected
     * @override
     */
    _onRender(context, options) {
      // Call parent _onRender first
      if (super._onRender) {
        super._onRender(context, options);
      }

      // Apply read-only state to all form elements
      this._applyReadOnlyState();
    }

    /**
     * Applies the read-only state to all form elements in the sheet
     * Disables inputs, buttons, and interactive elements when readOnly is true or isEditable is false
     * @private
     */
    _applyReadOnlyState() {
      if (!this.element) {
        return;
      }

      // Check both readOnly option and isEditable property
      const isReadOnly =
        this._readOnlyMode === true || this.isEditable === false;

      Logger.debug(
        "Applying read-only state to form elements",
        {
          className: this.constructor.name,
          isReadOnly,
          readOnlyMode: this._readOnlyMode,
          isEditable: this.isEditable,
          documentType: this.document?.type,
          documentName: this.document?.name,
        },
        "EDIT_MODE",
      );

      if (isReadOnly) {
        this._disableFormElements();
      } else {
        this._enableFormElements();
      }
    }

    /**
     * Disables all form elements in the sheet
     * @private
     */
    _disableFormElements() {
      const selectors = [
        'input:not([type="hidden"]):not([disabled])',
        "select:not([disabled])",
        "textarea:not([disabled])",
        "button:not([disabled]):not(.item):not([data-tab])", // Exclude tab buttons
        "prose-mirror",
        ".erps-number-input__button",
        ".erps-image-picker[data-edit]",
        '[data-action]:not([data-action="viewDoc"]):not([data-action="close"]):not([data-tab])', // Exclude tab actions
      ];

      selectors.forEach((selector) => {
        const elements = this.element.querySelectorAll(selector);
        elements.forEach((element) => {
          // Skip tab navigation elements
          if (this._isTabNavigationElement(element)) {
            return;
          }
          // Skip window control elements
          if (this._isWindowControlElement(element)) {
            return;
          }
          this._disableElement(element);
        });
      });

      // Special handling for ProseMirror editors
      const proseMirrorElements = this.element.querySelectorAll("prose-mirror");
      proseMirrorElements.forEach((element) => {
        element.setAttribute("editable", "false");
        element.style.pointerEvents = "none";
        element.style.opacity = "0.6";
      });

      Logger.debug(
        "Disabled form elements for read-only mode",
        {
          className: this.constructor.name,
          disabledCount: this.element.querySelectorAll(
            '[data-erps-disabled="true"]',
          ).length,
        },
        "EDIT_MODE",
      );
    }

    /**
     * Checks if an element is part of tab navigation and should remain interactive
     * @param {HTMLElement} element - The element to check
     * @returns {boolean} True if the element is part of tab navigation
     * @private
     */
    _isTabNavigationElement(element) {
      // Check if element has tab-related attributes
      if (
        element.hasAttribute("data-tab") ||
        element.classList.contains("item")
      ) {
        return true;
      }

      // Check if element is within a tab navigation container
      const tabContainer = element.closest(
        ".tabs, .tab-navigation, .sheet-tabs",
      );
      if (tabContainer) {
        return true;
      }

      // Check for common tab-related classes
      const tabClasses = ["tab", "item", "tab-button", "sheet-tab"];
      if (tabClasses.some((cls) => element.classList.contains(cls))) {
        return true;
      }

      return false;
    }

    /**
     * Checks if an element is part of window controls and should remain interactive
     * @param {HTMLElement} element - The element to check
     * @returns {boolean} True if the element is part of window controls
     * @private
     */
    _isWindowControlElement(element) {
      // Check if element is within window header/controls
      const windowHeader = element.closest(
        ".window-header, .application-header, .header-button",
      );
      if (windowHeader) {
        return true;
      }

      // Check for window control actions
      const windowActions = [
        "close",
        "minimize",
        "maximize",
        "popOut",
        "copyUuid",
        "showArtwork",
        "showTokenArtwork",
        "configureToken",
        "setSheetTheme",
      ];
      const elementAction = element.getAttribute("data-action");
      if (windowActions.includes(elementAction)) {
        return true;
      }

      // Check for window control classes
      const windowControlClasses = [
        "header-button",
        "window-control",
        "close",
        "minimize",
        "maximize",
        "fa-times",
        "fa-window-close",
        "fa-copy",
        "fa-external-link-alt",
      ];
      if (windowControlClasses.some((cls) => element.classList.contains(cls))) {
        return true;
      }

      // Check if element is a direct child of window controls container
      const controlsContainer = element.closest(
        ".window-controls, .header-controls, .application-controls",
      );
      if (controlsContainer) {
        return true;
      }

      return false;
    }

    /**
     * Enables all form elements in the sheet (removes read-only restrictions)
     * @private
     */
    _enableFormElements() {
      const disabledElements = this.element.querySelectorAll(
        '[data-erps-disabled="true"]',
      );

      disabledElements.forEach((element) => {
        this._enableElement(element);
      });

      // Special handling for ProseMirror editors
      const proseMirrorElements = this.element.querySelectorAll("prose-mirror");
      proseMirrorElements.forEach((element) => {
        element.setAttribute("editable", "true");
        element.style.pointerEvents = "";
        element.style.opacity = "";
      });

      Logger.debug(
        "Enabled form elements for editable mode",
        {
          className: this.constructor.name,
          enabledCount: disabledElements.length,
        },
        "EDIT_MODE",
      );
    }

    /**
     * Disables a specific element and marks it as disabled by this mixin
     * @param {HTMLElement} element - The element to disable
     * @private
     */
    _disableElement(element) {
      // Skip elements that are already disabled or should remain interactive
      if (element.disabled || element.hasAttribute("data-erps-keep-enabled")) {
        return;
      }

      // Store original disabled state
      if (!element.hasAttribute("data-erps-original-disabled")) {
        element.setAttribute(
          "data-erps-original-disabled",
          element.disabled ? "true" : "false",
        );
      }

      // Mark as disabled by this mixin
      element.setAttribute("data-erps-disabled", "true");

      // Apply appropriate disabling method based on element type
      if (
        element.tagName === "INPUT" ||
        element.tagName === "SELECT" ||
        element.tagName === "TEXTAREA"
      ) {
        element.disabled = true;
      } else if (
        element.tagName === "BUTTON" ||
        element.hasAttribute("data-action")
      ) {
        element.disabled = true;
        element.style.pointerEvents = "none";
        element.style.opacity = "0.6";
      } else if (element.classList.contains("erps-image-picker")) {
        element.style.pointerEvents = "none";
        element.style.opacity = "0.6";
        element.removeAttribute("data-edit");
        element.setAttribute("data-erps-original-edit", "img");
      }
    }

    /**
     * Enables a specific element that was disabled by this mixin
     * @param {HTMLElement} element - The element to enable
     * @private
     */
    _enableElement(element) {
      // Only enable elements that were disabled by this mixin
      if (!element.hasAttribute("data-erps-disabled")) {
        return;
      }

      // Restore original disabled state
      const originalDisabled =
        element.getAttribute("data-erps-original-disabled") === "true";

      // Remove our tracking attributes
      element.removeAttribute("data-erps-disabled");
      element.removeAttribute("data-erps-original-disabled");

      // Restore element state based on type
      if (
        element.tagName === "INPUT" ||
        element.tagName === "SELECT" ||
        element.tagName === "TEXTAREA"
      ) {
        element.disabled = originalDisabled;
      } else if (
        element.tagName === "BUTTON" ||
        element.hasAttribute("data-action")
      ) {
        element.disabled = originalDisabled;
        if (!originalDisabled) {
          element.style.pointerEvents = "";
          element.style.opacity = "";
        }
      } else if (element.classList.contains("erps-image-picker")) {
        element.style.pointerEvents = "";
        element.style.opacity = "";
        const originalEdit = element.getAttribute("data-erps-original-edit");
        if (originalEdit) {
          element.setAttribute("data-edit", originalEdit);
          element.removeAttribute("data-erps-original-edit");
        }
      }
    }
  };
}
