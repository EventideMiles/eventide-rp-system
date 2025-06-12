import { Logger } from "../../services/logger.mjs";

/**
 * Actor Sheet Gear Tab Management Mixin
 *
 * Provides tab switching functionality for gear sections with state preservation
 * across renders. Handles equipped/unequipped gear tab switching.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with gear tab management functionality
 */
export const ActorSheetGearTabsMixin = (BaseClass) =>
  class extends BaseClass {
    // Current gear tab state
    _currentGearTab;

    /**
     * Initialize gear tab functionality with state preservation
     * @private
     */
    #initGearTabs() {
      const gearTabButtons = this.element.querySelectorAll(".gear-tab-button");
      const gearTabContents =
        this.element.querySelectorAll(".gear-tab-content");

      if (gearTabButtons.length === 0 || gearTabContents.length === 0) {
        return; // No gear tabs found, probably not on gear tab
      }

      // Store current active tab before re-initialization (if any)
      let currentActiveTab = this._currentGearTab;
      if (!currentActiveTab) {
        // Check if there's already an active tab in the DOM
        const activeButton = this.element.querySelector(
          ".gear-tab-button.active",
        );
        if (activeButton) {
          currentActiveTab = activeButton.getAttribute("data-gear-tab");
        } else {
          // Default to 'equipped' if no active tab found
          currentActiveTab = "equipped";
        }
      }

      // Remove existing event listeners to prevent duplicates
      gearTabButtons.forEach((button) => {
        // Clone the button to remove all event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
      });

      // Re-query buttons after cloning
      const newGearTabButtons =
        this.element.querySelectorAll(".gear-tab-button");

      // Handle tab button clicks
      newGearTabButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();

          const targetTab = button.getAttribute("data-gear-tab");

          // Store the selected tab
          this._currentGearTab = targetTab;

          // Remove active class from all buttons and contents
          newGearTabButtons.forEach((btn) => btn.classList.remove("active"));
          gearTabContents.forEach((content) =>
            content.classList.remove("active"),
          );

          // Add active class to clicked button and corresponding content
          button.classList.add("active");
          const targetContent = this.element.querySelector(
            `[data-gear-content="${targetTab}"]`,
          );
          if (targetContent) {
            targetContent.classList.add("active");
          }

          Logger.debug("Gear tab switched", {
            sheetId: this.id,
            actorName: this.actor?.name,
            targetTab,
          });
        });
      });

      // Restore the previously active tab
      this.#restoreGearTabState(
        currentActiveTab,
        newGearTabButtons,
        gearTabContents,
      );

      Logger.debug("Gear tabs initialized with state preservation", {
        sheetId: this.id,
        actorName: this.actor?.name,
        buttonCount: newGearTabButtons.length,
        contentCount: gearTabContents.length,
        activeTab: currentActiveTab,
      });
    }

    /**
     * Restore the gear tab state to the specified tab
     * @private
     * @param {string} targetTab - The tab to activate
     * @param {NodeList} buttons - The gear tab buttons
     * @param {NodeList} contents - The gear tab contents
     */
    #restoreGearTabState(targetTab, buttons, contents) {
      // Remove active class from all buttons and contents
      buttons.forEach((btn) => btn.classList.remove("active"));
      contents.forEach((content) => content.classList.remove("active"));

      // Find and activate the target tab
      const targetButton = this.element.querySelector(
        `[data-gear-tab="${targetTab}"]`,
      );
      const targetContent = this.element.querySelector(
        `[data-gear-content="${targetTab}"]`,
      );

      if (targetButton && targetContent) {
        targetButton.classList.add("active");
        targetContent.classList.add("active");
        this._currentGearTab = targetTab;
      } else {
        // Fallback to first available tab if target not found
        const firstButton = buttons[0];
        const firstContent = contents[0];
        if (firstButton && firstContent) {
          firstButton.classList.add("active");
          firstContent.classList.add("active");
          this._currentGearTab = firstButton.getAttribute("data-gear-tab");
        }
      }

      Logger.debug("Gear tab state restored", {
        sheetId: this.id,
        actorName: this.actor?.name,
        targetTab,
        actualTab: this._currentGearTab,
      });
    }

    /**
     * Clean up gear tab state
     * @private
     */
    #cleanupGearTabState() {
      // Clear gear tab state
      delete this._currentGearTab;

      Logger.debug("Gear tab state cleaned up", {
        appId: this.id,
        appName: this.constructor.name,
      });
    }

    /**
     * Initialize gear tab functionality during render
     * Call this from your _onRender method
     * @protected
     */
    _initGearTabManagement() {
      this.#initGearTabs();
    }

    /**
     * Clean up gear tab functionality during close
     * Call this from your _preClose method
     * @protected
     */
    _cleanupGearTabManagement() {
      this.#cleanupGearTabState();
    }
  };
