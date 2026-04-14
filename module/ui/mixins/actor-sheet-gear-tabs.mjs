import { createTabManagementMixin } from "./actor-sheet-tab-management.mjs";

/**
 * Actor Sheet Gear Tab Management Mixin
 *
 * Provides tab switching functionality for gear sections with state preservation
 * across renders. Handles equipped/unequipped gear tab switching.
 *
 * This mixin is a thin wrapper around the generic tab management mixin,
 * configured specifically for gear tabs.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with gear tab management functionality
 */
export const ActorSheetGearTabsMixin = createTabManagementMixin({
  buttonSelector: ".gear-tab-button",
  contentSelector: ".gear-tab-content",
  buttonDataAttr: "data-gear-tab",
  contentDataAttr: "data-gear-content",
  defaultTab: "equipped",
  stateProperty: "_currentGearTab",
});

// Extend the mixin to provide specific initialization and cleanup methods
export const ActorSheetGearTabsMixinWithInit = (BaseClass) => {
  const MixedClass = ActorSheetGearTabsMixin(BaseClass);
  
  return class extends MixedClass {
    /**
     * Initialize gear tab management
     * @protected
     */
    _initGearTabManagement() {
      this._initTabManagement();
    }

    /**
     * Clean up gear tab management
     * @protected
     */
    _cleanupGearTabManagement() {
      this._cleanupTabManagement();
    }
  };
};
