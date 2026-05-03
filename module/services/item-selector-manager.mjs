/**
 * ItemSelectorManager Service
 *
 * Provides centralized management for item selector combo boxes and the
 * shared scope selector in item sheets. Handles initialization, cleanup,
 * and configuration of all selector types.
 *
 * @module ItemSelectorManager
 * @see module:item-sheet
 */

import { ItemSelectorComboBox } from "../ui/components/item-selector-combo-box.mjs";
import { ItemScopeSelector } from "../ui/components/item-scope-selector.mjs";
import {
  ItemSourceCollector,
  ALL_SCOPES,
} from "../helpers/item-source-collector.mjs";
import { Logger } from "./logger.mjs";

export class ItemSelectorManager {
  static SELECTOR_CONFIGS = {
    "action-item": {
      itemTypes: () => ItemSourceCollector.getActionItemTypes(),
      handlerName: "_onActionItemSelected",
      placeholderKey: "EVENTIDE_RP_SYSTEM.Forms.ActionItemSelector.Placeholder",
      selectorType: "action-item",
    },
    effects: {
      itemTypes: () => ItemSourceCollector.getEffectItemTypes(),
      handlerName: "_onEffectSelected",
      placeholderKey: "EVENTIDE_RP_SYSTEM.Forms.EffectsSelector.Placeholder",
      selectorType: "effects",
    },
    transformations: {
      itemTypes: ["transformation"],
      handlerName: "_onTransformationSelected",
      placeholderKey:
        "EVENTIDE_RP_SYSTEM.Forms.TransformationsSelector.Placeholder",
      selectorType: "transformations",
    },
    "combat-powers": {
      itemTypes: ["combatPower"],
      handlerName: "_onCombatPowerSelected",
      placeholderKey:
        "EVENTIDE_RP_SYSTEM.Forms.CombatPowersSelector.Placeholder",
      selectorType: "combat-powers",
      itemTypeFilter: "transformation",
    },
    "action-cards": {
      itemTypes: ["actionCard"],
      handlerName: "_onActionCardSelected",
      placeholderKey:
        "EVENTIDE_RP_SYSTEM.Forms.ActionCardsSelector.Placeholder",
      selectorType: "action-cards",
      itemTypeFilter: "transformation",
    },
    "self-effects": {
      itemTypes: () => ItemSourceCollector.getEffectItemTypes(),
      handlerName: "_onSelfEffectSelected",
      placeholderKey:
        "EVENTIDE_RP_SYSTEM.Forms.SelfEffectsSelector.Placeholder",
      selectorType: "self-effects",
    },
  };

  static getEffectiveScopes(item) {
    const savedScopes = item?.system?.selectorScopes;
    if (savedScopes && Array.isArray(savedScopes) && savedScopes.length > 0) {
      return savedScopes;
    }
    return [...ALL_SCOPES];
  }

  static async saveScopePreferences(item, scopes) {
    try {
      const sortedScopes = [...scopes].sort();
      await item.update(
        { "system.selectorScopes": sortedScopes },
        { render: false },
      );
      Logger.debug(
        "Saved scope preferences",
        { sortedScopes },
        "ItemSelectorManager",
      );
      return item;
    } catch (error) {
      Logger.error(
        "Failed to save scope preferences",
        error,
        "ItemSelectorManager",
      );
      throw error;
    }
  }

  static initializeScopeSelector(sheet, _selectorTypes) {
    const container = sheet.element.querySelector("[data-scope-selector]");
    if (!container) {
      Logger.debug(
        "No scope selector container found",
        null,
        "ItemSelectorManager",
      );
      return null;
    }

    let scopes = this.getEffectiveScopes(sheet.item);
    const parentActor = sheet.item?.isOwned ? sheet.item.parent : null;

    if (!parentActor) {
      scopes = scopes.filter((s) => s !== "thisCharacter");
    }

    const scopeSelector = new ItemScopeSelector({
      container,
      parentActor,
      scopes,
      onScopeChange: (newScopes) => {
        this._handleScopeChange(sheet, newScopes);
      },
    });

    Logger.debug(
      "Initialized scope selector",
      { scopes },
      "ItemSelectorManager",
    );
    return scopeSelector;
  }

  static initializeSelectors(sheet, selectorTypes) {
    const selectors = {};

    // Get shared scope config
    let scopes = this.getEffectiveScopes(sheet.item);
    const parentActor = sheet.item?.isOwned ? sheet.item.parent : null;
    if (!parentActor) {
      scopes = scopes.filter((s) => s !== "thisCharacter");
    }

    try {
      for (const selectorType of selectorTypes) {
        const config = this.SELECTOR_CONFIGS[selectorType];

        if (!config) {
          Logger.warn(
            `Unknown selector type: ${selectorType}`,
            null,
            "ItemSelectorManager",
          );
          continue;
        }

        if (
          config.itemTypeFilter &&
          sheet.item.type !== config.itemTypeFilter
        ) {
          continue;
        }

        const container = sheet.element.querySelector(
          `[data-selector="${selectorType}"]`,
        );
        if (!container) {
          Logger.debug(
            `Container not found for selector: ${selectorType}`,
            null,
            "ItemSelectorManager",
          );
          continue;
        }

        const itemTypes =
          typeof config.itemTypes === "function"
            ? config.itemTypes()
            : config.itemTypes;

        const selector = new ItemSelectorComboBox({
          container,
          itemTypes,
          onSelect: this.createHandler(sheet, config.handlerName),
          placeholder: game.i18n.localize(config.placeholderKey),
          selectorType: config.selectorType,
          scopes,
          parentActor,
        });

        selectors[selectorType] = selector;

        const privateFieldName = `#${this._toCamelCase(selectorType)}Selector`;
        if (typeof sheet._setPrivate === "function") {
          sheet._setPrivate(privateFieldName, selector);
        }

        Logger.debug(
          `Initialized selector: ${selectorType}`,
          { selectorType, itemTypes, scopes },
          "ItemSelectorManager",
        );
      }
    } catch (error) {
      Logger.error(
        "Failed to initialize item selectors",
        error,
        "ItemSelectorManager",
      );
    }

    return selectors;
  }

  static _handleScopeChange(sheet, newScopes) {
    Logger.debug(
      "Scope changed, syncing all selectors",
      { newScopes },
      "ItemSelectorManager",
    );

    if (sheet._selectors) {
      for (const selector of Object.values(sheet._selectors)) {
        if (typeof selector.setScopes === "function") {
          selector.setScopes(newScopes);
        }
      }
    }

    this.saveScopePreferences(sheet.item, newScopes);
  }

  static cleanupSelectors(sheet, selectorInstances) {
    try {
      for (const [selectorType, selector] of Object.entries(
        selectorInstances,
      )) {
        if (selector && typeof selector.destroy === "function") {
          selector.destroy();
        }

        const privateFieldName = `#${this._toCamelCase(selectorType)}Selector`;
        if (typeof sheet._setPrivate === "function") {
          sheet._setPrivate(privateFieldName, null);
        }
      }

      Logger.debug(
        "Cleaned up item selectors",
        { count: Object.keys(selectorInstances).length },
        "ItemSelectorManager",
      );
    } catch (error) {
      Logger.warn(
        "Error cleaning up item selectors",
        error,
        "ItemSelectorManager",
      );
    }
  }

  static cleanupScopeSelector(scopeSelector) {
    try {
      if (scopeSelector && typeof scopeSelector.destroy === "function") {
        scopeSelector.destroy();
      }
    } catch (error) {
      Logger.warn(
        "Error cleaning up scope selector",
        error,
        "ItemSelectorManager",
      );
    }
  }

  static createHandler(sheet, handlerName) {
    return async (droppedItem) => {
      try {
        if (typeof sheet[handlerName] === "function") {
          await sheet[handlerName](droppedItem);
        } else {
          Logger.warn(
            `Handler method not found: ${handlerName}`,
            { sheet, handlerName },
            "ItemSelectorManager",
          );
        }
      } catch (error) {
        Logger.error(
          `Error in selector handler: ${handlerName}`,
          error,
          "ItemSelectorManager",
        );
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GenericError"),
        );
      }
    };
  }

  static _toCamelCase(str) {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  static getSelectorConfig(selectorType) {
    return this.SELECTOR_CONFIGS[selectorType];
  }

  static getAvailableSelectorTypes() {
    return Object.keys(this.SELECTOR_CONFIGS);
  }
}
