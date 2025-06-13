/**
 * System Cleanup Utilities
 *
 * This module provides centralized cleanup functions to prevent memory leaks
 * when the system is disabled, reloaded, or when Foundry is shut down.
 *
 * @module utils/system-cleanup
 */

import { Logger } from "../services/logger.mjs";
import { cleanupGlobalNumberInputs } from "../helpers/number-inputs.mjs";
import { cleanupGlobalColorPickers } from "../helpers/color-pickers.mjs";
import { cleanupGlobalThemeManager } from "../helpers/theme-manager.mjs";
import { cleanupGMControlHooks } from "../services/hooks/gm-control-hooks.mjs";
import { cleanupChatListeners } from "../services/hooks/chat-listeners.mjs";

// Track if cleanup has been initialized
let cleanupInitialized = false;

/**
 * Safe logging function that works before Logger is initialized
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} message - Message to log
 * @param {*} data - Optional data to log
 */
function safeLog(level, message, data = null) {
  try {
    // Try to use Logger if available and settings are registered
    if (typeof Logger !== "undefined" && game?.settings?.get) {
      Logger[level](message, data || {}, "SYSTEM_CLEANUP");
    } else {
      // Fall back to console logging
      const logMessage = `ERPS | SYSTEM_CLEANUP | ${message}`;
      if (data) {
        console[level](logMessage, data);
      } else {
        console[level](logMessage);
      }
    }
  } catch {
    // If all else fails, use basic console logging
    console.info(`ERPS | SYSTEM_CLEANUP | ${message}`, data || "");
  }
}

/**
 * Perform comprehensive system cleanup to prevent memory leaks
 * This should be called when the system is being disabled or reloaded
 */
export function performSystemCleanup() {
  safeLog("info", "Starting comprehensive system cleanup");

  try {
    // Clean up GM control hooks and intervals
    cleanupGMControlHooks();

    // Clean up chat listener resources
    cleanupChatListeners();

    // Clean up global event listeners
    cleanupGlobalNumberInputs();
    cleanupGlobalColorPickers();

    // Clean up theme manager instances
    cleanupGlobalThemeManager();

    // Clean up any remaining DOM elements that might hold references
    cleanupOrphanedElements();

    // Clear any remaining intervals that might be running
    clearAllSystemIntervals();

    safeLog("info", "System cleanup completed successfully");
  } catch (error) {
    safeLog("error", "Failed to complete system cleanup", error);
  }
}

/**
 * Perform aggressive cleanup before system initialization
 * This helps prevent accumulation of resources on system reloads
 */
export function performPreInitCleanup() {
  safeLog("debug", "Performing pre-initialization cleanup");

  try {
    // Clear any existing intervals that might be running
    clearAllSystemIntervals();

    // Clean up any orphaned elements from previous loads
    cleanupOrphanedElements();

    // Force cleanup of any existing global handlers
    cleanupGlobalNumberInputs();
    cleanupGlobalColorPickers();
    cleanupGlobalThemeManager();
    cleanupGMControlHooks();
    cleanupChatListeners();

    safeLog("debug", "Pre-initialization cleanup completed");
  } catch (error) {
    safeLog("warn", "Failed to complete pre-initialization cleanup", error);
  }
}

/**
 * Clear all system intervals that might be running
 * @private
 */
function clearAllSystemIntervals() {
  try {
    // Store original setInterval and setTimeout to track our intervals
    if (!window._erpsIntervalIds) {
      window._erpsIntervalIds = new Set();
    }

    // Clear any intervals we've been tracking
    let clearedCount = 0;
    window._erpsIntervalIds.forEach((id) => {
      try {
        clearInterval(id);
        clearTimeout(id);
        clearedCount++;
      } catch {
        // Ignore errors for non-existent intervals
      }
    });
    window._erpsIntervalIds.clear();

    // Also try to clear a reasonable range of interval IDs
    // This is less aggressive than clearing ALL intervals
    const currentId = setTimeout(() => {}, 0);
    clearTimeout(currentId);

    // Only clear intervals in a reasonable range around the current ID
    const rangeStart = Math.max(1, currentId - 1000);
    const rangeEnd = currentId + 10;

    for (let i = rangeStart; i <= rangeEnd; i++) {
      try {
        clearInterval(i);
        clearTimeout(i);
      } catch {
        // Ignore errors for non-existent intervals
      }
    }

    safeLog("debug", "Cleared system intervals", {
      trackedIntervals: clearedCount,
      rangeCleared: `${rangeStart}-${rangeEnd}`,
      currentId,
    });
  } catch (error) {
    safeLog("warn", "Failed to clear intervals", error);
  }
}

/**
 * Clean up orphaned DOM elements that might hold references
 * @private
 */
function cleanupOrphanedElements() {
  try {
    // Remove any orphaned GM control status elements
    const gmStatusElements = document.querySelectorAll(".gm-control-status");
    gmStatusElements.forEach((el) => {
      try {
        el.remove();
      } catch (error) {
        safeLog("warn", "Failed to remove GM status element", error);
      }
    });

    // Remove any orphaned theme-related elements and attributes
    /**
     * Clean up all theme-related attributes and elements to prevent memory leaks
     * and ensure clean state on system reload. This includes:
     * - Global theme attributes (data-theme)
     * - Component-specific theme attributes (data-bg-theme, data-tab-theme, etc.)
     * - Eventide-specific theme attributes (data-eventide-theme)
     *
     * This cleanup is essential for preventing theme-related issues during
     * system reloads and ensuring proper theme application on restart.
     */
    const themeElements = document.querySelectorAll(
      "[data-eventide-theme], [data-theme], [data-bg-theme], [data-tab-theme], [data-name-theme], [data-header-theme], [data-table-theme], [data-section-theme], [data-toggle-theme], [data-biography-theme], [data-input-theme], [data-select-theme], [data-button-theme], [data-color-theme], [data-textarea-theme], [data-items-theme]",
    );
    themeElements.forEach((el) => {
      try {
        // Remove all theme-related attributes
        el.removeAttribute("data-eventide-theme");
        el.removeAttribute("data-theme");
        el.removeAttribute("data-bg-theme");
        el.removeAttribute("data-tab-theme");
        el.removeAttribute("data-name-theme");
        el.removeAttribute("data-header-theme");
        el.removeAttribute("data-table-theme");
        el.removeAttribute("data-section-theme");
        el.removeAttribute("data-toggle-theme");
        el.removeAttribute("data-biography-theme");
        el.removeAttribute("data-input-theme");
        el.removeAttribute("data-select-theme");
        el.removeAttribute("data-button-theme");
        el.removeAttribute("data-color-theme");
        el.removeAttribute("data-textarea-theme");
        el.removeAttribute("data-items-theme");
      } catch (error) {
        safeLog("warn", "Failed to clean theme attributes", error);
      }
    });

    /**
     * Clean up ERPS-specific elements including theme-related classes
     * This ensures all custom elements and their event listeners are properly
     * cleaned up during system shutdown or reload.
     */
    const erpsElements = document.querySelectorAll(
      "[class*='erps-'], [data-erps], .eventide-sheet",
    );
    erpsElements.forEach((el) => {
      try {
        // Clone and replace to remove event listeners
        const clone = el.cloneNode(true);
        if (el.parentNode) {
          el.parentNode.replaceChild(clone, el);
        }
      } catch (error) {
        safeLog("warn", "Failed to clean ERPS element", error);
      }
    });

    safeLog("debug", "Orphaned elements cleaned up");
  } catch (error) {
    safeLog("error", "Failed to cleanup orphaned elements", error);
  }
}

/**
 * Initialize cleanup hooks for automatic cleanup on system events
 */
export function initializeCleanupHooks() {
  if (cleanupInitialized) {
    safeLog("debug", "Cleanup hooks already initialized");
    return;
  }

  safeLog("debug", "Initializing cleanup hooks");

  // Perform pre-initialization cleanup first
  performPreInitCleanup();

  // Clean up when the world is being shut down
  Hooks.on("ready", () => {
    // Set up cleanup on page unload
    window.addEventListener("beforeunload", () => {
      performSystemCleanup();
    });

    // Set up cleanup on page visibility change (when tab becomes hidden)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        safeLog("debug", "Page hidden, performing cleanup");
        performSystemCleanup();
      }
    });
  });

  // Clean up on hot reload (development)
  if (typeof globalThis.module !== "undefined" && globalThis.module?.hot) {
    globalThis.module.hot.dispose(() => {
      performSystemCleanup();
    });
  }

  cleanupInitialized = true;
}
