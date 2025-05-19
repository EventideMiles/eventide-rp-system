import EventideRpSystemItemBase from "./base-item.mjs";

export default class EventideRpSystemTransformation extends EventideRpSystemItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    // Store complete combat power data
    schema.embeddedCombatPowers = new fields.ArrayField(
      new fields.ObjectField()
    );

    schema.size = new fields.NumberField({
      required: true,
      initial: 1,
      min: 0.5,
      max: 5,
      choices: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
    });
    
    // Add token image property with proper categories
    schema.tokenImage = new fields.FilePathField({
      required: false,
      blank: true,
      initial: "",
      label: "EVENTIDE_RP_SYSTEM.Item.Transformation.TokenImage",
      hint: "EVENTIDE_RP_SYSTEM.Item.Transformation.TokenImageHint",
      button: true,
      categories: ["IMAGE"]
    });

    schema.cursed = new fields.BooleanField({
      required: true,
      initial: false,
    });

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

  prepareDerivedData() {
    const DEFAULT_IMAGE = "icons/svg/item-bag.svg";
    super.prepareDerivedData?.();

    if (this.parent.img !== DEFAULT_IMAGE) {
      this.tokenImage = this.parent.img;
    } else {
      this.tokenImage = "";
    }
  }
}
