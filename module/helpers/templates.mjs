/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials.
    "systems/eventide-rp-system/templates/actor/parts/actor-features.hbs",
    "systems/eventide-rp-system/templates/actor/parts/actor-items.hbs",
    "systems/eventide-rp-system/templates/actor/parts/actor-effects.hbs",
    "systems/eventide-rp-system/templates/actor/parts/actor-statuses.hbs",
    // Item partials
    "systems/eventide-rp-system/templates/item/parts/item-effects.hbs",
  ]);
};
