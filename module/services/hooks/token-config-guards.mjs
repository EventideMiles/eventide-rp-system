import { Logger } from "../logger.mjs";

/**
 * Token Configuration Guards
 *
 * Prevents editing of tokens and prototype tokens while transformations are active.
 * This ensures that transformed appearances are not accidentally saved as defaults.
 *
 * Requires Foundry VTT v13+
 */
export class TokenConfigGuards {
  /**
   * Initialize the token configuration guards
   * Overrides the render methods for TokenConfig and PrototypeTokenConfig
   * to intercept and prevent configuration during active transformations
   */
  static initialize() {
    Logger.info("Initializing Token Configuration Guards", null, "TRANSFORMATION");

    // Get the namespaced classes in Foundry v13
    const TokenConfig = foundry.applications.sheets.TokenConfig;
    const PrototypeTokenConfig = foundry.applications.sheets.PrototypeTokenConfig;

    // Store original render methods
    const originalTokenConfigRender = TokenConfig.prototype.render;
    const originalPrototypeTokenConfigRender = PrototypeTokenConfig.prototype.render;

    // Override TokenConfig render (for placed tokens)
    TokenConfig.prototype.render = async function (...args) {
      const token = this.token;
      const actor = token?.actor;

      Logger.debug(
        "TokenConfig.render called",
        {
          hasToken: !!token,
          hasActor: !!actor,
          actorName: actor?.name,
          isToken: actor?.isToken,
          hasGetFlag: !!(actor?.getFlag),
          activeTransformation: actor?.getFlag?.("eventide-rp-system", "activeTransformation"),
        },
        "TRANSFORMATION",
      );

      // Check if this is a linked token with an active transformation
      if (actor && !actor.isToken && actor.getFlag("eventide-rp-system", "activeTransformation")) {
        Logger.debug(
          "Blocking token config - linked actor has active transformation",
          { actorName: actor.name, tokenId: token.id },
          "TRANSFORMATION",
        );

        return await TokenConfigGuards._handleLinkedTokenConfig(
          actor,
          originalTokenConfigRender,
          this,
          args,
        );
      }

      // Check if this is an unlinked token with an active transformation
      if (actor && actor.isToken && actor.getFlag("eventide-rp-system", "activeTransformation")) {
        Logger.debug(
          "Blocking token config - unlinked token has active transformation",
          { tokenId: token.id },
          "TRANSFORMATION",
        );

        return await TokenConfigGuards._handleUnlinkedTokenConfig(
          actor,
          originalTokenConfigRender,
          this,
          args,
        );
      }

      // No transformation, proceed normally
      Logger.debug(
        "Allowing token config - no active transformation",
        { actorName: actor?.name },
        "TRANSFORMATION",
      );
      return originalTokenConfigRender.call(this, ...args);
    };

    // Override PrototypeTokenConfig render (for prototype tokens)
    PrototypeTokenConfig.prototype.render = async function (...args) {
      // Use this.actor to get the actor (not this.object)
      const actor = this.actor;

      // Check if actor exists and has an active transformation
      if (actor && actor.getFlag && actor.getFlag("eventide-rp-system", "activeTransformation")) {
        Logger.debug(
          "Blocking prototype token config - actor has active transformation",
          { actorName: actor.name },
          "TRANSFORMATION",
        );

        return await TokenConfigGuards._handlePrototypeTokenConfig(
          actor,
          originalPrototypeTokenConfigRender,
          this,
          args,
        );
      }

      // No transformation, proceed normally
      return originalPrototypeTokenConfigRender.call(this, ...args);
    };

    Logger.info("Token Configuration Guards initialized", null, "TRANSFORMATION");
  }

  /**
   * Handle token config attempt for a linked actor with active transformation
   * Shows confirmation dialog for GMs, simple notification for players
   *
   * @private
   * @param {Actor} actor - The actor with active transformation
   * @param {Function} originalRender - The original render method
   * @param {TokenConfig} context - The TokenConfig instance
   * @param {Array} args - The render method arguments
   * @returns {Promise<TokenConfig|null>}
   */
  static async _handleLinkedTokenConfig(actor, originalRender, context, args) {
    // For non-GMs, just show a notification and block access
    if (!game.user.isGM) {
      Logger.info(
        "Non-GM user blocked from token config during transformation",
        { actorName: actor.name },
        "TRANSFORMATION",
      );

      ui.notifications.warn(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Notifications.TokenConfigBlockedForPlayers"),
      );
      return context;
    }

    // For GMs, show confirmation dialog
    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("EVENTIDE_RP_SYSTEM.Dialogs.TokenConfigDuringTransformation.Title"),
      },
      content: `
        <p>${game.i18n.localize("EVENTIDE_RP_SYSTEM.Dialogs.TokenConfigDuringTransformation.LinkedWarning")}</p>
        <p>${game.i18n.localize("EVENTIDE_RP_SYSTEM.Dialogs.TokenConfigDuringTransformation.Prompt")}</p>
      `,
      rejectClose: false,
      modal: true,
    });

    if (proceed) {
      Logger.info(
        "GM chose to revert transformation and open token config",
        { actorName: actor.name },
        "TRANSFORMATION",
      );

      await actor.removeTransformation();
      return originalRender.call(context, ...args);
    } else {
      Logger.info(
        "GM cancelled token config due to active transformation",
        { actorName: actor.name },
        "TRANSFORMATION",
      );

      ui.notifications.info(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Notifications.TokenConfigCancelled"),
      );
      return context;
    }
  }

  /**
   * Handle token config attempt for an unlinked token with active transformation
   * Shows confirmation dialog for GMs, simple notification for players
   *
   * @private
   * @param {Actor} actor - The synthetic actor for the unlinked token
   * @param {Function} originalRender - The original render method
   * @param {TokenConfig} context - The TokenConfig instance
   * @param {Array} args - The render method arguments
   * @returns {Promise<TokenConfig|null>}
   */
  static async _handleUnlinkedTokenConfig(actor, originalRender, context, args) {
    // For non-GMs, just show a notification and block access
    if (!game.user.isGM) {
      Logger.info(
        "Non-GM user blocked from token config during transformation",
        { tokenId: actor.token.id },
        "TRANSFORMATION",
      );

      ui.notifications.warn(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Notifications.TokenConfigBlockedForPlayers"),
      );
      return context;
    }

    // For GMs, show confirmation dialog
    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("EVENTIDE_RP_SYSTEM.Dialogs.TokenConfigDuringTransformation.Title"),
      },
      content: `
        <p>${game.i18n.localize("EVENTIDE_RP_SYSTEM.Dialogs.TokenConfigDuringTransformation.UnlinkedWarning")}</p>
        <p>${game.i18n.localize("EVENTIDE_RP_SYSTEM.Dialogs.TokenConfigDuringTransformation.Prompt")}</p>
      `,
      rejectClose: false,
      modal: true,
    });

    if (proceed) {
      Logger.info(
        "GM chose to revert unlinked token transformation and open token config",
        { tokenId: actor.token.id },
        "TRANSFORMATION",
      );

      await actor.removeTransformation();
      return originalRender.call(context, ...args);
    } else {
      Logger.info(
        "GM cancelled token config for unlinked token due to active transformation",
        { tokenId: actor.token.id },
        "TRANSFORMATION",
      );

      ui.notifications.info(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Notifications.TokenConfigCancelled"),
      );
      return context;
    }
  }

  /**
   * Handle prototype token config attempt for an actor with active transformation
   * Shows confirmation dialog for GMs, simple notification for players
   *
   * @private
   * @param {Actor} actor - The actor with active transformation
   * @param {Function} originalRender - The original render method
   * @param {DefaultTokenConfig} context - The DefaultTokenConfig instance
   * @param {Array} args - The render method arguments
   * @returns {Promise<DefaultTokenConfig|null>}
   */
  static async _handlePrototypeTokenConfig(actor, originalRender, context, args) {
    // For non-GMs, just show a notification and block access
    if (!game.user.isGM) {
      Logger.info(
        "Non-GM user blocked from prototype token config during transformation",
        { actorName: actor.name },
        "TRANSFORMATION",
      );

      ui.notifications.warn(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Notifications.PrototypeTokenConfigBlockedForPlayers"),
      );
      return context;
    }

    // For GMs, show confirmation dialog
    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("EVENTIDE_RP_SYSTEM.Dialogs.PrototypeTokenConfigDuringTransformation.Title"),
      },
      content: `
        <p>${game.i18n.localize("EVENTIDE_RP_SYSTEM.Dialogs.PrototypeTokenConfigDuringTransformation.Warning")}</p>
        <p>${game.i18n.localize("EVENTIDE_RP_SYSTEM.Dialogs.PrototypeTokenConfigDuringTransformation.Prompt")}</p>
      `,
      rejectClose: false,
      modal: true,
    });

    if (proceed) {
      Logger.info(
        "GM chose to revert transformation and open prototype token config",
        { actorName: actor.name },
        "TRANSFORMATION",
      );

      await actor.removeTransformation();
      return originalRender.call(context, ...args);
    } else {
      Logger.info(
        "GM cancelled prototype token config due to active transformation",
        { actorName: actor.name },
        "TRANSFORMATION",
      );

      ui.notifications.info(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Notifications.PrototypeTokenConfigCancelled"),
      );
      return context;
    }
  }
}
