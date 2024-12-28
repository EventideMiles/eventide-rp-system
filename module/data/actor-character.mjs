/**
 * Most of the original functionality has been hoisted to base actor because I wanted
 * most of the function on both NPCs and players: may add something here some day so
 * left the functions and had them just call super to define for now.
 */

import EventideRpSystemActorBase from "./base-actor.mjs";

export default class EventideRpSystemCharacter extends EventideRpSystemActorBase {
  static defineSchema() {
    // const fields = foundry.data.fields;
    // const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }

  getRollData() {
    super.getRollData();
  }
}
