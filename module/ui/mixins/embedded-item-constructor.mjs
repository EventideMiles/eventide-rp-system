import { Logger } from "../../services/_module.mjs";

/**
 * Embedded Item Constructor Mixin
 *
 * Provides constructor functionality for embedded item sheets including:
 * - Temporary document creation for embedded items
 * - Permission inheritance from parent items
 * - Active effect initialization for status and gear items
 * - Proper ownership and permission setup
 *
 * @param {class} BaseClass - The base item sheet class to extend
 * @returns {class} Extended class with embedded item constructor functionality
 */
export const EmbeddedItemConstructorMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Initialize a temporary item document for embedded item editing
     * @param {object} itemData - The raw data of the item to edit
     * @param {Item} parentItem - The parent item document (action card or transformation)
     * @param {boolean} isEffect - Whether this is an embedded effect (vs main embedded item)
     * @returns {Item} The temporary item document
     * @protected
     */
    _initializeTempItem(itemData, parentItem, isEffect = false) {
      Logger.methodEntry(
        "EmbeddedItemConstructorMixin",
        "_initializeTempItem",
        {
          itemData,
          parentItem: parentItem?.name,
          isEffect,
        },
      );

      // Create a temporary, un-parented Item document to represent the embedded item
      const tempItem = new CONFIG.Item.documentClass(itemData, {
        parent: null,
      });

      // Initialize effects collection if it doesn't exist
      if (!tempItem.effects) {
        tempItem.effects = new foundry.utils.Collection();
      }

      Logger.debug(
        "EmbeddedItemConstructorMixin | Processing item data",
        {
          itemType: itemData.type,
          itemName: itemData.name,
          hasEffectsData: !!(
            itemData.effects && Array.isArray(itemData.effects)
          ),
          effectsCount: itemData.effects?.length || 0,
        },
        "EMBEDDED_CONSTRUCTOR",
      );

      // Initialize active effects from stored data
      this._initializeActiveEffects(tempItem, itemData);

      // Set up permissions based on parent item
      this._setupPermissions(tempItem, parentItem);

      Logger.methodExit(
        "EmbeddedItemConstructorMixin",
        "_initializeTempItem",
        tempItem,
      );
      return tempItem;
    }

    /**
     * Initialize active effects for the temporary item
     * @param {Item} tempItem - The temporary item document
     * @param {object} itemData - The raw item data
     * @private
     */
    _initializeActiveEffects(tempItem, itemData) {
      // If the item data has effects, create temporary ActiveEffect documents
      if (itemData.effects && Array.isArray(itemData.effects)) {
        for (const effectData of itemData.effects) {
          Logger.debug(
            "EmbeddedItemConstructorMixin | Creating temp effect from stored data",
            {
              effectId: effectData._id,
              effectName: effectData.name,
              duration: effectData.duration,
              durationSeconds: effectData.duration?.seconds,
            },
            "EMBEDDED_CONSTRUCTOR",
          );

          const tempEffect = new CONFIG.ActiveEffect.documentClass(effectData, {
            parent: tempItem,
          });
          tempItem.effects.set(effectData._id, tempEffect);
        }
      } else if (itemData.type === "status" || itemData.type === "gear") {
        // Create a default ActiveEffect for status effects and gear if none exists
        const defaultEffectData = this._createDefaultEffect(tempItem);

        Logger.debug(
          "EmbeddedItemConstructorMixin | Creating default effect for status/gear",
          {
            itemType: itemData.type,
            defaultEffectData,
          },
          "EMBEDDED_CONSTRUCTOR",
        );

        const tempEffect = new CONFIG.ActiveEffect.documentClass(
          defaultEffectData,
          {
            parent: tempItem,
          },
        );
        tempItem.effects.set(defaultEffectData._id, tempEffect);

        // Also add the effect to the item data so it gets saved
        if (!itemData.effects) {
          itemData.effects = [];
        }
        itemData.effects.push(defaultEffectData);
      }
    }

    /**
     * Create a default active effect for status and gear items
     * @param {Item} tempItem - The temporary item document
     * @returns {object} Default effect data
     * @private
     */
    _createDefaultEffect(tempItem) {
      return {
        _id: foundry.utils.randomID(),
        name: tempItem.name,
        icon: tempItem.img,
        changes: [],
        disabled: false,
        duration: {
          seconds: 0,
          startTime: null,
          combat: "",
          rounds: 0,
          turns: 0,
          startRound: 0,
          startTurn: 0,
        },
        flags: {},
        tint: "#ffffff",
        transfer: true,
        statuses: [],
      };
    }

    /**
     * Set up permissions for the temporary item based on the parent item
     * @param {Item} tempItem - The temporary item document
     * @param {Item} parentItem - The parent item document
     * @private
     */
    _setupPermissions(tempItem, parentItem) {
      // Set permissions based on the containing parent item
      Object.defineProperty(tempItem, "isOwner", {
        value: parentItem.isOwner,
        configurable: true,
      });
      Object.defineProperty(tempItem, "isEditable", {
        value: parentItem.isEditable,
        configurable: true,
      });

      // Copy ownership from the parent item to ensure proper permissions
      Object.defineProperty(tempItem, "ownership", {
        value: parentItem.ownership,
        configurable: true,
      });

      // Override permission methods to use parent item permissions
      tempItem.canUserModify = function (user, action) {
        return parentItem.canUserModify(user, action);
      };

      tempItem.testUserPermission = function (user, permission, options) {
        return parentItem.testUserPermission(user, permission, options);
      };

      Logger.debug(
        "EmbeddedItemConstructorMixin | Permissions set up",
        {
          isOwner: tempItem.isOwner,
          isEditable: tempItem.isEditable,
          parentName: parentItem.name,
        },
        "EMBEDDED_CONSTRUCTOR",
      );
    }
  };
