import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";
import { erpsMessageHandler } from "../../services/_module.mjs";

/**
 * Actor Transformation Mixin
 *
 * Provides transformation functionality for actors, including applying and removing
 * transformations, managing token appearance changes, and handling power/resolve adjustments.
 *
 * @param {class} BaseClass - The base actor class to extend
 * @returns {class} Extended class with transformation functionality
 */
export const ActorTransformationMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Apply a transformation to the actor, changing the token appearance and storing the original state
     *
     * @param {Item} transformationItem - The transformation item to apply
     * @returns {Promise<Actor>} This actor after the update
     */
    async applyTransformation(transformationItem) {
      Logger.methodEntry("ActorTransformationMixin", "applyTransformation", {
        transformationId: transformationItem?.id,
        transformationName: transformationItem?.name,
      });

      // Check if the operation can proceed
      const [validationResult] = await ErrorHandler.handleAsync(
        Promise.resolve(
          this._validateTransformationOperation(transformationItem),
        ),
        {
          context: "Transformation Validation",
          errorType: ErrorHandler.ERROR_TYPES.VALIDATION,
          showToUser: false,
        },
      );

      if (!validationResult) {
        Logger.warn(
          "Transformation validation failed",
          transformationItem,
          "TRANSFORMATION",
        );
        return this;
      }

      // Get all tokens linked to this actor across all scenes
      const tokens = this._getAllTokensAcrossScenes();
      if (!tokens.length) {
        return this;
      }

      try {
        // Store original token data if needed
        await this._storeOriginalTokenData(tokens);

        // Ensure the transformation item is on the actor
        const actorTransformationItem =
          await this._ensureTransformationItemOnActor(transformationItem);

        // Apply transformation resolve and power adjustments
        await this._transformPowerAndResolveUpdate(actorTransformationItem);

        // Set flags indicating active transformation
        await this._setTransformationFlags(actorTransformationItem);

        // Update tokens with the transformation appearance
        await this._updateTokensForTransformation(
          tokens,
          actorTransformationItem,
        );

        // Create a chat message about the transformation
        await erpsMessageHandler.createTransformationMessage({
          actor: this,
          transformation: actorTransformationItem,
          isApplying: true,
        });

        return this;
      } catch (error) {
        const [, _handledError] = await ErrorHandler.handleAsync(
          Promise.reject(error),
          {
            context: "Apply Transformation",
            errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          },
        );

        return this;
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
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoPermission"),
        );
        return this;
      }

      // Get the active transformation ID
      const transformationId = this.getFlag(
        "eventide-rp-system",
        "activeTransformation",
      );
      if (!transformationId) {
        return this;
      }

      try {
        // Get the transformation item
        const transformationItem = this.items.find(
          (item) => item.type === "transformation",
        );

        // Get the original token data
        const originalTokenData = this.getFlag(
          "eventide-rp-system",
          "originalTokenData",
        );
        if (!originalTokenData) {
          Logger.warn(
            "No original token data found for transformation removal",
            null,
            "TRANSFORMATION",
          );
          return this;
        }

        // Get all tokens linked to this actor across all scenes
        const tokens = this._getAllTokensAcrossScenes();
        if (!tokens.length) {
          return this;
        }

        // Create a chat message about the transformation being removed
        if (transformationItem) {
          await erpsMessageHandler.createTransformationMessage({
            actor: this,
            transformation: transformationItem,
            isApplying: false,
          });
        }

        // Restore original token data
        await this._restoreOriginalTokenData(tokens, originalTokenData);

        // Restore original resolve and power values
        await this._restoreOriginalStats(originalTokenData);

        // Remove all transformation items
        await this._removeTransformationItems();

        // Clear the transformation flags
        await this._clearTransformationFlags();

        return this;
      } catch (error) {
        const [, _handledError] = await ErrorHandler.handleAsync(
          Promise.reject(error),
          {
            context: "Remove Transformation",
            errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          },
        );

        return this;
      }
    }

    /**
     * Transforms power and resolve statistics based on a transformation item and updates the actor.
     * If there's a current transformation, calculates the difference between the current and new adjustments.
     * If there's no current transformation, applies the new adjustments directly.
     *
     * @param {Object} actorTransformationItem - The transformation item on the actor
     * @param {number} actorTransformationItem.system.powerAdjustment - The power adjustment value from the transformation
     * @param {number} actorTransformationItem.system.resolveAdjustment - The resolve adjustment value from the transformation
     * @returns {Promise<Actor>} A promise that resolves to the updated actor
     * @private
     */
    async _transformPowerAndResolveUpdate(actorTransformationItem) {

      const newPowerAdjustment = Number(
        actorTransformationItem.system.powerAdjustment,
      );
      const newResolveAdjustment = Number(
        actorTransformationItem.system.resolveAdjustment,
      );

      // Apply the new adjustments
      const updateData = {
        "system.resolve.max": Math.max(
          this.system.resolve.max + newResolveAdjustment,
          0,
        ),
        "system.resolve.value": this._clampValue(
          this.system.resolve.value + newResolveAdjustment,
          0,
          this.system.resolve.max + newResolveAdjustment,
        ),
        "system.power.max": Math.max(
          this.system.power.max + newPowerAdjustment,
          0,
        ),
        "system.power.value": this._clampValue(
          this.system.power.value + newPowerAdjustment,
          0,
          this.system.power.max + newPowerAdjustment,
        ),
      };

      return await this.update(updateData);
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
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoPermission"),
        );
        return false;
      }

      // Validate item type
      if (!transformationItem || transformationItem.type !== "transformation") {
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NotTransformation"),
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
      // Check if there's already an active transformation by checking the flag
      // This is more reliable than counting items since items can be added before flags are set
      const hasActiveTransformation = this.getFlag(
        "eventide-rp-system",
        "activeTransformation",
      );

      // Only store original token data if there isn't already a transformation active
      // This ensures we maintain the original appearance, not the appearance of a previous transformation
      if (hasActiveTransformation) {
        return;
      }

      // Store original token data in flags with scene information for cross-scene support
      const originalTokenData = tokens.map((tokenInfo) => {
        const tokenDoc = tokenInfo.document;
        const scene = tokenInfo.scene;
        return {
          tokenId: tokenDoc.id,
          sceneId: scene.id,
          sceneName: scene.name,
          img: tokenDoc.texture.src,
          scale: tokenDoc.texture.scaleX,
          width: tokenDoc.width,
          height: tokenDoc.height,
          maxResolve: this.system.resolve.max,
          maxPower: this.system.power.max,
        };
      });

      // Set flag with original token data
      await this.setFlag(
        "eventide-rp-system",
        "originalTokenData",
        originalTokenData,
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

      // Get embedded combat powers data
      const embeddedCombatPowers =
        transformationItem.system.getEmbeddedCombatPowers();
      const embeddedCombatPowersData = embeddedCombatPowers.map((power) =>
        power.toObject(),
      );

      // Get embedded action cards data
      const embeddedActionCards =
        transformationItem.system.getEmbeddedActionCards();
      const embeddedActionCardsData = embeddedActionCards.map((actionCard) =>
        actionCard.toObject(),
      );

      await this.setFlag(
        "eventide-rp-system",
        "activeTransformation",
        transformationItem.id,
      );
      await this.setFlag(
        "eventide-rp-system",
        "activeTransformationName",
        transformationItem.name,
      );
      await this.setFlag(
        "eventide-rp-system",
        "activeTransformationCursed",
        transformationItem.system.cursed,
      );
      await this.setFlag(
        "eventide-rp-system",
        "activeTransformationCombatPowers",
        embeddedCombatPowersData,
      );
      await this.setFlag(
        "eventide-rp-system",
        "activeTransformationActionCards",
        embeddedActionCardsData,
      );

    }

    /**
     * Update tokens with the transformation appearance across all scenes
     *
     * @private
     * @param {Object[]|Token[]} tokens - Array of token objects (with scene info) or legacy token array
     * @param {Item} transformationItem - The transformation item
     * @returns {Promise<void>}
     */
    async _updateTokensForTransformation(tokens, transformationItem) {
      const transformationUpdates =
        this._getTokenTransformationUpdates(transformationItem);

      if (Object.keys(transformationUpdates).length === 0) {
        return;
      }

      // Group tokens by scene for efficient batch updates
      const sceneUpdates = new Map();

      for (const tokenInfo of tokens) {
        const tokenDoc = tokenInfo.document;
        const scene = tokenInfo.scene;

        if (!scene) {
          continue;
        }

        const sceneId = scene.id;
        if (!sceneUpdates.has(sceneId)) {
          sceneUpdates.set(sceneId, []);
        }

        // Add transformation updates to this token
        sceneUpdates.get(sceneId).push({
          _id: tokenDoc.id,
          ...transformationUpdates,
        });
      }

      // Execute batch updates for each scene
      for (const [sceneId, updates] of sceneUpdates) {
        const scene = game.scenes.get(sceneId);
        if (scene && updates.length > 0) {
          try {
            await scene.updateEmbeddedDocuments("Token", updates);
          } catch (error) {
            Logger.error(
              `Failed to update tokens in scene "${scene.name}"`,
              error,
              "TRANSFORMATION",
            );
          }
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
      // Skip size changes if size is 0 ("no size change")
      if (transformationItem.system.size > 0) {
        this._calculateTransformationSize(
          updates,
          transformationItem.system.size,
        );
      }

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
     * Remove all transformation items from the actor
     *
     * @private
     * @returns {Promise<void>}
     */
    async _removeTransformationItems() {
      const transformationIds = this.items
        .filter((item) => item.type === "transformation")
        .map((item) => item.id);

      if (transformationIds.length > 0) {
        await this.deleteEmbeddedDocuments("Item", transformationIds);
      }
    }

    /**
     * Restore original token data for all tokens across all scenes
     *
     * @private
     * @param {Object[]|Token[]} tokens - Array of token objects (with scene info) or legacy token array
     * @param {Object[]} originalTokenData - Original token data array (with scene information)
     * @returns {Promise<void>}
     */
    async _restoreOriginalTokenData(tokens, originalTokenData) {

      // Group restoration updates by scene for efficient batch updates
      const sceneRestoreUpdates = new Map();

      for (const tokenInfo of tokens) {
        const tokenDoc = tokenInfo.document;
        const scene = tokenInfo.scene;

        if (!scene) {
          continue;
        }

        // Find original data for this token, considering both tokenId and sceneId for uniqueness
        const originalData = originalTokenData.find(
          (d) =>
            d.tokenId === tokenDoc.id && (d.sceneId === scene.id || !d.sceneId), // Handle legacy data without sceneId
        );

        if (!originalData) {
          continue;
        }

        const sceneId = scene.id;
        if (!sceneRestoreUpdates.has(sceneId)) {
          sceneRestoreUpdates.set(sceneId, []);
        }

        const restoreUpdates = {
          _id: tokenDoc.id,
          "texture.src": originalData.img,
          "texture.scaleX": originalData.scale,
          "texture.scaleY": originalData.scale,
          width: originalData.width,
          height: originalData.height,
        };

        sceneRestoreUpdates.get(sceneId).push(restoreUpdates);
      }

      // Execute batch restoration updates for each scene
      for (const [sceneId, updates] of sceneRestoreUpdates) {
        const scene = game.scenes.get(sceneId);
        if (scene && updates.length > 0) {
          try {
            await scene.updateEmbeddedDocuments("Token", updates);
          } catch (error) {
            Logger.error(
              `Failed to restore tokens in scene "${scene.name}"`,
              error,
              "TRANSFORMATION",
            );
          }
        }
      }
    }

    /**
     * Restore original resolve and power values
     *
     * @private
     * @param {Object[]} originalTokenData - Original token data array
     * @returns {Promise<void>}
     */
    async _restoreOriginalStats(originalTokenData) {
      const originalData = originalTokenData[0]; // All tokens share the same actor stats
      if (!originalData) {
        return;
      }

      const restoreData = {
        "system.resolve.max": originalData.maxResolve,
        "system.resolve.value": this._clampValue(
          this.system.resolve.value,
          0,
          originalData.maxResolve,
        ),
        "system.power.max": originalData.maxPower,
        "system.power.value": this._clampValue(
          this.system.power.value,
          0,
          originalData.maxPower,
        ),
      };

      await this.update(restoreData);
    }

    /**
     * Clear all transformation-related flags
     *
     * @private
     * @returns {Promise<void>}
     */
    async _clearTransformationFlags() {

      await this.unsetFlag("eventide-rp-system", "originalTokenData");
      await this.unsetFlag("eventide-rp-system", "activeTransformation");
      await this.unsetFlag("eventide-rp-system", "activeTransformationName");
      await this.unsetFlag("eventide-rp-system", "activeTransformationCursed");
      await this.unsetFlag(
        "eventide-rp-system",
        "activeTransformationCombatPowers",
      );
      await this.unsetFlag(
        "eventide-rp-system",
        "activeTransformationActionCards",
      );
    }

    /**
     * Utility method to clamp a value between min and max
     *
     * @private
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    _clampValue(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    /**
     * Ensure the transformation item is on the actor
     * If the transformation item is not already on the actor, create a copy
     * If there's a different transformation already on the actor, remove it first
     *
     * @private
     * @param {Item} transformationItem - The transformation item to ensure is on the actor
     * @returns {Promise<Item>} The transformation item that is now on the actor
     */
    async _ensureTransformationItemOnActor(transformationItem) {
      // Check if this transformation is already on the actor
      const existingTransformation = this.items.get(transformationItem.id);
      if (existingTransformation) {
        return existingTransformation;
      }

      // Check for any other transformation items on the actor
      const currentTransformations = this.items.filter(
        (item) => item.type === "transformation",
      );

      // Remove any existing transformation items (there should only be one)
      if (currentTransformations.length > 0) {
        await this.deleteEmbeddedDocuments(
          "Item",
          currentTransformations.map((t) => t.id),
        );
      }

      // If the transformation item is not owned by this actor, create a copy
      if (transformationItem.parent !== this) {
        const transformationData = transformationItem.toObject();
        const [createdItem] = await this.createEmbeddedDocuments("Item", [
          transformationData,
        ]);

        return createdItem;
      }

      // The transformation is already owned by this actor
      return transformationItem;
    }

    /**
     * Apply transformation appearance to a newly created token
     * This method is called when a token is created from an actor that has an active transformation
     *
     * @param {TokenDocument} tokenDocument - The newly created token document
     * @returns {Promise<void>}
     */
    async _applyTransformationToNewToken(tokenDocument) {
      // Get the active transformation ID from flags
      const activeTransformationId = this.getFlag(
        "eventide-rp-system",
        "activeTransformation",
      );

      if (!activeTransformationId) {
        return;
      }

      // Find the transformation item on the actor
      const transformationItem = this.items.get(activeTransformationId);
      if (!transformationItem) {
        return;
      }

      try {
        // Calculate the transformation updates using existing logic
        const updates = this._getTokenTransformationUpdates(transformationItem);

        // Apply updates if we have any
        if (Object.keys(updates).length > 0) {
          await tokenDocument.update(updates);
        }
      } catch (error) {
        Logger.error(
          `Failed to apply transformation updates to new token ${tokenDocument.id}`,
          error,
          "TRANSFORMATION",
        );
        throw error;
      }
    }

    /**
     * Get all tokens for this actor across all scenes
     * This method finds token documents from all scenes, regardless of render state
     *
     * @private
     * @returns {Object[]} Array of token document objects with scene information
     */
    _getAllTokensAcrossScenes() {
      Logger.methodEntry(
        "ActorTransformationMixin",
        "_getAllTokensAcrossScenes",
      );

      const tokens = [];

      // Iterate through all scenes to find tokens for this actor
      for (const scene of game.scenes.contents) {
        // Find token documents in this scene that belong to this actor
        const sceneTokens = scene.tokens.filter(
          (tokenDoc) => tokenDoc.actorId === this.id && tokenDoc.actor,
        );

        // Add all token documents (regardless of whether they're currently rendered)
        for (const tokenDoc of sceneTokens) {
          tokens.push({
            document: tokenDoc,
            scene,
          });
        }
      }

      Logger.debug(
        `Found ${tokens.length} tokens across ${game.scenes.contents.length} scenes`,
        {
          actorName: this.name,
          sceneTokenCounts: tokens.reduce((acc, t) => {
            acc[t.scene.name] = (acc[t.scene.name] || 0) + 1;
            return acc;
          }, {}),
        },
        "TRANSFORMATION",
      );

      Logger.methodExit(
        "ActorTransformationMixin",
        "_getAllTokensAcrossScenes",
        tokens,
      );
      return tokens;
    }

    /**
     * Get the current action cards for this actor, accounting for transformation overrides
     * When transformed, returns transformation action cards; otherwise returns actor's own action cards
     *
     * @returns {Item[]} Array of action card items (temporary items for transformation action cards)
     */
    getCurrentActionCards() {
      Logger.methodEntry("ActorTransformationMixin", "getCurrentActionCards");

      // Check if actor is transformed
      const transformationActionCards = this.getFlag(
        "eventide-rp-system",
        "activeTransformationActionCards",
      );

      if (transformationActionCards && transformationActionCards.length > 0) {
        // Actor is transformed and has transformation action cards - return them as temporary items
        Logger.debug(
          "Returning transformation action cards",
          {
            count: transformationActionCards.length,
            names: transformationActionCards.map((ac) => ac.name),
          },
          "TRANSFORMATION",
        );

        const transformationActionCardItems = transformationActionCards.map((actionCardData) => {
          const tempItem = new CONFIG.Item.documentClass(actionCardData, {
            parent: this,
          });

          // The temporary item is editable if the actor is editable
          Object.defineProperty(tempItem, "isEditable", {
            value: this.isEditable,
            configurable: true,
          });

          return tempItem;
        });

        Logger.methodExit(
          "ActorTransformationMixin",
          "getCurrentActionCards",
          transformationActionCardItems,
        );
        return transformationActionCardItems;
      }

      // No transformation or no transformation action cards - return actor's own action cards
      const actorActionCards = this.items.filter((item) => item.type === "actionCard");
      Logger.debug(
        "Returning actor's own action cards",
        {
          count: actorActionCards.length,
          names: actorActionCards.map((ac) => ac.name),
        },
        "TRANSFORMATION",
      );

      Logger.methodExit(
        "ActorTransformationMixin",
        "getCurrentActionCards",
        actorActionCards,
      );
      return actorActionCards;
    }

    /**
     * Get the current combat powers for this actor, accounting for transformation overrides
     * When transformed, returns transformation combat powers; otherwise returns actor's own combat powers
     *
     * @returns {Item[]} Array of combat power items (temporary items for transformation combat powers)
     */
    getCurrentCombatPowers() {
      Logger.methodEntry("ActorTransformationMixin", "getCurrentCombatPowers");

      // Check if actor is transformed
      const transformationCombatPowers = this.getFlag(
        "eventide-rp-system",
        "activeTransformationCombatPowers",
      );

      if (transformationCombatPowers && transformationCombatPowers.length > 0) {
        // Actor is transformed and has transformation combat powers - return them as temporary items
        Logger.debug(
          "Returning transformation combat powers",
          {
            count: transformationCombatPowers.length,
            names: transformationCombatPowers.map((cp) => cp.name),
          },
          "TRANSFORMATION",
        );

        const transformationCombatPowerItems = transformationCombatPowers.map((combatPowerData) => {
          const tempItem = new CONFIG.Item.documentClass(combatPowerData, {
            parent: this,
          });

          // The temporary item is editable if the actor is editable
          Object.defineProperty(tempItem, "isEditable", {
            value: this.isEditable,
            configurable: true,
          });

          return tempItem;
        });

        Logger.methodExit(
          "ActorTransformationMixin",
          "getCurrentCombatPowers",
          transformationCombatPowerItems,
        );
        return transformationCombatPowerItems;
      }

      // No transformation or no transformation combat powers - return actor's own combat powers
      const actorCombatPowers = this.items.filter((item) => item.type === "combatPower");
      Logger.debug(
        "Returning actor's own combat powers",
        {
          count: actorCombatPowers.length,
          names: actorCombatPowers.map((cp) => cp.name),
        },
        "TRANSFORMATION",
      );

      Logger.methodExit(
        "ActorTransformationMixin",
        "getCurrentCombatPowers",
        actorCombatPowers,
      );
      return actorCombatPowers;
    }

    /**
     * Check if the actor currently has transformation combat powers active
     *
     * @returns {boolean} True if transformation combat powers are active
     */
    hasTransformationCombatPowers() {
      const transformationCombatPowers = this.getFlag(
        "eventide-rp-system",
        "activeTransformationCombatPowers",
      );
      return transformationCombatPowers && transformationCombatPowers.length > 0;
    }

    /**
     * Check if the actor currently has transformation action cards active
     *
     * @returns {boolean} True if transformation action cards are active
     */
    hasTransformationActionCards() {
      const transformationActionCards = this.getFlag(
        "eventide-rp-system",
        "activeTransformationActionCards",
      );
      return transformationActionCards && transformationActionCards.length > 0;
    }
  };
