import { WindowSizingFixMixin } from "./window-sizing-fix-mixin.mjs";
import { EditModeCheckMixin } from "./edit-mode-check.mjs";

/**
 * Combined baseline mixins for all sheet types
 *
 * This combines the essential mixins that should be applied to all sheets:
 * - WindowSizingFixMixin: Fixes ApplicationV2 window sizing issues
 * - EditModeCheckMixin: Automatically handles form input states based on editable property
 *
 * @param {Class} BaseClass - The ApplicationV2 class to extend
 * @returns {Class} Extended class with all baseline sheet functionality
 */
export function BaselineSheetMixins(BaseClass) {
  return WindowSizingFixMixin(EditModeCheckMixin(BaseClass));
}

// Export individual mixins for cases where only specific functionality is needed
export { WindowSizingFixMixin, EditModeCheckMixin };
