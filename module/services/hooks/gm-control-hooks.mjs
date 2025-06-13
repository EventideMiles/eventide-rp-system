import { Logger } from "../logger.mjs";
import { gmControlManager } from "../managers/gm-control.mjs";

// Store the interval ID for cleanup
let autoCleanupInterval = null;

// Track if hooks have been initialized to prevent duplicates
let hooksInitialized = false;

// Store hook IDs for cleanup
let hookIds = [];

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
      Logger[level](message, data || {}, "GM_CONTROL_HOOKS");
    } else {
      // Fall back to console logging
      const logMessage = `ERPS | GM_CONTROL_HOOKS | ${message}`;
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

    console.info(`ERPS | GM_CONTROL_HOOKS | ${message}`, data || "");
  }
}

/**
 * Initialize GM control hooks for auto-cleanup and maintenance
 */
export function initGMControlHooks() {
  // Prevent multiple initializations
  if (hooksInitialized) {
    safeLog("debug", "GM control hooks already initialized, skipping");
    return;
  }

  safeLog("info", "Initializing GM control hooks");

  // Clear any existing resources first
  cleanupGMControlHooks();

  /**
   * Auto-cleanup resolved GM apply messages periodically
   */
  const readyHookId = Hooks.on("ready", async () => {
    // Only run cleanup for GMs
    if (!game.user.isGM) return;

    // Clear any existing interval first (extra safety)
    if (autoCleanupInterval) {
      clearInterval(autoCleanupInterval);
      autoCleanupInterval = null;
      safeLog("debug", "Cleared existing interval before creating new one");
    }

    safeLog("info", "Setting up GM control auto-cleanup timer");

    // Run cleanup every 30 minutes
    autoCleanupInterval = setInterval(
      async () => {
        try {
          const cleanedCount =
            await gmControlManager.bulkCleanupResolvedMessages();

          if (cleanedCount > 0) {
            safeLog(
              "info",
              `Auto-cleanup removed ${cleanedCount} resolved GM apply messages`,
              { cleanedCount },
            );
          }
        } catch (error) {
          safeLog("error", "Failed to run auto-cleanup", error);
        }
      },
      30 * 60 * 1000,
    ); // 30 minutes

    // Track this interval for cleanup
    if (window._erpsIntervalIds) {
      window._erpsIntervalIds.add(autoCleanupInterval);
    }

    safeLog("debug", "Auto-cleanup interval created", {
      intervalId: autoCleanupInterval,
    });
  });

  /**
   * Validate targets when actors are deleted
   */
  const deleteActorHookId = Hooks.on(
    "deleteActor",
    async (actor, _options, _userId) => {
      if (!game.user.isGM) return;

      safeLog("debug", `Actor deleted, validating GM apply messages`, {
        actorId: actor.id,
        actorName: actor.name,
      });

      try {
        await gmControlManager.validateAllPendingMessages();
      } catch (error) {
        safeLog(
          "error",
          "Failed to validate messages after actor deletion",
          error,
        );
      }
    },
  );

  /**
   * Show GM control statistics on render sidebar
   */
  const renderChatLogHookId = Hooks.on(
    "renderChatLog",
    async (_app, html, _data) => {
      if (!game.user.isGM) return;

      try {
        const stats = gmControlManager.getPendingStats();

        // Only show if there are pending applications
        if (stats.totalMessages > 0) {
          const statusElement = html.querySelector("#chat-controls");
          if (statusElement) {
            const existingStatus =
              statusElement.querySelector(".gm-control-status");
            if (!existingStatus) {
              const statusHtml = `
              <div class="gm-control-status" style="
                background: rgba(255, 193, 7, 0.1);
                border: 1px solid rgba(255, 193, 7, 0.3);
                border-radius: 4px;
                padding: 0.5rem;
                margin: 0.5rem 0;
                font-size: 0.8rem;
                color: #ffc107;
                display: flex;
                align-items: center;
                justify-content: space-between;
              ">
                <span>
                  <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
                  ${stats.totalMessages} GM Apply Message(s) Pending
                </span>
                <button type="button" class="gm-bulk-cleanup-btn" style="
                  background: #ffc107;
                  color: #000;
                  border: none;
                  padding: 0.25rem 0.5rem;
                  border-radius: 3px;
                  font-size: 0.7rem;
                  cursor: pointer;
                " title="Clean up all resolved messages">
                  <i class="fas fa-broom"></i> Cleanup
                </button>
              </div>
            `;
              statusElement.insertAdjacentHTML("afterbegin", statusHtml);

              // Add click handler for cleanup button
              const cleanupBtn = statusElement.querySelector(
                ".gm-bulk-cleanup-btn",
              );
              cleanupBtn.addEventListener("click", async () => {
                const cleanedCount =
                  await gmControlManager.bulkCleanupResolvedMessages(0); // Clean all resolved
                if (cleanedCount > 0) {
                  ui.notifications.info(
                    `Cleaned up ${cleanedCount} resolved messages`,
                  );
                  // Refresh the chat to update the status
                  ui.chat.render();
                } else {
                  ui.notifications.info("No resolved messages to clean up");
                }
              });
            }
          }
        }
      } catch (error) {
        safeLog("error", "Failed to render GM control status", error);
      }
    },
  );

  /**
   * Enhanced error handling for GM apply operations
   */
  const errorHookId = Hooks.on("error", (error, context) => {
    if (context?.source === "GM_CONTROL") {
      safeLog("error", "GM Control system error", error);

      // Show user-friendly error message
      ui.notifications.error(
        "GM Control system encountered an error. Check console for details.",
      );
    }
  });

  // Store hook IDs for cleanup
  hookIds = [readyHookId, deleteActorHookId, renderChatLogHookId, errorHookId];
  hooksInitialized = true;

  safeLog("info", "GM control hooks initialized successfully", {
    hookCount: hookIds.length,
  });
}

/**
 * Cleanup GM control hooks (for module disable/reload)
 */
export function cleanupGMControlHooks() {
  safeLog("info", "Cleaning up GM control hooks");

  // Clear the auto-cleanup interval
  if (autoCleanupInterval) {
    clearInterval(autoCleanupInterval);

    // Remove from tracking
    if (window._erpsIntervalIds) {
      window._erpsIntervalIds.delete(autoCleanupInterval);
    }

    autoCleanupInterval = null;
    safeLog("debug", "Cleared auto-cleanup interval");
  }

  // Remove any status elements
  const statusElements = document.querySelectorAll(".gm-control-status");
  statusElements.forEach((el) => el.remove());

  // Remove all hooks
  hookIds.forEach((hookId) => {
    try {
      Hooks.off(hookId);
    } catch (error) {
      safeLog("warn", `Failed to remove hook ${hookId}`, error);
    }
  });
  hookIds = [];

  // Reset initialization flag
  hooksInitialized = false;

  safeLog("debug", "GM control hooks cleanup completed");
}
