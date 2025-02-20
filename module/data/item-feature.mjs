import EventideRpSystemItemBase from "./base-item.mjs";

export default class EventideRpSystemFeature extends EventideRpSystemItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.bgColor = new fields.ColorField({
      initial: "#70B87A",
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
