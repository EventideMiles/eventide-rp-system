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
      backgroundSelector: '.eventide-sheet',
      tabsSelector: '.tabs',
      nameSelector: '.document-name',
      headerSelector: '.eventide-sheet__header',
      dataTablesSelector: '.erps-data-table',
      sectionHeadersSelector: '.eventide-sheet-data-section__header',
      togglesSelector: '.erps-toggles',
      biographySelector: '.biography-content, [data-biography-theme]',
      inputsSelector: '.erps-input',
      selectsSelector: '.erps-select',
      buttonsSelector: '.erps-button',
      numberInputsSelector: '.erps-number-input__input',
      numberButtonsSelector: '.erps-number-input__button',
      // Custom theme attributes
      backgroundAttribute: 'data-bg-theme',
      tabAttribute: 'data-tab-theme',
      nameAttribute: 'data-name-theme',
      headerAttribute: 'data-header-theme',
      tableAttribute: 'data-table-theme',
      sectionAttribute: 'data-section-theme',
      toggleAttribute: 'data-toggle-theme',
      biographyAttribute: 'data-biography-theme',
      inputAttribute: 'data-input-theme',
      selectAttribute: 'data-select-theme',
      buttonAttribute: 'data-button-theme',
      numberInputAttribute: 'data-input-theme',
      numberButtonAttribute: 'data-button-theme',
      // Whether to auto-apply themes on render
      autoApply: true,
      // Whether to verify theme application
      verify: true,
      // Whether to show notifications for theme changes
      showNotifications: false,
      ...options
    };

    this.hookId = null;
    this.domEventHandler = null;
    this.isSetup = false;

    Logger.debug("Theme manager instance created", {
      appId: this.appId,
      appType: this.appType,
      options: this.options
    }, "THEME_MANAGER");
  }

  /**
   * Initialize theme management for this application
   */
  initialize() {
    if (this.isSetup) {
      Logger.debug("Theme manager already initialized", {
        appId: this.appId,
        appType: this.appType
      }, "THEME_MANAGER");
      return;
    }

    // Set theme properties immediately to prevent flashing
    const currentTheme = CommonFoundryTasks.retrieveSheetTheme();
    this.setThemeProperties(currentTheme);

    this.setupChangeListeners();

    if (this.options.autoApply) {
      this.applyThemes();
    }

    if (this.options.verify) {
      this.verifyThemes();
    }

    this.isSetup = true;
    activeInstances.set(this.appId, this);

    Logger.debug("Theme manager initialized", {
      appId: this.appId,
      appType: this.appType,
      activeInstancesCount: activeInstances.size,
      themePropertiesSet: true
    }, "THEME_MANAGER");
  }

  /**
   * Apply themes immediately to prevent flashing during re-renders
   */
  applyThemes() {
    if (!this.element) {
      Logger.warn("No element available for theme application", {
        appId: this.appId,
        appType: this.appType
      }, "THEME_MANAGER");
      return;
    }

    const currentTheme = CommonFoundryTasks.retrieveSheetTheme();

    // Set CSS custom properties on the sheet container for theme inheritance
    this.setThemeProperties(currentTheme);

    // Apply background theme
    this.applyThemeToSelector(
      this.options.backgroundSelector,
      this.options.backgroundAttribute,
      currentTheme,
      'background'
    );

    // Apply tab theme
    this.applyThemeToSelector(
      this.options.tabsSelector,
      this.options.tabAttribute,
      currentTheme,
      'tab'
    );

    // Apply name theme
    this.applyThemeToSelector(
      this.options.nameSelector,
      this.options.nameAttribute,
      currentTheme,
      'name'
    );

    // Apply header theme
    this.applyThemeToSelector(
      this.options.headerSelector,
      this.options.headerAttribute,
      currentTheme,
      'header'
    );

    // Apply data table themes
    this.applyThemeToSelector(
      this.options.dataTablesSelector,
      this.options.tableAttribute,
      currentTheme,
      'table'
    );

    // Apply section header themes
    this.applyThemeToSelector(
      this.options.sectionHeadersSelector,
      this.options.sectionAttribute,
      currentTheme,
      'section'
    );

    // Apply toggle themes
    this.applyThemeToSelector(
      this.options.togglesSelector,
      this.options.toggleAttribute,
      currentTheme,
      'toggle'
    );

    // Apply biography themes
    this.applyThemeToSelector(
      this.options.biographySelector,
      this.options.biographyAttribute,
      currentTheme,
      'biography'
    );

    // Apply input themes
    this.applyThemeToSelector(
      this.options.inputsSelector,
      this.options.inputAttribute,
      currentTheme,
      'input'
    );

    // Apply select themes
    this.applyThemeToSelector(
      this.options.selectsSelector,
      this.options.selectAttribute,
      currentTheme,
      'select'
    );

    // Apply button themes
    this.applyThemeToSelector(
      this.options.buttonsSelector,
      this.options.buttonAttribute,
      currentTheme,
      'button'
    );

    // Apply number input themes
    this.applyThemeToSelector(
      this.options.numberInputsSelector,
      this.options.numberInputAttribute,
      currentTheme,
      'number-input'
    );

    // Apply number button themes
    this.applyThemeToSelector(
      this.options.numberButtonsSelector,
      this.options.numberButtonAttribute,
      currentTheme,
      'number-button'
    );

    Logger.debug("Themes applied", {
      appId: this.appId,
      appType: this.appType,
      theme: currentTheme
    }, "THEME_MANAGER");
  }

  /**
   * Set CSS custom properties on the sheet container for theme inheritance
   * This allows ERPS elements to inherit the current theme and maintain it during re-renders
   * @param {string} theme - The current theme name
   */
  setThemeProperties(theme) {
    // Theme color mappings using the actual values from themes.scss
    // These values match the theme maps generated in themes.scss
    const themeColors = {
      blue: {
        primary: 'rgba(30, 58, 138, 0.9)',      // blue-dark with 90% opacity
        secondary: 'rgba(59, 130, 246, 0.8)',   // blue with 80% opacity
        tertiary: 'rgba(59, 130, 246, 0.8)',    // blue with 80% opacity
        accent: 'rgba(30, 58, 138, 0.95)',      // blue-dark with 95% opacity
        light: 'rgba(59, 130, 246, 0.7)',       // blue with 70% opacity
        glow: 'rgba(59, 130, 246, 0.6)',        // blue with 60% opacity
        text: '#fff',
        bright: 'rgba(59, 130, 246, 1)'         // blue at full opacity
      },
      black: {
        primary: 'rgba(80, 80, 80, 0.9)',       // gray-dark with 90% opacity
        secondary: 'rgba(100, 100, 100, 0.8)',  // gray with 80% opacity
        tertiary: 'rgba(227, 227, 227, 0.8)',   // tertiary color with 80% opacity
        accent: 'rgba(80, 80, 80, 0.95)',       // gray-dark with 95% opacity
        light: 'rgba(160, 160, 160, 0.7)',      // gray-light with 70% opacity
        glow: 'rgba(160, 160, 160, 0.6)',       // gray-light with 60% opacity
        text: '#fff',
        bright: 'rgba(160, 160, 160, 1)'        // gray-light at full opacity
      },
      green: {
        primary: 'rgba(21, 128, 61, 0.9)',      // green-dark with 90% opacity
        secondary: 'rgba(34, 197, 94, 0.8)',    // green with 80% opacity
        tertiary: 'rgba(0, 177, 0, 0.8)',       // tertiary green with 80% opacity
        accent: 'rgba(21, 128, 61, 0.95)',      // green-dark with 95% opacity
        light: 'rgba(34, 197, 94, 0.7)',        // green with 70% opacity
        glow: 'rgba(34, 197, 94, 0.6)',         // green with 60% opacity
        text: '#fff',
        bright: 'rgba(34, 197, 94, 1)'          // green at full opacity
      },
      light: {
        primary: 'rgba(160, 160, 160, 0.9)',    // gray-light with 90% opacity (modified for light theme)
        secondary: 'rgba(160, 160, 160, 0.8)',  // gray-light with 80% opacity (modified for light theme)
        tertiary: 'rgba(36, 35, 35, 0.8)',      // tertiary color with 80% opacity
        accent: 'rgba(160, 160, 160, 0.95)',    // gray-light with 95% opacity (modified for light theme)
        light: 'rgba(100, 100, 100, 0.7)',      // gray with 70% opacity (modified for light theme)
        glow: 'rgba(100, 100, 100, 0.6)',       // gray with 60% opacity (modified for light theme)
        text: '#1e293b',
        bright: 'rgba(255, 255, 255, 1)'        // white at full opacity
      },
      gold: {
        primary: 'rgba(180, 83, 9, 0.9)',       // orange-dark with 90% opacity
        secondary: 'rgba(217, 119, 6, 0.8)',    // orange with 80% opacity
        tertiary: 'rgba(255, 215, 0, 0.8)',     // gold tertiary with 80% opacity
        accent: 'rgba(180, 83, 9, 0.95)',       // orange-dark with 95% opacity
        light: 'rgba(217, 119, 6, 0.7)',        // orange with 70% opacity
        glow: 'rgba(217, 119, 6, 0.6)',         // orange with 60% opacity
        text: '#fff',
        bright: 'rgba(255, 215, 0, 1)'          // gold at full opacity
      },
      purple: {
        primary: 'rgba(147, 51, 234, 0.9)',     // purple-theme with 90% opacity
        secondary: 'rgba(147, 51, 234, 0.8)',   // purple-theme with 80% opacity
        tertiary: 'rgba(211, 4, 180, 0.8)',     // tertiary purple with 80% opacity
        accent: 'rgba(75, 0, 130, 0.95)',       // purple-dark with 95% opacity
        light: 'rgba(147, 51, 234, 0.7)',       // purple-theme with 70% opacity
        glow: 'rgba(147, 51, 234, 0.6)',        // purple-theme with 60% opacity
        text: '#fff',
        bright: 'rgba(211, 4, 180, 1)'          // tertiary purple at full opacity
      }
    };

    const colors = themeColors[theme] || themeColors.blue;
    const container = this.element;

    if (container) {
      // Set CSS custom properties that cascade to all child elements
      container.style.setProperty('--theme-primary', colors.primary);
      container.style.setProperty('--theme-secondary', colors.secondary);
      container.style.setProperty('--theme-tertiary', colors.tertiary);
      container.style.setProperty('--theme-accent', colors.accent);
      container.style.setProperty('--theme-light', colors.light);
      container.style.setProperty('--theme-glow', colors.glow);
      container.style.setProperty('--theme-text', colors.text);
      container.style.setProperty('--theme-bright', colors.bright);

      Logger.debug(`Set theme properties for ${theme}`, {
        appId: this.appId,
        theme,
        colors,
        container: container.className
      }, "THEME_MANAGER");
    } else {
      Logger.warn("No container found for setting theme properties", {
        appId: this.appId,
        theme
      }, "THEME_MANAGER");
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
    const elements = this.element.querySelectorAll(selector);

    // Also check if the root element matches the selector
    const rootMatches = this.element.matches && this.element.matches(selector);
    const allElements = rootMatches ? [this.element, ...elements] : [...elements];

    if (allElements.length === 0) {
      Logger.debug(`No elements found for ${type} theme`, {
        appId: this.appId,
        selector,
        attribute
      }, "THEME_MANAGER");
      return;
    }

    let updatedCount = 0;
    allElements.forEach((element, index) => {
      const currentValue = element.getAttribute(attribute);

      // Only update if different to avoid unnecessary DOM manipulation
      if (currentValue !== theme) {
        element.setAttribute(attribute, theme);
        updatedCount++;

        Logger.debug(`${type} theme applied`, {
          appId: this.appId,
          elementIndex: index,
          previousTheme: currentValue,
          newTheme: theme,
          attribute
        }, "THEME_MANAGER");
      }
    });

    if (updatedCount > 0) {
      Logger.debug(`Updated ${updatedCount} ${type} theme elements`, {
        appId: this.appId,
        totalElements: allElements.length,
        theme
      }, "THEME_MANAGER");
    }
  }

  /**
   * Verify themes are properly applied (logging only, no corrections)
   */
  verifyThemes() {
    if (!this.element) return;

    const currentTheme = CommonFoundryTasks.retrieveSheetTheme();
    const verificationResults = {
      background: this.verifyThemeOnSelector(this.options.backgroundSelector, this.options.backgroundAttribute, currentTheme),
      tabs: this.verifyThemeOnSelector(this.options.tabsSelector, this.options.tabAttribute, currentTheme),
      name: this.verifyThemeOnSelector(this.options.nameSelector, this.options.nameAttribute, currentTheme),
      header: this.verifyThemeOnSelector(this.options.headerSelector, this.options.headerAttribute, currentTheme),
      dataTables: this.verifyThemeOnSelector(this.options.dataTablesSelector, this.options.tableAttribute, currentTheme),
      sectionHeaders: this.verifyThemeOnSelector(this.options.sectionHeadersSelector, this.options.sectionAttribute, currentTheme),
      toggles: this.verifyThemeOnSelector(this.options.togglesSelector, this.options.toggleAttribute, currentTheme),
      biography: this.verifyThemeOnSelector(this.options.biographySelector, this.options.biographyAttribute, currentTheme),
      inputs: this.verifyThemeOnSelector(this.options.inputsSelector, this.options.inputAttribute, currentTheme),
      selects: this.verifyThemeOnSelector(this.options.selectsSelector, this.options.selectAttribute, currentTheme),
      buttons: this.verifyThemeOnSelector(this.options.buttonsSelector, this.options.buttonAttribute, currentTheme),
      numberInputs: this.verifyThemeOnSelector(this.options.numberInputsSelector, this.options.numberInputAttribute, currentTheme),
      numberButtons: this.verifyThemeOnSelector(this.options.numberButtonsSelector, this.options.numberButtonAttribute, currentTheme)
    };

    const mismatches = Object.entries(verificationResults)
      .filter(([_, result]) => result.mismatches > 0)
      .map(([type, result]) => ({ type, ...result }));

    if (mismatches.length > 0) {
      Logger.warn("Theme verification found mismatches", {
        appId: this.appId,
        appType: this.appType,
        expectedTheme: currentTheme,
        mismatches
      }, "THEME_MANAGER");
    } else {
      Logger.debug("Theme verification passed", {
        appId: this.appId,
        appType: this.appType,
        theme: currentTheme,
        verificationResults
      }, "THEME_MANAGER");
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
    const elements = this.element.querySelectorAll(selector);
    const rootMatches = this.element.matches && this.element.matches(selector);
    const allElements = rootMatches ? [this.element, ...elements] : [...elements];

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
          attribute
        });
      }
    });

    return {
      totalElements: allElements.length,
      mismatches,
      details
    };
  }

  /**
   * Set up theme change listeners
   */
  setupChangeListeners() {
    if (this.hookId || this.domEventHandler) {
      Logger.debug("Theme change listeners already set up", {
        appId: this.appId,
        appType: this.appType
      }, "THEME_MANAGER");
      return;
    }

    // Hook listener for theme changes
    this.hookId = Hooks.on("eventide-rp-system.themeChanged", (data) => {
      Logger.debug("Theme change hook received", {
        appId: this.appId,
        appType: this.appType,
        newTheme: data.newTheme,
        userId: data.userId
      }, "THEME_MANAGER");

      this.handleThemeChange(data.newTheme);
    });

    // DOM event listener for theme changes
    this.domEventHandler = (event) => {
      Logger.debug("Theme change DOM event received", {
        appId: this.appId,
        appType: this.appType,
        newTheme: event.detail.newTheme,
        userId: event.detail.userId
      }, "THEME_MANAGER");

      this.handleThemeChange(event.detail.newTheme);
    };

    document.addEventListener("eventide-theme-change", this.domEventHandler);

    Logger.debug("Theme change listeners set up", {
      appId: this.appId,
      appType: this.appType,
      hookId: this.hookId
    }, "THEME_MANAGER");
  }

  /**
   * Handle theme change events
   * @param {string} newTheme - The new theme to apply
   */
  handleThemeChange(newTheme) {
    // Apply themes immediately
    this.applyThemes();

    // Trigger application re-render if available
    if (this.application && typeof this.application.render === 'function') {
      setTimeout(() => {
        try {
          this.application.render(false);
          Logger.debug("Application re-rendered for theme change", {
            appId: this.appId,
            appType: this.appType,
            newTheme
          }, "THEME_MANAGER");
        } catch (error) {
          Logger.warn("Failed to re-render application for theme change", {
            appId: this.appId,
            appType: this.appType,
            error: error.message
          }, "THEME_MANAGER");
        }
      }, 50);
    }

    // Show notification if enabled
    if (this.options.showNotifications) {
      const themeNames = {
        blue: "Night",
        black: "Midnight",
        green: "Dawn",
        light: "Noon",
        gold: "Twilight",
        purple: "Dusk"
      };

      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Info.SheetThemeChanged", {
          userName: game.user.name,
          themeName: themeNames[newTheme] || newTheme
        })
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
      document.removeEventListener("eventide-theme-change", this.domEventHandler);
      this.domEventHandler = null;
    }

    // Remove from active instances
    activeInstances.delete(this.appId);
    this.isSetup = false;

    Logger.debug("Theme manager cleaned up", {
      appId: this.appId,
      appType: this.appType,
      remainingInstances: activeInstances.size
    }, "THEME_MANAGER");
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
    Logger.warn("Invalid application provided to theme manager", {
      application: !!application,
      element: !!application?.element
    }, "THEME_MANAGER");
    return null;
  }

  // Check if already initialized
  const existingInstance = activeInstances.get(application.id);
  if (existingInstance) {
    Logger.debug("Theme manager already exists for application", {
      appId: application.id,
      appType: application.constructor.name
    }, "THEME_MANAGER");
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
  const appId = typeof applicationOrId === 'string' ? applicationOrId : applicationOrId?.id;

  if (!appId) {
    Logger.warn("No application ID provided for theme manager cleanup", {
      applicationOrId
    }, "THEME_MANAGER");
    return;
  }

  const instance = activeInstances.get(appId);
  if (instance) {
    instance.cleanup();
  } else {
    Logger.debug("No theme manager instance found for cleanup", {
      appId
    }, "THEME_MANAGER");
  }
};

/**
 * Apply themes to all active instances
 */
export const applyThemesToAll = () => {
  Logger.debug("Applying themes to all active instances", {
    instanceCount: activeInstances.size
  }, "THEME_MANAGER");

  for (const instance of activeInstances.values()) {
    try {
      instance.applyThemes();
    } catch (error) {
      Logger.warn("Failed to apply themes to instance", {
        appId: instance.appId,
        appType: instance.appType,
        error: error.message
      }, "THEME_MANAGER");
    }
  }
};

/**
 * Get theme manager instance for an application
 * @param {Application|string} applicationOrId - The application instance or ID
 * @returns {ThemeManagerInstance|null} The theme manager instance or null if not found
 */
export const getThemeManager = (applicationOrId) => {
  const appId = typeof applicationOrId === 'string' ? applicationOrId : applicationOrId?.id;
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

  Logger.debug("Global theme listener added", {
    listenerCount: globalListeners.size
  }, "THEME_MANAGER");
};

/**
 * Remove a global theme change listener
 * @param {Function} listener - Function to remove
 */
export const removeGlobalThemeListener = (listener) => {
  globalListeners.delete(listener);

  Logger.debug("Global theme listener removed", {
    listenerCount: globalListeners.size
  }, "THEME_MANAGER");
};

/**
 * Trigger global theme change (for use by theme switching functions)
 * @param {string} newTheme - The new theme
 * @param {string} userId - The user who changed the theme
 */
export const triggerGlobalThemeChange = (newTheme, userId = game.user.id) => {
  const data = { newTheme, userId };

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
      Logger.warn("Global theme listener error", {
        error: error.message
      }, "THEME_MANAGER");
    }
  }

  Logger.info("Global theme change triggered", {
    newTheme,
    userId,
    activeInstances: activeInstances.size,
    globalListeners: globalListeners.size
  }, "THEME_MANAGER");
};

/**
 * Preset configurations for different sheet types
 */
export const THEME_PRESETS = {
  CHARACTER_SHEET: {
    backgroundSelector: '.eventide-sheet',
    tabsSelector: '.tabs',
    nameSelector: '.document-name',
    headerSelector: '.eventide-sheet__header',
    dataTablesSelector: '.erps-data-table',
    sectionHeadersSelector: '.eventide-sheet-data-section__header',
    togglesSelector: '.erps-toggles',
    biographySelector: '.biography-content, [data-biography-theme]',
    inputsSelector: '.erps-input',
    selectsSelector: '.erps-select',
    buttonsSelector: '.erps-button',
    numberInputsSelector: '.erps-number-input__input',
    numberButtonsSelector: '.erps-number-input__button',
    autoApply: true,
    verify: true,
    showNotifications: false
  },

  ITEM_SHEET: {
    backgroundSelector: '.eventide-sheet',
    tabsSelector: '.tabs',
    nameSelector: '.document-name',
    headerSelector: '.eventide-sheet__header',
    dataTablesSelector: '.erps-data-table, .erps-item-effects__grid',
    sectionHeadersSelector: '.erps-item-effects__section-header',
    togglesSelector: '.erps-toggles',
    biographySelector: '.biography-content, [data-biography-theme]',
    inputsSelector: '.erps-input',
    selectsSelector: '.erps-select',
    buttonsSelector: '.erps-button',
    numberInputsSelector: '.erps-number-input__input',
    numberButtonsSelector: '.erps-number-input__button',
    autoApply: true,
    verify: true,
    showNotifications: false
  },

  MINIMAL: {
    backgroundSelector: '',
    tabsSelector: '',
    nameSelector: '',
    headerSelector: '',
    dataTablesSelector: '',
    sectionHeadersSelector: '',
    inputsSelector: '',
    selectsSelector: '',
    buttonsSelector: '',
    numberInputsSelector: '',
    numberButtonsSelector: '',
    autoApply: false,
    verify: false,
    showNotifications: false
  }
};
