import { createTabManagementMixin } from "./actor-sheet-tab-management.mjs";

/**
 * Actor Sheet Feature Tab Management Mixin
 *
 * Provides tab switching functionality for feature sections with state preservation
 * across renders. Handles active/inactive/all feature tab switching.
 *
 * This mixin is a thin wrapper around the generic tab management mixin,
 * configured specifically for feature tabs.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with feature tab management functionality
 */
export const ActorSheetFeatureTabsMixin = createTabManagementMixin({
  buttonSelector: ".feature-tab-button",
  contentSelector: ".feature-tab-content",
  buttonDataAttr: "data-feature-tab",
  contentDataAttr: "data-feature-content",
  defaultTab: "active",
  stateProperty: "_currentFeatureTab",
  initMethodName: "_initFeatureTabs",
  cleanupMethodName: "_cleanupFeatureTabs",
});

// Extend the mixin to provide specific initialization and cleanup methods
// that can be called from the actor sheet's _onRender
export const ActorSheetFeatureTabsMixinWithInit = (BaseClass) => {
  const MixedClass = ActorSheetFeatureTabsMixin(BaseClass);
  
  return class extends MixedClass {
    /**
      * Initialize feature tab management
      * @protected
      */
    _initFeatureTabManagement() {
      this._initFeatureTabs();
    }

    /**
      * Clean up feature tab management
      * @protected
      */
    _cleanupFeatureTabManagement() {
      this._cleanupFeatureTabs();
    }
  };
};