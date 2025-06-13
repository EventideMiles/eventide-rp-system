import { EventidePopupHelpers } from "../components/_module.mjs";
import { InventoryUtils } from "../../helpers/_module.mjs";
import { Logger } from "../../services/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";

/**
 * Application for displaying gear information including roll formulas and quantity checks.
 * @extends {EventidePopupHelpers}
 */
export class GearPopup extends EventidePopupHelpers {
  /** @override */
  static PARTS = {
    gearPopup: {
      template:
        "systems/eventide-rp-system/templates/macros/popups/gear-popup.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["eventide-sheet", "eventide-sheet--scrollbars", "gear-popup"],
    position: {
      width: 600,
      height: "auto",
    },
    window: {
      icon: "fa-solid fa-sack",
    },
    form: {
      handler: this.#onSubmit,
    },
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format("EVENTIDE_RP_SYSTEM.WindowTitles.GearPopup");
  }

  constructor({ item }) {
    super({ item });
    this.type = "gear";
  }

  /**
   * Checks if the gear item is eligible for use, using actor's actual inventory
   * when available (for action card embedded items)
   * @returns {Object} An object containing the eligibility status for each check.
   * @override
   */
  async checkEligibility() {
    const problems = {
      targeting: false,
      power: false,
      quantity: false,
      equipped: false,
    };

    if (this.item.system.targeted) {
      const targetArray = await erps.utils.getTargetArray();
      if (targetArray.length === 0) problems.targeting = true;
    }

    // For gear items, check against actor's actual inventory if available
    if (this.item.actor) {
      const gearStatus = InventoryUtils.getGearStatus(
        this.item.actor,
        this.item.name,
      );

      if (gearStatus.exists) {
        // Use actual inventory data
        if (!gearStatus.equipped) {
          problems.equipped = true;
        }

        const requiredQuantity = this.item.system.cost || 0;
        if (gearStatus.quantity < requiredQuantity) {
          problems.quantity = true;
        }
      } else {
        // Item doesn't exist in actor's inventory
        problems.quantity = true;
        problems.equipped = true;
      }
    } else {
      // Fallback to embedded item's own data (shouldn't happen in normal usage)
      if (this.item.system.cost > (this.item.system.quantity || 0)) {
        problems.quantity = true;
      }

      if (!this.item?.system?.equipped) {
        problems.equipped = true;
      }
    }

    return problems;
  }

  /**
   * Handle rendering of the gear popup application
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  _onRender(_context, _options) {
    super._onRender(_context, _options);

    // Re-apply themes on re-render (but don't reinitialize)
    if (this.themeManager) {
      this.themeManager.applyThemes();
    }
  }

  /**
   * Handle the first render of the gear popup application
   * @override
   * @protected
   */
  _onFirstRender() {
    super._onFirstRender();

    // Initialize theme management only on first render
    if (!this.themeManager) {
      this.themeManager = initThemeManager(
        this,
        THEME_PRESETS.CREATOR_APPLICATION,
      );
    }
  }

  /**
   * Clean up resources before closing the application
   * @param {Object} options - The options for closing
   * @returns {Promise<void>}
   * @override
   */
  async _preClose(options) {
    // Clean up theme management for this specific instance
    if (this.themeManager) {
      cleanupThemeManager(this);
      this.themeManager = null;
    }

    await super._preClose(options);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = GearPopup.DEFAULT_OPTIONS.classes.join(" ");

    return context;
  }

  /**
   * Handle form submission.
   * @param {Event} event - The form submission event
   * @param {FormData} formData - The form data
   * @param {HTMLElement} form - The form element
   * @private
   */
  static async #onSubmit(_event, _formData, _form) {
    const problems = await this.checkEligibility(this.item);

    if (Object.values(problems).some((value) => value)) {
      return ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.GearError"),
      );
    }

    // Determine execution context - for popup usage, we detect embedded gear by checking if item exists in actor's collection
    const isEmbeddedGear =
      this.item.actor && !this.item.actor.items.has(this.item.id);

    Logger.debug(
      "GearPopup gear usage context detection",
      {
        itemName: this.item.name,
        itemId: this.item.id,
        actorName: this.item.actor?.name,
        isEmbeddedGear,
        actorHasItem: this.item.actor?.items.has(this.item.id),
        embeddedCost: this.item.system.cost,
      },
      "GEAR_POPUP",
    );

    if (isEmbeddedGear) {
      // This is embedded gear from an action card - update the real inventory item
      const actualGearItem = InventoryUtils.findGearByName(
        this.item.actor,
        this.item.name,
      );

      Logger.debug(
        "Searching for real gear item in actor inventory",
        {
          searchName: this.item.name,
          found: !!actualGearItem,
          actualGearId: actualGearItem?.id,
          actualGearName: actualGearItem?.name,
          actualGearQuantity: actualGearItem?.system.quantity,
          actualGearCost: actualGearItem?.system.cost,
          actorItemCount: this.item.actor.items.size,
        },
        "GEAR_POPUP",
      );

      if (!actualGearItem) {
        Logger.warn(
          "Real gear item not found in actor inventory",
          {
            embeddedItemName: this.item.name,
            actorName: this.item.actor.name,
            actorGearItems: this.item.actor.items
              .filter((i) => i.type === "gear")
              .map((i) => i.name),
          },
          "GEAR_POPUP",
        );

        return ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.GearNotFoundInInventory",
            {
              gearName: this.item.name,
            },
          ),
        );
      }

      // Calculate cost from embedded item, deduct from real inventory
      const costToDeduct = this.item.system.cost || 0;
      const currentQuantity = actualGearItem.system.quantity || 0;
      const newQuantity = Math.max(0, currentQuantity - costToDeduct);

      Logger.debug(
        "Updating real gear quantity from embedded item",
        {
          embeddedItemName: this.item.name,
          realItemName: actualGearItem.name,
          costToDeduct,
          currentQuantity,
          newQuantity,
        },
        "GEAR_POPUP",
      );

      await actualGearItem.update({
        "system.quantity": newQuantity,
      });

      Logger.info(
        "Successfully updated real gear inventory from embedded gear popup",
        {
          gearName: actualGearItem.name,
          previousQuantity: currentQuantity,
          newQuantity,
          costDeducted: costToDeduct,
        },
        "GEAR_POPUP",
      );

      // Create message using the embedded item for display
      erps.messages.createCombatPowerMessage(this.item);
    } else {
      // This is direct gear use - reduce from the gear item's own quantity
      Logger.debug(
        "Direct gear use - updating item's own quantity",
        {
          itemName: this.item.name,
          currentQuantity: this.item.system.quantity,
          cost: this.item.system.cost,
        },
        "GEAR_POPUP",
      );

      this.item.addQuantity(-this.item.system.cost);
      erps.messages.createCombatPowerMessage(this.item);
    }

    this.close();
  }
}
