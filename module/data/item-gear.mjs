import EventideRpSystemItemBase from "./base-item.mjs";
import { InventoryUtils } from "../helpers/_module.mjs";
import { Logger } from "../services/_module.mjs";

export default class EventideRpSystemGear extends EventideRpSystemItemBase {
  static LOCALIZATION_PREFIXES = [
    "EVENTIDE_RP_SYSTEM.Item.base",
    "EVENTIDE_RP_SYSTEM.Item.Gear",
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.equipped = new fields.BooleanField({
      required: true,
      initial: true,
    });

    schema.cursed = new fields.BooleanField({
      required: true,
      initial: false,
    });

    schema.bgColor = new fields.ColorField({
      initial: "#8B4513",
      blank: false,
      required: true,
    });
    schema.textColor = new fields.ColorField({
      initial: "#ffffff",
      blank: false,
      required: true,
    });

    schema.quantity = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 0,
    });
    schema.weight = new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
      min: 0,
    });
    schema.cost = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
    });

    schema.targeted = new fields.BooleanField({
      required: true,
      initial: true,
    });

    schema.className = new fields.StringField({
      required: true,
      nullable: false,
      choices: ["weapon", "armor", "tool", "spell", "other"],
      initial: "other",
    });

    schema.roll = new fields.SchemaField({
      type: new fields.StringField({
        initial: "roll",
        required: true,
        nullable: false,
        choices: ["roll", "flat", "none"],
      }),
      ability: new fields.StringField({
        required: true,
        nullable: false,
        choices: ["acro", "phys", "fort", "will", "wits", "unaugmented"],
        initial: "unaugmented",
      }),
      bonus: new fields.NumberField({ initial: 0 }),
      diceAdjustments: new fields.SchemaField({
        advantage: new fields.NumberField({ initial: 0, ...requiredInteger }),
        disadvantage: new fields.NumberField({
          initial: 0,
          ...requiredInteger,
        }),
        total: new fields.NumberField({ initial: 0, ...requiredInteger }),
      }),
    });

    return schema;
  }

  prepareDerivedData() {
    this.roll.diceAdjustments.total =
      this.roll.diceAdjustments.advantage -
      this.roll.diceAdjustments.disadvantage;
  }

  /**
   * Custom bypass handler for gear items
   * Handles different execution contexts (direct use, action cards, etc.)
   * @param {Object} popupConfig - The popup configuration object
   * @param {Object} options - The options passed to roll() method
   * @returns {Promise<Object>} Result of the bypass execution
   */
  async handleBypass(popupConfig, options) {
    Logger.methodEntry("EventideRpSystemGear", "handleBypass", {
      itemName: this.name,
      actorName: this.actor?.name,
      cost: this.system.cost,
      hasActionCardContext: !!options?.actionCardContext,
    });

    try {
      if (!this.actor) {
        throw new Error("Cannot execute gear bypass without an actor");
      }

      // Determine execution context
      const isFromActionCard =
        options?.actionCardContext?.isFromActionCard || false;
      const isEmbeddedGear = !this.actor.items.has(this.id);

      Logger.debug(
        "Gear bypass context detection",
        {
          itemName: this.name,
          itemId: this.id,
          actorName: this.actor.name,
          isFromActionCard,
          isEmbeddedGear,
          actorHasItem: this.actor.items.has(this.id),
          embeddedCost: this.system.cost,
          actionCardName: options?.actionCardContext?.actionCard?.name,
          executionMode: options?.actionCardContext?.executionMode,
        },
        "GEAR_BYPASS",
      );

      if (isFromActionCard || isEmbeddedGear) {
        // This is gear from an action card or embedded context - update the real inventory item
        // Calculate cost from embedded item first
        const requiredQuantity = this.system.cost || 0;
        const actualGearItem = InventoryUtils.findGearByName(
          this.actor,
          this.name,
          requiredQuantity,
        );

        Logger.debug(
          "Searching for real gear item for action card execution",
          {
            searchName: this.name,
            requiredQuantity,
            found: !!actualGearItem,
            actualGearId: actualGearItem?.id,
            actualGearName: actualGearItem?.name,
            actualGearQuantity: actualGearItem?.system.quantity,
            actualGearCost: actualGearItem?.system.cost,
            actorItemCount: this.actor.items.size,
            isFromActionCard,
          },
          "GEAR_BYPASS",
        );

        if (!actualGearItem) {
          Logger.warn(
            "Real gear item not found in actor inventory for action card execution",
            {
              embeddedItemName: this.name,
              actorName: this.actor.name,
              actorGearItems: this.actor.items
                .filter((i) => i.type === "gear")
                .map((i) => i.name),
              actionCardName: options?.actionCardContext?.actionCard?.name,
            },
            "GEAR_BYPASS",
          );

          throw new Error(`Gear "${this.name}" not found in actor's inventory`);
        }

        // Deduct from real inventory
        const currentQuantity = actualGearItem.system.quantity || 0;
        const newQuantity = Math.max(0, currentQuantity - requiredQuantity);

        Logger.debug(
          "Updating real gear quantity for action card execution",
          {
            embeddedItemName: this.name,
            realItemName: actualGearItem.name,
            costToDeduct: requiredQuantity,
            currentQuantity,
            newQuantity,
            actionCardName: options?.actionCardContext?.actionCard?.name,
          },
          "GEAR_BYPASS",
        );

        await actualGearItem.update({
          "system.quantity": newQuantity,
        });

        Logger.info(
          "Successfully updated real gear inventory for action card execution",
          {
            gearName: actualGearItem.name,
            previousQuantity: currentQuantity,
            newQuantity,
            costDeducted: requiredQuantity,
            isFromActionCard,
            actionCardName: options?.actionCardContext?.actionCard?.name,
          },
          "GEAR_BYPASS",
        );
      } else {
        // This is direct gear use - reduce from the gear item's own quantity
        const costToDeduct = this.system.cost || 0;
        const currentQuantity = this.system.quantity || 0;
        const newQuantity = Math.max(0, currentQuantity - costToDeduct);

        Logger.debug(
          "Direct gear bypass - updating item's own quantity",
          {
            itemName: this.name,
            costToDeduct,
            currentQuantity,
            newQuantity,
          },
          "GEAR_BYPASS",
        );

        await this.update({
          "system.quantity": newQuantity,
        });

        Logger.info(
          "Successfully updated gear item's own quantity for direct use",
          {
            itemName: this.name,
            previousQuantity: currentQuantity,
            newQuantity,
            costDeducted: costToDeduct,
            isFromActionCard: false,
          },
          "GEAR_BYPASS",
        );
      }

      // Create the combat power message using this item for display
      const result = await erps.messages.createCombatPowerMessage(this);

      Logger.methodExit("EventideRpSystemGear", "handleBypass", result);
      return result;
    } catch (error) {
      Logger.error("Failed to execute gear bypass", error);
      Logger.methodExit("EventideRpSystemGear", "handleBypass", null);
      throw error;
    }
  }
}
