import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";

/**
 * Actor Sheet Context Preparation Mixin
 *
 * Provides context and item preparation functionality for actor sheets.
 * Handles data preparation, item organization, and context enrichment.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with context preparation functionality
 */
export const ActorSheetContextPreparationMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Prepare items for display in the sheet
     * @param {Object} context - The sheet context
     * @returns {Object} The enriched context with prepared items
     * @protected
     */
    _prepareItems(context) {
      Logger.debug(
        "Preparing items for actor sheet",
        {
          actorName: this.actor?.name,
          itemCount: this.actor?.items?.size || 0,
        },
        "CONTEXT_PREPARATION",
      );

      try {
        // Initialize item arrays
        const gear = [];
        const spells = [];
        const features = [];
        const effects = [];
        const transformations = [];
        const baseActionCards = [];
        const combatPowers = [];

        // Process each item and categorize by type
        for (const item of this.actor.items) {
          const itemData = item.toObject();

          // Add computed properties
          itemData.isEquipped = item.system.equipped || false;
          itemData.isActive = item.system.active || false;

          Logger.debug(
            "Processing item for categorization",
            {
              itemName: item.name,
              itemType: item.type,
              itemId: item.id,
            },
            "CONTEXT_PREPARATION",
          );

          switch (item.type) {
            case "gear":
              gear.push(itemData);
              break;
            case "spell":
              spells.push(itemData);
              break;
            case "feature":
              features.push(itemData);
              break;
            case "status":
              effects.push(itemData);
              break;
            case "transformation":
              transformations.push(itemData);
              break;
            case "actionCard":
              baseActionCards.push(itemData);
              break;
            case "combatPower":
              combatPowers.push(itemData);
              break;
            default:
              Logger.warn(
                `Unknown item type: ${item.type}`,
                { itemId: item.id, itemName: item.name },
                "CONTEXT_PREPARATION",
              );
              break;
          }
        }

        // Sort items within categories
        gear.sort((a, b) => a.name.localeCompare(b.name));
        spells.sort((a, b) => a.name.localeCompare(b.name));
        features.sort((a, b) => a.name.localeCompare(b.name));
        effects.sort((a, b) => a.name.localeCompare(b.name));
        transformations.sort((a, b) => a.name.localeCompare(b.name));
        baseActionCards.sort((a, b) => a.name.localeCompare(b.name));
        combatPowers.sort((a, b) => a.name.localeCompare(b.name));

        // Separate equipped and unequipped gear
        const equippedGear = gear.filter((item) => item.isEquipped);
        const unequippedGear = gear.filter((item) => !item.isEquipped);

        // Handle transformation combat powers
        let transformationCombatPowers = [];

        // Check if actor is transformed and get transformation combat powers
        const activeTransformationId = this.actor.getFlag(
          "eventide-rp-system",
          "activeTransformation",
        );

        Logger.debug(
          "Checking for active transformation",
          {
            actorName: this.actor.name,
            activeTransformationId,
            hasActiveTransformation: !!activeTransformationId,
          },
          "CONTEXT_PREPARATION",
        );

        if (activeTransformationId) {
          // Try to get combat powers from stored flag data first
          const storedCombatPowersData = this.actor.getFlag(
            "eventide-rp-system",
            "activeTransformationCombatPowers",
          );

          if (storedCombatPowersData && Array.isArray(storedCombatPowersData)) {
            // Create temporary Item instances from the stored data
            transformationCombatPowers = storedCombatPowersData.map(
              (powerData) => {
                const tempItem = new CONFIG.Item.documentClass(powerData, {
                  parent: this.actor,
                });

                // Make the temporary item editable based on actor permissions
                Object.defineProperty(tempItem, "isEditable", {
                  value: this.actor.isEditable,
                  configurable: true,
                });

                return tempItem;
              },
            );

            Logger.debug(
              "Retrieved transformation combat powers from flags",
              {
                actorName: this.actor.name,
                embeddedPowerCount: transformationCombatPowers.length,
                embeddedPowerNames: transformationCombatPowers.map(
                  (p) => p.name,
                ),
              },
              "CONTEXT_PREPARATION",
            );
          } else {
            // Fallback: try to find the transformation item in actor's items
            const activeTransformation = this.actor.items.get(
              activeTransformationId,
            );

            Logger.debug(
              "Fallback: looking for transformation item in actor's items",
              {
                actorName: this.actor.name,
                transformationId: activeTransformationId,
                transformationFound: !!activeTransformation,
                transformationType: activeTransformation?.type,
                transformationName: activeTransformation?.name,
              },
              "CONTEXT_PREPARATION",
            );

            if (
              activeTransformation &&
              activeTransformation.type === "transformation"
            ) {
              transformationCombatPowers =
                activeTransformation.system.getEmbeddedCombatPowers();

              Logger.debug(
                "Retrieved transformation combat powers from item",
                {
                  actorName: this.actor.name,
                  transformationName: activeTransformation.name,
                  embeddedPowerCount: transformationCombatPowers.length,
                  embeddedPowerNames: transformationCombatPowers.map(
                    (p) => p.name,
                  ),
                },
                "CONTEXT_PREPARATION",
              );
            }
          }
        }

        // Handle transformation action cards similar to combat powers
        let transformationActionCards = [];

        // Check if actor is transformed and get transformation action cards
        if (activeTransformationId) {
          // Try to get action cards from stored flag data first
          const storedActionCardsData = this.actor.getFlag(
            "eventide-rp-system",
            "activeTransformationActionCards",
          );

          if (storedActionCardsData && Array.isArray(storedActionCardsData)) {
            // Create temporary Item instances from the stored data
            transformationActionCards = storedActionCardsData.map(
              (actionCardData) => {
                const tempItem = new CONFIG.Item.documentClass(actionCardData, {
                  parent: this.actor,
                });

                // Make the temporary item editable based on actor permissions
                Object.defineProperty(tempItem, "isEditable", {
                  value: this.actor.isEditable,
                  configurable: true,
                });

                return tempItem;
              },
            );

            Logger.debug(
              "Retrieved transformation action cards from flags",
              {
                actorName: this.actor.name,
                embeddedActionCardCount: transformationActionCards.length,
                embeddedActionCardNames: transformationActionCards.map(
                  (ac) => ac.name,
                ),
              },
              "CONTEXT_PREPARATION",
            );
          } else {
            // Fallback: try to find the transformation item in actor's items
            const activeTransformation = this.actor.items.get(
              activeTransformationId,
            );

            Logger.debug(
              "Fallback: looking for transformation item in actor's items for action cards",
              {
                actorName: this.actor.name,
                transformationId: activeTransformationId,
                transformationFound: !!activeTransformation,
                transformationType: activeTransformation?.type,
                transformationName: activeTransformation?.name,
              },
              "CONTEXT_PREPARATION",
            );

            if (
              activeTransformation &&
              activeTransformation.type === "transformation"
            ) {
              transformationActionCards =
                activeTransformation.system.getEmbeddedActionCards();

              Logger.debug(
                "Retrieved transformation action cards from item",
                {
                  actorName: this.actor.name,
                  transformationName: activeTransformation.name,
                  embeddedActionCardCount: transformationActionCards.length,
                  embeddedActionCardNames: transformationActionCards.map(
                    (ac) => ac.name,
                  ),
                },
                "CONTEXT_PREPARATION",
              );
            }
          }
        }

        Logger.debug(
          "Processed action cards for display",
          {
            actorName: this.actor.name,
            baseActionCardCount: baseActionCards.length,
            transformationActionCardCount: transformationActionCards.length,
            hasTransformationActionCards: transformationActionCards.length > 0,
          },
          "CONTEXT_PREPARATION",
        );

        // Add to context
        context.gear = gear;
        context.equippedGear = equippedGear;
        context.unequippedGear = unequippedGear;
        context.spells = spells;
        context.features = features;
        context.effects = effects;
        context.statuses = effects; // Templates expect 'statuses' for status effects
        context.transformations = transformations;
        context.actionCards = baseActionCards;
        context.transformationActionCards = transformationActionCards;
        context.combatPowers = combatPowers;
        context.transformationCombatPowers = transformationCombatPowers;

        // Add counts for template use
        context.gearCount = gear.length;
        context.equippedGearCount = equippedGear.length;
        context.unequippedGearCount = unequippedGear.length;
        context.spellCount = spells.length;
        context.featureCount = features.length;
        context.effectCount = effects.length;
        context.statusCount = effects.length; // Templates expect 'statusCount'
        context.transformationCount = transformations.length;
        context.actionCardCount = baseActionCards.length;
        context.transformationActionCardCount = transformationActionCards.length;
        context.combatPowerCount = combatPowers.length;
        context.transformationCombatPowerCount =
          transformationCombatPowers.length;

        Logger.debug(
          "Items prepared successfully",
          {
            actorName: this.actor.name,
            gearCount: gear.length,
            equippedCount: equippedGear.length,
            unequippedCount: unequippedGear.length,
            spellCount: spells.length,
            featureCount: features.length,
            effectCount: effects.length,
            transformationCount: transformations.length,
            actionCardCount: baseActionCards.length,
            combatPowerCount: combatPowers.length,
            transformationCombatPowerCount: transformationCombatPowers.length,
          },
          "CONTEXT_PREPARATION",
        );

        return context;
      } catch (error) {
        Logger.error(
          `Error preparing items for ${this.actor?.name}`,
          error,
          "DATA_PROCESSING"
        );

        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ItemPreparationError",
          ),
        );

        // Return context with empty arrays to prevent template errors
        context.gear = [];
        context.equippedGear = [];
        context.unequippedGear = [];
        context.spells = [];
        context.features = [];
        context.effects = [];
        context.statuses = [];
        context.transformations = [];
        context.actionCards = [];
        context.combatPowers = [];
        context.transformationCombatPowers = [];

        return context;
      }
    }

    /**
     * Prepare actor data for display in the sheet
     * @param {Object} context - The sheet context
     * @returns {Object} The enriched context with prepared actor data
     * @protected
     */
    _prepareActorData(context) {
      Logger.debug(
        "Preparing actor data for sheet",
        {
          actorName: this.actor?.name,
          actorType: this.actor?.type,
        },
        "CONTEXT_PREPARATION",
      );

      try {
        const actorData = context.actor;
        const systemData = actorData.system;

        // Add computed properties
        context.isTransformed = !!this.actor.getFlag(
          "eventide-rp-system",
          "activeTransformation",
        );
        context.activeTransformationId = this.actor.getFlag(
          "eventide-rp-system",
          "activeTransformation",
        );
        context.hasTransformationActionCards = this.actor.hasTransformationActionCards
          ? this.actor.hasTransformationActionCards()
          : false;
        context.autoTokenUpdate = this.actor.getFlag(
          "eventide-rp-system",
          "autoTokenUpdate",
        );

        // Prepare health data
        if (systemData.health) {
          context.healthPercentage = Math.round(
            (systemData.health.value / systemData.health.max) * 100,
          );
          context.isHealthy = systemData.health.value >= systemData.health.max;
          context.isWounded = systemData.health.value < systemData.health.max;
          context.isCritical =
            systemData.health.value <= systemData.health.max * 0.25;
        }

        // Prepare resource data (mana, stamina, etc.)
        if (systemData.resources) {
          context.resources = {};
          for (const [key, resource] of Object.entries(systemData.resources)) {
            if (resource && typeof resource === "object" && resource.max) {
              context.resources[key] = {
                ...resource,
                percentage: Math.round((resource.value / resource.max) * 100),
                isEmpty: resource.value <= 0,
                isFull: resource.value >= resource.max,
              };
            }
          }
        }

        // Prepare attribute data
        if (systemData.attributes) {
          context.attributes = {};
          for (const [key, attribute] of Object.entries(
            systemData.attributes,
          )) {
            if (attribute && typeof attribute === "object") {
              context.attributes[key] = {
                ...attribute,
                modifier: Math.floor((attribute.value - 10) / 2),
                isPositive: attribute.value > 10,
                isNegative: attribute.value < 10,
              };
            }
          }
        }

        // Add permission flags
        context.isOwner = this.document.isOwner;
        context.isGM = game.user.isGM;
        context.canEdit = this.document.isOwner || game.user.isGM;

        Logger.debug(
          "Actor data prepared successfully",
          {
            actorName: this.actor.name,
            isTransformed: context.isTransformed,
            healthPercentage: context.healthPercentage,
            resourceCount: Object.keys(context.resources || {}).length,
            attributeCount: Object.keys(context.attributes || {}).length,
          },
          "CONTEXT_PREPARATION",
        );

        return context;
      } catch (error) {
        Logger.error(
          `Error preparing actor data for ${this.actor?.name}`,
          error,
          "DATA_PROCESSING"
        );

        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ActorDataPreparationError",
          ),
        );

        // Return context with safe defaults
        context.isTransformed = false;
        context.healthPercentage = 100;
        context.resources = {};
        context.attributes = {};
        context.isOwner = false;
        context.isGM = false;
        context.canEdit = false;

        return context;
      }
    }

    /**
     * Enrich context with additional computed properties and helpers
     * @param {Object} context - The sheet context
     * @returns {Object} The fully enriched context
     * @protected
     */
    _enrichContext(context) {
      Logger.debug(
        "Enriching context for actor sheet",
        {
          actorName: this.actor?.name,
          contextKeys: Object.keys(context),
        },
        "CONTEXT_PREPARATION",
      );

      try {
        // Add utility functions for templates
        context.helpers = {
          // Format numbers with proper localization
          formatNumber: (value) => {
            return new Intl.NumberFormat(game.i18n.lang).format(value);
          },

          // Format percentages
          formatPercentage: (value) => {
            return `${Math.round(value)}%`;
          },

          // Check if value is positive
          isPositive: (value) => {
            return value > 0;
          },

          // Check if value is negative
          isNegative: (value) => {
            return value < 0;
          },

          // Get modifier string with sign
          getModifierString: (value) => {
            const modifier = Math.floor((value - 10) / 2);
            return modifier >= 0 ? `+${modifier}` : `${modifier}`;
          },
        };

        // Add theme information
        context.currentTheme =
          game.user.getFlag("eventide-rp-system", "sheetTheme") || "blue";

        // Add system information
        context.systemVersion = game.system.version;
        context.foundryVersion = game.version;

        Logger.debug(
          "Context enriched successfully",
          {
            actorName: this.actor.name,
            currentTheme: context.currentTheme,
            helperCount: Object.keys(context.helpers).length,
          },
          "CONTEXT_PREPARATION",
        );

        return context;
      } catch (error) {
        Logger.error(
          `Error enriching context for ${this.actor?.name}`,
          error,
          "DATA_PROCESSING"
        );

        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ContextEnrichmentError",
          ),
        );

        // Return context with safe defaults
        context.helpers = {};
        context.currentTheme = "blue";

        return context;
      }
    }

    /**
     * Prepare the complete context for the actor sheet
     * Call this from your _prepareContext method
     * @param {Object} context - The base context
     * @returns {Object} The fully prepared context
     * @protected
     */
    _prepareSheetContext(context) {
      Logger.debug(
        "Preparing complete sheet context",
        {
          actorName: this.actor?.name,
          initialContextKeys: Object.keys(context),
        },
        "CONTEXT_PREPARATION",
      );

      try {
        // Prepare items
        context = this._prepareItems(context);

        // Prepare actor data
        context = this._prepareActorData(context);

        // Enrich context
        context = this._enrichContext(context);

        Logger.info(
          "Sheet context prepared successfully",
          {
            actorName: this.actor.name,
            finalContextKeys: Object.keys(context),
            itemCounts: {
              gear: context.gearCount,
              spells: context.spellCount,
              features: context.featureCount,
              effects: context.effectCount,
            },
          },
          "CONTEXT_PREPARATION",
        );

        return context;
      } catch (error) {
        Logger.error(
          `Error preparing sheet context for ${this.actor?.name}`,
          error,
          "DATA_PROCESSING"
        );

        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.SheetContextPreparationError",
          ),
        );

        return context;
      }
    }
  };
