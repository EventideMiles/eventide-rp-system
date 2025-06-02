import EventideRpSystemItemBase from "./base-item.mjs";

export default class EventideRpSystemTransformation extends EventideRpSystemItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    const requiredInteger = { required: true, nullable: false, integer: true };

    // Store complete combat power data
    schema.embeddedCombatPowers = new fields.ArrayField(
      new fields.ObjectField(),
    );

    schema.size = new fields.NumberField({
      required: true,
      initial: 1,
      min: 0.5,
      max: 5,
      choices: [0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
    });

    // Add token image property with proper categories
    schema.tokenImage = new fields.FilePathField({
      required: false,
      blank: true,
      initial: "",
      label: "EVENTIDE_RP_SYSTEM.Item.Transformation.TokenImage",
      hint: "EVENTIDE_RP_SYSTEM.Item.Transformation.TokenImageHint",
      button: true,
      categories: ["IMAGE"],
    });

    schema.powerAdjustment = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
    });

    schema.resolveAdjustment = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
    });

    schema.cursed = new fields.BooleanField({
      required: true,
      initial: false,
    });

    return schema;
  }

  /**
   * Add a combat power to this transformation's embedded combat powers
   *
   * Creates a complete copy of the combat power data and stores it in the transformation.
   * The combat power must be of type "combatPower" and will be ignored if it already exists.
   *
   * @param {Item} combatPower - The combat power item to add to this transformation
   * @returns {Promise<EventideRpSystemTransformation>} This transformation instance for method chaining
   * @throws {Error} If the provided item is not a combat power
   * @async
   */
  async addCombatPower(combatPower) {
    if (combatPower.type !== "combatPower") {
      throw new Error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.TransformationItemTypes"),
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

  /**
   * Remove a combat power from this transformation's embedded combat powers
   *
   * Removes the combat power with the specified ID from the embedded combat powers array.
   * If the power is not found, the method returns without making changes.
   *
   * @param {string} powerId - The ID of the combat power to remove
   * @returns {Promise<EventideRpSystemTransformation>} This transformation instance for method chaining
   * @async
   */
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
      // Use the transformation item's parent (the actor) as the parent for the combat power
      const actor = this.parent?.parent || this.parent;
      const tempItem = new CONFIG.Item.documentClass(powerData, {
        parent: actor,
      });

      // Override the isEditable property to make this item read-only
      Object.defineProperty(tempItem, "isEditable", {
        value: false,
        writable: false,
        configurable: false,
      });

      // Also override the sheet's isEditable property when it's accessed
      const originalSheet = tempItem.sheet;
      Object.defineProperty(tempItem, "sheet", {
        get() {
          if (originalSheet && !originalSheet._readOnlyOverridden) {
            Object.defineProperty(originalSheet, "isEditable", {
              value: false,
              writable: false,
              configurable: false,
            });
            originalSheet._readOnlyOverridden = true;
          }
          return originalSheet;
        },
        configurable: true,
      });

      return tempItem;
    });
  }

  prepareDerivedData() {
    const DEFAULT_IMAGES = ["icons/svg/item-bag.svg", "icons/svg/ice-aura.svg"];
    super.prepareDerivedData?.();

    if (!DEFAULT_IMAGES.includes(this.parent.img)) {
      this.tokenImage = this.parent.img;
    } else {
      this.tokenImage = "";
    }
  }
}
