import { Logger } from "../../services/_module.mjs";

/**
 * Context Menu Mixin
 *
 * Provides context menu infrastructure including overflow handling,
 * drop zone management, and cleanup functionality.
 *
 * This mixin extracts shared context menu functionality used by
 * both actor-sheet and item-sheet.
 *
 * @param {class} BaseClass - The base sheet class to extend
 * @returns {class} Extended class with context menu functionality
 */
export const ContextMenuMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Array to store context menu references for cleanup
     * @type {Array<ContextMenu>}
     * @protected
     */
    _contextMenus = [];

    /**
     * Clean up any orphaned scrollbar-hide styles that may be left in the document
     * @private
     */
    _cleanupOrphanedScrollbarStyles() {
      // Find all scrollbar-hide style elements
      const orphanedStyles = document.querySelectorAll(
        'style[id^="erps-context-menu-scrollbar-hide"]',
      );

      orphanedStyles.forEach((style) => {
        // Check if the style belongs to a sheet that still exists
        const styleId = style.id;
        const sheetId = styleId.replace("erps-context-menu-scrollbar-hide-", "");

        // If this isn't our style, check if the owning sheet still exists
        if (sheetId !== this.id.toString()) {
          const owningElement =
            document.getElementById(`app-${sheetId}`) ||
            document.querySelector(`[data-appid="${sheetId}"]`);

          // If the owning sheet doesn't exist, remove the orphaned style
          if (!owningElement) {
            style.remove();
          }
        }
      });
    }

    /**
     * Manually bind all context menus to the current element
     * This ensures context menus work even when tabs are dynamically rendered
     * @param {Array<Object>} menuArray - Array of menu definitions
     * @protected
     */
    _bindAllContextMenus(menuArray) {
      menuArray.forEach((menu) => {
        if (menu) {
          try {
            menu.bind(this.element);
          } catch {
            // Silently ignore binding errors for menus that don't have matching elements yet
          }
        }
      });
    }

    /**
     * Wrapper for creating context menus with overflow handling and drop zone disabling
     * This fixes the issue where context menus get clipped by parent containers with overflow:hidden
     * and disables drop zones to prevent focus fighting between context menu and drop zones
     *
     * @param {ContextMenu} contextMenu - The context menu instance to enhance
     * @param {string} stopSelector - CSS selector for the container to stop at when searching for overflow parents
     * @protected
     */
    _enhanceContextMenuWithOverflowFix(
      contextMenu,
      stopSelector = ".window-content",
    ) {
      if (!contextMenu) return;

      // Check if this context menu has already been enhanced
      // This prevents duplicate onOpen/onClose handlers when context menus are rebound
      if (contextMenu._erpsOverflowFixApplied) {
        return;
      }

      // Mark this context menu as enhanced to prevent duplicate enhancement
      contextMenu._erpsOverflowFixApplied = true;

      // Override the onOpen callback to fix overflow clipping and disable drop zones
      const originalOnOpen = contextMenu.onOpen;
      contextMenu.onOpen = (target) => {
        // Find parent containers with overflow hidden
        const containers = [];
        let current = target;

        // Stop at the specified container
        const stopElement = target.closest(stopSelector);

        while (current && current !== stopElement) {
          const computedStyle = window.getComputedStyle(current);

          // Check any element with overflow hidden
          if (
            computedStyle.overflow === "hidden" ||
            computedStyle.overflowY === "hidden"
          ) {
            containers.push({
              element: current,
              overflow: current.style.overflow,
              overflowY: current.style.overflowY,
            });
            current.style.setProperty("overflow", "visible", "important");
            current.style.setProperty("overflowY", "visible", "important");
          }
          current = current.parentElement;
        }
        // Store for restoration
        this._overflowContainers = containers;

        // Disable ALL drop zones globally while context menu is open
        this._disableAllDropZones();

        // Add scoped style to hide scrollbars only for this specific sheet instance
        const scrollbarHideStyle = document.createElement("style");
        scrollbarHideStyle.id = `erps-context-menu-scrollbar-hide-${this.id}`;

        // Get unique identifier for this sheet to scope the style
        const sheetId =
          this.element.id || this.element.getAttribute("data-appid");

        scrollbarHideStyle.textContent = `
          #${sheetId} *,
          #${sheetId} *::before,
          #${sheetId} *::after {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          #${sheetId} *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        `;
        document.head.appendChild(scrollbarHideStyle);
        this._scrollbarHideStyle = scrollbarHideStyle;

        // Add CSS class to suppress hover animations on action card groups
        // This prevents flickering when context menu appears over action card groups
        this.element.classList.add("context-menu-active");

        if (originalOnOpen) originalOnOpen.call(contextMenu, target);
      };

      // Override the onClose callback to restore overflow and re-enable drop zones
      const originalOnClose = contextMenu.onClose;
      contextMenu.onClose = () => {
        // Call original close first to allow animation to complete
        if (originalOnClose) originalOnClose.call(contextMenu);

        // Delay restoration to allow ContextMenu animation to complete
        // The animation uses getBoundingClientRect which needs the menu visible
        window.requestAnimationFrame(() => {
          window.setTimeout(() => {
            // Restore all overflow values
            if (this._overflowContainers) {
              for (const {
                element,
                overflow,
                overflowY,
              } of this._overflowContainers) {
                element.style.overflow = overflow;
                element.style.overflowY = overflowY;
              }
              this._overflowContainers = [];
            }
            // Remove scrollbar hide style
            if (this._scrollbarHideStyle) {
              this._scrollbarHideStyle.remove();
              this._scrollbarHideStyle = null;
            }

            // Force scrollbars to redisplay by triggering a reflow
            // This ensures the browser recalculates scrollbar visibility
            if (this.element) {
              // eslint-disable-next-line no-unused-expressions
              this.element.offsetHeight; // Force reflow
            }

            // Remove CSS class to re-enable hover animations
            this.element.classList.remove("context-menu-active");

            // Re-enable ALL drop zones globally
            this._enableAllDropZones();
          }, 100); // Wait for animation to complete (Foundry's default is ~50ms)
        });
      };
    }

    /**
     * Disable ALL drop zones globally to prevent focus fighting with context menus
     * This affects drop zones across all sheets, including item sheets
     * @private
     */
    _disableAllDropZones() {
      const dropZones = document.querySelectorAll("[data-drop-zone]");
      dropZones.forEach((zone) => {
        zone.classList.add("erps-drop-zone-disabled");
        zone.style.pointerEvents = "none";
      });
    }

    /**
     * Re-enable ALL drop zones globally after context menu closes
     * @private
     */
    _enableAllDropZones() {
      const dropZones = document.querySelectorAll("[data-drop-zone]");
      dropZones.forEach((zone) => {
        zone.classList.remove("erps-drop-zone-disabled");
        zone.style.pointerEvents = "";
      });
    }

    /**
     * Clean up all context menus
     * Call this from your close method to ensure proper cleanup
     * @protected
     */
    _cleanupContextMenus() {
      // Remove scrollbar hide style if it exists
      if (this._scrollbarHideStyle) {
        this._scrollbarHideStyle.remove();
        this._scrollbarHideStyle = null;
      }

      // Restore overflow values if they exist
      if (this._overflowContainers) {
        for (const { element, overflow, overflowY } of this._overflowContainers) {
          element.style.overflow = overflow;
          element.style.overflowY = overflowY;
        }
        this._overflowContainers = [];
      }

      // Remove context menu active class
      if (this.element) {
        this.element.classList.remove("context-menu-active");
      }

      // Clean up orphaned scrollbar styles
      this._cleanupOrphanedScrollbarStyles();

      Logger.debug("Context menus cleaned up", {
        sheetId: this.id,
        contextMenuCount: this._contextMenus.length,
      });
    }
  };
