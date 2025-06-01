import EventideRpSystemDataModel from "./base-model.mjs";
/**
 * Base actor data model for the Eventide RP System.
 * Defines the common data schema shared by all actor types.
 * @extends {EventideRpSystemDataModel}
 */
export default class EventideRpSystemActorBase extends EventideRpSystemDataModel {
  /**
   * Define the data schema for actor documents.
   * @returns {Object} The actor data schema.
   * @static
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const overrideInteger = { integer: true, required: false, nullable: true };
    const schema = {};

    schema.resolve = new fields.SchemaField({
      value: new fields.NumberField({
        ...requiredInteger,
        initial: 10,
        min: 0,
      }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10, min: 1 }),
    });
    schema.power = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 5, min: 0 }),
      max: new fields.NumberField({
        required: true,
        initial: 5,
        min: 0,
      }),
    });
    schema.biography = new fields.StringField({ required: true, blank: true }); // equivalent to passing ({initial: ""}) for StringFields

    schema.attributes = new fields.SchemaField({
      level: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 1,
          min: 1,
        }),
      }),
    });

    // Iterate over ability names and create a new SchemaField for each.
    schema.abilities = new fields.SchemaField(
      Object.keys(CONFIG.EVENTIDE_RP_SYSTEM.abilities).reduce(
        (obj, ability) => {
          obj[ability] = new fields.SchemaField({
            value: new fields.NumberField({ ...requiredInteger, initial: 1 }),
            override: new fields.NumberField({
              ...overrideInteger,
              initial: null,
            }),
            transform: new fields.NumberField({
              ...requiredInteger,
              initial: 0,
            }),
            change: new fields.NumberField({ ...requiredInteger, initial: 0 }),
            total: new fields.NumberField({ ...requiredInteger, initial: 1 }),
            ac: new fields.NumberField({ ...requiredInteger, initial: 11 }),
            diceAdjustments: new fields.SchemaField({
              advantage: new fields.NumberField({
                ...requiredInteger,
                initial: 0,
              }),
              disadvantage: new fields.NumberField({
                ...requiredInteger,
                initial: 0,
              }),
              total: new fields.NumberField({
                ...requiredInteger,
                initial: 0,
              }),
              mode: new fields.StringField({
                required: false,
                initial: "",
              }),
            }),
          });
          return obj;
        },
        {},
      ),
    );

    schema.hiddenAbilities = new fields.SchemaField({
      dice: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 20,
          min: 0,
        }),
        total: new fields.NumberField({
          ...requiredInteger,
          initial: 20,
          min: 0,
        }),
        override: new fields.NumberField({ ...overrideInteger, initial: null }),
        change: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      cmax: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 20,
          min: 1,
        }),
        total: new fields.NumberField({
          ...requiredInteger,
          initial: 20,
          min: 1,
        }),
        override: new fields.NumberField({ ...overrideInteger, initial: null }),
        change: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      cmin: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 20,
          min: 1,
        }),
        total: new fields.NumberField({
          ...requiredInteger,
          initial: 20,
          min: 1,
        }),
        override: new fields.NumberField({ ...overrideInteger, initial: null }),
        change: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      fmin: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 1,
          min: 0,
        }),
        total: new fields.NumberField({
          ...requiredInteger,
          initial: 1,
          min: 0,
        }),
        override: new fields.NumberField({ ...overrideInteger, initial: null }),
        change: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      fmax: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 1,
          min: 1,
        }),
        total: new fields.NumberField({
          ...requiredInteger,
          initial: 1,
          min: 1,
        }),
        override: new fields.NumberField({ ...overrideInteger, initial: null }),
        change: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      vuln: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 0,
        }),
        total: new fields.NumberField({
          ...requiredInteger,
          initial: 0,
          min: 0,
        }),
        override: new fields.NumberField({ ...overrideInteger, initial: null }),
        change: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
    });

    schema.statTotal = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      mainInit: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
      }),
      subInit: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
      }),
    });

    // CR and XP fields (primarily for NPCs but available to all actors)
    schema.cr = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 0,
    });

    schema.xp = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
    });

    return schema;
  }

  /**
   * Prepare base actor data, calculating derived values.
   * @param {Object} actorData - The actor's data object.
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    for (const key in this.abilities) {
      // Handle ability label localization.
      const current = this.abilities[key];
      current.label =
        game.i18n.localize(CONFIG.EVENTIDE_RP_SYSTEM.abilities[key]) ?? key;
      current.abbr =
        game.i18n.localize(
          CONFIG.EVENTIDE_RP_SYSTEM.abilityAbbreviations[key],
        ) ?? key;
      current.total = current.override
        ? current.override + current.change + current.transform
        : current.value + current.change + current.transform;
      current.ac = current.total + 11;

      // Calculate total for diceAdjustments
      current.diceAdjustments.total =
        current.diceAdjustments.advantage -
        current.diceAdjustments.disadvantage;
      if (current.diceAdjustments.total < 0) {
        current.diceAdjustments.mode = "kl";
      } else if (current.diceAdjustments.total > 0) {
        current.diceAdjustments.mode = "k";
      } else {
        current.diceAdjustments.mode = "";
      }
    }

    for (const key in this.hiddenAbilities) {
      // Handle hidden ability label localization.
      const current = this.hiddenAbilities[key];
      current.label =
        game.i18n.localize(CONFIG.EVENTIDE_RP_SYSTEM.hiddenAbilities[key]) ??
        key;
      current.total = current.override
        ? current.override + current.change
        : current.value + current.change;
    }

    this.statTotal.value = Object.values(this.abilities).reduce(
      (total, ability) => {
        return total + ability.total;
      },
      0,
    );

    this.statTotal.mainInit =
      (this.abilities.acro.total + this.abilities.wits.total) / 2;

    this.statTotal.subInit = this.statTotal.value / 100;

    // Calculate XP from CR using the configurable formula (primarily for NPCs)
    if (this.cr !== undefined && this.cr >= 0) {
      this.xp = this.calculateXPFromCR();
    }
  }

  /**
   * Get the roll data for the actor.
   * @returns {Object} The roll data.
   */
  getRollData() {
    const data = {};

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@acro.total + 4`.
    if (this.abilities) {
      for (const [k, v] of Object.entries(this.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Keep hiddenAbilities as a nested object for critical detection
    // but also copy individual properties to top level for formula compatibility
    if (this.hiddenAbilities) {
      data.hiddenAbilities = foundry.utils.deepClone(this.hiddenAbilities);

      // Also copy individual hidden abilities to top level for backward compatibility
      for (const [k, v] of Object.entries(this.hiddenAbilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    data.lvl = this.attributes.level.value;
    data.statTotal = this.statTotal.value;
    data.cr = this.cr;
    data.xp = this.xp;

    return data;
  }

  /**
   * Calculate XP value from Challenge Rating using the configurable formula
   * @returns {number} The calculated XP value
   */
  calculateXPFromCR() {
    try {
      // Get the CR-to-XP formula from settings
      const formula =
        game.settings?.get("eventide-rp-system", "crToXpFormula") ||
        "Math.max(10, Math.floor(@cr * 200 * Math.pow(1.5, @cr)))";

      // Get roll data for formula evaluation
      const rollData = this.getRollData();

      // Replace @cr with the actual CR value in the formula
      const processedFormula = formula.replace(/@cr/g, this.cr);

      // Use Foundry's Roll class to safely evaluate the formula
      const roll = new Roll(processedFormula, rollData);
      const result = roll.evaluateSync();

      return Math.max(0, Math.floor(result.total));
    } catch (error) {
      console.warn("ERPS | Error calculating XP from CR:", error);
      // Fallback to simple calculation
      return Math.max(10, Math.floor(this.cr * 200));
    }
  }
}
