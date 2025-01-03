import EventideRpSystemDataModel from "./base-model.mjs";

export default class EventideRpSystemActorBase extends EventideRpSystemDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
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
      max: new fields.NumberField({ ...requiredInteger, initial: 5 }),
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
            change: new fields.NumberField({ ...requiredInteger, initial: 0 }),
            total: new fields.NumberField({ ...requiredInteger, initial: 1 }),
            ac: new fields.NumberField({ ...requiredInteger, initial: 11 }),
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
        change: new fields.NumberField({
          ...requiredInteger,
          initial: 0,
        }),
        total: new fields.NumberField({
          ...requiredInteger,
          initial: 20,
          min: 0,
        }),
      }),
      cmax: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 20,
          min: 1,
        }),
        change: new fields.NumberField({
          ...requiredInteger,
          initial: 0,
        }),
        total: new fields.NumberField({
          ...requiredInteger,
          initial: 20,
          min: 1,
        }),
      }),
      cmin: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 20,
          min: 1,
        }),
        change: new fields.NumberField({
          ...requiredInteger,
          initial: 0,
        }),
        total: new fields.NumberField({
          ...requiredInteger,
          initial: 20,
          min: 1,
        }),
      }),
      fmin: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 1,
          min: 0,
        }),
        change: new fields.NumberField({
          ...requiredInteger,
          initial: 0,
        }),
        total: new fields.NumberField({
          ...requiredInteger,
          initial: 1,
          min: 0,
        }),
      }),
      fmax: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 1,
          min: 1,
        }),
        change: new fields.NumberField({
          ...requiredInteger,
          initial: 0,
        }),
        total: new fields.NumberField({
          ...requiredInteger,
          initial: 1,
          min: 1,
        }),
      }),
      sens: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 0,
        }),
        change: new fields.NumberField({
          ...requiredInteger,
          initial: 0,
        }),
        total: new fields.NumberField({
          ...requiredInteger,
          initial: 0,
        }),
      }),
    });

    return schema;
  }

  prepareDerivedData() {
    for (const key in this.abilities) {
      // Handle ability label localization.
      this.abilities[key].label =
        game.i18n.localize(CONFIG.EVENTIDE_RP_SYSTEM.abilities[key]) ?? key;
      this.abilities[key].abbr =
        game.i18n.localize(
          CONFIG.EVENTIDE_RP_SYSTEM.abilityAbbreviations[key]
        ) ?? key;
      this.abilities[key].total =
        this.abilities[key].value + this.abilities[key].change;
      this.abilities[key].ac = this.abilities[key].total + 11;
    }

    for (const key in this.hiddenAbilities) {
      // Handle hidden ability label localization.
      this.hiddenAbilities[key].label =
        game.i18n.localize(CONFIG.EVENTIDE_RP_SYSTEM.hiddenAbilities[key]) ??
        key;
      this.hiddenAbilities[key].total =
        this.hiddenAbilities[key].value + this.hiddenAbilities[key].change;
    }
  }

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

    return data;
  }
}
