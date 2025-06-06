import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";

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

      // Get all tokens linked to this actor
      const tokens = this.getActiveTokens();
      if (!tokens.length) {
        Logger.warn(
          "No active tokens found for transformation",
          null,
          "TRANSFORMATION",
        );
        return this;
      }

      try {
        // Store original token data if needed
        await this._storeOriginalTokenData(tokens);

        // Apply transformation resolve and power adjustments
        await this._transformPowerAndResolveUpdate(transformationItem);

        // Set flags indicating active transformation
        await this._setTransformationFlags(transformationItem);

        // Update tokens with the transformation appearance
        await this._updateTokensForTransformation(tokens, transformationItem);

        // Create a chat message about the transformation
        const { erpsMessageHandler } = await import(
          "../../services/_module.mjs"
        );
        await erpsMessageHandler.createTransformationMessage({
          actor: this,
          transformation: transformationItem,
          isApplying: true,
        });

        Logger.info(
          `Applied transformation "${transformationItem.name}" to actor "${this.name}"`,
          null,
          "TRANSFORMATION",
        );
        Logger.methodExit(
          "ActorTransformationMixin",
          "applyTransformation",
          this,
        );

        return this;
      } catch (error) {
        const [, _handledError] = await ErrorHandler.handleAsync(
          Promise.reject(error),
          {
            context: "Apply Transformation",
            errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          },
        );

        Logger.methodExit(
          "ActorTransformationMixin",
          "applyTransformation",
          null,
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
      Logger.methodEntry("ActorTransformationMixin", "removeTransformation");

      // Check permissions
      if (!this.isOwner) {
        ui.notifications.warn(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoPermission"),
        );
        Logger.warn(
          "User lacks permission to remove transformation",
          null,
          "TRANSFORMATION",
        );
        return this;
      }

      // Get the active transformation ID
      const transformationId = this.getFlag(
        "eventide-rp-system",
        "activeTransformation",
      );
      if (!transformationId) {
        Logger.debug(
          "No active transformation found to remove",
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

        // Get all tokens linked to this actor
        const tokens = this.getActiveTokens();
        if (!tokens.length) {
          Logger.warn(
            "No active tokens found for transformation removal",
            null,
            "TRANSFORMATION",
          );
          return this;
        }

        // Create a chat message about the transformation being removed
        if (transformationItem) {
          const { erpsMessageHandler } = await import(
            "../../services/_module.mjs"
          );
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

        Logger.info(
          `Removed transformation from actor "${this.name}"`,
          null,
          "TRANSFORMATION",
        );
        Logger.methodExit(
          "ActorTransformationMixin",
          "removeTransformation",
          this,
        );

        return this;
      } catch (error) {
        const [, _handledError] = await ErrorHandler.handleAsync(
          Promise.reject(error),
          {
            context: "Remove Transformation",
            errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          },
        );

        Logger.methodExit(
          "ActorTransformationMixin",
          "removeTransformation",
          null,
        );
        return this;
      }
    }

    /**
     * Transforms power and resolve statistics based on a transformation item and updates the actor.
     * If there's a current transformation, calculates the difference between the current and new adjustments.
     * If there's no current transformation, applies the new adjustments directly.
     *
     * @param {Object} transformationItem - The transformation item being applied
     * @param {number} transformationItem.system.powerAdjustment - The power adjustment value from the transformation
     * @param {number} transformationItem.system.resolveAdjustment - The resolve adjustment value from the transformation
     * @returns {Promise<Actor>} A promise that resolves to the updated actor
     * @private
     */
    async _transformPowerAndResolveUpdate(transformationItem) {
      Logger.methodEntry(
        "ActorTransformationMixin",
        "_transformPowerAndResolveUpdate",
        {
          powerAdjustment: transformationItem.system.powerAdjustment,
          resolveAdjustment: transformationItem.system.resolveAdjustment,
        },
      );

      // Get the current transformation item
      const currentTransformationItem = this.items.find(
        (item) => item.type === "transformation",
      );

      Logger.debug(
        "Current transformation item:",
        currentTransformationItem,
        "TRANSFORMATION",
      );
      Logger.debug(
        "New transformation item:",
        transformationItem,
        "TRANSFORMATION",
      );

      const newPowerAdjustment = Number(
        transformationItem.system.powerAdjustment,
      );
      const newResolveAdjustment = Number(
        transformationItem.system.resolveAdjustment,
      );

      if (this.getFlag("eventide-rp-system", "activeTransformation")) {
        // Remove the current transformation item
        await this.deleteEmbeddedDocuments("Item", [
          currentTransformationItem.id,
        ]);
      }

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

      Logger.debug("Applying stat updates:", updateData, "TRANSFORMATION");
      Logger.methodExit(
        "ActorTransformationMixin",
        "_transformPowerAndResolveUpdate",
      );

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
      Logger.methodEntry(
        "ActorTransformationMixin",
        "_validateTransformationOperation",
        {
          itemType: transformationItem?.type,
          hasOwnership: this.isOwner,
        },
      );

      // Check permissions
      if (!this.isOwner) {
        ui.notifications.warn(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoPermission"),
        );
        Logger.warn(
          "Permission check failed for transformation",
          null,
          "TRANSFORMATION",
        );
        return false;
      }

      // Validate item type
      if (!transformationItem || transformationItem.type !== "transformation") {
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NotTransformation"),
        );
        Logger.warn(
          "Invalid transformation item type",
          { type: transformationItem?.type },
          "TRANSFORMATION",
        );
        return false;
      }

      Logger.methodExit(
        "ActorTransformationMixin",
        "_validateTransformationOperation",
        true,
      );
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
      Logger.methodEntry(
        "ActorTransformationMixin",
        "_storeOriginalTokenData",
        {
          tokenCount: tokens.length,
        },
      );

      // Check if there's already an active transformation by checking the flag
      // This is more reliable than counting items since items can be added before flags are set
      const hasActiveTransformation = this.getFlag(
        "eventide-rp-system",
        "activeTransformation",
      );

      // Only store original token data if there isn't already a transformation active
      // This ensures we maintain the original appearance, not the appearance of a previous transformation
      if (hasActiveTransformation) {
        Logger.debug(
          "Active transformation exists, not storing token data",
          null,
          "TRANSFORMATION",
        );
        Logger.methodExit(
          "ActorTransformationMixin",
          "_storeOriginalTokenData",
        );
        return;
      }

      // Store original token data in flags
      const originalTokenData = tokens.map((token) => ({
        tokenId: token.id,
        img: token.document.texture.src,
        scale: token.document.texture.scaleX,
        width: token.document.width,
        height: token.document.height,
        maxResolve: token.actor.system.resolve.max,
        maxPower: token.actor.system.power.max,
      }));

      Logger.debug(
        "Storing original token data:",
        originalTokenData,
        "TRANSFORMATION",
      );

      // Set flag with original token data
      await this.setFlag(
        "eventide-rp-system",
        "originalTokenData",
        originalTokenData,
      );
      Logger.methodExit("ActorTransformationMixin", "_storeOriginalTokenData");
    }

    /**
     * Set flags with active transformation information
     *
     * @private
     * @param {Item} transformationItem - The transformation item
     * @returns {Promise<void>}
     */
    async _setTransformationFlags(transformationItem) {
      Logger.methodEntry(
        "ActorTransformationMixin",
        "_setTransformationFlags",
        {
          transformationId: transformationItem.id,
          transformationName: transformationItem.name,
        },
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

      Logger.methodExit("ActorTransformationMixin", "_setTransformationFlags");
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
      Logger.methodEntry(
        "ActorTransformationMixin",
        "_updateTokensForTransformation",
        {
          tokenCount: tokens.length,
        },
      );

      for (const token of tokens) {
        const updates = this._getTokenTransformationUpdates(transformationItem);

        // Apply updates if we have any
        if (Object.keys(updates).length > 0) {
          Logger.debug(
            `Updating token ${token.id}:`,
            updates,
            "TRANSFORMATION",
          );
          await token.document.update(updates);
        }
      }

      Logger.methodExit(
        "ActorTransformationMixin",
        "_updateTokensForTransformation",
      );
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
      this._calculateTransformationSize(
        updates,
        transformationItem.system.size,
      );

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
        Logger.debug(
          "Removing transformation items:",
          transformationIds,
          "TRANSFORMATION",
        );
        await this.deleteEmbeddedDocuments("Item", transformationIds);
      }
    }

    /**
     * Restore original token data for all tokens
     *
     * @private
     * @param {Token[]} tokens - Array of tokens to restore
     * @param {Object[]} originalTokenData - Original token data array
     * @returns {Promise<void>}
     */
    async _restoreOriginalTokenData(tokens, originalTokenData) {
      Logger.methodEntry(
        "ActorTransformationMixin",
        "_restoreOriginalTokenData",
        {
          tokenCount: tokens.length,
        },
      );

      for (const token of tokens) {
        const originalData = originalTokenData.find(
          (d) => d.tokenId === token.id,
        );
        if (!originalData) {
          Logger.warn(
            `No original data found for token ${token.id}`,
            null,
            "TRANSFORMATION",
          );
          continue;
        }

        const restoreUpdates = {
          "texture.src": originalData.img,
          "texture.scaleX": originalData.scale,
          "texture.scaleY": originalData.scale,
          width: originalData.width,
          height: originalData.height,
        };

        Logger.debug(
          `Restoring token ${token.id}:`,
          restoreUpdates,
          "TRANSFORMATION",
        );
        await token.document.update(restoreUpdates);
      }

      Logger.methodExit(
        "ActorTransformationMixin",
        "_restoreOriginalTokenData",
      );
    }

    /**
     * Restore original resolve and power values
     *
     * @private
     * @param {Object[]} originalTokenData - Original token data array
     * @returns {Promise<void>}
     */
    async _restoreOriginalStats(originalTokenData) {
      Logger.methodEntry("ActorTransformationMixin", "_restoreOriginalStats");

      const originalData = originalTokenData[0]; // All tokens share the same actor stats
      if (!originalData) {
        Logger.warn(
          "No original data found for stat restoration",
          null,
          "TRANSFORMATION",
        );
        Logger.methodExit("ActorTransformationMixin", "_restoreOriginalStats");
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

      Logger.debug("Restoring stats:", restoreData, "TRANSFORMATION");
      await this.update(restoreData);
      Logger.methodExit("ActorTransformationMixin", "_restoreOriginalStats");
    }

    /**
     * Clear all transformation-related flags
     *
     * @private
     * @returns {Promise<void>}
     */
    async _clearTransformationFlags() {
      Logger.methodEntry(
        "ActorTransformationMixin",
        "_clearTransformationFlags",
      );

      await this.unsetFlag("eventide-rp-system", "originalTokenData");
      await this.unsetFlag("eventide-rp-system", "activeTransformation");
      await this.unsetFlag("eventide-rp-system", "activeTransformationName");
      await this.unsetFlag("eventide-rp-system", "activeTransformationCursed");

      Logger.methodExit(
        "ActorTransformationMixin",
        "_clearTransformationFlags",
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
  };
