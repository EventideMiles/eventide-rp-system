import EventideRpSystemItemBase from "./base-item.mjs";

/**
 * Data model for Status items in the Eventide RP System.
 *
 * Status items represent temporary or permanent conditions that can be applied to actors.
 * They are primarily used for visual representation and organization, with customizable
 * background and text colors for easy identification.
 *
 * Schema Fields:
 * - bgColor: Background color for the status display (default: purple)
 * - textColor: Text color for the status display (default: white)
 *
 * @extends {EventideRpSystemItemBase}
 * @since 1.0.0
 */
export default class EventideRpSystemStatus extends EventideRpSystemItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.bgColor = new fields.ColorField({
      initial: "#7A70B8",
      blank: false,
      required: true,
    });
    schema.textColor = new fields.ColorField({
      initial: "#ffffff",
      blank: false,
      required: true,
    });

    return schema;
  }
}
