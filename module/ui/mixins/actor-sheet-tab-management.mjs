/**
 * Actor Sheet Tab Management Mixin
 *
 * Provides generic tab switching functionality with state preservation across renders.
 * This mixin can be configured for different tab types (features, gear, etc.) by passing
 * configuration options.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @param {Object} config - Configuration object for tab management
 * @param {string} config.buttonSelector - CSS selector for tab buttons (e.g., ".feature-tab-button")
 * @param {string} config.contentSelector - CSS selector for tab contents (e.g., ".feature-tab-content")
 * @param {string} config.buttonDataAttr - Data attribute for tab buttons (e.g., "data-feature-tab")
 * @param {string} config.contentDataAttr - Data attribute for tab contents (e.g., "data-feature-content")
 * @param {string} config.defaultTab - Default tab to activate (e.g., "active" or "equipped")
 * @param {string} config.stateProperty - Property name for storing current tab state (e.g., "_currentFeatureTab")
 * @returns {class} Extended class with tab management functionality
 */
export const createTabManagementMixin = (config) => (BaseClass) =>
  class extends BaseClass {
    /**
     * Initialize tab functionality with state preservation
     * @private
     */
    #initTabs() {
      const tabButtons = this.element.querySelectorAll(config.buttonSelector);
      const tabContents = this.element.querySelectorAll(config.contentSelector);

      if (tabButtons.length === 0 || tabContents.length === 0) {
        return; // No tabs found, probably not on this tab
      }

      // Store current active tab before re-initialization (if any)
      let currentActiveTab = this[config.stateProperty];
      if (!currentActiveTab) {
        // Check if there's already an active tab in the DOM
        const activeButton = this.element.querySelector(
          `${config.buttonSelector}.active`,
        );
        if (activeButton) {
          currentActiveTab = activeButton.getAttribute(config.buttonDataAttr);
        } else {
          // Default to configured default tab
          currentActiveTab = config.defaultTab;
        }
      }

      // Remove existing event listeners to prevent duplicates
      tabButtons.forEach((button) => {
        // Clone the button to remove all event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
      });

      // Re-query buttons after cloning
      const newTabButtons = this.element.querySelectorAll(config.buttonSelector);

      // Handle tab button clicks
      newTabButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();

          const targetTab = button.getAttribute(config.buttonDataAttr);

          // Store the selected tab
          this[config.stateProperty] = targetTab;

          // Remove active class from all buttons and contents
          newTabButtons.forEach((btn) => btn.classList.remove("active"));
          tabContents.forEach((content) => content.classList.remove("active"));

          // Add active class to clicked button and corresponding content
          button.classList.add("active");
          const targetContent = this.element.querySelector(
            `[${config.contentDataAttr}="${targetTab}"]`,
          );
          if (targetContent) {
            targetContent.classList.add("active");
          }

        });
      });

      // Restore the previously active tab
      this.#restoreTabState(currentActiveTab, newTabButtons, tabContents);
    }

    /**
     * Restore the tab state to the specified tab
     * @private
     * @param {string} targetTab - The tab to activate
     * @param {NodeList} buttons - The tab buttons
     * @param {NodeList} contents - The tab contents
     */
    #restoreTabState(targetTab, buttons, contents) {
      // Remove active class from all buttons and contents
      buttons.forEach((btn) => btn.classList.remove("active"));
      contents.forEach((content) => content.classList.remove("active"));

      // Find and activate the target tab
      const targetButton = this.element.querySelector(
        `[${config.buttonDataAttr}="${targetTab}"]`,
      );
      const targetContent = this.element.querySelector(
        `[${config.contentDataAttr}="${targetTab}"]`,
      );

      if (targetButton && targetContent) {
        targetButton.classList.add("active");
        targetContent.classList.add("active");
        this[config.stateProperty] = targetTab;
      } else {
        // Fallback to first available tab if target not found
        const firstButton = buttons[0];
        const firstContent = contents[0];
        if (firstButton && firstContent) {
          firstButton.classList.add("active");
          firstContent.classList.add("active");
          this[config.stateProperty] = firstButton.getAttribute(config.buttonDataAttr);
        }
      }
    }

    /**
     * Clean up tab state
     * @private
     */
    #cleanupTabState() {
      // Clear tab state
      delete this[config.stateProperty];
    }

    /**
     * Initialize tab functionality during render
     * Call this from your _onRender method
     * @protected
     */
    _initTabManagement() {
      this.#initTabs();
    }

    /**
     * Clean up tab functionality during close
     * Call this from your _preClose method
     * @protected
     */
    _cleanupTabManagement() {
      this.#cleanupTabState();
    }
  };