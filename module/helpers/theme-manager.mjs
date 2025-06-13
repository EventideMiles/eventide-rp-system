import { Logger } from "../services/_module.mjs";
import { CommonFoundryTasks } from "../utils/_module.mjs";

/**
 * Centralized Theme Management System
 *
 * Handles theme application, change detection, and cleanup for all sheet types.
 * Provides consistent theme management across character sheets, item sheets, and other applications.
 */

/**
 * Theme manager instances for tracking active applications
 * @type {Map<string, ThemeManagerInstance>}
 */
const activeInstances = new Map();

/**
 * Global theme change listeners
 * @type {Set<Function>}
 */
const globalListeners = new Set();

/**
 * Theme manager instance for a specific application
 */
class ThemeManagerInstance {
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

    this.setupChangeListeners();

    if (this.options.autoApply) {
      this.applyThemes();
    }

    if (this.options.verify) {
      this.verifyThemes();
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
    this.applyGlobalTheme(currentTheme);

    // Apply background theme
    this.applyThemeToSelector(
      this.options.backgroundSelector,
      this.options.backgroundAttribute,
      currentTheme,
      "background",
    );

    // Apply tab theme
    this.applyThemeToSelector(
      this.options.tabsSelector,
      this.options.tabAttribute,
      currentTheme,
      "tab",
    );

    // Apply name theme
    this.applyThemeToSelector(
      this.options.nameSelector,
      this.options.nameAttribute,
      currentTheme,
      "name",
    );

    // Apply header theme
    this.applyThemeToSelector(
      this.options.headerSelector,
      this.options.headerAttribute,
      currentTheme,
      "header",
    );

    // Apply data table themes
    this.applyThemeToSelector(
      this.options.dataTablesSelector,
      this.options.tableAttribute,
      currentTheme,
      "table",
    );

    // Apply section header themes
    this.applyThemeToSelector(
      this.options.sectionHeadersSelector,
      this.options.sectionAttribute,
      currentTheme,
      "section",
    );

    // Apply toggle themes
    this.applyThemeToSelector(
      this.options.togglesSelector,
      this.options.toggleAttribute,
      currentTheme,
      "toggle",
    );

    // Apply biography themes
    this.applyThemeToSelector(
      this.options.biographySelector,
      this.options.biographyAttribute,
      currentTheme,
      "biography",
    );

    // Apply input themes
    this.applyThemeToSelector(
      this.options.inputsSelector,
      this.options.inputAttribute,
      currentTheme,
      "input",
    );

    // Apply select themes
    this.applyThemeToSelector(
      this.options.selectsSelector,
      this.options.selectAttribute,
      currentTheme,
      "select",
    );

    // Apply button themes
    this.applyThemeToSelector(
      this.options.buttonsSelector,
      this.options.buttonAttribute,
      currentTheme,
      "button",
    );

    // Apply number input themes
    this.applyThemeToSelector(
      this.options.numberInputsSelector,
      this.options.numberInputAttribute,
      currentTheme,
      "number-input",
    );

    // Apply number button themes
    this.applyThemeToSelector(
      this.options.numberButtonsSelector,
      this.options.numberButtonAttribute,
      currentTheme,
      "number-button",
    );

    // Apply color picker themes
    this.applyThemeToSelector(
      this.options.colorPickersSelector,
      this.options.colorPickerAttribute,
      currentTheme,
      "color-picker",
    );

    // Apply textarea themes
    this.applyThemeToSelector(
      this.options.textareasSelector,
      this.options.textareaAttribute,
      currentTheme,
      "textarea",
    );

    // Apply items panel themes
    this.applyThemeToSelector(
      this.options.itemsPanelsSelector,
      this.options.itemsPanelAttribute,
      currentTheme,
      "items-panel",
    );

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
   * Apply global theme to body element for global UI elements
   * @param {string} theme - The theme to apply
   */
  applyGlobalTheme(theme) {
    if (document.body) {
      const currentBodyTheme = document.body.getAttribute("data-theme");

      // Only update if different to avoid unnecessary DOM manipulation
      if (currentBodyTheme !== theme) {
        document.body.setAttribute("data-theme", theme);

        Logger.debug(
          "Global theme applied to body",
          {
            appId: this.appId,
            previousTheme: currentBodyTheme,
            newTheme: theme,
          },
          "THEME_MANAGER",
        );
      }
    }
  }

  /**
   * Apply theme to elements matching a selector
   * @param {string} selector - CSS selector for target elements
   * @param {string} attribute - Data attribute to set
   * @param {string} theme - Theme value to apply
   * @param {string} type - Type of theme for logging
   */
  applyThemeToSelector(selector, attribute, theme, type) {
    // Skip empty selectors
    if (!selector || selector.trim() === "") {
      Logger.debug(
        `Skipping ${type} theme - empty selector`,
        {
          appId: this.appId,
          selector,
          attribute,
        },
        "THEME_MANAGER",
      );
      return;
    }

    const elements = this.element.querySelectorAll(selector);

    // Also check if the root element matches the selector
    const rootMatches = this.element.matches && this.element.matches(selector);
    const allElements = rootMatches
      ? [this.element, ...elements]
      : [...elements];

    if (allElements.length === 0) {
      Logger.debug(
        `No elements found for ${type} theme`,
        {
          appId: this.appId,
          selector,
          attribute,
        },
        "THEME_MANAGER",
      );
      return;
    }

    let updatedCount = 0;
    allElements.forEach((element, index) => {
      const currentValue = element.getAttribute(attribute);

      // Only update if different to avoid unnecessary DOM manipulation
      if (currentValue !== theme) {
        element.setAttribute(attribute, theme);
        updatedCount++;

        Logger.debug(
          `${type} theme applied`,
          {
            appId: this.appId,
            elementIndex: index,
            previousTheme: currentValue,
            newTheme: theme,
            attribute,
          },
          "THEME_MANAGER",
        );
      }
    });

    if (updatedCount > 0) {
      Logger.debug(
        `Updated ${updatedCount} ${type} theme elements`,
        {
          appId: this.appId,
          totalElements: allElements.length,
          theme,
        },
        "THEME_MANAGER",
      );
    }
  }

  /**
   * Verify themes are properly applied (logging only, no corrections)
   */
  verifyThemes() {
    if (!this.element) return;

    const currentTheme = CommonFoundryTasks.retrieveSheetTheme();
    const verificationResults = {
      background: this.verifyThemeOnSelector(
        this.options.backgroundSelector,
        this.options.backgroundAttribute,
        currentTheme,
      ),
      tabs: this.verifyThemeOnSelector(
        this.options.tabsSelector,
        this.options.tabAttribute,
        currentTheme,
      ),
      name: this.verifyThemeOnSelector(
        this.options.nameSelector,
        this.options.nameAttribute,
        currentTheme,
      ),
      header: this.verifyThemeOnSelector(
        this.options.headerSelector,
        this.options.headerAttribute,
        currentTheme,
      ),
      dataTables: this.verifyThemeOnSelector(
        this.options.dataTablesSelector,
        this.options.tableAttribute,
        currentTheme,
      ),
      sectionHeaders: this.verifyThemeOnSelector(
        this.options.sectionHeadersSelector,
        this.options.sectionAttribute,
        currentTheme,
      ),
      toggles: this.verifyThemeOnSelector(
        this.options.togglesSelector,
        this.options.toggleAttribute,
        currentTheme,
      ),
      biography: this.verifyThemeOnSelector(
        this.options.biographySelector,
        this.options.biographyAttribute,
        currentTheme,
      ),
      inputs: this.verifyThemeOnSelector(
        this.options.inputsSelector,
        this.options.inputAttribute,
        currentTheme,
      ),
      selects: this.verifyThemeOnSelector(
        this.options.selectsSelector,
        this.options.selectAttribute,
        currentTheme,
      ),
      buttons: this.verifyThemeOnSelector(
        this.options.buttonsSelector,
        this.options.buttonAttribute,
        currentTheme,
      ),
      numberInputs: this.verifyThemeOnSelector(
        this.options.numberInputsSelector,
        this.options.numberInputAttribute,
        currentTheme,
      ),
      numberButtons: this.verifyThemeOnSelector(
        this.options.numberButtonsSelector,
        this.options.numberButtonAttribute,
        currentTheme,
      ),
      colorPickers: this.verifyThemeOnSelector(
        this.options.colorPickersSelector,
        this.options.colorPickerAttribute,
        currentTheme,
      ),
      textareas: this.verifyThemeOnSelector(
        this.options.textareasSelector,
        this.options.textareaAttribute,
        currentTheme,
      ),
      itemsPanels: this.verifyThemeOnSelector(
        this.options.itemsPanelsSelector,
        this.options.itemsPanelAttribute,
        currentTheme,
      ),
    };

    const mismatches = Object.entries(verificationResults)
      .filter(([_, result]) => result.mismatches > 0)
      .map(([type, result]) => ({ type, ...result }));

    if (mismatches.length > 0) {
      Logger.warn(
        "Theme verification found mismatches",
        {
          appId: this.appId,
          appType: this.appType,
          expectedTheme: currentTheme,
          mismatches,
        },
        "THEME_MANAGER",
      );
    } else {
      Logger.debug(
        "Theme verification passed",
        {
          appId: this.appId,
          appType: this.appType,
          theme: currentTheme,
          verificationResults,
        },
        "THEME_MANAGER",
      );
    }
  }

  /**
   * Verify theme on elements matching a selector
   * @param {string} selector - CSS selector for target elements
   * @param {string} attribute - Data attribute to check
   * @param {string} expectedTheme - Expected theme value
   * @returns {Object} Verification results
   */
  verifyThemeOnSelector(selector, attribute, expectedTheme) {
    // Skip empty selectors
    if (!selector || selector.trim() === "") {
      return {
        totalElements: 0,
        mismatches: 0,
        details: [],
      };
    }

    const elements = this.element.querySelectorAll(selector);
    const rootMatches = this.element.matches && this.element.matches(selector);
    const allElements = rootMatches
      ? [this.element, ...elements]
      : [...elements];

    let mismatches = 0;
    const details = [];

    allElements.forEach((element, index) => {
      const actualTheme = element.getAttribute(attribute);
      if (actualTheme !== expectedTheme) {
        mismatches++;
        details.push({
          elementIndex: index,
          expected: expectedTheme,
          actual: actualTheme,
          selector,
          attribute,
        });
      }
    });

    return {
      totalElements: allElements.length,
      mismatches,
      details,
    };
  }

  /**
   * Set up theme change listeners
   */
  setupChangeListeners() {
    if (this.hookId || this.domEventHandler) {
      Logger.debug(
        "Theme change listeners already set up",
        {
          appId: this.appId,
          appType: this.appType,
        },
        "THEME_MANAGER",
      );
      return;
    }

    // Hook listener for theme changes
    this.hookId = Hooks.on("eventide-rp-system.themeChanged", (data) => {
      Logger.debug(
        "Theme change hook received",
        {
          appId: this.appId,
          appType: this.appType,
          newTheme: data.newTheme,
          userId: data.userId,
        },
        "THEME_MANAGER",
      );

      this.handleThemeChange(data.newTheme);
    });

    // DOM event listener for theme changes
    this.domEventHandler = (event) => {
      Logger.debug(
        "Theme change DOM event received",
        {
          appId: this.appId,
          appType: this.appType,
          newTheme: event.detail.newTheme,
          userId: event.detail.userId,
        },
        "THEME_MANAGER",
      );

      this.handleThemeChange(event.detail.newTheme);
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
   * Handle theme change events and ensure proper propagation
   * This method is called when a theme change is detected and ensures that:
   * 1. The new theme is immediately applied to the current application
   * 2. The application is fully re-rendered to ensure all theme changes are visible
   * 3. Appropriate notifications are shown if enabled
   *
   * @param {string} newTheme - The new theme to apply
   * @private
   */
  handleThemeChange(newTheme) {
    // Apply themes immediately
    this.applyThemes();

    // Trigger application re-render if available
    if (this.application && typeof this.application.render === "function") {
      try {
        // Force a full re-render to ensure all theme changes are applied
        this.application.render(true);

        Logger.debug(
          "Application re-rendered for theme change",
          {
            appId: this.appId,
            appType: this.appType,
            newTheme,
          },
          "THEME_MANAGER",
        );
      } catch (error) {
        Logger.warn(
          "Failed to re-render application for theme change",
          {
            appId: this.appId,
            appType: this.appType,
            error: error.message,
          },
          "THEME_MANAGER",
        );
      }
    }

    // Show notification if enabled
    if (this.options.showNotifications) {
      const themeNames = {
        blue: "Night",
        black: "Midnight",
        green: "Dawn",
        light: "Noon",
        gold: "Twilight",
        purple: "Dusk",
      };

      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Info.SheetThemeChanged", {
          userName: game.user.name,
          themeName: themeNames[newTheme] || newTheme,
        }),
      );
    }
  }

  /**
   * Clean up theme change listeners and remove from active instances
   */
  cleanup() {
    // Remove hook listener
    if (this.hookId) {
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
      "Theme manager cleaned up",
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
 * Initialize theme management for an application
 * @param {Application} application - The Foundry application instance
 * @param {Object} options - Configuration options
 * @returns {ThemeManagerInstance} The theme manager instance
 */
export const initThemeManager = (application, options = {}) => {
  if (!application || !application.element) {
    Logger.warn(
      "Invalid application provided to theme manager",
      {
        application: !!application,
        element: !!application?.element,
      },
      "THEME_MANAGER",
    );
    return null;
  }

  // Check if already initialized
  const existingInstance = activeInstances.get(application.id);
  if (existingInstance) {
    Logger.debug(
      "Theme manager already exists for application",
      {
        appId: application.id,
        appType: application.constructor.name,
      },
      "THEME_MANAGER",
    );
    return existingInstance;
  }

  const instance = new ThemeManagerInstance(application, options);
  instance.initialize();

  return instance;
};

/**
 * Clean up theme management for an application
 * @param {Application|string} applicationOrId - The application instance or ID
 */
export const cleanupThemeManager = (applicationOrId) => {
  const appId =
    typeof applicationOrId === "string" ? applicationOrId : applicationOrId?.id;

  if (!appId) {
    Logger.warn(
      "No application ID provided for theme manager cleanup",
      {
        applicationOrId,
      },
      "THEME_MANAGER",
    );
    return;
  }

  const instance = activeInstances.get(appId);
  if (instance) {
    instance.cleanup();
  } else {
    Logger.debug(
      "No theme manager instance found for cleanup",
      { appId },
      "THEME_MANAGER",
    );
  }
};

/**
 * Clean up all theme manager instances and global resources
 * This should be called when the system is being disabled or reloaded
 */
export const cleanupGlobalThemeManager = () => {
  // Safe logging function that works before Logger is initialized
  function safeLog(level, message, data = null) {
    try {
      // Try to use Logger if available and settings are registered
      if (typeof Logger !== "undefined" && game?.settings?.get) {
        Logger[level](message, data || {}, "THEME_MANAGER");
      } else {
        // Fall back to console logging
        const logMessage = `ERPS | THEME_MANAGER | ${message}`;
        if (data) {
          console[level](logMessage, data);
        } else {
          console[level](logMessage);
        }
      }
    } catch {
      // If all else fails, use basic console logging
      console.info(`ERPS | THEME_MANAGER | ${message}`, data || "");
    }
  }

  safeLog("info", "Cleaning up global theme manager resources");

  try {
    // Clean up all active instances
    const instanceCount = activeInstances.size;
    for (const [appId, instance] of activeInstances.entries()) {
      try {
        instance.cleanup();
      } catch (error) {
        safeLog(
          "warn",
          `Failed to cleanup theme manager instance ${appId}`,
          error,
        );
      }
    }

    // Clear the active instances map
    activeInstances.clear();

    // Clear global listeners
    globalListeners.clear();

    safeLog(
      "info",
      `Global theme manager cleanup completed - cleaned up ${instanceCount} instances`,
      { instanceCount },
    );
  } catch (error) {
    safeLog("error", "Failed to cleanup global theme manager", error);
  }
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
 * Add a global theme change listener
 * @param {Function} listener - Function to call when theme changes
 */
export const addGlobalThemeListener = (listener) => {
  globalListeners.add(listener);

  Logger.debug(
    "Global theme listener added",
    {
      listenerCount: globalListeners.size,
    },
    "THEME_MANAGER",
  );
};

/**
 * Remove a global theme change listener
 * @param {Function} listener - Function to remove
 */
export const removeGlobalThemeListener = (listener) => {
  globalListeners.delete(listener);

  Logger.debug(
    "Global theme listener removed",
    {
      listenerCount: globalListeners.size,
    },
    "THEME_MANAGER",
  );
};

/**
 * Trigger global theme change (for use by theme switching functions)
 * @param {string} newTheme - The new theme
 * @param {string} userId - The user who changed the theme
 */
export const triggerGlobalThemeChange = (newTheme, userId = game.user.id) => {
  const data = { newTheme, userId };

  // Apply global theme to body element immediately
  applyGlobalThemeStatic(newTheme);

  // Trigger Foundry hook
  Hooks.callAll("eventide-rp-system.themeChanged", data);

  // Trigger DOM event
  const event = new CustomEvent("eventide-theme-change", { detail: data });
  document.dispatchEvent(event);

  // Call global listeners
  for (const listener of globalListeners) {
    try {
      listener(data);
    } catch (error) {
      Logger.warn(
        "Global theme listener error",
        {
          error: error.message,
        },
        "THEME_MANAGER",
      );
    }
  }

  Logger.info(
    "Global theme change triggered",
    {
      newTheme,
      userId,
      activeInstances: activeInstances.size,
      globalListeners: globalListeners.size,
    },
    "THEME_MANAGER",
  );
};

/**
 * Apply global theme to body element (static version for global use)
 * @param {string} theme - The theme to apply
 */
const applyGlobalThemeStatic = (theme) => {
  if (document.body) {
    const currentBodyTheme = document.body.getAttribute("data-theme");

    // Only update if different to avoid unnecessary DOM manipulation
    if (currentBodyTheme !== theme) {
      document.body.setAttribute("data-theme", theme);

      Logger.debug(
        "Global theme applied to body (static)",
        {
          previousTheme: currentBodyTheme,
          newTheme: theme,
        },
        "THEME_MANAGER",
      );
    }
  }
};

/**
 * Initialize global theme on system startup
 */
export const initializeGlobalTheme = () => {
  const currentTheme = CommonFoundryTasks.retrieveSheetTheme();
  applyGlobalThemeStatic(currentTheme);

  Logger.info(
    "Global theme initialized",
    {
      theme: currentTheme,
    },
    "THEME_MANAGER",
  );
};

/**
 * Preset configurations for different sheet types
 */
export const THEME_PRESETS = {
  CHARACTER_SHEET: {
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
    autoApply: true,
    verify: true,
    showNotifications: false,
  },

  ITEM_SHEET: {
    backgroundSelector: ".eventide-sheet",
    tabsSelector: ".tabs .item",
    nameSelector: ".document-name input",
    headerSelector: ".eventide-sheet__header",
    dataTablesSelector: ".erps-data-table, .erps-item-effects__grid",
    sectionHeadersSelector: ".erps-item-effects__section-header",
    togglesSelector: ".erps-toggles",
    biographySelector: ".biography-content",
    inputsSelector: ".erps-input",
    selectsSelector: ".erps-select",
    buttonsSelector: ".erps-button",
    numberInputsSelector: ".erps-number-input__input",
    numberButtonsSelector: ".erps-number-input__button",
    colorPickersSelector: ".erps-color-picker, .color-picker-with-hex",
    textareasSelector: ".erps-textarea",
    itemsPanelsSelector: ".erps-items-panel",
    autoApply: true,
    verify: true,
    showNotifications: false,
  },

  CREATOR_APPLICATION: {
    backgroundSelector: ".eventide-sheet",
    tabsSelector: "",
    nameSelector: '.erps-input[name="name"]',
    headerSelector: ".erps-form__header",
    dataTablesSelector: ".erps-data-table",
    sectionHeadersSelector: ".erps-form__header",
    togglesSelector: ".erps-toggles",
    biographySelector: '.erps-textarea[name="description"]',
    inputsSelector: ".erps-input",
    selectsSelector: ".erps-select",
    buttonsSelector: ".erps-button",
    numberInputsSelector: ".erps-number-input__input",
    numberButtonsSelector: ".erps-number-input__button",
    colorPickersSelector: ".erps-color-picker, .color-picker-with-hex",
    textareasSelector: ".erps-textarea",
    itemsPanelsSelector: ".erps-items-panel",
    footerSelector: ".erps-form__footer",
    autoApply: true,
    verify: true,
    showNotifications: false,
  },

  MINIMAL: {
    backgroundSelector: "",
    tabsSelector: "",
    nameSelector: "",
    headerSelector: "",
    dataTablesSelector: "",
    sectionHeadersSelector: "",
    inputsSelector: "",
    selectsSelector: "",
    buttonsSelector: "",
    numberInputsSelector: "",
    numberButtonsSelector: "",
    colorPickersSelector: "",
    textareasSelector: "",
    itemsPanelsSelector: "",
    autoApply: false,
    verify: false,
    showNotifications: false,
  },
};
