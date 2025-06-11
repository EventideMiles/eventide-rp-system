import { EventideRpSystemItemBase } from "./_module.mjs";

/**
 * Data model for Action Card items in the Eventide RP System.
 *
 * Action cards are special items that can contain embedded items and effects,
 * and can execute complex attack chains or apply saved damage.
 */
export default class EventideRpSystemActionCard extends EventideRpSystemItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    /**
     * Single embedded item (combat power, gear, or feature)
     * Only used in attack chain mode
     */
    schema.embeddedItem = new fields.ObjectField({
      required: true,
      initial: {},
      nullable: true,
    });

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

    /**
     * Action card mode - determines behavior
     */
    schema.mode = new fields.StringField({
      required: true,
      initial: "attackChain",
      choices: ["attackChain", "savedDamage"],
    });

    /**
     * Attack chain configuration (only used when mode is "attackChain")
     */
    schema.attackChain = new fields.SchemaField({
      firstStat: new fields.StringField({
        required: true,
        initial: "acro",
        choices: ["acro", "phys", "fort", "will", "wits"],
      }),
      secondStat: new fields.StringField({
        required: true,
        initial: "phys",
        choices: ["acro", "phys", "fort", "will", "wits"],
      }),
      damageCondition: new fields.StringField({
        required: true,
        initial: "never",
        choices: ["never", "oneSuccess", "twoSuccesses"],
      }),
      damageFormula: new fields.StringField({
        required: true,
        initial: "1d6",
        blank: true,
      }),
      damageType: new fields.StringField({
        required: true,
        initial: "damage",
        choices: ["damage", "heal"],
      }),
      statusCondition: new fields.StringField({
        required: true,
        initial: "never",
        choices: ["never", "oneSuccess", "twoSuccesses", "rollValue"],
      }),
      statusThreshold: new fields.NumberField({
        required: false,
        initial: 15,
        integer: true,
        min: 1,
        max: 30,
      }),
    });

    /**
     * Embedded effects that can be applied on chain hits
     * Contains status effects and gear items that are applied based on the attack chain status condition
     */
    schema.embeddedStatusEffects = new fields.ArrayField(
      new fields.ObjectField({
        required: true,
      }),
      {
        required: true,
        initial: [],
      },
    );

    /**
     * Saved damage configuration (only used when mode is "savedDamage")
     */
    schema.savedDamage = new fields.SchemaField({
      formula: new fields.StringField({
        required: true,
        initial: "1d6",
        blank: true,
      }),
      type: new fields.StringField({
        required: true,
        initial: "damage",
        choices: ["damage", "heal"],
      }),
      description: new fields.StringField({
        required: true,
        initial: "",
        blank: true,
      }),
    });

    return schema;
  }
}
