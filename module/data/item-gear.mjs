import EventideRpSystemItemBase from "./base-item.mjs";

export default class EventideRpSystemGear extends EventideRpSystemItemBase {
  static LOCALIZATION_PREFIXES = [
    "EVENTIDE_RP_SYSTEM.Item.base",
    "EVENTIDE_RP_SYSTEM.Item.Gear",
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.bgColor = new fields.ColorField({
      initial: "#8B4513",
      blank: false,
      required: true,
    });
    schema.textColor = new fields.ColorField({
      initial: "#ffffff",
      blank: false,
      required: true,
    });

    schema.quantity = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 1,
    });
    schema.weight = new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
      min: 0,
    });
    schema.cost = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
    });

    schema.targeted = new fields.BooleanField({
      required: true,
      initial: true,
    });

    schema.roll = new fields.SchemaField({
      type: new fields.StringField({
        initial: "roll",
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
    // Build the formula dynamically using string interpolation
    const roll = this.roll;

    this.formula = `${roll.diceNum}${roll.diceSize}${roll.diceBonus}`;
  }
}
