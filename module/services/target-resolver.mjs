/**
 * TargetResolver Service
 *
 * Provides centralized target resolution for action card processing.
 * Handles target array retrieval from selected tokens, self-targeting
 * logic, and validation of target availability.
 *
 * @module TargetResolver
 * @see module:item-action-card-execution
 */

import { Logger } from "./logger.mjs";

/**
 * @typedef {Object} TargetResolutionResult
 * @property {boolean} success - Whether target resolution was successful
 * @property {Token[]} targets - Array of target tokens (empty if unsuccessful)
 * @property {string} [reason] - Failure reason if unsuccessful
 */

/**
 * @typedef {Object} TargetResolutionContext
 * @property {Actor} actor - The actor executing the action
 * @property {boolean} selfTarget - Whether self-targeting is enabled
 * @property {string} [contextName] - Name of the calling context for logging
 */

/**
 * @typedef {Object} LockedTargetData
 * @property {string|null} actorId - Actor document ID
 * @property {string} tokenId - Token document ID
 * @property {string|null} sceneId - Scene ID where token exists
 * @property {string} actorName - Actor name for logging/notification
 * @property {string|null} tokenName - Token name (may differ from actor)
 * @property {string} img - Image for display
 * @property {boolean} isLinked - Whether token is linked to actor
 * @property {string|null} uuid - Actor UUID for reliable retrieval
 */

/**
 * @typedef {Object} ResolvedTargetsResult
 * @property {ResolvedTarget[]} valid - Array of successfully resolved targets
 * @property {InvalidTarget[]} invalid - Array of targets that could not be resolved
 * @property {boolean} allValid - Whether all targets were successfully resolved
 */

/**
 * @typedef {Object} ResolvedTarget
 * @property {Token|null} token - The resolved token (may be null for actor-only)
 * @property {Actor} actor - The resolved actor
 * @property {LockedTargetData} lockedTarget - Original locked target data
 */

/**
 * @typedef {Object} InvalidTarget
 * @property {LockedTargetData} lockedTarget - The locked target that couldn't be resolved
 * @property {string} reason - Reason the target couldn't be resolved
 */

/**
 * @typedef {Object} LockedTargetValidation
 * @property {boolean} found - Whether the target was found
 * @property {Token|null} token - The resolved token (null if not found)
 * @property {Actor|null} actor - The resolved actor (null if not found)
 * @property {string|null} reason - Failure reason if not found
 */

/**
 * TargetResolver class for resolving action card targets
 *
 * @class TargetResolver
 */
export class TargetResolver {
  /**
   * Resolve targets for action card execution
   *
   * Retrieves the target array from selected tokens, handles self-targeting
   * when enabled, and validates that targets are available.
   *
   * @static
   * @param {TargetResolutionContext} context - The target resolution context
   * @returns {Promise<TargetResolutionResult>} The resolution result with targets
   */
  static async resolveTargets(context) {
    const { actor, selfTarget, contextName = "action card" } = context;

    try {
      // Get targets from selected tokens
      let targetArray = await erps.utils.getTargetArray();

      // Handle self-targeting: create synthetic target array with actor's token
      if (selfTarget) {
        const selfToken = TargetResolver.getSelfTargetToken(actor);
        if (selfToken) {
          targetArray = [selfToken];
          Logger.debug(
            "Self-targeting enabled - using synthetic target array",
            { actorId: actor.id, actorName: actor.name },
            "ACTION_CARD",
          );
        } else {
          Logger.warn(
            "Self-targeting enabled but no token found for actor",
            { actorId: actor.id, actorName: actor.name },
            "ACTION_CARD",
          );
          ui.notifications.warn(
            game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.SelfTargetNoToken"),
          );
          return { success: false, targets: [], reason: "noSelfToken" };
        }
      }

      // Validate targets exist
      if (targetArray.length === 0) {
        Logger.warn(`No targets found for ${contextName}`, null, "ACTION_CARD");
        ui.notifications.warn(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.NoTargetsAttackChain"),
        );
        return { success: false, targets: [], reason: "noTargets" };
      }

      return { success: true, targets: targetArray };
    } catch (error) {
      Logger.error("Failed to resolve targets", error, "ACTION_CARD");
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.TargetResolutionFailed", {
          message: error.message,
        }),
      );
      return { success: false, targets: [], reason: "error" };
    }
  }

  /**
   * Get the actor's token for self-targeting
   *
   * Attempts to find the actor's token first through the synthetic token
   * (preferred for linked actors), then falls back to active tokens on canvas.
   *
   * @static
   * @param {Actor} actor - The actor to get the token for
   * @returns {TokenDocument|null} The actor's token or null if not found
   */
  static getSelfTargetToken(actor) {
    // First try to get the actor's synthetic token (preferred)
    if (actor.token) {
      return actor.token;
    }

    // Fallback to getting active tokens from the canvas
    const activeTokens = actor.getActiveTokens();
    if (activeTokens.length > 0) {
      // Return the first active token
      return activeTokens[0];
    }

    // No token found
    return null;
  }

  /**
   * Get target array without self-targeting logic
   *
   * Simple wrapper around erps.utils.getTargetArray() for cases
   * where self-targeting is not needed.
   *
   * @static
   * @returns {Promise<Token[]>} Array of target tokens
   */
  static async getTargetArray() {
    try {
      return await erps.utils.getTargetArray();
    } catch (error) {
      Logger.error("Failed to get target array", error, "ACTION_CARD");
      return [];
    }
  }

  /**
   * Validate that targets are available for an action
   *
   * @static
   * @param {Token[]} targets - Array of target tokens to validate
   * @param {string} [contextName] - Name of the action for error messages
   * @returns {boolean} True if targets are available, false otherwise
   */
  static validateTargets(targets, contextName = "action") {
    if (!targets || targets.length === 0) {
      Logger.warn(
        `No targets available for ${contextName}`,
        null,
        "ACTION_CARD",
      );
      ui.notifications.warn(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.NoTargetsAttackChain"),
      );
      return false;
    }
    return true;
  }

  /**
   * Check if an actor has a valid token for self-targeting
   *
   * @static
   * @param {Actor} actor - The actor to check
   * @returns {boolean} True if the actor has a valid token
   */
  static hasValidSelfToken(actor) {
    return TargetResolver.getSelfTargetToken(actor) !== null;
  }

  /**
   * Create a synthetic target array for self-targeting
   *
   * Returns an array containing only the actor's token, or empty array
   * if no token is available.
   *
   * @static
   * @param {Actor} actor - The actor to create the target array for
   * @returns {TokenDocument[]} Array containing the actor's token, or empty
   */
  static createSelfTargetArray(actor) {
    const selfToken = TargetResolver.getSelfTargetToken(actor);
    return selfToken ? [selfToken] : [];
  }

  /**
   * Lock targets for persistence across async operations
   *
   * Captures all target data needed to survive token deletion,
   * including actor UUID for reliable retrieval.
   *
   * @static
   * @param {Token[]} tokens - Array of target tokens to lock
   * @returns {LockedTargetData[]} Array of locked target data objects
   */
  static lockTargets(tokens) {
    if (!tokens || tokens.length === 0) {
      return [];
    }

    return tokens.map((token) => {
      const actor = token.actor;
      const isLinked = token.isLinked ?? token.document?.isLinked ?? true;

      return {
        actorId: actor?.id ?? null,
        tokenId: token.id,
        sceneId:
          token.scene?.id ??
          token.document?.parent?.id ??
          token.parent?.id ??
          null,
        actorName: actor?.name ?? "Unknown",
        tokenName: token.name ?? null,
        img: token.texture?.src ?? actor?.img ?? "",
        isLinked,
        uuid: actor?.uuid ?? null,
      };
    });
  }

  /**
   * Resolve locked targets back to tokens/actors
   *
   * Attempts to resolve locked targets back to their original tokens,
   * falling back to actor lookup via UUID if tokens were deleted.
   *
   * @static
   * @param {LockedTargetData[]} lockedTargets - Array of locked target data
   * @returns {ResolvedTargetsResult} Result with valid tokens and invalid targets
   */
  static resolveLockedTargets(lockedTargets) {
    if (!lockedTargets || lockedTargets.length === 0) {
      return { valid: [], invalid: [], allValid: true };
    }

    const valid = [];
    const invalid = [];

    for (const locked of lockedTargets) {
      const validation = TargetResolver.validateLockedTarget(locked);

      if (validation.found) {
        valid.push({
          token: validation.token,
          actor: validation.actor,
          lockedTarget: locked,
        });
      } else {
        invalid.push({
          lockedTarget: locked,
          reason: validation.reason,
        });
      }
    }

    return {
      valid,
      invalid,
      allValid: invalid.length === 0,
    };
  }

  /**
   * Validate a single locked target still exists
   *
   * Attempts token lookup first, then falls back to actor UUID.
   *
   * @static
   * @param {LockedTargetData} lockedTarget - The locked target to validate
   * @returns {LockedTargetValidation} Validation result with found status
   */
  static validateLockedTarget(lockedTarget) {
    if (!lockedTarget) {
      return { found: false, token: null, actor: null, reason: "noData" };
    }

    // Try token lookup first (for linked tokens still on scene)
    if (lockedTarget.sceneId && lockedTarget.tokenId) {
      const scene = game.scenes?.get(lockedTarget.sceneId);
      if (scene) {
        const token = scene.tokens.get(lockedTarget.tokenId);
        if (token && token.actor) {
          return {
            found: true,
            token,
            actor: token.actor,
            reason: null,
          };
        }
      }
    }

    // Fallback to actor lookup via UUID (survives token deletion)
    if (lockedTarget.uuid) {
      const actor = fromUuidSync(lockedTarget.uuid);
      if (actor) {
        // Try to get an active token for the actor
        const activeTokens = actor.getActiveTokens?.() ?? [];
        const token = activeTokens.length > 0 ? activeTokens[0] : null;

        return {
          found: true,
          token,
          actor,
          reason: token ? null : "actorOnly",
        };
      }
    }

    // Actor lookup by ID as last resort
    if (lockedTarget.actorId) {
      const actor = game.actors?.get(lockedTarget.actorId);
      if (actor) {
        const activeTokens = actor.getActiveTokens?.() ?? [];
        const token = activeTokens.length > 0 ? activeTokens[0] : null;

        return {
          found: true,
          token,
          actor,
          reason: token ? null : "actorOnly",
        };
      }
    }

    return {
      found: false,
      token: null,
      actor: null,
      reason: "deleted",
    };
  }
}
