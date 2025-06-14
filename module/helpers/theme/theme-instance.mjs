import { Logger } from "../../services/_module.mjs";
import { CommonFoundryTasks } from "../../utils/_module.mjs";
import {
  applyGlobalTheme,
  applyThemeToSelector,
  applyThemeImmediate,
} from "./theme-applicator.mjs";

/**
 * Theme manager instances for tracking active applications
 * @type {Map<string, ThemeManagerInstance>}
 */
const activeInstances = new Map();

/**
 * Theme manager instance for a specific application
 */
export class ThemeManagerInstance {
  constructor(application, options = {}) {
    this.application = application;
    this.element = application.element;
    this.appId = application.id;
    this.appType = application.constructor.name;
    this.options = {
      // Default selectors for different theme targets
      backgroundSelector: ".eventide-sheet",
      tabsSelector: ".tabs",
      nameSelector: ".document-name",
      headerSelector: ".eventide-sheet__header",
      dataTablesSelector: ".erps-data-table",
      sectionHeadersSelector: ".eventide-sheet-data-section__header",
      togglesSelector: ".erps-toggles",
      biographySelector: ".biography-content, [data-biography-theme]",
      inputsSelector: ".erps-input",
      selectsSelector: ".erps-select",
      buttonsSelector: ".erps-button",
      numberInputsSelector: ".erps-number-input__input",
      numberButtonsSelector: ".erps-number-input__button",
      colorPickersSelector: ".erps-color-picker, .color-picker-with-hex",
      textareasSelector: ".erps-textarea",
      itemsPanelsSelector: ".erps-items-panel",
      // Custom theme attributes
      backgroundAttribute: "data-bg-theme",
      tabAttribute: "data-tab-theme",
      nameAttribute: "data-name-theme",
      headerAttribute: "data-header-theme",
      tableAttribute: "data-table-theme",
      sectionAttribute: "data-section-theme",
      toggleAttribute: "data-toggle-theme",
      biographyAttribute: "data-biography-theme",
      inputAttribute: "data-input-theme",
      selectAttribute: "data-select-theme",
      buttonAttribute: "data-button-theme",
      numberInputAttribute: "data-input-theme",
      numberButtonAttribute: "data-button-theme",
      colorPickerAttribute: "data-color-theme",
      textareaAttribute: "data-textarea-theme",
      itemsPanelAttribute: "data-items-theme",
      // Whether to auto-apply themes on render
      autoApply: true,
      // Whether to verify theme application
      verify: true,
      // Whether to show notifications for theme changes
      showNotifications: false,
      ...options,
    };

    this.hookId = null;
    this.domEventHandler = null;
    this.isSetup = false;

    Logger.debug(
      "Theme manager instance created",
      {
        appId: this.appId,
        appType: this.appType,
        options: this.options,
      },
      "THEME_MANAGER",
    );
  }

  /**
   * Initialize theme management for this application
   */
  initialize() {
    if (this.isSetup) {
      Logger.debug(
        "Theme manager already initialized",
        {
          appId: this.appId,
          appType: this.appType,
        },
        "THEME_MANAGER",
      );
      return;
    }

    // Apply theme immediately to prevent flashing - this is fast and synchronous
    if (this.element) {
      applyThemeImmediate(this.element);
    }

    // Check if theme is already applied before setting up listeners
    const currentTheme = CommonFoundryTasks.retrieveSheetTheme();
    const bodyTheme = document.body.getAttribute("data-current-theme");

    // Only apply themes if they're not already set
    if (!bodyTheme || bodyTheme !== currentTheme) {
      this.setupChangeListeners();

      if (this.options.autoApply) {
        this.applyThemes();
      }

      if (this.options.verify) {
        this.verifyThemes();
      }
    }

    this.isSetup = true;
    activeInstances.set(this.appId, this);

    Logger.debug(
      "Theme manager initialized",
      {
        appId: this.appId,
        appType: this.appType,
        activeInstancesCount: activeInstances.size,
      },
      "THEME_MANAGER",
    );
  }

  /**
   * Apply themes immediately to prevent flashing during re-renders
   */
  applyThemes() {
    if (!this.element) {
      Logger.warn(
        "No element available for theme application",
        {
          appId: this.appId,
          appType: this.appType,
        },
        "THEME_MANAGER",
      );
      return;
    }

    const currentTheme = CommonFoundryTasks.retrieveSheetTheme();

    // Apply global theme to body element for global scrollbars and UI elements
    applyGlobalTheme(currentTheme, this.appId);

    // Apply all theme selectors
    const themeSelectors = [
      {
        selector: this.options.backgroundSelector,
        attribute: this.options.backgroundAttribute,
        type: "background",
      },
      {
        selector: this.options.tabsSelector,
        attribute: this.options.tabAttribute,
        type: "tab",
      },
      {
        selector: this.options.nameSelector,
        attribute: this.options.nameAttribute,
        type: "name",
      },
      {
        selector: this.options.headerSelector,
        attribute: this.options.headerAttribute,
        type: "header",
      },
      {
        selector: this.options.dataTablesSelector,
        attribute: this.options.tableAttribute,
        type: "table",
      },
      {
        selector: this.options.sectionHeadersSelector,
        attribute: this.options.sectionAttribute,
        type: "section",
      },
      {
        selector: this.options.togglesSelector,
        attribute: this.options.toggleAttribute,
        type: "toggle",
      },
      {
        selector: this.options.biographySelector,
        attribute: this.options.biographyAttribute,
        type: "biography",
      },
      {
        selector: this.options.inputsSelector,
        attribute: this.options.inputAttribute,
        type: "input",
      },
      {
        selector: this.options.selectsSelector,
        attribute: this.options.selectAttribute,
        type: "select",
      },
      {
        selector: this.options.buttonsSelector,
        attribute: this.options.buttonAttribute,
        type: "button",
      },
      {
        selector: this.options.numberInputsSelector,
        attribute: this.options.numberInputAttribute,
        type: "number-input",
      },
      {
        selector: this.options.numberButtonsSelector,
        attribute: this.options.numberButtonAttribute,
        type: "number-button",
      },
      {
        selector: this.options.colorPickersSelector,
        attribute: this.options.colorPickerAttribute,
        type: "color-picker",
      },
      {
        selector: this.options.textareasSelector,
        attribute: this.options.textareaAttribute,
        type: "textarea",
      },
      {
        selector: this.options.itemsPanelsSelector,
        attribute: this.options.itemsPanelAttribute,
        type: "items-panel",
      },
    ];

    themeSelectors.forEach(({ selector, attribute, type }) => {
      applyThemeToSelector(
        this.element,
        selector,
        attribute,
        currentTheme,
        type,
        this.appId,
      );
    });

    Logger.debug(
      "Themes applied",
      {
        appId: this.appId,
        appType: this.appType,
        theme: currentTheme,
      },
      "THEME_MANAGER",
    );
  }

  /**
   * Set up theme change listeners
   */
  setupChangeListeners() {
    // Set up Foundry hook listener
    this.hookId = Hooks.on("eventide-rp-system.themeChanged", (data) => {
      this.handleThemeChange(data);
    });

    // Set up DOM event listener
    this.domEventHandler = (event) => {
      this.handleThemeChange(event.detail);
    };
    document.addEventListener("eventide-theme-change", this.domEventHandler);

    Logger.debug(
      "Theme change listeners set up",
      {
        appId: this.appId,
        appType: this.appType,
        hookId: this.hookId,
      },
      "THEME_MANAGER",
    );
  }

  /**
   * Handle theme change events
   * @param {Object} data - Theme change data
   */
  handleThemeChange(data) {
    if (this.options.autoApply) {
      this.applyThemes();
    }

    if (this.options.verify) {
      this.verifyThemes();
    }

    if (this.options.showNotifications) {
      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Notifications.ThemeChanged", {
          theme: data.newTheme,
        }),
      );
    }

    Logger.debug(
      "Theme change handled",
      {
        appId: this.appId,
        appType: this.appType,
        newTheme: data.newTheme,
      },
      "THEME_MANAGER",
    );
  }

  /**
   * Verify that themes have been applied correctly
   */
  verifyThemes() {
    if (!this.element) return;

    const currentTheme = CommonFoundryTasks.retrieveSheetTheme();
    const backgroundElements = this.element.querySelectorAll(
      this.options.backgroundSelector,
    );

    let verificationPassed = true;
    backgroundElements.forEach((element, index) => {
      const appliedTheme = element.getAttribute(
        this.options.backgroundAttribute,
      );
      if (appliedTheme !== currentTheme) {
        verificationPassed = false;
        Logger.warn(
          "Theme verification failed",
          {
            appId: this.appId,
            elementIndex: index,
            expectedTheme: currentTheme,
            appliedTheme,
          },
          "THEME_MANAGER",
        );
      }
    });

    if (verificationPassed) {
      Logger.debug(
        "Theme verification passed",
        {
          appId: this.appId,
          theme: currentTheme,
          elementsChecked: backgroundElements.length,
        },
        "THEME_MANAGER",
      );
    }
  }

  /**
   * Clean up theme manager resources
   */
  cleanup() {
    // Remove hook listener
    if (this.hookId !== null) {
      Hooks.off("eventide-rp-system.themeChanged", this.hookId);
      this.hookId = null;
    }

    // Remove DOM event listener
    if (this.domEventHandler) {
      document.removeEventListener(
        "eventide-theme-change",
        this.domEventHandler,
      );
      this.domEventHandler = null;
    }

    // Remove from active instances
    activeInstances.delete(this.appId);

    this.isSetup = false;

    Logger.debug(
      "Theme manager instance cleaned up",
      {
        appId: this.appId,
        appType: this.appType,
        remainingInstances: activeInstances.size,
      },
      "THEME_MANAGER",
    );
  }
}

/**
 * Get theme manager instance for an application
 * @param {Application|string} applicationOrId - The application instance or ID
 * @returns {ThemeManagerInstance|null} The theme manager instance or null if not found
 */
export const getThemeManager = (applicationOrId) => {
  const appId =
    typeof applicationOrId === "string" ? applicationOrId : applicationOrId?.id;
  return activeInstances.get(appId) || null;
};

/**
 * Get all active theme manager instances
 * @returns {Map<string, ThemeManagerInstance>} Map of app IDs to theme manager instances
 */
export const getAllThemeManagers = () => {
  return new Map(activeInstances);
};

/**
 * Get the count of active theme instances for diagnostics
 * @returns {number} Number of active theme manager instances
 */
export const getActiveThemeInstances = () => {
  return activeInstances.size;
};

/**
 * Apply themes to all active instances
 */
export const applyThemesToAll = () => {
  Logger.debug(
    "Applying themes to all active instances",
    {
      instanceCount: activeInstances.size,
    },
    "THEME_MANAGER",
  );

  for (const instance of activeInstances.values()) {
    try {
      instance.applyThemes();
    } catch (error) {
      Logger.warn(
        "Failed to apply themes to instance",
        {
          appId: instance.appId,
          appType: instance.appType,
          error: error.message,
        },
        "THEME_MANAGER",
      );
    }
  }
};

/**
 * Clean up all theme manager instances
 */
export const cleanupAllInstances = () => {
  Logger.debug(
    "Cleaning up all theme manager instances",
    {
      instanceCount: activeInstances.size,
    },
    "THEME_MANAGER",
  );

  const instanceCount = activeInstances.size;
  for (const [appId, instance] of activeInstances.entries()) {
    try {
      instance.cleanup();
    } catch (error) {
      Logger.warn(
        `Failed to cleanup theme manager instance ${appId}`,
        error,
        "THEME_MANAGER",
      );
    }
  }

  activeInstances.clear();

  Logger.debug(
    `All theme manager instances cleaned up - cleaned up ${instanceCount} instances`,
    { instanceCount },
    "THEME_MANAGER",
  );
};
