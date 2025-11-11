import { Logger } from "./logger.mjs";

/**
 * Service for converting between actors and transformations
 */
export class TransformationConverter {
  /**
   * Default compendium names
   */
  static COMPENDIUMS = {
    actors: "convertedactors",
    actorsLabel: "Converted Actors",
    transformations: "convertedtransformations",
    transformationsLabel: "Converted Transformations",
  };

  /**
   * Convert an actor to a transformation item
   *
   * @param {Actor} actor - The actor to convert
   * @param {Object} options - Conversion options
   * @param {string} [options.name] - Name for the transformation (defaults to actor name)
   * @param {string} [options.folder] - Folder ID for world item creation
   * @param {string} [options.compendium] - Compendium pack ID (defaults to world.convertedtransformations)
   * @param {string} [options.createIn="compendium"] - Where to create: "world", "compendium", or "both"
   * @returns {Promise<{world: Item|null, compendium: Item|null}>} The created transformation items
   */
  static async actorToTransformation(actor, options = {}) {
    if (!game.user.isGM) {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnlyOperation"),
      );
      return { world: null, compendium: null };
    }

    const name = options.name || actor.name;
    const createIn = options.createIn || "compendium";
    const compendiumName =
      options.compendium || `world.${this.COMPENDIUMS.transformations}`;

    Logger.debug(
      `Converting actor "${actor.name}" to transformation "${name}"`,
      { actorId: actor.id, options },
      "TRANSFORMATION_CONVERTER",
    );

    // Build transformation data
    const transformationData = {
      name,
      type: "transformation",
      img: actor.img,
      system: {
        description: actor.system.biography || "",
        tokenImage: actor.prototypeToken.texture.src || "",
        size: this._calculateTokenSize(actor.prototypeToken),
        powerAdjustment: actor.system.power.max - 5, // 5 is default power max
        resolveAdjustment: actor.system.resolve.max - 10, // 10 is default resolve max
        cursed: false,
        abilityOverrides: {},
        embeddedCombatPowers: [],
        embeddedActionCards: [],
        actionCardGroups: foundry.utils.deepClone(
          actor.system.actionCardGroups || [],
        ),
      },
      effects: [],
    };

    // Create Active Effect changes for ability overrides
    const changes = [];
    for (const [key, ability] of Object.entries(actor.system.abilities)) {
      // Store in abilityOverrides for UI display
      transformationData.system.abilityOverrides[key] = ability.value;

      // Create Active Effect change for transformation override
      changes.push({
        key: `system.abilities.${key}.transformOverride`,
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: ability.value,
      });
    }

    // Create the Active Effect
    if (changes.length > 0) {
      transformationData.effects.push({
        name: transformationData.name,
        icon: transformationData.img,
        changes,
        disabled: false,
        duration: {},
        flags: {},
        tint: "#ffffff",
        transfer: true,
      });
    }

    // Extract embedded items (combat powers and action cards)
    const combatPowers = actor.items.filter(
      (item) => item.type === "combatPower",
    );
    const actionCards = actor.items.filter(
      (item) => item.type === "actionCard",
    );

    for (const power of combatPowers) {
      const powerData = power.toObject();
      powerData._id = foundry.utils.randomID();
      transformationData.system.embeddedCombatPowers.push(powerData);
    }

    for (const card of actionCards) {
      const cardData = card.toObject();
      cardData._id = foundry.utils.randomID();
      transformationData.system.embeddedActionCards.push(cardData);
    }

    // Create in world if requested
    let worldItem = null;
    if (createIn === "world" || createIn === "both") {
      const worldData = foundry.utils.deepClone(transformationData);
      if (options.folder) {
        worldData.folder = options.folder;
      }
      worldItem = await Item.create(worldData);
      Logger.debug(
        `Created transformation in world: ${worldItem.id}`,
        {},
        "TRANSFORMATION_CONVERTER",
      );
    }

    // Create in compendium if requested
    let compendiumItem = null;
    if (createIn === "compendium" || createIn === "both") {
      const pack = await this._ensureCompendium(
        compendiumName,
        "Item",
        this.COMPENDIUMS.transformationsLabel,
      );
      if (pack) {
        const compendiumData = foundry.utils.deepClone(transformationData);
        delete compendiumData.folder; // Compendiums don't use folders
        compendiumItem = await Item.create(compendiumData, {
          pack: pack.collection,
        });
        Logger.debug(
          `Created transformation in compendium: ${compendiumItem.id}`,
          { compendium: pack.collection },
          "TRANSFORMATION_CONVERTER",
        );
      }
    }

    ui.notifications.info(
      game.i18n.format(
        "EVENTIDE_RP_SYSTEM.Info.ActorConvertedToTransformation",
        {
          name,
        },
      ),
    );

    return { world: worldItem, compendium: compendiumItem };
  }

  /**
   * Convert a transformation to an actor
   *
   * @param {Item} transformation - The transformation item to convert
   * @param {Object} options - Conversion options
   * @param {string} [options.name] - Name for the actor (defaults to transformation name)
   * @param {string} [options.type="character"] - Actor type: "character" or "npc"
   * @param {string} [options.folder] - Folder ID for world actor creation
   * @param {string} [options.compendium] - Compendium pack ID (defaults to world.convertedactors)
   * @param {string} [options.createIn="compendium"] - Where to create: "world", "compendium", or "both"
   * @returns {Promise<{world: Actor|null, compendium: Actor|null}>} The created actors
   */
  static async transformationToActor(transformation, options = {}) {
    if (!game.user.isGM) {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnlyOperation"),
      );
      return { world: null, compendium: null };
    }

    if (transformation.type !== "transformation") {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ItemNotTransformation"),
      );
      return { world: null, compendium: null };
    }

    const name = options.name || transformation.name;
    const type = options.type || "character";
    const createIn = options.createIn || "compendium";
    const compendiumName =
      options.compendium || `world.${this.COMPENDIUMS.actors}`;

    Logger.debug(
      `Converting transformation "${transformation.name}" to actor "${name}"`,
      { transformationId: transformation.id, options },
      "TRANSFORMATION_CONVERTER",
    );

    // Build actor data
    const actorData = {
      name,
      type,
      img: transformation.img,
      system: {
        biography: transformation.system.description || "",
        power: {
          value: Math.max(0, 5 + transformation.system.powerAdjustment),
          max: Math.max(0, 5 + transformation.system.powerAdjustment),
        },
        resolve: {
          value: Math.max(1, 10 + transformation.system.resolveAdjustment),
          max: Math.max(1, 10 + transformation.system.resolveAdjustment),
        },
        abilities: {},
        actionCardGroups: foundry.utils.deepClone(
          transformation.system.actionCardGroups || [],
        ),
      },
      prototypeToken: {
        texture: {
          src: transformation.system.tokenImage || transformation.img,
        },
        actorLink: type === "character",
      },
    };

    // Apply token size
    if (transformation.system.size && transformation.system.size > 0) {
      const size =
        Math.floor(transformation.system.size) > 1
          ? Math.floor(transformation.system.size)
          : transformation.system.size === 0.5
            ? 0.5
            : 1;
      const scale =
        transformation.system.size === 0.5 ||
        transformation.system.size % 1 === 0
          ? 1
          : transformation.system.size % 1 === 0.75
            ? 0.75
            : 1 + 0.5 / size;
      actorData.prototypeToken.width = size;
      actorData.prototypeToken.height = size;
      actorData.prototypeToken.texture = {
        ...actorData.prototypeToken.texture,
        scaleX: scale,
        scaleY: scale,
      };
    }

    // Extract ability values from transformation override effects
    // First, collect all transformOverride values from Active Effects
    const transformOverrides = {};
    if (transformation.effects && transformation.effects.size > 0) {
      for (const effect of transformation.effects) {
        if (effect.changes) {
          for (const change of effect.changes) {
            // Look for transformOverride changes
            if (change.key.includes("transformOverride")) {
              // Extract the ability key from the change key
              // Format: system.abilities.{abilityKey}.transformOverride
              const match = change.key.match(
                /system\.abilities\.(\w+)\.transformOverride/,
              );
              if (match && match[1]) {
                const abilityKey = match[1];
                // Only use the first override found for each ability
                if (!transformOverrides[abilityKey]) {
                  transformOverrides[abilityKey] = change.value;
                }
              }
            }
          }
        }
      }
    }

    // Set ability values from transform overrides, defaulting to 1
    for (const key of Object.keys(CONFIG.EVENTIDE_RP_SYSTEM.abilities)) {
      actorData.system.abilities[key] = {
        value: transformOverrides[key] ?? 1, // Default to 1 if no override
      };
    }

    // Create the actor first (world or compendium)
    let worldActor = null;
    let compendiumActor = null;

    // Create in world if requested
    if (createIn === "world" || createIn === "both") {
      const worldData = foundry.utils.deepClone(actorData);
      if (options.folder) {
        worldData.folder = options.folder;
      }
      worldActor = await Actor.create(worldData);
      Logger.debug(
        `Created actor in world: ${worldActor.id}`,
        {},
        "TRANSFORMATION_CONVERTER",
      );

      // Add embedded items to world actor
      await this._addEmbeddedItemsToActor(worldActor, transformation);
    }

    // Create in compendium if requested
    if (createIn === "compendium" || createIn === "both") {
      const pack = await this._ensureCompendium(
        compendiumName,
        "Actor",
        this.COMPENDIUMS.actorsLabel,
      );
      if (pack) {
        const compendiumData = foundry.utils.deepClone(actorData);
        delete compendiumData.folder; // Compendiums don't use folders
        compendiumActor = await Actor.create(compendiumData, {
          pack: pack.collection,
        });
        Logger.debug(
          `Created actor in compendium: ${compendiumActor.id}`,
          { compendium: pack.collection },
          "TRANSFORMATION_CONVERTER",
        );

        // Add embedded items to compendium actor
        await this._addEmbeddedItemsToActor(compendiumActor, transformation);
      }
    }

    ui.notifications.info(
      game.i18n.format(
        "EVENTIDE_RP_SYSTEM.Info.TransformationConvertedToActor",
        {
          name,
        },
      ),
    );

    return { world: worldActor, compendium: compendiumActor };
  }

  /**
   * Calculate token size from prototype token data
   * Rounds scale values appropriately: < 1 becomes 0.5 (small), >= 1 rounds to nearest
   * width integer
   *
   * @param {Object} prototypeToken - The actor's prototype token
   * @returns {number} The calculated size
   * @private
   */
  static _calculateTokenSize(prototypeToken) {
    const scale = prototypeToken.texture?.scaleX ?? 1;
    const width = prototypeToken.width ?? 1;
    const height = prototypeToken.height ?? 1;

    const constrained = Math.min(Math.max(width, height), 5);

    if (scale < 1 && (width < 1 || height < 1)) {
      return 0.5; // Tiny
    } else if (scale < 1 && (width === 1 || height === 1)) {
      return 0.75; // Small
    } else if (constrained === 5 || scale === 1) {
      return constrained; // return early since 5.5 doesn't exist
    } else {
      return constrained + 0.5; // half size
    }
  }

  /**
   * Add embedded items from transformation to actor, converting status effects to features
   *
   * @param {Actor} actor - The target actor
   * @param {Item} transformation - The source transformation
   * @private
   */
  static async _addEmbeddedItemsToActor(actor, transformation) {
    const itemsToCreate = [];

    // Add embedded combat powers from raw data
    const embeddedPowers = transformation.system.embeddedCombatPowers || [];
    for (const powerData of embeddedPowers) {
      const newPowerData = foundry.utils.deepClone(powerData);
      newPowerData._id = foundry.utils.randomID();
      itemsToCreate.push(newPowerData);
    }

    // Add embedded action cards from raw data
    const embeddedCards = transformation.system.embeddedActionCards || [];
    for (const cardData of embeddedCards) {
      const newCardData = foundry.utils.deepClone(cardData);
      newCardData._id = foundry.utils.randomID();
      itemsToCreate.push(newCardData);
    }

    // Convert status effects to features (transformations can have status items)
    if (transformation.items && transformation.items.size > 0) {
      const statusEffects = transformation.items.filter(
        (item) => item.type === "status",
      );
      for (const status of statusEffects) {
        const featureData = {
          name: status.name,
          type: "feature",
          img: status.img,
          system: {
            description: status.system.description || "",
          },
        };
        itemsToCreate.push(featureData);
      }
    }

    // Create all items at once
    if (itemsToCreate.length > 0) {
      await actor.createEmbeddedDocuments("Item", itemsToCreate);
      Logger.debug(
        `Added ${itemsToCreate.length} items to actor ${actor.name}`,
        { actorId: actor.id },
        "TRANSFORMATION_CONVERTER",
      );
    }
  }

  /**
   * Ensure a compendium exists, creating it if necessary
   *
   * @param {string} packId - Full pack ID (e.g., "world.convertedactors")
   * @param {string} type - Document type ("Actor" or "Item")
   * @param {string} label - Display label for the compendium
   * @returns {Promise<CompendiumCollection|null>} The compendium pack
   * @private
   */
  static async _ensureCompendium(packId, type, label) {
    let pack = game.packs.get(packId);

    if (!pack) {
      // Extract name from packId (remove "world." prefix if present)
      const name = packId.replace(/^world\./, "");

      Logger.debug(
        `Creating new compendium: ${name}`,
        { type, label },
        "TRANSFORMATION_CONVERTER",
      );

      const packData = {
        name,
        label,
        type,
      };

      try {
        pack =
          await foundry.documents.collections.CompendiumCollection.createCompendium(
            packData,
          );
      } catch (error) {
        Logger.error(
          `Failed to create compendium ${name}`,
          error,
          "TRANSFORMATION_CONVERTER",
        );
        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.CompendiumCreationFailed",
            {
              name,
            },
          ),
        );
        return null;
      }
    }

    return pack;
  }
}
