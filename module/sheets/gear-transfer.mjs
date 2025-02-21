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

    context.targetToken = targetArray[0];
    context.selectedToken = selectedArray[0];

    if (!context.targetToken || !context.selectedToken) {
      ui.notifications.warn("Please select a token and target another token");
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

    // Get gear items from target actor
    const targetItems = targetActor.items?.contents || [];
    context.targetGear = targetItems.filter((i) => i.type === "gear");

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

    console.log(form);

    const sourceToken = targetArray[0];
    const destToken = selectedArray[0];
    const itemId = form.gearId.value;
    const quantity = Number(form.quantity.value) || 1;

    const sourceActor = sourceToken.actor;
    const destActor = destToken.actor;

    const sourceItem = sourceActor.items.get(itemId);
    if (!sourceItem) return;

    // Check if destination already has this gear
    const existingItem = destActor.items.find(
      (i) => i.name === sourceItem.name && i.type === "gear"
    );

    if (existingItem) {
      // Update existing item quantity
      await existingItem.update({
        "system.quantity": existingItem.system.quantity + quantity,
      });
    } else {
      // Create new item
      const itemData = sourceItem.toObject();
      itemData.system.quantity = quantity;
      await destActor.createEmbeddedDocuments("Item", [itemData]);
    }

    // Always reduce source item quantity
    const newQuantity = Math.max(0, sourceItem.system.quantity - quantity);
    await sourceItem.update({
      "system.quantity": newQuantity,
    });
  }
}
