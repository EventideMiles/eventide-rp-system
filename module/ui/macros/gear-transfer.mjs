import { EventideSheetHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  applyThemeImmediate,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/_module.mjs";

/**
 * A form application for transferring gear from target to selected token.
 * @extends {EventideSheetHelpers}
 */
export class GearTransfer extends EventideSheetHelpers {
  static PARTS = {
    gearTransfer: {
      template: "systems/eventide-rp-system/templates/macros/gear-transfer.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "gear-transfer",
    classes: ["eventide-sheet", "eventide-sheet--scrollbars", "gear-transfer"],
    position: {
      width: 600,
      height: "auto",
    },
    tag: "form",
    window: {
      icon: "fa-solid fa-exchange",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format("EVENTIDE_RP_SYSTEM.WindowTitles.GearTransfer");
  }

  constructor(_options = {}) {
    super();
  }

  /**
   * Get data for the template render
   * @returns {Object} Template data
   */
  async _prepareContext(_options) {
    await EventideSheetHelpers._gmCheck();
    const context = {};

    this.targetTokens = await erps.utils.getTargetArray();
    this.selectedTokens = await erps.utils.getSelectedArray();
    this.targetToken = this.targetTokens[0];
    this.selectedToken = this.selectedTokens[0];

    // Check for multiple tokens
    if (this.targetTokens.length > 1) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SingleTargetOnly"),
      );
      this.close();
      return context;
    }

    if (this.selectedTokens.length > 1) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SingleSelectOnly"),
      );
      this.close();
      return context;
    }

    if (!this.targetToken || !this.selectedToken) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.BothFirst"),
      );
      this.close();
      return context;
    }

    // Check for self-transfer
    if (this.targetToken.id === this.selectedToken.id) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SameTransferPrevention"),
      );
      this.close();
      return context;
    }

    // Get actors
    context.targetActor = this.targetToken.actor;
    context.selectedActor = this.selectedToken.actor;

    if (!context.targetActor || !context.selectedActor) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoActor"),
      );
      this.close();
      return context;
    }

    // Get gear items from target actor with quantity > 0
    const targetItems = context.targetActor.items?.contents || [];
    context.targetGear = targetItems.filter(
      (i) => i.type === "gear" && i.system.quantity > 0,
    );

    if (context.targetGear.length === 0) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoGear"),
      );
      this.close();
      return context;
    }

    context.callouts = [
      {
        type: "information",
        faIcon: "fas fa-info-circle",
        text: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Gear.TransferGear",
          {
            target: context.targetActor.name,
            selected: context.selectedActor.name,
          },
        ),
      },
    ];

    context.footerButtons = [
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Transfer"),
        type: "submit",
        cssClass: "erps-button erps-button--primary",
      },
    ];

    return context;
  }

  /**
   * Handle form submission
   * @param {Event} event - The form submission event
   * @param {Object} form - The form data
   */
  static async #onSubmit(event, form, formData) {
    const itemId = formData.get("gearId");
    const requestedQuantity = Number(formData.get("quantity")) || 1;
    const description = formData.get("description").trim();

    const sourceActor = this.targetToken.actor;
    const destActor = this.selectedToken.actor;

    const sourceItem = sourceActor.items.get(itemId);
    if (!sourceItem) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.ItemNotFound"),
      );
    }

    // Calculate the actual quantity to transfer (never more than available)
    const availableQuantity = sourceItem.system.quantity;
    const transferQuantity = Math.min(requestedQuantity, availableQuantity);

    if (transferQuantity <= 0) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoItemsAvailable"),
      );
    }

    // Check if destination already has this gear
    const existingItem = destActor.items.find(
      (i) => i.name === sourceItem.name && i.type === "gear",
    );

    if (existingItem) {
      // Update existing item quantity
      await existingItem.update({
        "system.quantity": existingItem.system.quantity + transferQuantity,
      });
    } else {
      // Create new item
      const itemData = sourceItem.toObject();
      itemData.system.quantity = transferQuantity;
      await destActor.createEmbeddedDocuments("Item", [itemData]);
    }

    // Reduce source item quantity (never below 0)
    const newQuantity = Math.max(
      0,
      sourceItem.system.quantity - transferQuantity,
    );
    await sourceItem.update({
      "system.quantity": newQuantity,
    });

    // If the requested quantity was different from what was actually transferred, add a note
    let finalDescription = description;
    if (requestedQuantity !== transferQuantity) {
      const note = game.i18n.format(
        "EVENTIDE_RP_SYSTEM.Messages.PartialTransfer",
        {
          quantity: transferQuantity,
        },
      );
      finalDescription = description ? `${note}\n${description}` : note;
    }

    // Create chat message about the transfer
    await erps.messages.createGearTransferMessage(
      sourceItem,
      sourceActor,
      destActor,
      transferQuantity,
      finalDescription,
    );
  }

  /**
   * Handle rendering of the gear transfer application
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
   * Handle the first render of the gear transfer application
   * @override
   * @protected
   */
  async _onFirstRender() {
    super._onFirstRender();

    // Apply theme immediately to prevent flashing
    applyThemeImmediate(this.element);

    // Initialize theme management only on first render (non-blocking like actor/item sheets)
    if (!this.themeManager) {
      initThemeManager(this, THEME_PRESETS.CREATOR_APPLICATION)
        .then((manager) => {
          this.themeManager = manager;
          Logger.debug(
            "Theme management initialized asynchronously for gear transfer",
            {
              hasThemeManager: !!this.themeManager,
              sheetId: this.id,
            },
            "THEME",
          );
        })
        .catch((error) => {
          Logger.error(
            "Failed to initialize theme manager for gear transfer",
            error,
            "THEME",
          );
        });
    }
  }

  /**
   * Clean up number inputs and theme management before closing the application
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

    // Clean up number inputs
    if (this.element) {
      erps.utils.cleanupNumberInputs(this.element);
    }

    // Clear references to arrays and objects
    this.targetTokens = null;
    this.selectedTokens = null;
    this.targetToken = null;
    this.selectedToken = null;

    await super._preClose(options);
  }
}
