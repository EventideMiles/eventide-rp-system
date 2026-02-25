import { Logger } from "../../services/logger.mjs";
import { CommonFoundryTasks } from "../../utils/_module.mjs";
import {
  initThemeManager,
  cleanupThemeManager,
  triggerGlobalThemeChange,
  THEME_PRESETS,
  THEME_COLORS,
} from "../../helpers/_module.mjs";
import { applyThemeImmediate } from "../../helpers/theme/theme-applicator.mjs";

/**
 * Item Sheet Theme Management Mixin
 *
 * Provides theme management functionality for item sheets, including theme cycling,
 * immediate theme property setting, and theme manager integration.
 * Reuses the core theme functionality from the actor sheet but with item-specific presets.
 *
 * @param {class} BaseClass - The base item sheet class to extend
 * @returns {class} Extended class with theme management functionality
 */
export const ItemSheetThemeMixin = (BaseClass) =>
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
      const colors = THEME_COLORS[theme] || THEME_COLORS.blue;

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
        "Immediate theme properties set for item sheet",
        {
          theme,
          colors,
          targetElement: !!targetElement,
          itemName: this.item?.name,
          itemType: this.item?.type,
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
      // Apply theme immediately to prevent flashing - this is synchronous and fast
      applyThemeImmediate(this.element);

      // Set theme properties immediately to prevent flashing
      // const currentTheme = CommonFoundryTasks.retrieveSheetTheme();
      // TESTING: Comment out JavaScript theme property setting to test pure CSS
      // this._setImmediateThemeProperties(currentTheme);

      // Initialize centralized theme management with item sheet preset
      if (!this.themeManager) {
        // Handle the async initialization properly
        initThemeManager(this, THEME_PRESETS.ITEM_SHEET)
          .then((manager) => {
            this.themeManager = manager;
            Logger.debug(
              "Theme management initialized asynchronously for item sheet",
              {
                hasThemeManager: !!this.themeManager,
                sheetId: this.id,
                itemName: this.item?.name,
                itemType: this.item?.type,
              },
              "THEME",
            );
          })
          .catch((error) => {
            Logger.error(
              "Failed to initialize theme manager for item sheet",
              error,
              "THEME",
            );
          });
      } else {
        // Re-apply themes on re-render
        this.themeManager.applyThemes();
      }

      Logger.debug(
        "Theme management initialization started for item sheet",
        {
          hasThemeManager: !!this.themeManager,
          sheetId: this.id,
          itemName: this.item?.name,
          itemType: this.item?.type,
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
        "Theme management cleaned up for item sheet",
        {
          appId: this.id,
          appName: this.constructor.name,
          itemName: this.item?.name,
          itemType: this.item?.type,
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
      Logger.methodEntry("ItemSheetThemeMixin", "_setSheetTheme", {
        itemName: this.item?.name,
        itemType: this.item?.type,
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

        Logger.debug("Theme cycling for item sheet", {
          currentTheme,
          currentIndex,
          nextIndex,
          nextTheme,
          availableThemes: themes,
          itemName: this.item?.name,
        });

        // Update both the user flag and the setting
        await CommonFoundryTasks.storeUserFlag("sheetTheme", nextTheme);
        await game.settings.set("eventide-rp-system", "sheetTheme", nextTheme);

        Logger.info("User theme flag and setting updated from item sheet", {
          userName: game.user.name,
          userId: game.user.id,
          oldTheme: currentTheme,
          newTheme: nextTheme,
          itemName: this.item?.name,
        });

        // Trigger global theme change to update all open sheets
        await triggerGlobalThemeChange(nextTheme);

        Logger.methodExit("ItemSheetThemeMixin", "_setSheetTheme", {
          success: true,
          newTheme: nextTheme,
        });
      } catch (error) {
        Logger.error(
          "Failed to set sheet theme from item sheet",
          error,
          "THEME",
        );
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ThemeUpdateFailed"),
        );
        Logger.methodExit("ItemSheetThemeMixin", "_setSheetTheme", {
          success: false,
          error: error.message,
        });
      }
    }
  };
