import { ItemSheetThemeMixin } from "./item-sheet-theme.mjs";
import { ItemSheetDragDropMixin } from "./item-sheet-drag-drop.mjs";
import { ItemSheetCharacterEffectsMixin } from "./item-sheet-character-effects.mjs";
import { ItemSheetActionsMixin } from "./item-sheet-actions.mjs";
import { ItemSheetEffectGuardsMixin } from "./item-sheet-effect-guards.mjs";
import { TransformationActionCardFormMixin } from "./transformation-action-card-form.mjs";
import { ScrollPreservationMixin } from "./scroll-preservation.mjs";

/**
 * Combined Item Sheet Mixins
 *
 * Applies all item sheet mixins in the correct order to provide comprehensive
 * functionality for item sheets including:
 * - Theme management with item-specific presets
 * - Comprehensive drag-drop functionality
 * - Character effects management
 * - Action methods for various item types
 * - Effect guards and sanitization
 * - Transformation action card form handling
 * - Scroll position preservation across re-renders
 *
 * @param {class} BaseClass - The base item sheet class to extend
 * @returns {class} Extended class with all item sheet functionality
 */
export function ItemSheetAllMixins(BaseClass) {
  return ScrollPreservationMixin(
    ItemSheetThemeMixin(
      ItemSheetDragDropMixin(
        ItemSheetCharacterEffectsMixin(
          ItemSheetActionsMixin(
            TransformationActionCardFormMixin(ItemSheetEffectGuardsMixin(BaseClass)),
          ),
        ),
      ),
    ),
  );
}

// Export individual mixins for cases where only specific functionality is needed
export {
  ItemSheetThemeMixin,
  ItemSheetDragDropMixin,
  ItemSheetCharacterEffectsMixin,
  ItemSheetActionsMixin,
  ItemSheetEffectGuardsMixin,
  TransformationActionCardFormMixin,
  ScrollPreservationMixin,
};
