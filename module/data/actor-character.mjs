import EventideRpSystemActorBase from "./base-actor.mjs";

export default class EventideRpSystemCharacter extends EventideRpSystemActorBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.attributes = new fields.SchemaField({
      level: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 })
      }),
    });

    // Iterate over ability names and create a new SchemaField for each.
    schema.abilities = new fields.SchemaField(Object.keys(CONFIG.EVENTIDE_RP_SYSTEM.abilities).reduce((obj, ability) => {
      obj[ability] = new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      });
      return obj;
    }, {}));

    schema.hiddenAbilities = new fields.SchemaField({
      dice: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 20, min: 0 }),
      }),
      cmax: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 20, min: 0 }),
      }),
      cmin: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 20, min: 0 }),
      }),
      acrodc: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      }),
      physdc: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      }),
      fortdc: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      }),
      willdc: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      }),
      witsdc: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      }),
    });

    return schema;
  }

  prepareDerivedData() {
    // Loop through ability scores, and add their modifiers to our sheet output.
    for (const key in this.abilities) {
      // Modifier is just the value, as abilities don't have a modifier.
      this.abilities[key].mod = Math.floor(this.abilities[key].value);
      // Handle ability label localization.
      this.abilities[key].label = game.i18n.localize(CONFIG.EVENTIDE_RP_SYSTEM.abilities[key]) ?? key;
    }

    for (const key in this.hiddenAbilities) {
      // Modifier is just the value, as hidden abilities don't have a modifier.
      this.hiddenAbilities[key].mod = Math.floor(this.hiddenAbilities[key].value);
      // Handle ability label localization.
      this.hiddenAbilities[key].label = game.i18n.localize(CONFIG.EVENTIDE_RP_SYSTEM.hiddenAbilities[key]) ?? key;
    }
  }

  getRollData() {
    const data = {};

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@acro.mod + 4`.
    if (this.abilities) {
      for (let [k,v] of Object.entries(this.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    if (this.hiddenAbilities) {
      for (let [k,v] of Object.entries(this.hiddenAbilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    data.lvl = this.attributes.level.value;

    return data
  }
}