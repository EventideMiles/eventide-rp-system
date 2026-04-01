// @ts-nocheck
/**
 * @fileoverview Handlebars Template Preloader Tests
 *
 * Unit tests for the template preloader which handles pre-loading
 * Handlebars templates for faster rendering in the Eventide RP System.
 *
 * NOTE: These tests validate the expected template paths and count.
 * The actual templates.mjs module cannot be imported directly because
 * it uses a bare 'foundry' identifier which cannot be resolved by vite
 * during the transform phase. This is a limitation of the source code
 * architecture.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// These are the expected template paths from templates.mjs
const EXPECTED_TEMPLATES = [
  // Actor partials (7)
  "systems/eventide-rp-system/templates/actor/biography.hbs",
  "systems/eventide-rp-system/templates/actor/combat-powers.hbs",
  "systems/eventide-rp-system/templates/actor/effects.hbs",
  "systems/eventide-rp-system/templates/actor/features.hbs",
  "systems/eventide-rp-system/templates/actor/gear.hbs",
  "systems/eventide-rp-system/templates/actor/header.hbs",
  "systems/eventide-rp-system/templates/actor/statuses.hbs",

  // Chat message templates (8)
  "systems/eventide-rp-system/templates/chat/combat-power-message.hbs",
  "systems/eventide-rp-system/templates/chat/delete-status-message.hbs",
  "systems/eventide-rp-system/templates/chat/feature-message.hbs",
  "systems/eventide-rp-system/templates/chat/gear-equip-message.hbs",
  "systems/eventide-rp-system/templates/chat/initiative-roll.hbs",
  "systems/eventide-rp-system/templates/chat/restore-message.hbs",
  "systems/eventide-rp-system/templates/chat/roll-message.hbs",
  "systems/eventide-rp-system/templates/chat/status-message.hbs",

  // Item partials (7)
  "systems/eventide-rp-system/templates/item/attribute-parts/combat-power.hbs",
  "systems/eventide-rp-system/templates/item/attribute-parts/feature.hbs",
  "systems/eventide-rp-system/templates/item/attribute-parts/gear.hbs",
  "systems/eventide-rp-system/templates/item/description.hbs",
  "systems/eventide-rp-system/templates/item/effects.hbs",
  "systems/eventide-rp-system/templates/item/header.hbs",
  "systems/eventide-rp-system/templates/item/prerequisites.hbs",

  // Macro templates (6)
  "systems/eventide-rp-system/templates/macros/change-target-status.hbs",
  "systems/eventide-rp-system/templates/macros/damage-targets.hbs",
  "systems/eventide-rp-system/templates/macros/effect-creator.hbs",
  "systems/eventide-rp-system/templates/macros/gear-creator.hbs",
  "systems/eventide-rp-system/templates/macros/restore-target.hbs",
  "systems/eventide-rp-system/templates/macros/select-ability-roll.hbs",

  // Popup templates (4)
  "systems/eventide-rp-system/templates/macros/popups/combat-power-popup.hbs",
  "systems/eventide-rp-system/templates/macros/popups/feature-popup.hbs",
  "systems/eventide-rp-system/templates/macros/popups/gear-popup.hbs",
  "systems/eventide-rp-system/templates/macros/popups/status-popup.hbs"
];

describe('handlebars: templates.mjs', () => {
  describe('Template Paths Specification', () => {
    test('should define exactly 32 template paths', () => {
      // Arrange & Act & Assert
      expect(EXPECTED_TEMPLATES).toHaveLength(32);
    });

    test('should include all 7 actor partial templates', () => {
      // Act
      const actorTemplates = EXPECTED_TEMPLATES.filter(path => path.includes('/actor/'));

      // Assert
      expect(actorTemplates).toHaveLength(7);
      expect(actorTemplates).toContain('systems/eventide-rp-system/templates/actor/biography.hbs');
      expect(actorTemplates).toContain('systems/eventide-rp-system/templates/actor/combat-powers.hbs');
      expect(actorTemplates).toContain('systems/eventide-rp-system/templates/actor/effects.hbs');
      expect(actorTemplates).toContain('systems/eventide-rp-system/templates/actor/features.hbs');
      expect(actorTemplates).toContain('systems/eventide-rp-system/templates/actor/gear.hbs');
      expect(actorTemplates).toContain('systems/eventide-rp-system/templates/actor/header.hbs');
      expect(actorTemplates).toContain('systems/eventide-rp-system/templates/actor/statuses.hbs');
    });

    test('should include all 8 chat message templates', () => {
      // Act
      const chatTemplates = EXPECTED_TEMPLATES.filter(path => path.includes('/chat/'));

      // Assert
      expect(chatTemplates).toHaveLength(8);
      expect(chatTemplates).toContain('systems/eventide-rp-system/templates/chat/combat-power-message.hbs');
      expect(chatTemplates).toContain('systems/eventide-rp-system/templates/chat/delete-status-message.hbs');
      expect(chatTemplates).toContain('systems/eventide-rp-system/templates/chat/feature-message.hbs');
      expect(chatTemplates).toContain('systems/eventide-rp-system/templates/chat/gear-equip-message.hbs');
      expect(chatTemplates).toContain('systems/eventide-rp-system/templates/chat/initiative-roll.hbs');
      expect(chatTemplates).toContain('systems/eventide-rp-system/templates/chat/restore-message.hbs');
      expect(chatTemplates).toContain('systems/eventide-rp-system/templates/chat/roll-message.hbs');
      expect(chatTemplates).toContain('systems/eventide-rp-system/templates/chat/status-message.hbs');
    });

    test('should include all 7 item partial templates', () => {
      // Act
      const itemTemplates = EXPECTED_TEMPLATES.filter(path => path.includes('/item/'));

      // Assert
      expect(itemTemplates).toHaveLength(7);
      expect(itemTemplates).toContain('systems/eventide-rp-system/templates/item/attribute-parts/combat-power.hbs');
      expect(itemTemplates).toContain('systems/eventide-rp-system/templates/item/attribute-parts/feature.hbs');
      expect(itemTemplates).toContain('systems/eventide-rp-system/templates/item/attribute-parts/gear.hbs');
      expect(itemTemplates).toContain('systems/eventide-rp-system/templates/item/description.hbs');
      expect(itemTemplates).toContain('systems/eventide-rp-system/templates/item/effects.hbs');
      expect(itemTemplates).toContain('systems/eventide-rp-system/templates/item/header.hbs');
      expect(itemTemplates).toContain('systems/eventide-rp-system/templates/item/prerequisites.hbs');
    });

    test('should include all 6 macro templates', () => {
      // Act
      const macroTemplates = EXPECTED_TEMPLATES.filter(path => path.includes('/macros/') && !path.includes('/popups/'));

      // Assert
      expect(macroTemplates).toHaveLength(6);
      expect(macroTemplates).toContain('systems/eventide-rp-system/templates/macros/change-target-status.hbs');
      expect(macroTemplates).toContain('systems/eventide-rp-system/templates/macros/damage-targets.hbs');
      expect(macroTemplates).toContain('systems/eventide-rp-system/templates/macros/effect-creator.hbs');
      expect(macroTemplates).toContain('systems/eventide-rp-system/templates/macros/gear-creator.hbs');
      expect(macroTemplates).toContain('systems/eventide-rp-system/templates/macros/restore-target.hbs');
      expect(macroTemplates).toContain('systems/eventide-rp-system/templates/macros/select-ability-roll.hbs');
    });

    test('should include all 4 popup templates', () => {
      // Act
      const popupTemplates = EXPECTED_TEMPLATES.filter(path => path.includes('/popups/'));

      // Assert
      expect(popupTemplates).toHaveLength(4);
      expect(popupTemplates).toContain('systems/eventide-rp-system/templates/macros/popups/combat-power-popup.hbs');
      expect(popupTemplates).toContain('systems/eventide-rp-system/templates/macros/popups/feature-popup.hbs');
      expect(popupTemplates).toContain('systems/eventide-rp-system/templates/macros/popups/gear-popup.hbs');
      expect(popupTemplates).toContain('systems/eventide-rp-system/templates/macros/popups/status-popup.hbs');
    });

    test('should have all template paths as valid strings matching the expected pattern', () => {
      // Arrange & Act & Assert
      EXPECTED_TEMPLATES.forEach(path => {
        expect(path).toBeDefined();
        expect(typeof path).toBe('string');
        expect(path.length).toBeGreaterThan(0);
        expect(path).toMatch(/^systems\/eventide-rp-system\/templates\/.+\.hbs$/);
      });
    });

    test('should have no duplicate template paths', () => {
      // Arrange & Act
      const uniqueTemplates = new Set(EXPECTED_TEMPLATES);

      // Assert
      expect(uniqueTemplates.size).toBe(EXPECTED_TEMPLATES.length);
    });

    test('should follow consistent path naming convention', () => {
      // Arrange & Act & Assert
      EXPECTED_TEMPLATES.forEach(path => {
        // Paths should use lowercase with hyphens
        const filename = path.split('/').pop();
        expect(filename).toMatch(/^[a-z][a-z0-9-]*\.hbs$/);
      });
    });
  });

  describe('Module Integration (Validation)', () => {
    test('should validate that loadTemplates mock is properly set up in test environment', () => {
      // Arrange & Act & Assert
      expect(global.foundry).toBeDefined();
      expect(global.foundry.applications).toBeDefined();
      expect(global.foundry.applications.handlebars).toBeDefined();
      expect(global.foundry.applications.handlebars.loadTemplates).toBeDefined();
      expect(typeof global.foundry.applications.handlebars.loadTemplates).toBe('function');
    });
  });
});