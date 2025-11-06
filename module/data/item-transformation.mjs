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

    // Store complete action card data
    schema.embeddedActionCards = new fields.ArrayField(
      new fields.ObjectField(),
    );

    schema.size = new fields.NumberField({
      required: true,
      initial: 0, // Default to "no size change"
      min: 0,
      max: 5,
      choices: [0, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
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

    // Action card groups for organizing transformation action cards
    schema.actionCardGroups = new fields.ArrayField(
      new fields.SchemaField({
        _id: new fields.DocumentIdField(),
        name: new fields.StringField({
          required: true,
          initial: "Group",
          blank: false,
        }),
        collapsed: new fields.BooleanField({
          required: true,
          initial: true,
        }),
        sort: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
      }),
      {
        required: true,
        initial: [],
      },
    );

    return schema;
  }

  /**
   * Add a combat power to this transformation's embedded combat powers.
   *
   * This method always creates a new, unique copy of the combat power data,
   * assigning it a new ID to prevent conflicts. It is stored directly in the
   * transformation's `system.embeddedCombatPowers` array.
   *
   * @param {Item} combatPower - The combat power item to add to this transformation.
   * @returns {Promise<EventideRpSystemTransformation>} This transformation instance for method chaining.
   * @throws {Error} If the provided item is not a combat power.
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

    // Create a complete copy of the combat power data.
    const powerData = combatPower.toObject();

    // Assign a new random ID to the copied data. This is crucial to ensure the
    // embedded power is treated as a distinct entity from its source, preventing
    // a range of ID-related conflicts and editor issues.
    powerData._id = foundry.utils.randomID();

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
   * Add an action card to this transformation's embedded action cards.
   *
   * This method always creates a new, unique copy of the action card data,
   * assigning it a new ID to prevent conflicts. It is stored directly in the
   * transformation's `system.embeddedActionCards` array.
   *
   * @param {Item} actionCard - The action card item to add to this transformation.
   * @returns {Promise<EventideRpSystemTransformation>} This transformation instance for method chaining.
   * @throws {Error} If the provided item is not an action card.
   * @async
   */
  async addActionCard(actionCard) {
    if (actionCard.type !== "actionCard") {
      throw new Error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.TransformationItemTypes"),
      );
    }

    // Get current action cards
    const actionCards = foundry.utils.deepClone(this.embeddedActionCards || []);

    // Create a complete copy of the action card data.
    const actionCardData = actionCard.toObject();

    // Assign a new random ID to the copied data. This is crucial to ensure the
    // embedded action card is treated as a distinct entity from its source, preventing
    // a range of ID-related conflicts and editor issues.
    actionCardData._id = foundry.utils.randomID();

    // Add to the array
    actionCards.push(actionCardData);

    // Update the parent document
    await this.parent.update({ "system.embeddedActionCards": actionCards });
    return this;
  }

  /**
   * Remove an action card from this transformation's embedded action cards
   *
   * Removes the action card with the specified ID from the embedded action cards array.
   * If the action card is not found, the method returns without making changes.
   *
   * @param {string} actionCardId - The ID of the action card to remove
   * @returns {Promise<EventideRpSystemTransformation>} This transformation instance for method chaining
   * @async
   */
  async removeActionCard(actionCardId) {
    // Get current action cards
    const actionCards = foundry.utils.deepClone(this.embeddedActionCards || []);

    // Find the action card to remove
    const index = actionCards.findIndex((ac) => ac._id === actionCardId);
    if (index === -1) {
      return this; // Not found
    }

    // Remove from the array
    actionCards.splice(index, 1);

    // Update the parent document
    await this.parent.update({ "system.embeddedActionCards": actionCards });
    return this;
  }

  /**
   * Get all embedded combat powers as temporary Item instances
   * @returns {Item[]} Array of temporary Item instances
   */
  getEmbeddedCombatPowers() {
    if (!this.embeddedCombatPowers?.length) return [];
    const transformationItem = this.parent;

    return this.embeddedCombatPowers.map((powerData) => {
      // Use the transformation's actor as the parent, or null if unowned.
      const actor = transformationItem?.isOwned
        ? transformationItem.parent
        : null;
      const tempItem = new CONFIG.Item.documentClass(powerData, {
        parent: actor,
      });

      // The temporary item is editable if the transformation is editable.
      Object.defineProperty(tempItem, "isEditable", {
        value: transformationItem.isEditable,
        configurable: true,
      });

      // Override the update method to persist changes back to the transformation.
      tempItem.update = async (data) => {
        const powers = foundry.utils.deepClone(this.embeddedCombatPowers);
        const powerIndex = powers.findIndex((p) => p._id === tempItem.id);
        if (powerIndex === -1) {
          throw new Error("Could not find embedded combat power to update.");
        }

        // Merge the updates into the stored data.
        powers[powerIndex] = foundry.utils.mergeObject(
          powers[powerIndex],
          data,
          { inplace: false },
        );

        // Persist the changes to the transformation item.
        await transformationItem.update({
          "system.embeddedCombatPowers": powers,
        });

        // Close the temporary sheet and re-render the transformation sheet.
        tempItem.sheet.close();
        transformationItem.sheet.render(true);
        return tempItem;
      };

      return tempItem;
    });
  }

  /**
   * Get all embedded action cards as temporary Item instances
   * @returns {Item[]} Array of temporary Item instances
   */
  getEmbeddedActionCards() {
    if (!this.embeddedActionCards?.length) return [];
    const transformationItem = this.parent;

    return this.embeddedActionCards.map((actionCardData) => {
      // Use the transformation's actor as the parent, or null if unowned.
      const actor = transformationItem?.isOwned
        ? transformationItem.parent
        : null;
      const tempItem = new CONFIG.Item.documentClass(actionCardData, {
        parent: actor,
      });

      // The temporary item is editable if the transformation is editable.
      Object.defineProperty(tempItem, "isEditable", {
        value: transformationItem.isEditable,
        configurable: true,
      });

      // Override the update method to persist changes back to the transformation.
      tempItem.update = async (data, options = {}) => {
        const actionCards = foundry.utils.deepClone(this.embeddedActionCards);
        const actionCardIndex = actionCards.findIndex(
          (ac) => ac._id === tempItem.id,
        );
        if (actionCardIndex === -1) {
          throw new Error("Could not find embedded action card to update.");
        }

        // Merge the updates into the stored data.
        actionCards[actionCardIndex] = foundry.utils.mergeObject(
          actionCards[actionCardIndex],
          data,
          { inplace: false },
        );

        // Persist the changes to the transformation item.
        // Pass through the fromEmbeddedItem flag while maintaining render: false
        const updateOptions = {
          render: false, // Always use render: false to prevent focus stealing
          ...options, // Include any options passed from embedded item updates
        };
        await transformationItem.update(
          {
            "system.embeddedActionCards": actionCards,
          },
          updateOptions,
        );

        // Update the temporary item's source data to stay in sync
        tempItem.updateSource(actionCards[actionCardIndex]);

        // Only close the sheet if this is a direct action card update, not an embedded item update
        // Also treat image updates as embedded item updates to prevent unwanted sheet closure
        const isImageUpdate = data.img !== undefined;
        if (!options.fromEmbeddedItem && !isImageUpdate) {
          // Close the temporary sheet and re-render the transformation sheet.
          tempItem.sheet.close();
          transformationItem.sheet.render(true);
        } else {
          // For embedded item updates and image updates, refresh both sheets without closing
          if (tempItem.sheet?.rendered) {
            tempItem.sheet.render(false);
          }
          // Also refresh the transformation sheet to show updated action card data
          if (transformationItem.sheet?.rendered) {
            transformationItem.sheet.render(false);
          }
        }

        return tempItem;
      };

      // Add embedded item update handling for transformation action cards
      // This handles updates from embedded items within transformation action cards
      const originalUpdate = tempItem.update;
      tempItem.update = async (data, options = {}) => {
        // If this is an update to embedded item or status effects, handle it specially
        if (
          data["system.embeddedItem"] ||
          data["system.embeddedStatusEffects"]
        ) {
          // Update the action card data in the transformation's embedded action cards array
          const actionCards = foundry.utils.deepClone(this.embeddedActionCards);
          const actionCardIndex = actionCards.findIndex(
            (ac) => ac._id === tempItem.id,
          );
          if (actionCardIndex === -1) {
            throw new Error("Could not find embedded action card to update.");
          }

          // Merge the updates into the stored data
          actionCards[actionCardIndex] = foundry.utils.mergeObject(
            actionCards[actionCardIndex],
            data,
            { inplace: false },
          );

          // Persist the changes to the transformation item
          const updateOptions = {
            render: false, // Always use render: false to prevent focus stealing
            ...options, // Include any options passed from embedded item updates
          };
          await transformationItem.update(
            {
              "system.embeddedActionCards": actionCards,
            },
            updateOptions,
          );

          // Update the temporary item's source data to stay in sync
          tempItem.updateSource(actionCards[actionCardIndex]);

          // Handle sheet lifecycle - don't close for embedded item updates
          if (!options.fromEmbeddedItem) {
            tempItem.sheet.close();
            transformationItem.sheet.render(true);
          } else {
            if (tempItem.sheet?.rendered) {
              tempItem.sheet.render(false);
            }
            if (transformationItem.sheet?.rendered) {
              transformationItem.sheet.render(false);
            }
          }

          return tempItem;
        } else {
          // For other updates, use the original action card update method
          return originalUpdate.call(tempItem, data, options);
        }
      };

      return tempItem;
    });
  }

  prepareDerivedData() {
    const DEFAULT_IMAGES = [
      "icons/svg/item-bag.svg",
      "icons/svg/ice-aura.svg",
      "",
      null,
      undefined,
    ];
    super.prepareDerivedData?.();

    if (!DEFAULT_IMAGES.includes(this.parent.img)) {
      this.tokenImage = this.parent.img;
    } else {
      this.tokenImage = "";
    }
  }

  /**
   * Override the update method to handle embedded item updates
   * @param {object} data - The update data
   * @param {object} options - Update options
   * @returns {Promise<Item>}
   */
  async update(data, options = {}) {
    // If this is an embedded item update, prevent automatic sheet re-rendering
    if (options.fromEmbeddedItem) {
      // Use noHook to prevent automatic sheet updates
      const result = await super.update(data, { ...options, render: false });

      // Only re-render if the sheet is open and rendered
      if (this.sheet?.rendered) {
        this.sheet.render(false);
      }

      return result;
    }

    // For regular updates, use default behavior
    return super.update(data, options);
  }
}
