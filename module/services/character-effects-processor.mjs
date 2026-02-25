/**
 * CharacterEffectsProcessor Service
 *
 * Provides centralized character effects processing for item sheets.
 * Handles form parsing, effect mode mapping, and ActiveEffect change generation.
 *
 * @module CharacterEffectsProcessor
 */
export class CharacterEffectsProcessor {
  /**
   * Parse character effects from form elements
   *
   * Extracts character effects data from form fields with the pattern
   * `characterEffects.{type}.{index}.{property}`. Filters out removed effects
   * and returns a structured object with regular, hidden, and override effects.
   *
   * @static
   * @param {HTMLFormElement} form - The form element containing character effects fields
   * @param {Object} remove - Configuration for removing an effect
   * @param {number} [remove.index] - Index of the effect to remove
   * @param {string} [remove.type] - Type of effect to remove (regularEffects, hiddenEffects, overrideEffects)
   * @returns {CharacterEffectsData} Parsed character effects data
   * @typedef {Object} CharacterEffectsData
   * @property {Array<CharacterEffect>} regularEffects - Regular ability effects
   * @property {Array<CharacterEffect>} hiddenEffects - Hidden ability effects
   * @property {Array<CharacterEffect>} overrideEffects - Power/resolve override effects
   * @typedef {Object} CharacterEffect
   * @property {string} ability - Ability identifier
   * @property {string} mode - Effect mode (add, override, advantage, disadvantage, AC, transformOverride, transformChange)
   * @property {string} value - Effect value
   *
   * @example
   * const form = document.querySelector('form');
   * const effects = CharacterEffectsProcessor.parseCharacterEffectsForm(form, { index: 2, type: 'regularEffects' });
   * // Returns: { regularEffects: [...], hiddenEffects: [], overrideEffects: [] }
   */
  static parseCharacterEffectsForm(form, remove) {
    // Get all form elements that include "characterEffects" in their name
    let formElements = form.querySelectorAll('[name*="characterEffects"]');

    if (remove.type && remove.index) {
      formElements = Array.from(formElements).filter(
        (el) => !el.name.includes(`${remove.type}.${remove.index}`),
      );
    }

    // Create an object to store the values
    const characterEffects = {
      regularEffects: [],
      hiddenEffects: [],
      overrideEffects: [],
    };

    // Process each form element
    for (const element of formElements) {
      const name = element.name;
      const value = element.value;

      if (
        !name.includes("regularEffects") &&
        !name.includes("hiddenEffects") &&
        !name.includes("overrideEffects")
      ) {
        continue;
      }

      const parts = name.split(".");
      if (parts.length < 3) continue;

      const type = parts[1];
      const index = parseInt(parts[2], 10);
      const property = parts[3];

      if (!characterEffects[type][index]) {
        characterEffects[type][index] = {};
      }

      characterEffects[type][index][property] = value;
    }

    // Clean up the arrays
    characterEffects.regularEffects = characterEffects.regularEffects.filter(
      (e) => e,
    );
    characterEffects.hiddenEffects = characterEffects.hiddenEffects.filter(
      (e) => e,
    );
    characterEffects.overrideEffects = characterEffects.overrideEffects.filter(
      (e) => e,
    );

    return characterEffects;
  }

  /**
   * Process character effects into ActiveEffect changes array
   *
   * Converts character effects data into Foundry VTT ActiveEffect change objects
   * with proper key paths and modes. Handles regular, hidden, and override effects.
   *
   * @static
   * @param {CharacterEffectsData} characterEffects - Parsed character effects data
   * @param {Object} [options={}] - Processing options
   * @param {boolean} [options.supportExtendedModes=true] - Whether to support AC, transformOverride, transformChange modes
   * @returns {Promise<Array<ActiveEffectChange>>} Array of ActiveEffect change objects
   * @typedef {Object} ActiveEffectChange
   * @property {string} key - The dot-notation path to the property being modified
   * @property {number} mode - CONST.ACTIVE_EFFECT_MODES value (ADD, OVERRIDE, etc.)
   * @property {string|number} value - The value to apply
   *
   * @example
   * const changes = await CharacterEffectsProcessor.processEffectsToChanges({
   *   regularEffects: [{ ability: 'acro', mode: 'add', value: '2' }],
   *   hiddenEffects: [],
   *   overrideEffects: []
   * });
   * // Returns: [{ key: 'system.abilities.acro.change', mode: 0, value: '2' }]
   */
  static async processEffectsToChanges(characterEffects, options = {}) {
    const { supportExtendedModes = true } = options;

    const processEffects = (effects, isRegular) => {
      return effects.map((effect) => {
        const key = this.mapEffectModeToKey(
          effect,
          isRegular,
          supportExtendedModes,
        );
        const mode = this.getModeForEffect(effect, isRegular);

        return { key, mode, value: effect.value };
      });
    };

    return [
      ...processEffects(characterEffects.regularEffects, true),
      ...processEffects(characterEffects.hiddenEffects, false),
      ...processEffects(characterEffects.overrideEffects, false),
    ];
  }

  /**
   * Map an effect mode to its corresponding system key path
   *
   * Generates the dot-notation path for the system property based on the
   * effect's ability and mode. Handles special cases for power/resolve overrides
   * and transformation-specific modes.
   *
   * @static
   * @param {CharacterEffect} effect - The effect to map
   * @param {boolean} isRegular - Whether this is a regular (vs hidden) effect
   * @param {boolean} [supportExtendedModes=true] - Whether to support extended modes
   * @returns {string} The dot-notation key path
   *
   * @example
   * CharacterEffectsProcessor.mapEffectModeToKey(
   *   { ability: 'acro', mode: 'add' },
   *   true
   * );
   * // Returns: 'system.abilities.acro.change'
   *
   * CharacterEffectsProcessor.mapEffectModeToKey(
   *   { ability: 'powerOverride', mode: 'override' },
   *   false
   * );
   * // Returns: 'system.power.override'
   */
  static mapEffectModeToKey(effect, isRegular, supportExtendedModes = true) {
    // Handle override abilities first
    if (effect.ability === "powerOverride") {
      return "system.power.override";
    }
    if (effect.ability === "resolveOverride") {
      return "system.resolve.override";
    }

    if (isRegular) {
      const modeMap = supportExtendedModes
        ? {
            add: "change",
            override: "override",
            advantage: "diceAdjustments.advantage",
            disadvantage: "diceAdjustments.disadvantage",
            AC: "ac.change",
            transformOverride: "transformOverride",
            transformChange: "transformChange",
          }
        : {
            add: "change",
            override: "override",
            advantage: "diceAdjustments.advantage",
            disadvantage: "diceAdjustments.disadvantage",
          };

      const suffix = modeMap[effect.mode] || "transform";
      return `system.abilities.${effect.ability}.${suffix}`;
    } else {
      // Hidden abilities logic
      const suffix = effect.mode === "add" ? "change" : "override";
      return `system.hiddenAbilities.${effect.ability}.${suffix}`;
    }
  }

  /**
   * Get the ActiveEffect mode constant for an effect
   *
   * Converts string mode identifiers to CONST.ACTIVE_EFFECT_MODES values.
   * Handles mode mapping for regular and hidden effects.
   *
   * @static
   * @param {CharacterEffect} effect - The effect to get the mode for
   * @param {boolean} isRegular - Whether this is a regular (vs hidden) effect
   * @returns {number} CONST.ACTIVE_EFFECT_MODES value
   *
   * @example
   * CharacterEffectsProcessor.getModeForEffect(
   *   { ability: 'acro', mode: 'add' },
   *   true
   * );
   * // Returns: CONST.ACTIVE_EFFECT_MODES.ADD (0)
   */
  static getModeForEffect(effect, isRegular) {
    // For override abilities, always use OVERRIDE mode
    if (
      effect.ability === "powerOverride" ||
      effect.ability === "resolveOverride"
    ) {
      return CONST.ACTIVE_EFFECT_MODES.OVERRIDE;
    }

    if (isRegular) {
      // Regular abilities: only override mode uses OVERRIDE, others use ADD
      return effect.mode === "override"
        ? CONST.ACTIVE_EFFECT_MODES.OVERRIDE
        : CONST.ACTIVE_EFFECT_MODES.ADD;
    } else {
      // Hidden abilities logic
      return effect.mode === "add"
        ? CONST.ACTIVE_EFFECT_MODES.ADD
        : CONST.ACTIVE_EFFECT_MODES.OVERRIDE;
    }
  }

  /**
   * Generate an ActiveEffect change for a new effect
   *
   * Creates a change object for a newly added character effect.
   * Handles special cases for power/resolve overrides.
   *
   * @static
   * @param {Object} newEffect - Configuration for the new effect
   * @param {string} newEffect.type - Type of effect (abilities, hiddenAbilities)
   * @param {string} newEffect.ability - Ability identifier
   * @returns {ActiveEffectChange} The generated change object
   *
   * @example
   * const change = CharacterEffectsProcessor.generateNewEffectChange({
   *   type: 'abilities',
   *   ability: 'acro'
   * });
   * // Returns: { key: 'system.abilities.acro.change', mode: 0, value: 0 }
   */
  static generateNewEffectChange(newEffect) {
    let key;
    if (newEffect.ability === "powerOverride") {
      key = "system.power.override";
    } else if (newEffect.ability === "resolveOverride") {
      key = "system.resolve.override";
    } else {
      key = `system.${newEffect.type}.${newEffect.ability}.change`;
    }

    return {
      key,
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: 0,
    };
  }

  /**
   * Determine if an item is virtual (temporary/embedded)
   *
   * Virtual items include temporary action cards, embedded items in transformations,
   * and items with custom update methods that route through parent documents.
   *
   * @static
   * @param {Item} item - The item to check
   * @returns {boolean} True if the item is virtual
   *
   * @example
   * CharacterEffectsProcessor.isVirtualItem(temporaryActionCard); // true
   * CharacterEffectsProcessor.isVirtualItem(databaseItem); // false
   */
  static isVirtualItem(item) {
    // Check for custom update methods (embedded items)
    const hasCustomUpdate =
      item.update &&
      (item.update.toString().includes("embeddedActionCards") ||
        item.update.toString().includes("embeddedTransformations") ||
        item.update.toString().includes("embeddedStatusEffects") ||
        item.update.toString().includes("embeddedItem"));

    // Check for temporary action cards
    const isTemporaryActionCard =
      item.type === "actionCard" && !item.collection;

    // Check for embedded items
    const isEmbeddedItem = item.originalId && !item.collection;

    return hasCustomUpdate || isTemporaryActionCard || isEmbeddedItem;
  }

  /**
   * Get or create the first ActiveEffect for an item
   *
   * Retrieves the first effect from an item's effects collection, or creates
   * a new default effect if none exists. Handles both virtual and regular items.
   *
   * @static
   * @param {Item} item - The parent item
   * @param {Object} [duration={}] - Optional duration for the effect
   * @param {number} [duration.seconds] - Duration in seconds
   * @param {boolean} [allowCreate=true] - Whether to create an effect if none exists
   * @returns {Promise<ActiveEffect>} The first ActiveEffect
   * @throws {Error} If effect cannot be created for embedded items
   *
   * @example
   * const effect = await CharacterEffectsProcessor.getOrCreateFirstEffect(
   *   item,
   *   { seconds: 604800 }
   * );
   */
  static async getOrCreateFirstEffect(item, duration = {}, allowCreate = true) {
    let firstEffect = item.effects.contents[0];

    if (!firstEffect && allowCreate) {
      const defaultEffectData = {
        _id: foundry.utils.randomID(),
        name: item.name,
        icon: item.img,
        changes: [],
        disabled: false,
        duration,
        flags: {},
        tint: "#ffffff",
        transfer: true,
        statuses: [],
      };

      const isVirtualItem = this.isVirtualItem(item);

      if (isVirtualItem) {
        // For virtual items, create the effect in memory and update source
        firstEffect = new CONFIG.ActiveEffect.documentClass(defaultEffectData, {
          parent: item,
        });
        item.effects.set(defaultEffectData._id, firstEffect);

        // Also update the source data
        if (!item._source.effects) {
          item._source.effects = [];
        }
        item._source.effects.push(defaultEffectData);
      } else {
        // For regular items, create the effect in the database
        const createdEffects = await item.createEmbeddedDocuments(
          "ActiveEffect",
          [defaultEffectData],
          { fromEmbeddedItem: true },
        );
        firstEffect = createdEffects[0];
      }
    }

    return firstEffect;
  }

  /**
   * Update an ActiveEffect's changes array
   *
   * Updates the changes array of an ActiveEffect, handling both virtual
   * and regular items with appropriate update methods.
   *
   * @static
   * @param {Item} item - The parent item
   * @param {ActiveEffect} effect - The effect to update
   * @param {Object} updateData - The update data to apply
   * @param {string} updateData._id - Effect ID
   * @param {Array<ActiveEffectChange>} updateData.changes - New changes array
   * @param {Object} [options={}] - Update options
   * @param {boolean} [options.fromEmbeddedItem=true] - Flag to prevent sheet closure
   * @returns {Promise<void>}
   *
   * @example
   * await CharacterEffectsProcessor.updateEffectChanges(
   *   item,
   *   firstEffect,
   *   { _id: 'abc123', changes: [...] },
   *   { fromEmbeddedItem: true }
   * );
   */
  static async updateEffectChanges(item, effect, updateData, options = {}) {
    const updateOptions = { fromEmbeddedItem: true, ...options };
    const isVirtualItem = this.isVirtualItem(item);

    if (isVirtualItem) {
      // For virtual items, use the custom update method to route through parent
      await item.update(
        { effects: [{ ...effect.toObject(), ...updateData }] },
        updateOptions,
      );
    } else {
      // For regular items, update the embedded documents directly
      await item.updateEmbeddedDocuments(
        "ActiveEffect",
        [updateData],
        updateOptions,
      );
    }
  }
}
