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
        mode: new fields.StringField({ initial: "" }),
      }),
    });

    schema.formula = new fields.StringField({ blank: true });

    return schema;
  }

  prepareDerivedData() {
    // Build the formula dynamically using string interpolation
    const roll = this.roll;

    this.formula = "";

    if (!this.actor) return;

    const rollData = this.actor.getRollData();

    //   if (roll.diceNum === 0)
    //     // If diceNum is 0 it means it's a flat bonus
    //     this.formula = `${roll.diceSize}${roll.diceBonus}`;
    //   else this.formula = `${roll.diceNum}${roll.diceSize}${roll.diceBonus}`;
  }
}
