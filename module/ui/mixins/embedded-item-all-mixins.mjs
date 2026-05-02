import { EmbeddedItemConstructorMixin } from "./embedded-item-constructor.mjs";
import { EmbeddedItemDataMixin } from "./embedded-item-data.mjs";
import { EmbeddedItemCharacterEffectsMixin } from "./embedded-item-character-effects.mjs";
import { ItemSheetThemeMixin } from "./item-sheet-theme.mjs";

/**
 * Combined Embedded Item Mixins
 *
 * Combines all embedded item-specific mixins into a single mixin for easy application.
 * This includes constructor logic, data management, character effects, and theme management.
 *
 * Scroll position preservation is handled by Foundry V2's built-in
 * HandlebarsApplicationMixin via the `scrollable` PARTS configuration.
 *
 * @param {class} BaseClass - The base item sheet class to extend
 * @returns {class} Extended class with all embedded item functionality
 */
export const EmbeddedItemAllMixins = (BaseClass) =>
  ItemSheetThemeMixin(
    EmbeddedItemCharacterEffectsMixin(
      EmbeddedItemDataMixin(EmbeddedItemConstructorMixin(BaseClass)),
    ),
  );