/**
 * System Cleanup Utilities
 *
 * This module provides centralized cleanup functions to prevent memory leaks
 * when the system is disabled, reloaded, or when Foundry is shut down.
 *
 * @module utils/system-cleanup
 */

import { Logger } from "../services/logger.mjs";
import { cleanupGlobalColorPickers } from "../helpers/color-pickers.mjs";
import { cleanupGlobalThemeManager } from "../helpers/_module.mjs";
import { cleanupGMControlHooks } from "../services/hooks/gm-control-hooks.mjs";

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
        // eslint-disable-next-line no-console
        console[level](logMessage, data);
      } else {
        // eslint-disable-next-line no-console
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

    // Clean up global event listeners
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
    cleanupGlobalColorPickers();
    cleanupGlobalNumberInputs();
    cleanupGlobalThemeManager();
    cleanupGMControlHooks();

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

    // Clear only the intervals we've been tracking
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

    safeLog("debug", "Cleared tracked system intervals", {
      trackedIntervals: clearedCount,
    });
  } catch (error) {
    safeLog("warn", "Failed to clear intervals", error);
  }
}

/**
 * Clean up orphaned GM control status elements
 * 
 * NOTE: This function intentionally does NOT clean up:
 * - Theme attributes on active sheets (would break active UI)
 * - ERPS DOM elements via cloneNode (would destroy event listeners)
 * 
 * These operations were removed because they break Foundry V2's ApplicationV2
 * framework, which maintains internal references to DOM elements. Cloning
 * elements destroys these references and causes sheets to fail to open.
 * 
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
    // Set up cleanup on page unload only
    // NOTE: We do NOT clean up on visibilitychange (alt-tab) because that would
    // destroy active DOM elements and break Foundry V2's ApplicationV2 framework.
    window.addEventListener("beforeunload", () => {
      performSystemCleanup();
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

/**
 * Clean up global number inputs
 * @private
 */
function cleanupGlobalNumberInputs() {
  try {
    if (typeof erps !== "undefined" && erps.utils?.cleanupNumberInputsGlobal) {
      erps.utils.cleanupNumberInputsGlobal();
    }
    safeLog("debug", "Global number inputs cleaned up");
  } catch (error) {
    safeLog("warn", "Failed to cleanup global number inputs", error);
  }
}
