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
        isTokenActor: this.isToken,
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

      try {
        // Check if this is an unlinked token actor
        if (this.isToken) {
          // For unlinked tokens, only transform THIS specific token
          return await this._applyTransformationToUnlinkedToken(transformationItem);
        }

        // For linked actors, transform all tokens across all scenes
        const tokens = this._getAllTokensAcrossScenes();
        if (!tokens.length) {
          return this;
        }

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
     * Apply a transformation to a single unlinked token
     * This method handles transformations for unlinked tokens (actor.isToken === true)
     * Unlike linked actors, this only affects the specific token, not all tokens sharing the base actor
     *
     * @private
     * @param {Item} transformationItem - The transformation item to apply
     * @returns {Promise<Actor>} This actor after the update
     */
    async _applyTransformationToUnlinkedToken(transformationItem) {
      Logger.methodEntry(
        "ActorTransformationMixin",
        "_applyTransformationToUnlinkedToken",
        {
          transformationId: transformationItem?.id,
          transformationName: transformationItem?.name,
          tokenId: this.token?.id,
        },
      );

      if (!this.token) {
        Logger.error(
          "Cannot apply transformation to unlinked token: no token reference found",
          null,
          "TRANSFORMATION",
        );
        return this;
      }

      try {
        // Check if there's already an active transformation
        // If so, don't overwrite the original data (switching transformations)
        const hasActiveTransformation = this.getFlag(
          "eventide-rp-system",
          "activeTransformation",
        );

        if (!hasActiveTransformation) {
          // Store original token data for THIS token only
          // When we call setFlag on an unlinked token actor, it stores on the token's ActorDelta
          // We don't need tokenId/sceneId since the flag is stored ON this specific token
          const originalTokenData = {
            img: this.token.texture.src,
            scale: this.token.texture.scaleX,
            width: this.token.width,
            height: this.token.height,
          };

          await this.setFlag(
            "eventide-rp-system",
            "originalTokenData",
            originalTokenData,
          );

          Logger.debug(
            "Stored original token data for unlinked token",
            { tokenId: this.token.id, originalTokenData },
            "TRANSFORMATION",
          );
        } else {
          Logger.debug(
            "Skipping originalTokenData storage - unlinked token already transformed",
            { tokenId: this.token.id },
            "TRANSFORMATION",
          );
        }

        // Ensure the transformation item is on the actor
        const actorTransformationItem =
          await this._ensureTransformationItemOnActor(transformationItem);

        // Set flags indicating active transformation
        await this._setTransformationFlags(actorTransformationItem);

        // Update THIS token with the transformation appearance
        const updates = this._getTokenTransformationUpdates(actorTransformationItem);
        if (Object.keys(updates).length > 0) {
          await this.token.update(updates);
        }

        // Create a chat message about the transformation
        await erpsMessageHandler.createTransformationMessage({
          actor: this,
          transformation: actorTransformationItem,
          isApplying: true,
        });

        Logger.info(
          `Applied transformation to unlinked token: ${this.name}`,
          {
            transformationName: actorTransformationItem.name,
            tokenId: this.token.id,
          },
          "TRANSFORMATION",
        );

        return this;
      } catch (error) {
        Logger.error(
          "Failed to apply transformation to unlinked token",
          error,
          "TRANSFORMATION",
        );
        throw error;
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
        // Check if this is an unlinked token actor
        if (this.isToken) {
          // For unlinked tokens, only revert THIS specific token
          return await this._removeTransformationFromUnlinkedToken();
        }

        // For linked actors, revert all tokens across all scenes
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
     * Remove transformation from a single unlinked token
     * This method handles transformation removal for unlinked tokens (actor.isToken === true)
     *
     * @private
     * @returns {Promise<Actor>} This actor after the update
     */
    async _removeTransformationFromUnlinkedToken() {
      Logger.methodEntry(
        "ActorTransformationMixin",
        "_removeTransformationFromUnlinkedToken",
        {
          tokenId: this.token?.id,
        },
      );

      if (!this.token) {
        Logger.error(
          "Cannot remove transformation from unlinked token: no token reference found",
          null,
          "TRANSFORMATION",
        );
        return this;
      }

      try {
        // Get the transformation item
        const transformationItem = this.items.find(
          (item) => item.type === "transformation",
        );

        // Get the original token data (stored on this token's ActorDelta)
        const originalTokenData = this.getFlag(
          "eventide-rp-system",
          "originalTokenData",
        );

        if (!originalTokenData) {
          Logger.warn(
            "No original token data found for unlinked token transformation removal",
            { tokenId: this.token.id },
            "TRANSFORMATION",
          );
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

        // Restore THIS token's original appearance
        const restoreUpdates = {
          "texture.src": originalTokenData.img,
          "texture.scaleX": originalTokenData.scale,
          "texture.scaleY": originalTokenData.scale,
          width: originalTokenData.width,
          height: originalTokenData.height,
        };

        await this.token.update(restoreUpdates);

        // Remove all transformation items
        await this._removeTransformationItems();

        // Clear the transformation flags
        await this._clearTransformationFlags();

        Logger.info(
          `Removed transformation from unlinked token: ${this.name}`,
          { tokenId: this.token.id },
          "TRANSFORMATION",
        );

        return this;
      } catch (error) {
        Logger.error(
          "Failed to remove transformation from unlinked token",
          error,
          "TRANSFORMATION",
        );
        throw error;
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
     * For linked actors, all tokens should look the same, so we only need to store one template
     * Only stores if there's no active transformation (to prevent overwriting with transformed appearance)
     *
     * @private
     * @param {Token[]} tokens - Array of tokens to store data for
     * @returns {Promise<void>}
     */
    async _storeOriginalTokenData(tokens) {
      if (tokens.length === 0) {
        return;
      }

      // Check if there's already an active transformation
      // If so, don't overwrite the original data (it's already stored from the first transformation)
      const hasActiveTransformation = this.getFlag(
        "eventide-rp-system",
        "activeTransformation",
      );

      if (hasActiveTransformation) {
        Logger.debug(
          "Skipping originalTokenData storage - transformation already active",
          { actorName: this.name },
          "TRANSFORMATION",
        );
        return;
      }

      // For linked actors, all tokens should look identical
      // So we only need to store one template from any token
      const firstToken = tokens[0];
      const tokenDoc = firstToken.document;

      const originalTokenData = {
        img: tokenDoc.texture.src,
        scale: tokenDoc.texture.scaleX,
        width: tokenDoc.width,
        height: tokenDoc.height,
        maxResolve: this.system.resolve.max,
        maxPower: this.system.power.max,
      };

      // Set flag with original token data template
      await this.setFlag(
        "eventide-rp-system",
        "originalTokenData",
        originalTokenData,
      );

      Logger.debug(
        "Stored original token data",
        { actorName: this.name, originalTokenData },
        "TRANSFORMATION",
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
     * For LINKED actors: Finds ALL current tokens and reverts them using template data
     * Since linked actors should have identical token appearances, we use the stored template for all tokens
     *
     * @private
     * @param {Object[]|Token[]} tokens - Array of token objects (with scene info) - UNUSED, kept for compatibility
     * @param {Object} originalTokenData - Original token data object (template for all tokens)
     * @returns {Promise<void>}
     */
    async _restoreOriginalTokenData(tokens, originalTokenData) {

      // Validate we have template data
      if (!originalTokenData) {
        Logger.warn(
          "No template data found for token restoration",
          null,
          "TRANSFORMATION",
        );
        return;
      }

      // Group restoration updates by scene for efficient batch updates
      const sceneRestoreUpdates = new Map();

      // Find ALL current tokens for this actor (includes tokens added after transformation)
      const allCurrentTokens = this._getAllTokensAcrossScenes();

      // Restore all current tokens using the same template data
      for (const tokenInfo of allCurrentTokens) {
        const tokenDoc = tokenInfo.document;
        const scene = tokenInfo.scene;

        if (!scene) {
          continue;
        }

        const sceneId = scene.id;
        if (!sceneRestoreUpdates.has(sceneId)) {
          sceneRestoreUpdates.set(sceneId, []);
        }

        // All linked tokens get the same restoration data
        const restoreUpdates = {
          _id: tokenDoc.id,
          "texture.src": originalTokenData.img,
          "texture.scaleX": originalTokenData.scale,
          "texture.scaleY": originalTokenData.scale,
          width: originalTokenData.width,
          height: originalTokenData.height,
        };

        sceneRestoreUpdates.get(sceneId).push(restoreUpdates);
      }

      // Execute batch restoration updates for each scene
      for (const [sceneId, updates] of sceneRestoreUpdates) {
        const scene = game.scenes.get(sceneId);
        if (scene && updates.length > 0) {
          try {
            await scene.updateEmbeddedDocuments("Token", updates);
            Logger.info(
              `Restored ${updates.length} token(s) in scene "${scene.name}"`,
              null,
              "TRANSFORMATION",
            );
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
     * @param {Object} originalTokenData - Original token data object
     * @returns {Promise<void>}
     */
    async _restoreOriginalStats(originalTokenData) {
      if (!originalTokenData) {
        return;
      }

      const restoreData = {
        "system.resolve.max": originalTokenData.maxResolve,
        "system.resolve.value": this._clampValue(
          this.system.resolve.value,
          0,
          originalTokenData.maxResolve,
        ),
        "system.power.max": originalTokenData.maxPower,
        "system.power.value": this._clampValue(
          this.system.power.value,
          0,
          originalTokenData.maxPower,
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

      // Do NOT clear originalTokenData - keep it for the next transformation to update
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

      // If the transformation item is not embedded in this actor's collection, create a copy
      // Note: temporary items may have a parent but not be in the collection
      if (transformationItem.parent !== this || !transformationItem.collection) {
        const transformationData = transformationItem.toObject();

        // Ensure effects are properly included for embedded transformations
        if (transformationItem.effects && transformationItem.effects.size > 0) {
          transformationData.effects = [];
          for (const effect of transformationItem.effects) {
            const effectData = effect.toObject();
            transformationData.effects.push(effectData);
          }
        }

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
