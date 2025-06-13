/**
 * Base data model for the Eventide RP System.
 *
 * This class serves as the foundation for all data models in the system,
 * providing common functionality and utilities that are shared across
 * actors, items, and other document types.
 *
 * Key Features:
 * - Provides a `toPlainObject()` method for serialization
 * - Extends Foundry's TypeDataModel with system-specific functionality
 * - Serves as the base class for all system data models
 *
 * @extends {foundry.abstract.TypeDataModel}
 * @abstract
 * @since 1.0.0
 */
export default class EventideRpSystemDataModel extends foundry.abstract
  .TypeDataModel {
  /**
   * Convert the schema to a plain object.
   *
   * The built in `toObject()` method will ignore derived data when using Data Models.
   * This additional method will instead use the spread operator to return a simplified
   * version of the data.
   *
   * @returns {object} Plain object either via deepClone or the spread operator.
   */
  toPlainObject() {
    return { ...this };
  }
}
