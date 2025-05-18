import EventideRpSystemItemBase from "./base-item.mjs";

export default class EventideRpSystemTransformation extends EventideRpSystemItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    // Store complete combat power data
    schema.embeddedCombatPowers = new fields.ArrayField(
      new fields.ObjectField()
    );

    return schema;
  }

  async addCombatPower(combatPower) {
    if (combatPower.type !== "combatPower") {
      throw new Error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.TransformationItemTypes")
      );
    }

    // Get current powers
    const powers = foundry.utils.deepClone(this.embeddedCombatPowers || []);

    // Check if it already exists
    if (powers.some((p) => p._id === combatPower.id)) {
      return this; // Already exists
    }

    // Create a complete copy of the combat power data
    const powerData = combatPower.toObject();

    // Add to the array
    powers.push(powerData);

    // Update the parent document
    await this.parent.update({ "system.embeddedCombatPowers": powers });
    return this;
  }

  async removeCombatPower(powerId) {
    // Get current powers
    const powers = foundry.utils.deepClone(this.embeddedCombatPowers || []);

    // Find the power to remove
    const index = powers.findIndex((p) => p._id === powerId);
    if (index === -1) {
      return this; // Not found
    }

    // Remove from the array
    powers.splice(index, 1);

    // Update the parent document
    await this.parent.update({ "system.embeddedCombatPowers": powers });
    return this;
  }

  /**
   * Get all embedded combat powers as temporary Item instances
   * @returns {Item[]} Array of temporary Item instances
   */
  getEmbeddedCombatPowers() {
    if (!this.embeddedCombatPowers?.length) return [];

    return this.embeddedCombatPowers.map((powerData) => {
      // Create a temporary Item instance from the data
      return new CONFIG.Item.documentClass(powerData, { parent: this.parent });
    });
  }
}
