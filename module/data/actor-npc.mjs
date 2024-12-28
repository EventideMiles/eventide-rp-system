/**
 * This now matches the actor-character sheet and may change a bit depending on what
 * I end up finding out about linked tokens vs unlinked tokens: or if I need NPCs to
 * have different sheets.
 */

import EventideRpSystemActorBase from "./base-actor.mjs";

export default class EventideRpSystemNPC extends EventideRpSystemActorBase {
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
