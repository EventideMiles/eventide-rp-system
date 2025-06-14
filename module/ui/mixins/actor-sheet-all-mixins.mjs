import { ActorSheetStatusBarMixin } from "./actor-sheet-status-bar.mjs";
import { ActorSheetThemeMixin } from "./actor-sheet-theme.mjs";
import { ActorSheetGearTabsMixin } from "./actor-sheet-gear-tabs.mjs";
import { ActorSheetAdditionalActionsMixin } from "./actor-sheet-additional-actions.mjs";
import { ActorSheetFormOverrideMixin } from "./actor-sheet-form-overrides.mjs";
import { ActorSheetContextPreparationMixin } from "./actor-sheet-context-preparation.mjs";

/**
 * Combined Actor Sheet Mixins
 *
 * Applies all the new actor sheet mixins in the correct order.
 * This provides a single mixin that includes all the extracted functionality.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with all mixin functionality
 */
export const ActorSheetAllMixins = (BaseClass) =>
  ActorSheetContextPreparationMixin(
    ActorSheetFormOverrideMixin(
      ActorSheetAdditionalActionsMixin(
        ActorSheetGearTabsMixin(
          ActorSheetThemeMixin(ActorSheetStatusBarMixin(BaseClass)),
        ),
      ),
    ),
  );
