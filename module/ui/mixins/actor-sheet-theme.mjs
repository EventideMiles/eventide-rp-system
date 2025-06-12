import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";
import { CommonFoundryTasks } from "../../utils/_module.mjs";
import {
  initThemeManager,
  cleanupThemeManager,
  triggerGlobalThemeChange,
  THEME_PRESETS,
} from "../../helpers/theme-manager.mjs";

/**
 * Actor Sheet Theme Management Mixin
 *
 * Provides theme management functionality including theme cycling,
 * immediate theme property setting, and theme manager integration.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with theme management functionality
 */
export const ActorSheetThemeMixin = (BaseClass) =>
  class extends BaseClass {
    // Theme manager instance
    themeManager = null;

    /**
     * Set theme properties immediately on the sheet element to prevent flashing
     * This is a synchronous operation that happens before theme manager initialization
     * @param {string} theme - The current theme name
     * @private
     */
    _setImmediateThemeProperties(theme) {
      // Theme color mappings (same as in theme manager)
      const themeColors = {
        blue: {
          primary: "#4a90e2",
          secondary: "#357abd",
          bright: "#6bb6ff",
          glow: "rgba(74, 144, 226, 0.3)",
        },
        black: {
          primary: "#2c2c2c",
          secondary: "#1a1a1a",
          bright: "#4a4a4a",
          glow: "rgba(44, 44, 44, 0.3)",
        },
        green: {
          primary: "#4a9e4a",
          secondary: "#357a35",
          bright: "#6bb66b",
          glow: "rgba(74, 158, 74, 0.3)",
        },
        light: {
          primary: "#cbd5e1", // Light silver-gray (matches rgba(203, 213, 225, 0.75) at full opacity)
          secondary: "#e2e8f0", // Very light silver (matches rgba(226, 232, 240, 0.8) at full opacity)
          bright: "#ffffff", // Pure white
          glow: "rgba(59, 130, 246, 0.25)", // Subtle cool blue glow
        },
        gold: {
          primary: "#d4af37",
          secondary: "#b8941f",
          bright: "#f4d03f",
          glow: "rgba(212, 175, 55, 0.3)",
        },
        purple: {
          primary: "#8e44ad",
          secondary: "#7d3c98",
          bright: "#a569bd",
          glow: "rgba(142, 68, 173, 0.3)",
        },
      };

      const colors = themeColors[theme] || themeColors.blue;

      // Find the target element and set properties immediately
      let targetElement = null;
      if (this.element.querySelector(".eventide-sheet")) {
        targetElement = this.element.querySelector(".eventide-sheet");
      } else if (
        this.element.classList &&
        this.element.classList.contains("eventide-sheet")
      ) {
        targetElement = this.element;
      } else {
        targetElement = this.element;
      }

      if (targetElement && targetElement.style) {
        targetElement.style.setProperty("--theme-primary", colors.primary);
        targetElement.style.setProperty("--theme-secondary", colors.secondary);
        targetElement.style.setProperty("--theme-bright", colors.bright);
        targetElement.style.setProperty("--theme-glow", colors.glow);
      }

      Logger.debug(
        "Immediate theme properties set",
        {
          theme,
          colors,
          targetElement: !!targetElement,
        },
        "THEME",
      );
    }

    /**
     * Initialize theme management during render
     * Call this from your _onRender method
     * @protected
     */
    _initThemeManagement() {
      // Set theme properties immediately to prevent flashing
      // const currentTheme = CommonFoundryTasks.retrieveSheetTheme();
      // TESTING: Comment out JavaScript theme property setting to test pure CSS
      // this._setImmediateThemeProperties(currentTheme);

      // Initialize centralized theme management
      if (!this.themeManager) {
        this.themeManager = initThemeManager(
          this,
          THEME_PRESETS.CHARACTER_SHEET,
        );
      } else {
        // Re-apply themes on re-render
        this.themeManager.applyThemes();
      }

      Logger.debug(
        "Theme management initialized",
        {
          hasThemeManager: !!this.themeManager,
          sheetId: this.id,
        },
        "THEME",
      );
    }

    /**
     * Clean up theme management during close
     * Call this from your _preClose method
     * @protected
     */
    _cleanupThemeManagement() {
      // Clean up centralized theme management
      if (this.themeManager) {
        cleanupThemeManager(this);
        this.themeManager = null;
      }

      Logger.debug(
        "Theme management cleaned up",
        {
          appId: this.id,
          appName: this.constructor.name,
        },
        "THEME",
      );
    }

    /**
     * Handle setting the user's sheet theme preference (cycles through available themes)
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} _target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _setSheetTheme(_event, _target) {
      const currentTheme = CommonFoundryTasks.retrieveSheetTheme();
      Logger.methodEntry("ActorSheetThemeMixin", "_setSheetTheme", {
        actorName: this.actor?.name,
        currentTheme,
        userFlags: game.user.flags,
      });

      try {
        // Define the theme cycle order
        const themes = ["blue", "black", "green", "light", "gold", "purple"];

        // Find current theme index and move to next
        // Handle case where currentTheme might not be in the themes array
        let currentIndex = themes.indexOf(currentTheme);
        if (currentIndex === -1) {
          // If current theme is not found (corrupted data), default to blue (index 0)
          currentIndex = 0;
        }
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];

        Logger.debug("Theme cycling", {
          currentTheme,
          currentIndex,
          nextIndex,
          nextTheme,
          availableThemes: themes,
        });

        // Update both the user flag and the setting
        await CommonFoundryTasks.storeUserFlag("sheetTheme", nextTheme);
        await game.settings.set("eventide-rp-system", "sheetTheme", nextTheme);

        Logger.info("User theme flag and setting updated", {
          userName: game.user.name,
          newTheme: nextTheme,
          flagPath: "eventide-rp-system.sheetTheme",
          settingPath: "eventide-rp-system.sheetTheme",
        });

        // Trigger global theme change (this will handle re-rendering and notifications)
        triggerGlobalThemeChange(nextTheme, game.user.id);

        Logger.info("Sheet theme cycled successfully", {
          userName: game.user.name,
          previousTheme: currentTheme,
          newTheme: nextTheme,
        });

        Logger.methodExit("ActorSheetThemeMixin", "_setSheetTheme", nextTheme);
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Set sheet theme for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.UI,
          userMessage: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.SetSheetThemeError",
            {
              userName: game.user?.name || "Unknown",
            },
          ),
        });

        Logger.error("Failed to cycle sheet theme", {
          userName: game.user?.name,
          error: error.message,
          stack: error.stack,
        });

        Logger.methodExit("ActorSheetThemeMixin", "_setSheetTheme", null);
      }
    }
  };
