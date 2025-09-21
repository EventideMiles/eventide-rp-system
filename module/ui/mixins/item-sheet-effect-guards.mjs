import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";

/**
 * Item Sheet Effect Guards Mixin
 *
 * Provides effect sanitization and validation functionality for item sheets including:
 * - Ensuring each item has exactly one active effect
 * - Creating default effects when none exist
 * - Consolidating multiple effects into one
 * - Synchronizing effect names and images with item data
 *
 * @param {class} BaseClass - The base item sheet class to extend
 * @returns {class} Extended class with effect guards functionality
 */
export const ItemSheetEffectGuardsMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Ensures that each item has exactly one active effect.
     * Creates a default effect if none exists, or consolidates multiple effects into one.
     *
     * @returns {Promise<void>}
     * @protected
     */
    async eventideItemEffectGuards() {
      Logger.methodEntry(
        "ItemSheetEffectGuardsMixin",
        "eventideItemEffectGuards",
        {
          itemName: this.item?.name,
          itemType: this.item?.type,
          effectsCount: this.item.effects.size,
        },
      );

      // Additional check - skip effect guards for temporary items at the method level
      if (!this.item.collection ||
          !this.item.isEmbedded ||
          (this.item.update && this.item.update.toString().includes('embeddedActionCards'))) {
        Logger.debug(
          "Skipping effect guards - temporary or transformation item detected",
          {
            itemName: this.item?.name,
            itemType: this.item?.type,
            itemId: this.item?.id,
            hasCollection: !!this.item.collection,
            isEmbedded: this.item.isEmbedded,
            hasCustomUpdate: this.item.update && this.item.update.toString().includes('embeddedActionCards'),
          },
          "EFFECT_GUARDS",
        );
        return;
      }

      try {
        const effects = Array.from(this.item.effects);

        // Handle multiple effects - consolidate to one
        if (effects.length > 1) {
          Logger.warn(
            "Multiple effects found on item, consolidating to one",
            {
              itemName: this.item.name,
              effectsCount: effects.length,
              effectNames: effects.map((e) => e.name),
            },
            "EFFECT_GUARDS",
          );

          const keepEffect = this.item.effects.contents[0];
          const effectIds = effects.map((effect) => effect._id);

          await this.item.deleteEmbeddedDocuments("ActiveEffect", effectIds);
          await this.item.createEmbeddedDocuments("ActiveEffect", [keepEffect]);

          Logger.info(
            "Multiple effects consolidated successfully",
            {
              itemName: this.item.name,
              keptEffectName: keepEffect.name,
            },
            "EFFECT_GUARDS",
          );
        }

        // Handle no effects - create default
        if (effects.length === 0) {
          Logger.info(
            "No effects found on item, creating default effect",
            {
              itemName: this.item.name,
              itemType: this.item.type,
            },
            "EFFECT_GUARDS",
          );

          const newEffect = new ActiveEffect({
            _id: foundry.utils.randomID(),
            name: this.item.name,
            img: this.item.img,
            changes: [],
            disabled: false,
            duration: {
              startTime: null,
              seconds:
                this.item.type === "status" || this.item.type === "feature"
                  ? 18000
                  : 0,
              combat: "",
              rounds: 0,
              turns: 0,
              startRound: 0,
              startTurn: 0,
            },
            description: "",
            origin: "",
            tint: "#ffffff",
            transfer: true,
            statuses: new Set(),
            flags: {},
          });

          await this.item.createEmbeddedDocuments("ActiveEffect", [newEffect]);

          Logger.info(
            "Default effect created successfully",
            {
              itemName: this.item.name,
              effectName: newEffect.name,
              effectDuration: newEffect.duration.seconds,
            },
            "EFFECT_GUARDS",
          );
        }

        // Handle effect name/image synchronization
        const currentEffect = this.item.effects.contents[0];
        if (
          currentEffect &&
          (currentEffect.name !== this.item.name ||
            currentEffect.img !== this.item.img)
        ) {
          Logger.info(
            "Effect name/image out of sync with item, updating",
            {
              itemName: this.item.name,
              itemImg: this.item.img,
              effectName: currentEffect.name,
              effectImg: currentEffect.img,
            },
            "EFFECT_GUARDS",
          );

          const updateData = {
            _id: currentEffect._id,
            name: this.item.name,
            img: this.item.img,
          };

          await this.item.updateEmbeddedDocuments("ActiveEffect", [updateData]);

          Logger.info(
            "Effect synchronized with item successfully",
            {
              itemName: this.item.name,
              effectId: currentEffect._id,
            },
            "EFFECT_GUARDS",
          );
        }

        Logger.methodExit(
          "ItemSheetEffectGuardsMixin",
          "eventideItemEffectGuards",
        );
      } catch (error) {
        Logger.error("Failed to execute effect guards", error, "EFFECT_GUARDS");
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Effect Guards: ${this.item?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.UI,
          userMessage: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.EffectGuardsFailed",
            {
              itemName: this.item?.name || "Unknown",
            },
          ),
        });
        Logger.methodExit(
          "ItemSheetEffectGuardsMixin",
          "eventideItemEffectGuards",
        );
        throw error;
      }
    }

    /**
     * Initialize effect guards during context preparation
     * Call this from your _prepareContext method
     * @protected
     */
    async _initEffectGuards() {
      // Add comprehensive debugging
      Logger.debug(
        "Effect guards check - item details",
        {
          itemName: this.item?.name,
          itemType: this.item?.type,
          itemId: this.item?.id,
          hasCollection: !!this.item.collection,
          collection: this.item.collection?.constructor?.name,
          isTemporary: !this.item.collection,
          itemKeys: Object.keys(this.item || {}),
        },
        "EFFECT_GUARDS",
      );

      // Skip effect guards for temporary items (like action cards from transformations)
      if (!this.item.collection) {
        Logger.debug(
          "Skipping effect guards for temporary item",
          {
            itemName: this.item?.name,
            itemType: this.item?.type,
            itemId: this.item?.id,
          },
          "EFFECT_GUARDS",
        );
        return;
      }

      try {
        await this.eventideItemEffectGuards();

        Logger.debug(
          "Effect guards initialized successfully",
          {
            itemName: this.item?.name,
            itemType: this.item?.type,
            effectsCount: this.item.effects.size,
          },
          "EFFECT_GUARDS",
        );
      } catch (guardError) {
        Logger.warn(
          "Effect guards failed during initialization",
          guardError,
          "EFFECT_GUARDS",
        );
        // Don't throw here - let the sheet continue to render even if guards fail
      }
    }
  };
