import { erpsRollHandler } from "../services/managers/roll-dice.mjs";
import { erpsMessageHandler } from "../services/managers/system-messages.mjs";

/**
 * Actor document class for the Eventide RP System
 *
 * Represents an actor in the Eventide RP System, extending the base Foundry VTT Actor class.
 * This class handles character data preparation, roll handling, resource management, and
 * character transformations.
 *
 * @extends {foundry.documents.Actor}
 */
export class EventideRpSystemActor extends Actor {
  /**
   * Prepare actor data
   * @override
   */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /**
   * Prepare base actor data that exists before any derived data or active effects
   * @override
   */
  prepareBaseData() {
    // This method is intentionally left empty as all data preparation happens
    // in prepareDerivedData() after active effects have been applied.
    // In the future, any data that needs to be initialized before active effects
    // should be set up here.
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
  }

  /**
   * Extend the standard getRollData() method to add additional fields
   *
   * @override
   * @returns {Object} The actor's roll data
   */
  getRollData() {
    return {
      ...super.getRollData(),
      ...(this.system.getRollData?.() ?? null),
    };
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
    const result = { ...this };

    // Simplify system data.
    result.system = this.system.toPlainObject();

    // Add items.
    result.items = this.items?.size > 0 ? this.items.contents : [];

    // Add effects.
    result.effects = this.effects?.size > 0 ? this.effects.contents : [];

    return result;
  }

  /**
   * Apply a transformation to the actor, changing the token appearance and storing the original state
   *
   * @param {Item} transformationItem - The transformation item to apply
   * @returns {Promise<Actor>} This actor after the update
   */
  async applyTransformation(transformationItem) {
    // Check if the operation can proceed
    if (!this._validateTransformationOperation(transformationItem)) {
      return this;
    }

    // Get all tokens linked to this actor
    const tokens = this.getActiveTokens();
    if (!tokens.length) return this;

    // Store original token data if needed
    await this._storeOriginalTokenData(tokens);

    // Set flags indicating active transformation
    await this._setTransformationFlags(transformationItem);

    // Update tokens with the transformation appearance
    await this._updateTokensForTransformation(tokens, transformationItem);

    // Create a chat message about the transformation
    await erpsMessageHandler.createTransformationMessage({
      actor: this,
      transformation: transformationItem,
      isApplying: true,
    });

    return this;
  }

  /**
   * Validate that a transformation can be applied
   *
   * @private
   * @param {Item} transformationItem - The transformation item to validate
   * @returns {boolean} Whether the transformation can proceed
   */
  _validateTransformationOperation(transformationItem) {
    // Check permissions
    if (!this.isOwner) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoPermission")
      );
      return false;
    }

    // Validate item type
    if (transformationItem.type !== "transformation") {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NotTransformation")
      );
      return false;
    }

    return true;
  }

  /**
   * Store the original token data before applying a transformation
   *
   * @private
   * @param {Token[]} tokens - Array of tokens to store data for
   * @returns {Promise<void>}
   */
  async _storeOriginalTokenData(tokens) {
    // Check if there's already an active transformation
    const hasActiveTransformation = this.getFlag(
      "eventide-rp-system",
      "activeTransformation"
    );

    // Only store original token data if there isn't already a transformation active
    // This ensures we maintain the original appearance, not the appearance of a previous transformation
    if (hasActiveTransformation) return;

    // Store original token data in flags
    const originalTokenData = tokens.map((token) => {
      return {
        tokenId: token.id,
        img: token.document.texture.src,
        scale: token.document.texture.scaleX,
        width: token.document.width,
        height: token.document.height,
      };
    });

    // Set flag with original token data
    await this.setFlag(
      "eventide-rp-system",
      "originalTokenData",
      originalTokenData
    );
  }

  /**
   * Set flags with active transformation information
   *
   * @private
   * @param {Item} transformationItem - The transformation item
   * @returns {Promise<void>}
   */
  async _setTransformationFlags(transformationItem) {
    await this.setFlag(
      "eventide-rp-system",
      "activeTransformation",
      transformationItem.id
    );
    await this.setFlag(
      "eventide-rp-system",
      "activeTransformationName",
      transformationItem.name
    );
    await this.setFlag(
      "eventide-rp-system",
      "activeTransformationCursed",
      transformationItem.system.cursed
    );
  }

  /**
   * Update tokens with the transformation appearance
   *
   * @private
   * @param {Token[]} tokens - Array of tokens to update
   * @param {Item} transformationItem - The transformation item
   * @returns {Promise<void>}
   */
  async _updateTokensForTransformation(tokens, transformationItem) {
    for (const token of tokens) {
      const updates = this._getTokenTransformationUpdates(transformationItem);

      // Apply updates if we have any
      if (Object.keys(updates).length > 0) {
        await token.document.update(updates);
      }
    }
  }

  /**
   * Calculate the token updates needed for a transformation
   *
   * @private
   * @param {Item} transformationItem - The transformation item
   * @returns {Object} The updates to apply to the token
   */
  _getTokenTransformationUpdates(transformationItem) {
    const updates = {};

    // Update token image if provided
    if (transformationItem.system.tokenImage) {
      updates["texture.src"] = transformationItem.system.tokenImage;
    }

    // Calculate size and scale based on the transformation size
    this._calculateTransformationSize(updates, transformationItem.system.size);

    return updates;
  }

  /**
   * Calculate the size and scale for a transformation
   *
   * @private
   * @param {Object} updates - The updates object to modify
   * @param {number} size - The transformation size value
   * @returns {void}
   */
  _calculateTransformationSize(updates, size) {
    const isHalfIncrement = (size * 10) % 10 === 5; // Check if it's a .5 increment
    const baseSize = Math.floor(size);

    if (size === 0.5) {
      // a 'tiny' creature
      updates.width = 0.5;
      updates.height = 0.5;
      updates["texture.scaleX"] = 1;
      updates["texture.scaleY"] = 1;
    } else if (size === 0.75) {
      // a 'small' creature
      updates.width = 1;
      updates.height = 1;
      updates["texture.scaleX"] = 0.75;
      updates["texture.scaleY"] = 0.75;
    } else {
      updates.width = baseSize;
      updates.height = baseSize;
      if (isHalfIncrement) {
        const scale = 1 + 0.5 / baseSize;
        updates["texture.scaleX"] = scale;
        updates["texture.scaleY"] = scale;
      } else {
        updates["texture.scaleX"] = 1;
        updates["texture.scaleY"] = 1;
      }
    }
  }

  /**
   * Remove the active transformation from the actor, restoring the original token appearance
   *
   * @returns {Promise<Actor>} This actor after the update
   */
  async removeTransformation() {
    // Check permissions
    if (!this.isOwner) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoPermission")
      );
      return this;
    }

    // Get the active transformation ID
    const transformationId = this.getFlag(
      "eventide-rp-system",
      "activeTransformation"
    );
    if (!transformationId) return this; // No active transformation

    // Get the transformation item: we cannot get from id because it gets a new one when applied
    let transformationItem = this.items.find(
      (item) => item.type === "transformation"
    );

    // Get the original token data
    const originalTokenData = this.getFlag(
      "eventide-rp-system",
      "originalTokenData"
    );
    if (!originalTokenData) return this;

    // Get all tokens linked to this actor
    const tokens = this.getActiveTokens();
    if (!tokens.length) return this;

    // Create a chat message about the transformation being removed
    if (transformationItem) {
      await erpsMessageHandler.createTransformationMessage({
        actor: this,
        transformation: transformationItem,
        isApplying: false,
      });
    }

    // Remove all transformation items
    for (const item of this.items) {
      if (item.type === "transformation") {
        await this.deleteEmbeddedDocuments("Item", [item.id]);
      }
    }

    // Restore original token data
    for (const token of tokens) {
      const originalData = originalTokenData.find(
        (d) => d.tokenId === token.id
      );
      if (!originalData) continue;

      await token.document.update({
        "texture.src": originalData.img,
        "texture.scaleX": originalData.scale,
        "texture.scaleY": originalData.scale,
        width: originalData.width,
        height: originalData.height,
      });
    }

    // Clear the flags
    await this.unsetFlag("eventide-rp-system", "originalTokenData");
    await this.unsetFlag("eventide-rp-system", "activeTransformation");
    await this.unsetFlag("eventide-rp-system", "activeTransformationName");
    await this.unsetFlag("eventide-rp-system", "activeTransformationCursed");

    return this;
  }

  /**
   * Add resolve points to the actor
   *
   * @param {number} value - The amount of resolve to add
   * @returns {Promise<Actor>} The updated actor
   */
  async addResolve(value) {
    return this.update({
      "system.resolve.value": erps.utils.clamp(
        this.system.resolve.value + value,
        0,
        this.system.resolve.max
      ),
    });
  }

  /**
   * Add power points to the actor
   *
   * @param {number} value - The amount of power to add
   * @returns {Promise<Actor>} The updated actor
   */
  async addPower(value) {
    return this.update({
      "system.power.value": erps.utils.clamp(
        this.system.power.value + value,
        0,
        this.system.power.max
      ),
    });
  }

  /**
   * Apply damage or healing to the actor's resolve
   *
   * @param {Object} options - The damage options
   * @param {string} [options.formula="1"] - The damage formula
   * @param {string} [options.label="Damage"] - Label for the damage roll
   * @param {string} [options.description=""] - Description of the damage
   * @param {string} [options.type="damage"] - "damage" or "heal"
   * @param {boolean} [options.critAllowed=false] - Whether crits are allowed
   * @param {boolean} [options.acCheck=false] - Whether to check against AC
   * @param {string|null} [options.soundKey=null] - Sound effect key
   * @returns {Promise<Roll>} The damage roll
   */
  async damageResolve({
    formula = "1",
    label = "Damage",
    description = "",
    type = "damage",
    critAllowed = false,
    acCheck = false,
    soundKey = null,
  }) {
    const rollData = {
      formula,
      label,
      type,
      critAllowed,
      description,
      acCheck,
      soundKey,
    };
    const roll = await erpsRollHandler.handleRoll(rollData, this);

    // Only apply damage if user has permission
    if (this.isOwner) {
      // Apply damage to resolve.
      if (type === "heal") {
        await this.addResolve(Math.abs(roll.total));
      } else {
        await this.addResolve(-Math.abs(roll.total));
      }
    }

    return roll;
  }

  /**
   * Generate a roll formula string for an ability roll
   *
   * @param {Object} params - Parameters for the ability roll
   * @param {string} params.ability - The ability identifier
   * @returns {Promise<string>} The roll formula string
   */
  async getRollFormula({ ability }) {
    const actorRollData = this.getRollData();
    const diceAdjustments = actorRollData.abilities[ability].diceAdjustments;
    const total = diceAdjustments.total;
    const absTotal = Math.abs(total);
    const rolltype = diceAdjustments.mode;

    if (ability === "unaugmented")
      return `1d${actorRollData.hiddenAbilities.dice.total}`;

    return `${absTotal + 1}d${
      actorRollData.hiddenAbilities.dice.total
    }${rolltype} + ${actorRollData.abilities[ability].total}`;
  }

  /**
   * Get the roll formulas for all of the actor's abilities
   *
   * @returns {Promise<Object>} Object with ability keys mapped to roll formulas
   * @example
   * // Returns: { acro: "2d20k + 5", phys: "1d20 + 3", ... }
   * const formulas = await actor.getRollFormulas();
   */
  async getRollFormulas() {
    const formulas = await Promise.all(
      Object.keys(CONFIG.EVENTIDE_RP_SYSTEM.abilities).map((ability) =>
        this.getRollFormula({ ability })
      )
    );

    return Object.fromEntries(
      Object.keys(CONFIG.EVENTIDE_RP_SYSTEM.abilities).map((ability, index) => [
        ability,
        formulas[index],
      ])
    );
  }

  /**
   * Roll an ability check for the actor
   *
   * @param {Object} params - Parameters for the ability roll
   * @param {string} params.ability - The ability identifier
   * @returns {Promise<Roll>} The evaluated roll
   */
  async rollAbility({ ability }) {
    const actorRollData = this.getRollData();
    const formula = await this.getRollFormula({ ability });

    const rollData = {
      formula,
      label: `${actorRollData.abilities[ability].label}`,
      type: ability,
    };

    return await erpsRollHandler.handleRoll(rollData, this);
  }

  /**
   * Restore the actor's resources and remove status effects
   *
   * This function can restore the actor's resolve and power to their maximum values,
   * and can remove specific status effects or all status effects from the actor.
   * Only Game Masters can use this function.
   *
   * @param {Object} options - The restoration options
   * @param {boolean} [options.resolve=false] - Whether to restore resolve to maximum
   * @param {boolean} [options.power=false] - Whether to restore power to maximum
   * @param {Item[]} [options.statuses=[]] - Array of status items to be removed
   * @param {boolean} [options.all=false] - Whether to remove all status effects
   * @returns {Promise<ChatMessage|null>} Message detailing the restoration process, or null if not GM
   */
  async restore({ resolve, power, statuses, all }) {
    if (!game.user.isGM) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.GMOnly")
      );
      return null;
    }

    // Determine which status effects to remove
    const statusArray =
      statuses?.length && !all
        ? Array.from(statuses)
            .filter((i) => i.type === "status")
            .map((i) => i.id)
        : all
        ? Array.from(this.items)
            .filter((i) => i.type === "status")
            .map((i) => i.id)
        : [];

    // Restore resources if requested
    if (resolve) await this.addResolve(this.system.resolve.max || 0);
    if (power) await this.addPower(this.system.power.max || 0);

    // Remove status effects if any were specified
    if (statusArray && statusArray.length > 0) {
      const statusIds = Array.from(this.items)
        .filter((i) => i.type === "status" && statusArray.includes(i.id))
        .map((i) => i.id);

      await this.deleteEmbeddedDocuments("Item", statusIds);
    }

    // Create chat message about the restoration
    return await erpsMessageHandler.createRestoreMessage({
      all,
      resolve,
      power,
      statuses: statuses
        ? Array.from(statuses).filter((i) => i.type === "status")
        : [],
      actor: this,
    });
  }
}
