/**
 * Base data model for the Eventide RP System.
 * Provides common functionality for all system data models.
 * @extends {foundry.abstract.TypeDataModel}
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
