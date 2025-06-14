import { Logger } from "../../services/_module.mjs";
import { BaselineSheetMixins } from "./baseline-sheet-mixins.mjs";

const { ApplicationV2 } = foundry.applications.api;

/**
 * Performance Dashboard Application
 *
 * A modern ApplicationV2-based dashboard for monitoring system performance,
 * memory usage, and providing diagnostic information for the Eventide RP System.
 *
 * @extends {ApplicationV2}
 */
export class PerformanceDashboard extends BaselineSheetMixins(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "eventide-performance-dashboard",
    tag: "div",
    window: {
      title: "EVENTIDE_RP_SYSTEM.UI.PerformanceDashboard",
      icon: "fas fa-tachometer-alt",
      resizable: true,
      minimizable: true,
    },
    position: {
      width: 700,
      height: "auto",
    },
    actions: {
      refresh: PerformanceDashboard.#onRefresh,
      cleanup: PerformanceDashboard.#onCleanup,
      forceCleanup: PerformanceDashboard.#onForceCleanup,
    },
  };

  /** @override */
  static PARTS = {
    dashboard: {
      template:
        "systems/eventide-rp-system/templates/apps/performance-dashboard.hbs",
    },
  };

  /**
   * Auto-refresh interval ID
   * @type {number|null}
   * @private
   */
  #refreshInterval = null;

  /**
   * Whether auto-refresh is enabled
   * @type {boolean}
   * @private
   */
  #autoRefresh = false;

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Get current diagnostics
    const diagnostics = globalThis.erps?.diagnostics?.() || {};

    // Process memory info for display
    let memoryInfo = null;
    if (typeof diagnostics.memoryInfo === "object") {
      memoryInfo = {
        used: diagnostics.memoryInfo.used,
        total: diagnostics.memoryInfo.total,
        limit: diagnostics.memoryInfo.limit,
        usedPercent: this.#calculateMemoryPercent(
          diagnostics.memoryInfo.used,
          diagnostics.memoryInfo.limit,
        ),
      };
    }

    // Determine status colors and indicators
    const systemHealth = this.#assessSystemHealth(diagnostics);

    return foundry.utils.mergeObject(context, {
      diagnostics,
      memoryInfo,
      systemHealth,
      autoRefresh: this.#autoRefresh,
      refreshInterval: this.#refreshInterval ? 5 : 0, // 5 second intervals
      timestamp: new Date().toLocaleString(),
    });
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Set up auto-refresh if enabled
    if (this.#autoRefresh && !this.#refreshInterval) {
      this.#startAutoRefresh();
    }

    Logger.debug(
      "Performance dashboard rendered",
      {
        autoRefresh: this.#autoRefresh,
        hasInterval: !!this.#refreshInterval,
      },
      "PERFORMANCE_DASHBOARD",
    );
  }

  /** @override */
  async _preClose(options) {
    // Clean up auto-refresh interval
    this.#stopAutoRefresh();
    await super._preClose(options);
  }

  /**
   * Calculate memory usage percentage
   * @param {string} used - Used memory string (e.g., "45 MB")
   * @param {string} limit - Memory limit string (e.g., "4096 MB")
   * @returns {number} Percentage (0-100)
   * @private
   */
  #calculateMemoryPercent(used, limit) {
    try {
      const usedNum = parseFloat(used.replace(/[^\d.]/g, ""));
      const limitNum = parseFloat(limit.replace(/[^\d.]/g, ""));
      return limitNum > 0 ? Math.round((usedNum / limitNum) * 100) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Assess overall system health based on diagnostics
   * @param {Object} diagnostics - System diagnostics data
   * @returns {Object} Health assessment with status and warnings
   * @private
   */
  #assessSystemHealth(diagnostics) {
    const warnings = [];
    let status = "good"; // good, warning, critical

    // Check tracked intervals
    if (diagnostics.trackedIntervals > 10) {
      warnings.push("High number of tracked intervals");
      status = "warning";
    }
    if (diagnostics.trackedIntervals > 25) {
      status = "critical";
    }

    // Check memory usage if available
    if (typeof diagnostics.memoryInfo === "object") {
      const memPercent = this.#calculateMemoryPercent(
        diagnostics.memoryInfo.used,
        diagnostics.memoryInfo.limit,
      );
      if (memPercent > 70) {
        warnings.push("High memory usage");
        status = status === "good" ? "warning" : status;
      }
      if (memPercent > 85) {
        status = "critical";
      }
    }

    // Check for inactive systems
    if (!diagnostics.gmControlHooksInitialized) {
      warnings.push("GM Control hooks not initialized");
    }
    if (!diagnostics.numberInputsInitialized) {
      warnings.push("Number inputs not initialized");
    }

    return {
      status,
      warnings,
      statusColor:
        status === "good"
          ? "#00ff00"
          : status === "warning"
            ? "#ffaa00"
            : "#ff4444",
      statusIcon:
        status === "good"
          ? "fas fa-check-circle"
          : status === "warning"
            ? "fas fa-exclamation-triangle"
            : "fas fa-times-circle",
    };
  }

  /**
   * Start auto-refresh interval
   * @private
   */
  #startAutoRefresh() {
    if (this.#refreshInterval) return;

    this.#refreshInterval = setInterval(() => {
      if (this.rendered) {
        this.render();
      } else {
        this.#stopAutoRefresh();
      }
    }, 5000); // 5 second refresh

    // Track interval for cleanup
    if (window._erpsIntervalIds) {
      window._erpsIntervalIds.add(this.#refreshInterval);
    }

    Logger.debug(
      "Started auto-refresh for performance dashboard",
      {
        intervalId: this.#refreshInterval,
      },
      "PERFORMANCE_DASHBOARD",
    );
  }

  /**
   * Stop auto-refresh interval
   * @private
   */
  #stopAutoRefresh() {
    if (this.#refreshInterval) {
      clearInterval(this.#refreshInterval);

      // Remove from tracking
      if (window._erpsIntervalIds) {
        window._erpsIntervalIds.delete(this.#refreshInterval);
      }

      this.#refreshInterval = null;
      Logger.debug(
        "Stopped auto-refresh for performance dashboard",
        {},
        "PERFORMANCE_DASHBOARD",
      );
    }
  }

  /**
   * Toggle auto-refresh on/off
   */
  toggleAutoRefresh() {
    this.#autoRefresh = !this.#autoRefresh;

    if (this.#autoRefresh) {
      this.#startAutoRefresh();
    } else {
      this.#stopAutoRefresh();
    }

    this.render();
  }

  /**
   * Handle refresh action
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   * @private
   * @static
   */
  static async #onRefresh(event, target) {
    const app = target.closest("[data-application-id]");
    const appId = app?.dataset.applicationId;
    const instance = foundry.applications.instances.get(appId);

    if (instance) {
      await instance.render();
      ui.notifications.info("Performance dashboard refreshed");
    }
  }

  /**
   * Handle cleanup action
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   * @private
   * @static
   */
  static async #onCleanup(event, target) {
    try {
      globalThis.erps?.cleanup?.();
      ui.notifications.info("System cleanup completed successfully");

      // Refresh the dashboard after cleanup
      setTimeout(() => {
        const app = target.closest("[data-application-id]");
        const appId = app?.dataset.applicationId;
        const instance = foundry.applications.instances.get(appId);
        instance?.render();
      }, 1000);
    } catch (error) {
      Logger.error(
        "Failed to perform system cleanup",
        error,
        "PERFORMANCE_DASHBOARD",
      );
      ui.notifications.error(
        "System cleanup failed - check console for details",
      );
    }
  }

  /**
   * Handle force cleanup action
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   * @private
   * @static
   */
  static async #onForceCleanup(event, target) {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Confirm Force Cleanup" },
      content:
        "<p><strong>Warning:</strong> Force cleanup will clear ALL intervals and timeouts, which may affect other systems. Continue?</p>",
      modal: true,
    });

    if (confirmed) {
      try {
        globalThis.erps?.forceCleanup?.();
        ui.notifications.warn(
          "Force cleanup completed - some systems may need reinitialization",
        );

        // Refresh the dashboard after force cleanup
        setTimeout(() => {
          const app = target.closest("[data-application-id]");
          const appId = app?.dataset.applicationId;
          const instance = foundry.applications.instances.get(appId);
          instance?.render();
        }, 1000);
      } catch (error) {
        Logger.error(
          "Failed to perform force cleanup",
          error,
          "PERFORMANCE_DASHBOARD",
        );
        ui.notifications.error(
          "Force cleanup failed - check console for details",
        );
      }
    }
  }
}
