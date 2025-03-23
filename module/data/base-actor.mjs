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
      max: new fields.NumberField({ ...requiredInteger, initial: 10 }),
    });
    schema.power = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 5, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 5, min: 0 }),
      maxChange: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      maxOverride: new fields.NumberField({ ...overrideInteger, initial: null }),
      total: new fields.NumberField({ ...requiredInteger, initial: 5, min: 0 }),
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
        {}
      )
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

    return schema;
  }

  /**
   * Prepare base actor data, calculating derived values.
   * @param {Object} actorData - The actor's data object.
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Calculate power total based on maxOverride and maxChange
    if (this.power) {
      this.power.total = this.power.maxOverride !== null
        ? this.power.maxOverride + this.power.maxChange
        : this.power.max + this.power.maxChange;
    }

    for (const key in this.abilities) {
      // Handle ability label localization.
      const current = this.abilities[key];
      current.label =
        game.i18n.localize(CONFIG.EVENTIDE_RP_SYSTEM.abilities[key]) ?? key;
      current.abbr =
        game.i18n.localize(
          CONFIG.EVENTIDE_RP_SYSTEM.abilityAbbreviations[key]
        ) ?? key;
      current.total = current.override
        ? current.override + current.change
        : current.value + current.change;
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
      0
    );

    this.statTotal.mainInit =
      (this.abilities.acro.total + this.abilities.wits.total) / 2;

    this.statTotal.subInit = this.statTotal.value / 100;
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
      for (let [k, v] of Object.entries(this.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    if (this.hiddenAbilities) {
      for (let [k, v] of Object.entries(this.hiddenAbilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    data.lvl = this.attributes.level.value;
    data.statTotal = this.statTotal.value;

    return data;
  }
}
