import EventideRpSystemItemBase from "./base-item.mjs";

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
