/**
 * Utility class for creating transformation items.
 * Directly creates transformations in the custom transformations compendium.
 */
export class TransformationCreator {
  /**
   * Constructor that immediately creates a transformation instead of showing a form
   * @param {Object} options - Creation options
   * @param {string} [options.name] - Optional name for the transformation
   */
  constructor({ name = null } = {}) {
    // Immediately create the transformation when instantiated
    this.createTransformation({ name });
  }

  /**
   * Render method for compatibility with existing macro calls
   * Does nothing since we create immediately in constructor
   * @param {boolean} force - Ignored
   * @returns {this} Returns this for chaining
   */
  render(_force = false) {
    // No-op since creation happens in constructor
    return this;
  }

  /**
   * Create a new transformation item in the custom transformations compendium
   * @param {Object} options - Creation options
   * @param {string} [options.name] - Optional name for the transformation
   * @returns {Promise<Item>} The created transformation item
   */
  async createTransformation({ name = null } = {}) {
    try {
      // Ensure the custom transformations compendium exists
      const pack = await this._ensureCustomTransformationsCompendium();

      // Create default transformation data
      const transformationData = {
        name: name || "New Transformation",
        type: "transformation",
        img: "icons/svg/ice-aura.svg",
        system: {
          description: "",
          size: 0, // Default to "no size change"
          cursed: false,
          embeddedCombatPowers: [],
          embeddedActionCards: [],
          resolveAdjustment: 0,
          powerAdjustment: 0,
          tokenImage: "",
        },
      };

      // Create the transformation item in the compendium
      const item = await Item.create(transformationData, {
        pack: pack.collection,
      });

      // Open the item sheet for editing
      if (item) {
        item.sheet.render(true);
        ui.notifications.info(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Info.TransformationCreated", {
            name: item.name,
          }),
        );
        // Show additional guidance notification
        setTimeout(() => {
          ui.notifications.info(
            game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.TransformationUsageGuidance"),
            { permanent: false }
          );
        }, 1500); // Delay so it shows after the creation message
      }

      return item;
    } catch (error) {
      console.error("Failed to create transformation:", error);
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.TransformationCreationFailed"),
      );
      throw error;
    }
  }

  /**
   * Static version for direct calls
   * @param {Object} options - Creation options
   * @returns {Promise<Item>} The created transformation item
   */
  static async createTransformation(options = {}) {
    const instance = new TransformationCreator();
    return await instance.createTransformation(options);
  }

  /**
   * Ensure the custom transformations compendium exists, create it if it doesn't
   * @returns {Promise<CompendiumCollection>} The custom transformations compendium
   * @private
   */
  async _ensureCustomTransformationsCompendium() {
    const packId = "world.customtransformations";
    let pack = game.packs.get(packId);

    if (!pack) {
      const packData = {
        name: "customtransformations",
        label: "Custom Transformations",
        type: "Item",
      };

      pack = await foundry.documents.collections.CompendiumCollection.createCompendium(packData);

      ui.notifications.info(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.CustomTransformationsCompendiumCreated"),
      );
    }

    return pack;
  }


  /**
   * Legacy method to maintain compatibility with existing macro calls
   * @deprecated Use TransformationCreator.createTransformation() instead
   */
  static async create(options = {}) {
    return await this.createTransformation(options);
  }
}
