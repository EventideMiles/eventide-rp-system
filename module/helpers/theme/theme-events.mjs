import { Logger } from "../../services/_module.mjs";
import { CommonFoundryTasks } from "../../utils/_module.mjs";
import { applyGlobalTheme } from "./theme-applicator.mjs";

/**
 * Global theme change listeners
 * @type {Set<Function>}
 */
const globalListeners = new Set();

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
 * Clear all global theme listeners
 */
export const clearGlobalThemeListeners = () => {
  const listenerCount = globalListeners.size;
  globalListeners.clear();

  Logger.debug(
    "All global theme listeners cleared",
    {
      clearedCount: listenerCount,
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
  applyGlobalTheme(newTheme);

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
      globalListeners: globalListeners.size,
    },
    "THEME_MANAGER",
  );
};

/**
 * Initialize global theme on system startup
 */
export const initializeGlobalTheme = () => {
  const currentTheme = CommonFoundryTasks.retrieveSheetTheme();
  applyGlobalTheme(currentTheme);

  Logger.info(
    "Global theme initialized",
    {
      theme: currentTheme,
    },
    "THEME_MANAGER",
  );
};

/**
 * Set up global theme change detection
 * This sets up listeners for theme changes that affect all applications
 */
export const setupGlobalThemeDetection = () => {
  // Listen for setting changes that might affect themes
  Hooks.on("updateSetting", (setting, data) => {
    if (setting.key === "eventide-rp-system.sheetTheme") {
      const newTheme = data.value;
      triggerGlobalThemeChange(newTheme, game.user.id);
    }
  });

  // Listen for user flag changes (for backward compatibility)
  Hooks.on("updateUser", (user, data) => {
    if (
      user.id === game.user.id &&
      data.flags?.["eventide-rp-system"]?.sheetTheme
    ) {
      const newTheme = data.flags["eventide-rp-system"].sheetTheme;
      triggerGlobalThemeChange(newTheme, user.id);
    }
  });

  Logger.debug(
    "Global theme detection set up",
    {
      globalListeners: globalListeners.size,
    },
    "THEME_MANAGER",
  );
};

/**
 * Clean up global theme event resources
 */
export const cleanupGlobalThemeEvents = () => {
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
          // eslint-disable-next-line no-console
          console[level](logMessage, data);
        } else {
          // eslint-disable-next-line no-console
          console[level](logMessage);
        }
      }
    } catch {
      // If all else fails, use basic console logging

      console.info(`ERPS | THEME_MANAGER | ${message}`, data || "");
    }
  }

  safeLog("debug", "Cleaning up global theme event resources");

  try {
    const listenerCount = globalListeners.size;
    clearGlobalThemeListeners();

    safeLog(
      "debug",
      `Global theme event cleanup completed - cleared ${listenerCount} listeners`,
      { listenerCount },
    );
  } catch (error) {
    safeLog("warn", "Failed to cleanup global theme events", error);
  }
};
