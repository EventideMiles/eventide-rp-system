const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * A form application for transferring gear from target to selected token.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class GearTransfer extends HandlebarsApplicationMixin(ApplicationV2) {
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
      title: "Transfer Gear",
      icon: "fa-solid fa-exchange",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  constructor() {
    super();
  }

  /**
   * Get data for the template render
   * @returns {Object} Template data
   */
  async _prepareContext(options) {
    const context = {};

    const targetArray = await erps.utils.getTargetArray();
    const selectedArray = await erps.utils.getSelectedArray();

    // Check for multiple tokens
    if (targetArray.length > 1) {
      ui.notifications.warn("Please target only one token to transfer from");
      this.close();
      return context;
    }

    if (selectedArray.length > 1) {
      ui.notifications.warn("Please select only one token to transfer to");
      this.close();
      return context;
    }

    context.targetToken = targetArray[0];
    context.selectedToken = selectedArray[0];

    if (!context.targetToken || !context.selectedToken) {
      ui.notifications.warn("Please select a token and target another token");
      this.close();
      return context;
    }

    // Check for self-transfer
    if (context.targetToken.id === context.selectedToken.id) {
      ui.notifications.warn("Cannot transfer items to the same token");
      this.close();
      return context;
    }

    // Get actors
    const targetActor = context.targetToken.actor;
    const selectedActor = context.selectedToken.actor;

    if (!targetActor || !selectedActor) {
      ui.notifications.warn("Selected tokens must have associated actors");
      this.close();
      return context;
    }

    // Get gear items from target actor with quantity > 0
    const targetItems = targetActor.items?.contents || [];
    context.targetGear = targetItems.filter((i) => i.type === "gear" && i.system.quantity > 0);

    if (context.targetGear.length === 0) {
      ui.notifications.warn("Target has no gear items available to transfer");
      this.close();
      return context;
    }

    // Set names for display
    context.targetName = targetActor.name;
    context.selectedName = selectedActor.name;

    return context;
  }

  /**
   * Handle form submission
   * @param {Event} event - The form submission event
   * @param {Object} form - The form data
   */
  static async #onSubmit(event, form) {
    const targetArray = await erps.utils.getTargetArray();
    const selectedArray = await erps.utils.getSelectedArray();

    // Double-check validations in case tokens changed during form open
    if (targetArray.length !== 1 || selectedArray.length !== 1) {
      ui.notifications.warn("Invalid token selection. Please try again.");
      return;
    }

    const sourceToken = targetArray[0];
    const destToken = selectedArray[0];

    if (sourceToken.id === destToken.id) {
      ui.notifications.warn("Cannot transfer items to the same token");
      return;
    }

    const itemId = form.gearId.value;
    const requestedQuantity = Number(form.quantity.value) || 1;
    const description = form.description.value.trim();

    const sourceActor = sourceToken.actor;
    const destActor = destToken.actor;

    if (!sourceActor || !destActor) {
      ui.notifications.warn("Selected tokens must have associated actors");
      return;
    }

    const sourceItem = sourceActor.items.get(itemId);
    if (!sourceItem) return;

    // Calculate the actual quantity to transfer (never more than available)
    const availableQuantity = sourceItem.system.quantity;
    const transferQuantity = Math.min(requestedQuantity, availableQuantity);

    if (transferQuantity <= 0) {
      ui.notifications.warn("No items available to transfer");
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
    const newQuantity = Math.max(0, sourceItem.system.quantity - transferQuantity);
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
    await erps.utils.gearTransferMessage(sourceItem, sourceActor, destActor, transferQuantity, finalDescription);
  }
}
