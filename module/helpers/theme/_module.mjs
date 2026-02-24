/**
 * Theme Management Module
 *
 * This module provides comprehensive theme management functionality
 * organized into specialized sub-modules for better maintainability.
 */

// Export everything from the main theme manager
export * from "./theme-manager.mjs";

// Export individual modules for direct access if needed
export * as ThemeInstance from "./theme-instance.mjs";
export * as ThemeApplicator from "./theme-applicator.mjs";
export * as ThemeEvents from "./theme-events.mjs";
export * as ThemePresets from "./theme-presets.mjs";

// Export shared theme colors
export { THEME_COLORS } from "./theme-colors.mjs";
