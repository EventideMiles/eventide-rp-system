import {
  ActorSheetGearActionsMixin,
  ActorSheetDocumentActionsMixin,
  ActorSheetTransformationActionsMixin,
  ActorSheetDragDropMixin,
} from "./_module.mjs";

/**
 * Combined Actor Sheet Actions Mixin
 *
 * This combines all the action-related mixins for actor sheets:
 * - ActorSheetGearActionsMixin: Gear management functionality
 * - ActorSheetDocumentActionsMixin: Document CRUD operations
 * - ActorSheetTransformationActionsMixin: Transformation management
 * - ActorSheetDragDropMixin: Drag and drop functionality
 *
 * @param {Class} BaseClass - The base actor sheet class to extend
 * @returns {Class} Extended class with all action functionality
 */
export function ActorSheetActionsMixin(BaseClass) {
  return ActorSheetDragDropMixin(
    ActorSheetTransformationActionsMixin(
      ActorSheetDocumentActionsMixin(ActorSheetGearActionsMixin(BaseClass)),
    ),
  );
}
