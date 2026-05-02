import { ItemSheetThemeMixin } from "./item-sheet-theme.mjs";
import { ItemSheetDragDropMixin } from "./item-sheet-drag-drop.mjs";
import { ItemSheetCharacterEffectsMixin } from "./item-sheet-character-effects.mjs";
import { ItemSheetActionsMixin } from "./item-sheet-actions.mjs";
import { ItemSheetEffectGuardsMixin } from "./item-sheet-effect-guards.mjs";
import { TransformationActionCardFormMixin } from "./transformation-action-card-form.mjs";

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
 *
 * Scroll position preservation is handled by Foundry V2's built-in
 * HandlebarsApplicationMixin via the `scrollable` PARTS configuration.
 *
 * @param {class} BaseClass - The base item sheet class to extend
 * @returns {class} Extended class with all item sheet functionality
 */
export function ItemSheetAllMixins(BaseClass) {
  return ItemSheetThemeMixin(
    ItemSheetDragDropMixin(
      ItemSheetCharacterEffectsMixin(
        ItemSheetActionsMixin(
          TransformationActionCardFormMixin(ItemSheetEffectGuardsMixin(BaseClass)),
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
};