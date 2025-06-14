import EventideRpSystemDataModel from "./base-model.mjs";

/**
 * Base data model for all items in the Eventide RP System.
 *
 * This class defines the common schema and functionality shared by all item types
 * including gear, features, status effects, combat powers, transformations, and action cards.
 *
 * Common Fields:
 * - description: Rich text description of the item
 * - rollActorName: Whether to include actor name in roll messages
 *
 * @extends {EventideRpSystemDataModel}
 * @abstract
 * @since 1.0.0
 */
export default class EventideRpSystemItemBase extends EventideRpSystemDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.description = new fields.StringField({
      required: true,
      blank: true,
    });

    schema.rollActorName = new fields.BooleanField({
      required: true,
      initial: true,
    });

    return schema;
  }
}
