const { ApplicationV2 } = foundry.applications.api;
import { BaselineSheetMixins } from "./_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/logger.mjs";

/**
 * Generic Eventide Dialog Application
 *
 * A flexible dialog implementation that follows the Eventide design patterns.
 * Supports custom templates, buttons, and full theme integration.
 * @extends {WindowSizingFixMixin(HandlebarsApplicationMixin(ApplicationV2))}
 */
export class EventideDialog extends BaselineSheetMixins(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: [
      "eventide-sheet",
      "eventide-sheet--scrollbars",
      "eventide-dialog",
    ],
    tag: "form",
    position: {
      width: "auto",
      height: "auto",
    },
    window: {
      icon: "fas fa-comment-dots",
      resizable: true,
    },
    form: {
      submitOnChange: false,
      closeOnSubmit: false,
    },
    actions: {
      clickAction: EventideDialog.prototype._onClickAction,
    },
  };

  /**
   * Create a new EventideDialog
   * @param {Object} options - Dialog configuration options
   * @param {string} options.title - Dialog window title
   * @param {string} options.template - Path to the Handlebars template
   * @param {Object} options.data - Data to pass to the template
   * @param {Array} options.buttons - Array of button configurations
   * @param {Function} options.callback - Callback function for button clicks
   * @param {Object} options.windowOptions - Additional window options
   */
  constructor({
    title = "Dialog",
    template,
    data = {},
    buttons = [],
    callback = null,
    windowOptions = {},
  } = {}) {
    super();

    this.dialogTitle = title;
    this.templatePath = template;
    this.templateData = data;
    this.dialogButtons = buttons;
    this.dialogCallback = callback;
    this.windowOptions = windowOptions;

    // Apply window options to the instance
    if (windowOptions.width) {
      this.options.position.width = windowOptions.width;
    }
    if (windowOptions.height) {
      this.options.position.height = windowOptions.height;
    }
    if (windowOptions.icon) {
      this.options.window.icon = windowOptions.icon;
    }

    // Set up the template parts
    this.constructor.PARTS = {
      dialog: {
        template: this.templatePath || this._getDefaultTemplate(),
      },
    };

    Logger.debug("EventideDialog created", {
      title: this.dialogTitle,
      template: this.templatePath,
      buttonCount: this.dialogButtons.length,
      windowOptions: this.windowOptions,
    });
  }

  /**
   * Get the localized window title
   * @returns {string} The dialog title
   */
  get title() {
    return this.dialogTitle;
  }

  /**
   * Get the default template if none provided
   * @returns {string} Path to default template
   * @private
   */
  _getDefaultTemplate() {
    return "systems/eventide-rp-system/templates/dialogs/generic-dialog.hbs";
  }

  /**
   * Handle rendering of the dialog application
   * @param {ApplicationRenderContext} context - Prepared context data
   * @param {RenderOptions} options - Provided render options
   * @protected
   */
  _onRender(context, options) {
    super._onRender(context, options);

    // Re-apply themes on re-render (but don't reinitialize)
    if (this.themeManager) {
      this.themeManager.applyThemes();
    }
  }

  /**
   * Handle the first render of the dialog application
   * @override
   * @protected
   */
  _onFirstRender() {
    super._onFirstRender();

    // Initialize theme management only on first render
    if (!this.themeManager) {
      this.themeManager = initThemeManager(
        this,
        THEME_PRESETS.CREATOR_APPLICATION,
      );
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

    await super._preClose(options);
  }

  /**
   * Prepare context data for the dialog template
   * @override
   */
  async _prepareContext(_options) {
    Logger.methodEntry("EventideDialog", "_prepareContext", {
      title: this.dialogTitle,
    });

    const context = {
      // Base dialog properties
      cssClass: this.constructor.DEFAULT_OPTIONS.classes.join(" "),
      title: this.dialogTitle,

      // Template data
      ...this.templateData,

      // Button configuration
      footerButtons: this._prepareButtons(),

      // System properties
      isGM: game.user.isGM,
    };

    Logger.methodExit("EventideDialog", "_prepareContext", context);
    return context;
  }

  /**
   * Prepare button configurations for the footer
   * @returns {Array} Array of button objects
   * @private
   */
  _prepareButtons() {
    const buttons = [];

    // Add only the custom buttons that were passed in
    this.dialogButtons.forEach((button) => {
      buttons.push({
        label: button.label || "Button",
        type: "button",
        cssClass: button.cssClass || "erps-button",
        action: "clickAction", // This is the ApplicationV2 action
        icon: button.icon || null,
        // Store the actual button action and data in data attributes for the template
        buttonAction: button.action || "custom",
        buttonData: JSON.stringify(button.data || {}),
      });
    });

    return buttons;
  }

  /**
   * Handle button clicks and form submissions
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The clicked element
   * @protected
   */
  async _onClickAction(event, target) {
    // Get the actual button action from our custom data attribute
    const action = target.dataset.buttonAction || target.dataset.action;
    const buttonData = target.dataset.buttonData
      ? JSON.parse(target.dataset.buttonData)
      : {};

    Logger.debug("Dialog button clicked", {
      action,
      buttonData,
      title: this.dialogTitle,
      targetDataset: target.dataset,
    });

    // Handle built-in actions
    if (action === "close") {
      this.close();
      return;
    }

    // Handle custom actions through callback
    if (this.dialogCallback && typeof this.dialogCallback === "function") {
      try {
        const result = await this.dialogCallback(action, buttonData, this);

        // Close dialog if callback returns true or if closeOnSubmit is enabled
        if (result === true || this.options.form.closeOnSubmit) {
          this.close();
        }
      } catch (error) {
        Logger.error("Dialog callback error", error);
        ui.notifications.error(
          "An error occurred while processing the dialog action",
        );
      }
    }
  }

  /**
   * Render the dialog frame with proper autocomplete settings
   * @param {Object} options - Render options
   * @returns {Promise<HTMLElement>} The rendered frame
   * @override
   */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
  }

  /**
   * Static method to create and show a dialog
   * @param {Object} config - Dialog configuration
   * @returns {Promise<EventideDialog>} The created dialog instance
   * @static
   */
  static async show(config) {
    const dialog = new EventideDialog(config);
    await dialog.render(true);
    return dialog;
  }

  /**
   * Static method to create a simple confirmation dialog
   * @param {Object} config - Configuration object
   * @param {string} config.title - Dialog title
   * @param {string} config.content - Dialog content/message
   * @param {Function} config.onConfirm - Callback for confirm action
   * @param {Function} config.onCancel - Callback for cancel action
   * @returns {Promise<EventideDialog>} The created dialog instance
   * @static
   */
  static async confirm({
    title = "Confirm",
    content = "Are you sure?",
    onConfirm = null,
    onCancel = null,
  } = {}) {
    const buttons = [
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Confirm"),
        action: "confirm",
        cssClass: "erps-button erps-button--primary",
        icon: "fas fa-check",
      },
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Cancel"),
        action: "cancel",
        cssClass: "erps-button",
        icon: "fas fa-times",
      },
    ];

    const callback = async (action, _data, _dialog) => {
      if (action === "confirm" && onConfirm) {
        await onConfirm();
        return true; // Close dialog
      } else if (action === "cancel" && onCancel) {
        await onCancel();
        return true; // Close dialog
      }
      return true; // Close dialog by default
    };

    return EventideDialog.show({
      title,
      data: { content },
      buttons,
      callback,
    });
  }
}
