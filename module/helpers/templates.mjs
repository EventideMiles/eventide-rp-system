/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials
    "systems/eventide-rp-system/templates/actor/biography.hbs",
    "systems/eventide-rp-system/templates/actor/combat-powers.hbs",
    "systems/eventide-rp-system/templates/actor/effects.hbs",
    "systems/eventide-rp-system/templates/actor/features.hbs",
    "systems/eventide-rp-system/templates/actor/gear.hbs",
    "systems/eventide-rp-system/templates/actor/header.hbs",
    "systems/eventide-rp-system/templates/actor/statuses.hbs",
    
    // Chat message templates
    "systems/eventide-rp-system/templates/chat/combat-power-message.hbs",
    "systems/eventide-rp-system/templates/chat/delete-status-message.hbs",
    "systems/eventide-rp-system/templates/chat/feature-message.hbs",
    "systems/eventide-rp-system/templates/chat/gear-equip-message.hbs",
    "systems/eventide-rp-system/templates/chat/gear-transfer-message.hbs",
    "systems/eventide-rp-system/templates/chat/initiative-roll.hbs",
    "systems/eventide-rp-system/templates/chat/restore-message.hbs",
    "systems/eventide-rp-system/templates/chat/roll-message.hbs",
    "systems/eventide-rp-system/templates/chat/status-message.hbs",
    
    // Item partials
    "systems/eventide-rp-system/templates/item/attribute-parts/combat-power.hbs",
    "systems/eventide-rp-system/templates/item/attribute-parts/feature.hbs",
    "systems/eventide-rp-system/templates/item/attribute-parts/gear.hbs",
    "systems/eventide-rp-system/templates/item/description.hbs",
    "systems/eventide-rp-system/templates/item/effects.hbs",
    "systems/eventide-rp-system/templates/item/header.hbs",
    "systems/eventide-rp-system/templates/item/prerequisites.hbs",
    
    // Macro templates
    "systems/eventide-rp-system/templates/macros/change-target-status.hbs",
    "systems/eventide-rp-system/templates/macros/damage-targets.hbs",
    "systems/eventide-rp-system/templates/macros/effect-creator.hbs",
    "systems/eventide-rp-system/templates/macros/gear-creator.hbs",
    "systems/eventide-rp-system/templates/macros/gear-transfer.hbs",
    "systems/eventide-rp-system/templates/macros/restore-target.hbs",
    "systems/eventide-rp-system/templates/macros/select-ability-roll.hbs",
    
    // Popup templates
    "systems/eventide-rp-system/templates/macros/popups/combat-power-popup.hbs",
    "systems/eventide-rp-system/templates/macros/popups/feature-popup.hbs",
    "systems/eventide-rp-system/templates/macros/popups/gear-popup.hbs",
    "systems/eventide-rp-system/templates/macros/popups/status-popup.hbs"
  ]);
};
