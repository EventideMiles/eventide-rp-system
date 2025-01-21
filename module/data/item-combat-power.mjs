import EventideRpSystemItemBase from "./base-item.mjs";

export default class EventideRpSystemCombatPower extends EventideRpSystemItemBase {
  static LOCALIZATION_PREFIXES = [
    "EVENTIDE_RP_SYSTEM.Item.base",
    "EVENTIDE_RP_SYSTEM.Item.CombatPower",
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.cost = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 0,
    });

    schema.roll = new fields.SchemaField({
      type: new fields.StringField({
        initial: "roll",
        required: true,
        nullable: false,
        choices: ["roll", "flat"],
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
