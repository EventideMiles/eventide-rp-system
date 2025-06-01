import { Logger } from "../services/logger.mjs";
import {
  ActorTransformationMixin,
  ActorResourceMixin,
  ActorRollsMixin,
} from "./mixins/_module.mjs";
import { getSetting } from "../services/_module.mjs";

/**
 * Actor document class for the Eventide RP System
 *
 * Represents an actor in the Eventide RP System, extending the base Foundry VTT Actor class.
 * This class composes multiple mixins to provide comprehensive actor functionality including
 * transformations, resource management, and dice rolling.
 *
 * @extends {foundry.documents.Actor}
 */
export class EventideRpSystemActor extends ActorTransformationMixin(
  ActorResourceMixin(ActorRollsMixin(Actor)),
) {
  /**
   * Prepare actor data
   * @override
   */
  prepareData() {
    Logger.methodEntry("EventideRpSystemActor", "prepareData");

    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();

    Logger.methodExit("EventideRpSystemActor", "prepareData");
  }

  /**
   * Handle actor creation to automatically link character tokens and ensure NPCs are unlinked
   * @param {object} data - The initial data object provided to the document creation request
   * @param {object} options - Additional options which modify the creation request
   * @param {string} userId - The ID of the requesting user
   * @override
   */
  async _onCreate(data, options, userId) {
    Logger.methodEntry("EventideRpSystemActor", "_onCreate", {
      actorName: data.name,
      actorType: data.type,
      userId,
    });

    await super._onCreate(data, options, userId);

    // Handle token linking and vision setup based on actor type
    try {
      // Get the default vision range from settings
      const visionRange = getSetting("defaultTokenVisionRange") || 50;

      if (data.type === "character") {
        // Characters should ALWAYS be linked to their tokens
        await this.update({
          "prototypeToken.actorLink": true,
          "prototypeToken.sight.enabled": true,
          "prototypeToken.sight.range": visionRange,
        });

        Logger.debug(
          `Auto-linked prototype token and enabled vision for character actor: ${this.name}`,
          { visionRange },
          "ACTOR_CREATION",
        );
      } else if (data.type === "npc") {
        // NPCs should ALWAYS be unlinked from their tokens
        await this.update({
          "prototypeToken.actorLink": false,
          "prototypeToken.sight.enabled": true,
          "prototypeToken.sight.range": visionRange,
        });

        Logger.debug(
          `Ensured prototype token is unlinked and enabled vision for NPC actor: ${this.name}`,
          { visionRange },
          "ACTOR_CREATION",
        );
      }
    } catch (error) {
      Logger.warn(
        `Failed to set prototype token configuration for ${data.type} actor: ${this.name}`,
        error,
        "ACTOR_CREATION",
      );
      // Don't throw the error - token configuration failure shouldn't prevent actor creation
    }

    Logger.methodExit("EventideRpSystemActor", "_onCreate");
  }

  /**
   * Prepare base actor data that exists before any derived data or active effects
   * @override
   */
  prepareBaseData() {
    Logger.methodEntry("EventideRpSystemActor", "prepareBaseData");

    // This method is intentionally left empty as all data preparation happens
    // in prepareDerivedData() after active effects have been applied.
    // In the future, any data that needs to be initialized before active effects
    // should be set up here.

    Logger.methodExit("EventideRpSystemActor", "prepareBaseData");
  }

  /**
   * Augment the actor source data with additional dynamic data
   *
   * This method creates and calculates derived data that doesn't exist in the
   * strict data model but is needed for character sheets and rolls.
   *
   * @override
   */
  prepareDerivedData() {
    Logger.methodEntry("EventideRpSystemActor", "prepareDerivedData");

    const actorData = this;
    const flags =
      foundry.utils.getProperty(actorData.flags, "eventide-rp-system") || {};

    // Make these variables available for future derived data calculations
    const systemData = actorData.system;

    // TODO: Add derived data calculations here, such as:
    // - Calculating total abilities from base values and modifiers
    // - Deriving secondary statistics from primary ones
    // - Applying effects from items or status effects
    // - Computing resource maximums

    Logger.debug(
      "Prepared derived data for actor",
      {
        actorName: this.name,
        systemDataKeys: Object.keys(systemData),
        flagsKeys: Object.keys(flags),
      },
      "ACTOR_DATA",
    );

    Logger.methodExit("EventideRpSystemActor", "prepareDerivedData");
  }

  /**
   * Convert the actor document to a plain object for export or serialization
   *
   * The built in `toObject()` method will ignore derived data when using Data Models.
   * This additional method will instead use the spread operator to return a simplified
   * version of the data that includes derived properties.
   *
   * @returns {object} Plain object containing actor data
   */
  toPlainObject() {
    Logger.methodEntry("EventideRpSystemActor", "toPlainObject");

    const result = { ...this };

    // Simplify system data.
    result.system = this.system.toPlainObject();

    // Add items.
    result.items = this.items?.size > 0 ? this.items.contents : [];

    // Add effects.
    result.effects = this.effects?.size > 0 ? this.effects.contents : [];

    Logger.debug(
      "Converted actor to plain object",
      {
        itemCount: result.items.length,
        effectCount: result.effects.length,
      },
      "ACTOR_DATA",
    );

    Logger.methodExit("EventideRpSystemActor", "toPlainObject", result);
    return result;
  }

  /**
   * Get a summary of the actor's current state
   *
   * @returns {Object} Summary object with key actor information
   */
  getSummary() {
    const resources = this.getResourcePercentages();
    const transformation = this.getFlag(
      "eventide-rp-system",
      "activeTransformation",
    );
    const rollableAbilities = this.getRollableAbilities();

    return {
      name: this.name,
      type: this.type,
      resources,
      hasTransformation: !!transformation,
      transformationName: this.getFlag(
        "eventide-rp-system",
        "activeTransformationName",
      ),
      rollableAbilityCount: rollableAbilities.length,
      itemCount: this.items.size,
      effectCount: this.effects.size,
    };
  }

  /**
   * Check if the actor has a specific capability
   *
   * @param {string} capability - The capability to check for
   * @returns {boolean} Whether the actor has the capability
   */
  hasCapability(capability) {
    switch (capability) {
      case "transform":
        return this.isOwner;
      case "roll":
        return true;
      case "restore":
        return game.user.isGM;
      case "damage":
        return this.isOwner;
      default:
        Logger.warn(`Unknown capability check: ${capability}`, null, "ACTOR");
        return false;
    }
  }

  /**
   * Get the actor's display name with any status indicators
   *
   * @returns {string} Formatted display name
   */
  getDisplayName() {
    let displayName = this.name;

    // Add transformation indicator
    const transformationName = this.getFlag(
      "eventide-rp-system",
      "activeTransformationName",
    );
    if (transformationName) {
      displayName += ` (${transformationName})`;
    }

    // Add low resource indicators
    const lowResources = this.isLowResources();
    if (lowResources.any) {
      const indicators = [];
      if (lowResources.resolve) indicators.push("Low Resolve");
      if (lowResources.power) indicators.push("Low Power");
      displayName += ` [${indicators.join(", ")}]`;
    }

    return displayName;
  }
}
