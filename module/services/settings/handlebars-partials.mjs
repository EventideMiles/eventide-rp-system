/**
 * Handlebars partials initialization for Eventide RP System
 * @module services/settings/handlebars-partials
 */

/**
 * Initialize and register Handlebars partials
 *
 * This function loads the template files for commonly used UI components and
 * registers them as Handlebars partials so they can be included in other templates.
 *
 * @async
 * @returns {Promise<void>}
 */
export const initHandlebarsPartials = async () => {
  // Define the partial paths with their registration names
  const partialPaths = {
    "character-effects":
      "systems/eventide-rp-system/templates/macros/parts/character-effects.hbs",
    "macro-footer":
      "systems/eventide-rp-system/templates/macros/parts/macro-footer.hbs",
    "callout-box":
      "systems/eventide-rp-system/templates/macros/parts/callout-box.hbs",
    "card-effects":
      "systems/eventide-rp-system/templates/chat/parts/card-effects.hbs",
    "card-ac-check":
      "systems/eventide-rp-system/templates/chat/parts/card-ac-check.hbs",
    "roll-info":
      "systems/eventide-rp-system/templates/chat/parts/roll-info.hbs",
    "color-pickers":
      "systems/eventide-rp-system/templates/macros/parts/color-pickers.hbs",
  };

  // Load and register each partial
  await Promise.all(
    Object.entries(partialPaths).map(async ([name, path]) => {
      try {
        const template = await fetchPartialTemplate(path);
        Handlebars.registerPartial(name, template);
      } catch (error) {
        console.error(`Failed to load Handlebars partial '${name}':`, error);
      }
    })
  );
};

/**
 * Fetch a template from a path
 *
 * @private
 * @param {string} path - Path to the template file
 * @returns {Promise<string>} The template content
 */
const fetchPartialTemplate = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status} when fetching ${path}`);
  }
  return await response.text();
};
