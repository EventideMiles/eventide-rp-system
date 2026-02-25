/**
 * EffectManager Service
 *
 * Provides centralized ActiveEffect management operations for item sheets.
 * All methods are designed to be called from item sheet mixins.
 *
 * @module EffectManager
 * @see module:item-sheet-actions
 */

import { Logger } from "./logger.mjs";

/**
 * EffectManager class for handling ActiveEffect CRUD operations
 *
 * @class EffectManager
 */
export class EffectManager {
  /**
   * Get an effect from an item based on target element
   *
   * @static
   * @param {Item} item - The parent item containing effects
   * @param {HTMLElement} target - The target element to search from
   * @returns {ActiveEffect|undefined} The found effect or undefined if not found
   */
  static getEffect(item, target) {
    const li = target.closest(".effect");
    return item.effects.get(li?.dataset?.effectId);
  }

  /**
   * Delete an effect from an item
   *
   * @static
   * @param {Item} item - The parent item containing the effect
   * @param {HTMLElement} target - The target element with data-effect-id
   * @returns {Promise<void>}
   */
  static async deleteEffect(item, target) {
    try {
      const effect = this.getEffect(item, target);
      if (!effect) {
        Logger.warn("No effect found for deletion", {}, "ITEM_ACTIONS");
        return;
      }

      await effect.delete();
    } catch (error) {
      Logger.error("Failed to delete effect", error, "ITEM_ACTIONS");
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.EffectDeletionFailed", {
          itemName: item?.name || "Unknown",
        }),
      );
    }
  }

  /**
   * Create a new effect on an item
   *
   * @static
   * @param {Item} item - The parent item for the new effect
   * @param {HTMLElement} target - The target element with dataset configuration
   * @returns {Promise<void>}
   */
  static async createEffect(item, target) {
    try {
      // Retrieve the configured document class for ActiveEffect
      const aeCls = foundry.utils.getDocumentClass("ActiveEffect");
      // Prepare the document creation data by initializing it a default name.
      // As of v12, you can define custom Active Effect subtypes just like Item subtypes if you want
      const effectData = {
        name: aeCls.defaultName({
          // defaultName handles an undefined type gracefully
          type: target.dataset.type,
          parent: item,
        }),
      };
      // Loop through the dataset and add it to our effectData
      for (const [dataKey, value] of Object.entries(target.dataset)) {
        // These data attributes are reserved for the action handling
        if (["action", "documentClass"].includes(dataKey)) continue;
        // Nested properties require dot notation in the HTML, e.g. anything with `system`
        foundry.utils.setProperty(effectData, dataKey, value);
      }

      // Finally, create the embedded document!
      await aeCls.create(effectData, {
        parent: item,
      });
    } catch (error) {
      Logger.error("Failed to create effect", error, "ITEM_ACTIONS");
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.EffectCreationFailed", {
          itemName: item?.name || "Unknown",
        }),
      );
    }
  }

  /**
   * Toggle the disabled state of an effect
   *
   * @static
   * @param {Item} item - The parent item containing the effect
   * @param {HTMLElement} target - The target element with data-effect-id
   * @returns {Promise<void>}
   */
  static async toggleEffect(item, target) {
    try {
      const effect = this.getEffect(item, target);
      if (!effect) {
        Logger.warn("No effect found for toggling", {}, "ITEM_ACTIONS");
        return;
      }

      await effect.update({ disabled: !effect.disabled });
    } catch (error) {
      Logger.error("Failed to toggle effect", error, "ITEM_ACTIONS");
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.EffectToggleFailed", {
          itemName: item?.name || "Unknown",
        }),
      );
    }
  }
}

export default EffectManager;
