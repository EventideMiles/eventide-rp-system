/**
 * Actor Sheet Feature Tab Management Mixin
 *
 * Provides tab switching functionality for feature sections with state preservation
 * across renders. Handles active/inactive/all feature tab switching.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with feature tab management functionality
 */
export const ActorSheetFeatureTabsMixin = (BaseClass) =>
  class extends BaseClass {
    // Current feature tab state
    _currentFeatureTab;

    /**
     * Initialize feature tab functionality with state preservation
     * @private
     */
    #initFeatureTabs() {
      const featureTabButtons = this.element.querySelectorAll(".feature-tab-button");
      const featureTabContents =
        this.element.querySelectorAll(".feature-tab-content");

      if (featureTabButtons.length === 0 || featureTabContents.length === 0) {
        return; // No feature tabs found, probably not on feature tab
      }

      // Store current active tab before re-initialization (if any)
      let currentActiveTab = this._currentFeatureTab;
      if (!currentActiveTab) {
        // Check if there's already an active tab in the DOM
        const activeButton = this.element.querySelector(
          ".feature-tab-button.active",
        );
        if (activeButton) {
          currentActiveTab = activeButton.getAttribute("data-feature-tab");
        } else {
          // Default to 'active' if no active tab found
          currentActiveTab = "active";
        }
      }

      // Remove existing event listeners to prevent duplicates
      featureTabButtons.forEach((button) => {
        // Clone the button to remove all event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
      });

      // Re-query buttons after cloning
      const newFeatureTabButtons =
        this.element.querySelectorAll(".feature-tab-button");

      // Handle tab button clicks
      newFeatureTabButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();

          const targetTab = button.getAttribute("data-feature-tab");

          // Store the selected tab
          this._currentFeatureTab = targetTab;

          // Remove active class from all buttons and contents
          newFeatureTabButtons.forEach((btn) => btn.classList.remove("active"));
          featureTabContents.forEach((content) =>
            content.classList.remove("active"),
          );

          // Add active class to clicked button and corresponding content
          button.classList.add("active");
          const targetContent = this.element.querySelector(
            `[data-feature-content="${targetTab}"]`,
          );
          if (targetContent) {
            targetContent.classList.add("active");
          }

        });
      });

      // Restore the previously active tab
      this.#restoreFeatureTabState(
        currentActiveTab,
        newFeatureTabButtons,
        featureTabContents,
      );

    }

    /**
     * Restore the feature tab state to the specified tab
     * @private
     * @param {string} targetTab - The tab to activate
     * @param {NodeList} buttons - The feature tab buttons
     * @param {NodeList} contents - The feature tab contents
     */
    #restoreFeatureTabState(targetTab, buttons, contents) {
      // Remove active class from all buttons and contents
      buttons.forEach((btn) => btn.classList.remove("active"));
      contents.forEach((content) => content.classList.remove("active"));

      // Find and activate the target tab
      const targetButton = this.element.querySelector(
        `[data-feature-tab="${targetTab}"]`,
      );
      const targetContent = this.element.querySelector(
        `[data-feature-content="${targetTab}"]`,
      );

      if (targetButton && targetContent) {
        targetButton.classList.add("active");
        targetContent.classList.add("active");
        this._currentFeatureTab = targetTab;
      } else {
        // Fallback to first available tab if target not found
        const firstButton = buttons[0];
        const firstContent = contents[0];
        if (firstButton && firstContent) {
          firstButton.classList.add("active");
          firstContent.classList.add("active");
          this._currentFeatureTab = firstButton.getAttribute("data-feature-tab");
        }
      }

    }

    /**
     * Clean up feature tab state
     * @private
     */
    #cleanupFeatureTabState() {
      // Clear feature tab state
      delete this._currentFeatureTab;

    }

    /**
     * Initialize feature tab functionality during render
     * Call this from your _onRender method
     * @protected
     */
    _initFeatureTabManagement() {
      this.#initFeatureTabs();
    }

    /**
     * Clean up feature tab functionality during close
     * Call this from your _preClose method
     * @protected
     */
    _cleanupFeatureTabManagement() {
      this.#cleanupFeatureTabState();
    }
  };