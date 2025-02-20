import EventideRpSystemDataModel from "./base-model.mjs";

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
