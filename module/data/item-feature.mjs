import EventideRpSystemItemBase from "./base-item.mjs";

export default class EventideRpSystemFeature extends EventideRpSystemItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
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

    schema.targeted = new fields.BooleanField({
      required: true,
      initial: false,
    });

    schema.roll = new fields.SchemaField({
      type: new fields.StringField({
        initial: "none",
        required: true,
        nullable: false,
        choices: ["roll", "flat", "none"],
      }),
      ability: new fields.StringField({
        required: true,
        nullable: false,
        choices: ["acro", "phys", "fort", "will", "wits", "unaugmented"],
        initial: "unaugmented",
      }),
      bonus: new fields.NumberField({ initial: 0 }),
      diceAdjustments: new fields.SchemaField({
        advantage: new fields.NumberField({ initial: 0, ...requiredInteger }),
        disadvantage: new fields.NumberField({
          initial: 0,
          ...requiredInteger,
        }),
        total: new fields.NumberField({ initial: 0, ...requiredInteger }),
      }),
    });

    return schema;
  }

  prepareDerivedData() {
    this.roll.diceAdjustments.total =
      this.roll.diceAdjustments.advantage -
      this.roll.diceAdjustments.disadvantage;
  }
}
