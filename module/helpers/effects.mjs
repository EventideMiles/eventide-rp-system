/**
 * Helper functions for Active Effects
 * @module helpers/effects
 */

/**
 * Prepare the data structure for Active Effects which are currently embedded in an Actor or Item.
 *
 * This function organizes active effects into categories (temporary, passive, inactive)
 * for easier rendering and management in the UI.
 *
 * @param {ActiveEffect[]} effects - A collection or generator of Active Effect documents to prepare sheet data for
 * @returns {Object} Categorized effects data for rendering
 * @returns {Object} returns.temporary - Category for temporary effects
 * @returns {Object} returns.passive - Category for passive effects
 * @returns {Object} returns.inactive - Category for disabled effects
 */
export function prepareActiveEffectCategories(effects) {
  // Define effect header categories
  const categories = {
    temporary: {
      type: "temporary",
      label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Effect.Temporary"),
      effects: [],
    },
    passive: {
      type: "passive",
      label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Effect.Passive"),
      effects: [],
    },
    inactive: {
      type: "inactive",
      label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Effect.Inactive"),
      effects: [],
    },
  };

  // Iterate over active effects, classifying them into categories
  for (const effect of effects) {
    if (effect.disabled) {
      categories.inactive.effects.push(effect);
    } else if (effect.isTemporary) {
      categories.temporary.effects.push(effect);
    } else {
      categories.passive.effects.push(effect);
    }
  }

  // Sort each category by the sort property
  for (const category of Object.values(categories)) {
    category.effects.sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  return categories;
}
