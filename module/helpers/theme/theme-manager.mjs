/**
 * Centralized Theme Management System
 *
 * This module provides a unified interface for theme management across the system.
 * It combines functionality from multiple specialized modules:
 * - Theme Instance Management
 * - Theme Application Logic
 * - Theme Event Handling
 * - Theme Presets
 */

// Import all theme management functionality
export {
  ThemeManagerInstance,
  getThemeManager,
  getAllThemeManagers,
  applyThemesToAll,
  cleanupAllInstances,
} from "./theme-instance.mjs";

export {
  applyGlobalTheme,
  applyThemeToSelector,
  applyMultipleThemes,
  removeThemeFromSelector,
  verifyThemeApplication,
  applyThemeImmediate,
  injectImmediateThemeStyles,
  removeImmediateThemeStyles,
} from "./theme-applicator.mjs";

export {
  addGlobalThemeListener,
  removeGlobalThemeListener,
  clearGlobalThemeListeners,
  triggerGlobalThemeChange,
  initializeGlobalTheme,
  setupGlobalThemeDetection,
  cleanupGlobalThemeEvents,
} from "./theme-events.mjs";

export {
  THEME_PRESETS,
  getThemePreset,
  getThemePresetNames,
  createCustomPreset,
  validateThemePreset,
} from "./theme-presets.mjs";

// Re-export functions with original names for backward compatibility
export { cleanupGlobalThemeEvents as cleanupGlobalThemeManager } from "./theme-events.mjs";
export { cleanupGlobalThemeEvents as cleanupThemeManager } from "./theme-events.mjs";

// Backward compatibility alias for the old function name
export { initializeThemeManager as initThemeManager };

/**
 * Initialize a theme manager for an application
 * This is the main entry point for setting up theme management
 *
 * @param {Application} application - The Foundry application instance
 * @param {Object|string} [options] - Theme options or preset name
 * @returns {ThemeManagerInstance} The created theme manager instance
 */
export const initializeThemeManager = async (application, options = {}) => {
  // If options is a string, treat it as a preset name
  if (typeof options === "string") {
    const { getThemePreset } = await import("./theme-presets.mjs");
    const preset = getThemePreset(options);
    if (preset) {
      options = preset;
    } else {
      console.warn(
        `Theme preset "${options}" not found, using default options`,
      );
      options = {};
    }
  }

  const { ThemeManagerInstance } = await import("./theme-instance.mjs");
  const themeManager = new ThemeManagerInstance(application, options);
  themeManager.initialize();
  return themeManager;
};

/**
 * Quick setup function for common sheet types
 * @param {Application} application - The Foundry application instance
 * @param {string} [sheetType="CHARACTER_SHEET"] - The type of sheet (CHARACTER_SHEET, ITEM_SHEET, etc.)
 * @returns {ThemeManagerInstance} The created theme manager instance
 */
export const setupSheetTheme = async (
  application,
  sheetType = "CHARACTER_SHEET",
) => {
  return initializeThemeManager(application, sheetType);
};

/**
 * Initialize the global theme system
 * This should be called once during system initialization
 */
export const initializeGlobalThemeSystem = async () => {
  const { initializeGlobalTheme, setupGlobalThemeDetection } = await import(
    "./theme-events.mjs"
  );

  initializeGlobalTheme();
  setupGlobalThemeDetection();
};

/**
 * Clean up the entire theme system
 * This should be called during system cleanup
 */
export const cleanupGlobalThemeSystem = async () => {
  const { cleanupAllInstances } = await import("./theme-instance.mjs");
  const { cleanupGlobalThemeEvents } = await import("./theme-events.mjs");

  cleanupAllInstances();
  cleanupGlobalThemeEvents();
};
