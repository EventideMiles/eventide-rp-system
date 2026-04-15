/**
 * Theme Managed Popup Mixin
 *
 * A mixin that provides consistent theme lifecycle management for popup applications.
 * This eliminates duplicate theme initialization and cleanup code across all popup classes.
 *
 * @module ui/mixins/theme-managed-popup-mixin
 */

import {
  initThemeManager,
  THEME_PRESETS,
  applyThemeImmediate,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/_module.mjs";

/**
 * Mixin that adds theme lifecycle management to popup applications.
 *
 * This mixin provides:
 * - `_onFirstRender()`: Applies immediate theme styles and initializes the theme manager
 * - `_onRender()`: Re-applies themes on subsequent renders
 * - `_preClose()`: Cleans up theme manager resources
 *
 * @mixin
 * @param {class} BaseClass - The base class to extend with theme management
 * @returns {class} The extended class with theme management methods
 *
 * @example
 * class MyPopup extends ThemeManagedPopupMixin(EventidePopupHelpers) {
 *   // Your popup class now has automatic theme management
 * }
 */
export function ThemeManagedPopupMixin(BaseClass) {
  return class ThemeManagedPopup extends BaseClass {
    /**
     * Handle the first render of the popup application.
     * Applies theme immediately to prevent flashing, then initializes theme manager.
     * @override
     * @protected
     */
    async _onFirstRender() {
      await super._onFirstRender();

      // Apply theme immediately to prevent flashing
      applyThemeImmediate(this.element);

      // Initialize theme management only on first render (non-blocking)
      if (!this.themeManager) {
        initThemeManager(this, THEME_PRESETS.CREATOR_APPLICATION)
          .then((manager) => {
            this.themeManager = manager;
          })
          .catch((error) => {
            Logger.error(
              `Failed to initialize theme manager for ${this.constructor.name}`,
              error,
              "THEME",
            );
          });
      }
    }

    /**
     * Handle rendering of the popup application.
     * Re-applies themes on re-render (but doesn't reinitialize).
     * @param {ApplicationRenderContext} context - Prepared context data
     * @param {RenderOptions} options - Provided render options
     * @override
     * @protected
     */
    _onRender(context, options) {
      super._onRender(context, options);

      // Re-apply themes on re-render (but don't reinitialize)
      if (this.themeManager) {
        this.themeManager.applyThemes();
      }
    }

    /**
     * Clean up resources before closing the application.
     * Cleans up theme management for this specific instance.
     * @param {Object} options - The options for closing
     * @returns {Promise<void>}
     * @override
     */
    async _preClose(options) {
      // Clean up theme management for this specific instance
      if (this.themeManager) {
        cleanupThemeManager(this);
        this.themeManager = null;
      }

      await super._preClose(options);
    }
  };
}
