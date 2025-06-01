/**
 * NPC actor data model for the Eventide RP System.
 * Extends the base actor model. CR and XP fields are now handled in the base model.
 * @extends {EventideRpSystemActorBase}
 */

import EventideRpSystemActorBase from "./base-actor.mjs";

export default class EventideRpSystemNPC extends EventideRpSystemActorBase {
  static defineSchema() {
    const schema = super.defineSchema();

    // NPC-specific schema extensions can be added here if needed
    // CR and XP are now handled in the base actor model

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    // NPC-specific derived data calculations can be added here if needed
    // XP calculation is now handled in the base actor model
  }

  getRollData() {
    const data = super.getRollData();

    // NPC-specific roll data can be added here if needed
    // CR and XP are now included in the base roll data

    return data;
  }
}
