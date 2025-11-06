import { EventideRpSystemItemBase } from "./_module.mjs";

/**
 * Data model for Action Card items in the Eventide RP System.
 *
 * Action cards are special items that can contain embedded items and effects,
 * and can execute complex attack chains or apply saved damage.
 */
export default class EventideRpSystemActionCard extends EventideRpSystemItemBase {
  /**
   * Define the data schema for Action Card items.
   *
   * This schema defines the complete structure and validation rules for the most
   * complex item type in the Eventide RP System. Action cards support two modes:
   * attack chains with embedded items and saved damage for direct application.
   * Schema changes require careful migration planning and version compatibility checks.
   *
   * @static
   * @returns {Object} The complete data schema definition for action cards
   * @property {ObjectField} embeddedItem - Single embedded item for attack chains
   * @property {StringField} mode - Operating mode: "attackChain" or "savedDamage"
   * @property {SchemaField} attackChain - Attack chain configuration with dual stats
   * @property {SchemaField} savedDamage - Saved damage configuration for direct application
   * @property {ArrayField} embeddedStatusEffects - Collection of status effects to apply
   * @property {ArrayField} embeddedTransformations - Collection of transformations to apply
   * @property {SchemaField} transformationConfig - Transformation trigger conditions
   * @property {ColorField} bgColor - Background color for action card display
   * @property {ColorField} textColor - Text color for action card display
   * @property {StringField} repetitions - Number of repetitions formula (e.g., "1", "1d4")
   * @property {BooleanField} advanceInitiative - Whether to advance initiative after execution
   *
   * @example
   * // Access schema definition
   * const schema = EventideRpSystemActionCard.defineSchema();
   * console.log(schema.mode.choices); // ["attackChain", "savedDamage"]
   * console.log(schema.attackChain.fields.firstStat.choices); // ["acro", "phys", ...]
   *
   * @throws {Error} If field validation fails during schema creation
   *
   * @since 13.15.0
   * @author Eventide RP System
   *
   * @critical This method defines the core data structure for action cards.
   *          Modifications can break save compatibility and require migration scripts.
   *          Action cards are the primary complex workflow mechanism in the system.
   */
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
        choices: ["never", "oneSuccess", "twoSuccesses", "rollValue"],
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
      damageThreshold: new fields.NumberField({
        required: false,
        initial: 15,
        integer: true,
        min: 1,
      }),
      statusCondition: new fields.StringField({
        required: true,
        initial: "oneSuccess",
        choices: ["never", "oneSuccess", "twoSuccesses", "rollValue"],
      }),
      statusThreshold: new fields.NumberField({
        required: false,
        initial: 15,
        integer: true,
        min: 1,
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
     * Embedded transformations that can be applied on successful action card execution
     * Contains transformation items that are applied based on the success conditions
     */
    schema.embeddedTransformations = new fields.ArrayField(
      new fields.ObjectField({
        required: true,
      }),
      {
        required: true,
        initial: [],
      },
    );

    /**
     * Transformation configuration for when to apply embedded transformations
     */
    schema.transformationConfig = new fields.SchemaField({
      condition: new fields.StringField({
        required: true,
        initial: "oneSuccess",
        choices: ["never", "oneSuccess", "twoSuccesses", "rollValue"],
      }),
      threshold: new fields.NumberField({
        required: false,
        initial: 15,
        integer: true,
        min: 1,
      }),
    });

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

    /**
     * Whether to advance initiative after execution
     */
    schema.advanceInitiative = new fields.BooleanField({
      required: true,
      initial: false,
    });

    /**
     * Whether to attempt to reduce user inventory when transferring gear from effects column
     */
    schema.attemptInventoryReduction = new fields.BooleanField({
      required: true,
      initial: false,
    });

    /**
     * Repetition configuration - new action modes feature
     */

    /**
     * Number of repetitions to execute (roll formula)
     */
    schema.repetitions = new fields.StringField({
      required: true,
      initial: "1",
      blank: false,
    });

    /**
     * Whether to re-roll the embedded item for each repetition (attack chains only)
     */
    schema.repeatToHit = new fields.BooleanField({
      required: true,
      initial: false,
    });

    /**
     * Whether damage applies on every repetition (true) or just first success (false)
     */
    schema.damageApplication = new fields.BooleanField({
      required: true,
      initial: false,
    });

    /**
     * Whether status effects apply/intensify on every repetition
     */
    schema.statusPerSuccess = new fields.BooleanField({
      required: true,
      initial: false,
    });

    /**
     * Custom timing override between repetitions in seconds (0 = use system default)
     */
    schema.timingOverride = new fields.NumberField({
      required: true,
      initial: 0.0,
      min: 0,
      nullable: false,
    });

    /**
     * Whether to apply resource costs on each repetition (true) or just first execution (false)
     */
    schema.costOnRepetition = new fields.BooleanField({
      required: true,
      initial: false,
    });

    /**
     * Group ID for organizing action cards
     * Null means ungrouped
     */
    schema.groupId = new fields.StringField({
      required: false,
      initial: null,
      nullable: true,
    });

    return schema;
  }
}
