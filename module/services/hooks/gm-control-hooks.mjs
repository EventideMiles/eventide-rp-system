import { Logger } from "../logger.mjs";
import { gmControlManager } from "../managers/gm-control.mjs";

/**
 * Initialize GM control hooks for auto-cleanup and maintenance
 */
export function initGMControlHooks() {
  Logger.info("Initializing GM control hooks", {}, "GM_CONTROL_HOOKS");

  /**
   * Auto-cleanup resolved GM apply messages periodically
   */
  Hooks.on("ready", async () => {
    // Only run cleanup for GMs
    if (!game.user.isGM) return;

    Logger.info(
      "Setting up GM control auto-cleanup timer",
      {},
      "GM_CONTROL_HOOKS",
    );

    // Run cleanup every 30 minutes
    setInterval(
      async () => {
        try {
          const cleanedCount =
            await gmControlManager.bulkCleanupResolvedMessages();

          if (cleanedCount > 0) {
            Logger.info(
              `Auto-cleanup removed ${cleanedCount} resolved GM apply messages`,
              { cleanedCount },
              "GM_CONTROL_HOOKS",
            );
          }
        } catch (error) {
          Logger.error("Failed to run auto-cleanup", error, "GM_CONTROL_HOOKS");
        }
      },
      30 * 60 * 1000,
    ); // 30 minutes
  });

  /**
   * Validate targets when actors are deleted
   */
  Hooks.on("deleteActor", async (actor, _options, _userId) => {
    if (!game.user.isGM) return;

    Logger.debug(
      `Actor deleted, validating GM apply messages`,
      { actorId: actor.id, actorName: actor.name },
      "GM_CONTROL_HOOKS",
    );

    try {
      await gmControlManager.validateAllPendingMessages();
    } catch (error) {
      Logger.error(
        "Failed to validate messages after actor deletion",
        error,
        "GM_CONTROL_HOOKS",
      );
    }
  });

  /**
   * Show GM control statistics on render sidebar
   */
  Hooks.on("renderChatLog", async (_app, html, _data) => {
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
      Logger.error(
        "Failed to render GM control status",
        error,
        "GM_CONTROL_HOOKS",
      );
    }
  });

  /**
   * Enhanced error handling for GM apply operations
   */
  Hooks.on("error", (error, context) => {
    if (context?.source === "GM_CONTROL") {
      Logger.error("GM Control system error", error, "GM_CONTROL_HOOKS");

      // Show user-friendly error message
      ui.notifications.error(
        "GM Control system encountered an error. Check console for details.",
      );
    }
  });

  Logger.info(
    "GM control hooks initialized successfully",
    {},
    "GM_CONTROL_HOOKS",
  );
}

/**
 * Cleanup GM control hooks (for module disable/reload)
 */
export function cleanupGMControlHooks() {
  Logger.info("Cleaning up GM control hooks", {}, "GM_CONTROL_HOOKS");

  // Remove any status elements
  const statusElements = document.querySelectorAll(".gm-control-status");
  statusElements.forEach((el) => el.remove());
}
