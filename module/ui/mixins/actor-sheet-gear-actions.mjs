import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";

/**
 * Actor Sheet Gear Actions Mixin
 *
 * Provides gear management functionality for actor sheets, including
 * equipping/unequipping gear, quantity adjustments, and related actions.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with gear management functionality
 */
export const ActorSheetGearActionsMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Toggle gear equipped state
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     * @static
     */
    static async _toggleGear(_event, target) {
      Logger.methodEntry("ActorSheetGearActionsMixin", "_toggleGear", {
        actorName: this.actor?.name,
        targetDataset: target.dataset,
      });

      try {
        const gear = this._getEmbeddedDocument(target);

        if (!gear) {
          throw new Error("Gear item not found");
        }

        const newEquippedState = !gear.system.equipped;
        await gear.update({ "system.equipped": newEquippedState });

        // Create gear equip message
        erps.messages.createGearEquipMessage(gear);

        Logger.debug(
          `Gear ${gear.name} equipped state changed to: ${newEquippedState}`,
          {
            gearId: gear.id,
            gearName: gear.name,
            equipped: newEquippedState,
          },
          "GEAR_ACTIONS",
        );

        Logger.methodExit("ActorSheetGearActionsMixin", "_toggleGear", gear);
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Toggle gear for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.GearToggleError",
          ),
        });

        Logger.methodExit("ActorSheetGearActionsMixin", "_toggleGear", null);
      }
    }

    /**
     * Increment gear quantity
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     * @static
     */
    static async _incrementGear(_event, target) {
      Logger.methodEntry("ActorSheetGearActionsMixin", "_incrementGear", {
        actorName: this.actor?.name,
        targetDataset: target.dataset,
      });

      try {
        const gear = this._getEmbeddedDocument(target);

        if (!gear) {
          throw new Error("Gear item not found");
        }

        const newQuantity = gear.system.quantity + 1;
        await gear.update({ "system.quantity": newQuantity });

        Logger.debug(
          `Gear ${gear.name} quantity incremented to: ${newQuantity}`,
          {
            gearId: gear.id,
            gearName: gear.name,
            previousQuantity: gear.system.quantity,
            newQuantity,
          },
          "GEAR_ACTIONS",
        );

        Logger.methodExit("ActorSheetGearActionsMixin", "_incrementGear", gear);
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Increment gear quantity for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.GearQuantityError",
          ),
        });

        Logger.methodExit("ActorSheetGearActionsMixin", "_incrementGear", null);
      }
    }

    /**
     * Decrement gear quantity
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     * @static
     */
    static async _decrementGear(_event, target) {
      Logger.methodEntry("ActorSheetGearActionsMixin", "_decrementGear", {
        actorName: this.actor?.name,
        targetDataset: target.dataset,
      });

      try {
        const gear = this._getEmbeddedDocument(target);

        if (!gear) {
          throw new Error("Gear item not found");
        }

        const currentQuantity = gear.system.quantity;
        const newQuantity = Math.max(currentQuantity - 1, 0);

        await gear.update({ "system.quantity": newQuantity });

        // If quantity reaches 0, create an unequip message after a brief delay
        if (newQuantity === 0) {
          setTimeout(() => {
            erps.messages.createGearEquipMessage(gear);
          }, 100);
        }

        Logger.debug(
          `Gear ${gear.name} quantity decremented to: ${newQuantity}`,
          {
            gearId: gear.id,
            gearName: gear.name,
            previousQuantity: currentQuantity,
            newQuantity,
            reachedZero: newQuantity === 0,
          },
          "GEAR_ACTIONS",
        );

        Logger.methodExit("ActorSheetGearActionsMixin", "_decrementGear", gear);
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Decrement gear quantity for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.GearQuantityError",
          ),
        });

        Logger.methodExit("ActorSheetGearActionsMixin", "_decrementGear", null);
      }
    }
  };
