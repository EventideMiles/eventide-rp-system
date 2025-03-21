import { EventideSheetHelpers } from "./base/eventide-sheet-helpers.mjs";

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
    classes: ["eventide-rp-system", "standard-form", "gear-transfer"],
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

  constructor(options = {}) {
    super();
  }

  /**
   * Get data for the template render
   * @returns {Object} Template data
   */
  async _prepareContext(options) {
    await EventideSheetHelpers._gmCheck();
    const context = {};

    this.targetTokens = await erps.utils.getTargetArray();
    this.selectedTokens = await erps.utils.getSelectedArray();
    this.targetToken = this.targetTokens[0];
    this.selectedToken = this.selectedTokens[0];

    // Check for multiple tokens
    if (this.targetTokens.length > 1) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SingleTargetOnly")
      );
      this.close();
      return context;
    }

    if (this.selectedTokens.length > 1) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SingleSelectOnly")
      );
      this.close();
      return context;
    }

    if (!this.targetToken || !this.selectedToken) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.BothFirst")
      );
      this.close();
      return context;
    }

    // Check for self-transfer
    if (this.targetToken.id === this.selectedToken.id) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SameTransferPrevention")
      );
      this.close();
      return context;
    }

    // Get actors
    context.targetActor = this.targetToken.actor;
    context.selectedActor = this.selectedToken.actor;

    if (!context.targetActor || !context.selectedActor) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoActor")
      );
      this.close();
      return context;
    }

    // Get gear items from target actor with quantity > 0
    const targetItems = context.targetActor.items?.contents || [];
    context.targetGear = targetItems.filter(
      (i) => i.type === "gear" && i.system.quantity > 0
    );

    if (context.targetGear.length === 0) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoGear")
      );
      this.close();
      return context;
    }

    return context;
  }

  /**
   * Handle form submission
   * @param {Event} event - The form submission event
   * @param {Object} form - The form data
   */
  static async #onSubmit(event, form) {
    const itemId = form.gearId.value;
    const requestedQuantity = Number(form.quantity.value) || 1;
    const description = form.description.value.trim();

    const sourceActor = this.targetToken.actor;
    const destActor = this.selectedToken.actor;

    const sourceItem = sourceActor.items.get(itemId);
    if (!sourceItem) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.ItemNotFound")
      );
      return;
    }

    // Calculate the actual quantity to transfer (never more than available)
    const availableQuantity = sourceItem.system.quantity;
    const transferQuantity = Math.min(requestedQuantity, availableQuantity);

    if (transferQuantity <= 0) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoItemsAvailable")
      );
      return;
    }

    // Check if destination already has this gear
    const existingItem = destActor.items.find(
      (i) => i.name === sourceItem.name && i.type === "gear"
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
      sourceItem.system.quantity - transferQuantity
    );
    await sourceItem.update({
      "system.quantity": newQuantity,
    });

    // If the requested quantity was different from what was actually transferred, add a note
    let finalDescription = description;
    if (requestedQuantity !== transferQuantity) {
      const note = `Only ${transferQuantity} items were available to transfer.`;
      finalDescription = description ? `${note}\n${description}` : note;
    }

    // Create chat message about the transfer
    await erps.messages.createGearTransferMessage(
      sourceItem,
      sourceActor,
      destActor,
      transferQuantity,
      finalDescription
    );
  }
}
