import { Logger } from "../../services/logger.mjs";
import { getSetting } from "../../services/_module.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";
import { erpsRollHandler } from "../../services/_module.mjs";

/**
 * Actor Rolls Mixin
 *
 * Provides rolling functionality for actors, including ability rolls,
 * roll formula generation, and dice mechanics integration.
 *
 * @param {class} BaseClass - The base actor class to extend
 * @returns {class} Extended class with rolling functionality
 */
export const ActorRollsMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Generate a roll formula string for an ability roll
     *
     * @param {Object} params - Parameters for the ability roll
     * @param {string} params.ability - The ability identifier
     * @returns {Promise<string>} The roll formula string
     */
    async getRollFormula({ ability }) {
      Logger.methodEntry("ActorRollsMixin", "getRollFormula", { ability });

      // Validate ability parameter
      if (!ability || typeof ability !== "string") {
        const error = new Error(`Invalid ability parameter: ${ability}`);
        Logger.error(
          "Invalid ability provided to getRollFormula",
          error,
          "ROLLS",
        );
        throw error;
      }

      try {
        const actorRollData = this.getRollData();

        // Handle unaugmented ability specially
        if (ability === "unaugmented") {
          const formula = `1d${actorRollData.hiddenAbilities.dice.total}`;
          Logger.debug(
            `Generated unaugmented formula: ${formula}`,
            null,
            "ROLLS",
          );
          Logger.methodExit("ActorRollsMixin", "getRollFormula", formula);
          return formula;
        }

        // Validate that the ability exists in the actor's abilities
        if (!actorRollData.abilities || !actorRollData.abilities[ability]) {
          const error = new Error(
            `Ability "${ability}" not found in actor data`,
          );
          Logger.error("Ability not found in actor data", error, "ROLLS");
          throw error;
        }

        const abilityData = actorRollData.abilities[ability];
        const diceAdjustments = abilityData.diceAdjustments;
        const total = diceAdjustments.total;
        const absTotal = Math.abs(total);
        const rollType = diceAdjustments.mode;

        // Generate the formula based on dice adjustments
        let diceFormula;
        if (absTotal > 0) {
          // When there are dice adjustments, roll multiple dice and keep the best/worst
          diceFormula = `${absTotal + 1}d${actorRollData.hiddenAbilities.dice.total}${rollType}1`;
        } else {
          // When no dice adjustments, roll a single die
          diceFormula = `1d${actorRollData.hiddenAbilities.dice.total}`;
        }

        const formula = `${diceFormula} + ${abilityData.total}`;

        Logger.debug(
          `Generated formula for ${ability}: ${formula}`,
          {
            diceAdjustments,
            abilityTotal: abilityData.total,
          },
          "ROLLS",
        );

        Logger.methodExit("ActorRollsMixin", "getRollFormula", formula);
        return formula;
      } catch (error) {
        Logger.error(
          `Error generating roll formula for ability "${ability}"`,
          error,
          "ROLLS",
        );
        Logger.methodExit("ActorRollsMixin", "getRollFormula", null);
        throw error;
      }
    }

    /**
     * Get the roll formulas for all of the actor's abilities
     *
     * @returns {Promise<Object>} Object with ability keys mapped to roll formulas
     * @example
     * // Returns: { acro: "2d20kh1 + 5", phys: "1d20 + 3", ... }
     * const formulas = await actor.getRollFormulas();
     */
    async getRollFormulas() {
      Logger.methodEntry("ActorRollsMixin", "getRollFormulas");

      try {
        // Validate that CONFIG.EVENTIDE_RP_SYSTEM.abilities exists
        if (!CONFIG?.EVENTIDE_RP_SYSTEM?.abilities) {
          const error = new Error(
            "CONFIG.EVENTIDE_RP_SYSTEM.abilities not found",
          );
          Logger.error(
            "System abilities configuration missing",
            error,
            "ROLLS",
          );
          throw error;
        }

        const abilities = Object.keys(CONFIG.EVENTIDE_RP_SYSTEM.abilities);
        Logger.debug(
          `Generating formulas for abilities: ${abilities.join(", ")}`,
          null,
          "ROLLS",
        );

        // Generate formulas for all abilities in parallel
        const [formulaResults, formulaErrors] = await ErrorHandler.handleAsync(
          Promise.all(
            abilities.map((ability) => this.getRollFormula({ ability })),
          ),
          {
            context: "Generate Roll Formulas",
            errorType: ErrorHandler.ERROR_TYPES.DATA,
            showToUser: false,
          },
        );

        if (formulaErrors) {
          Logger.error(
            "Error generating roll formulas",
            formulaErrors,
            "ROLLS",
          );
          throw formulaErrors;
        }

        // Create object mapping abilities to their formulas
        const formulas = Object.fromEntries(
          abilities.map((ability, index) => [ability, formulaResults[index]]),
        );

        Logger.debug("Generated roll formulas:", formulas, "ROLLS");
        Logger.methodExit("ActorRollsMixin", "getRollFormulas", formulas);

        return formulas;
      } catch (error) {
        Logger.error("Error in getRollFormulas", error, "ROLLS");
        Logger.methodExit("ActorRollsMixin", "getRollFormulas", {});
        // Return empty object as fallback instead of throwing
        return {};
      }
    }

    /**
     * Roll an ability check for the actor
     *
     * @param {Object} params - Parameters for the ability roll
     * @param {string} params.ability - The ability identifier
     * @returns {Promise<Roll>} The evaluated roll
     */
    async rollAbility({ ability }) {
      Logger.methodEntry("ActorRollsMixin", "rollAbility", { ability });

      // Validate ability parameter
      if (!ability || typeof ability !== "string") {
        const error = new Error(`Invalid ability parameter: ${ability}`);
        Logger.error("Invalid ability provided to rollAbility", error, "ROLLS");
        throw error;
      }

      try {
        const actorRollData = this.getRollData();

        // Validate that the ability exists
        if (
          ability !== "unaugmented" &&
          (!actorRollData.abilities || !actorRollData.abilities[ability])
        ) {
          const error = new Error(
            `Ability "${ability}" not found in actor data`,
          );
          Logger.error("Ability not found for rolling", error, "ROLLS");
          throw error;
        }

        // Generate the roll formula
        const formula = await this.getRollFormula({ ability });

        // Get the ability label for display
        const label =
          ability === "unaugmented"
            ? "Unaugmented Roll"
            : actorRollData.abilities[ability].label;

        const rollData = {
          formula,
          label,
          type: ability,
          rollMode: game.settings.get("core", "rollMode"),
          soundKey: "diceRoll",
        };

        Logger.debug(
          `Rolling ability ${ability} with formula: ${formula}`,
          rollData,
          "ROLLS",
        );

        // Use the imported roll handler
        const roll = await erpsRollHandler.handleRoll(rollData, this);

        Logger.info(
          `Rolled ${ability} for actor "${this.name}": ${roll.total}`,
          {
            formula,
            result: roll.total,
          },
          "ROLLS",
        );

        Logger.methodExit("ActorRollsMixin", "rollAbility", roll);
        return roll;
      } catch (error) {
        const [, _handledError] = await ErrorHandler.handleAsync(
          Promise.reject(error),
          {
            context: `Roll Ability: ${ability}`,
            errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          },
        );

        Logger.methodExit("ActorRollsMixin", "rollAbility", null);
        throw error;
      }
    }

    /**
     * Roll a custom formula for the actor
     *
     * @param {Object} params - Parameters for the custom roll
     * @param {string} params.formula - The dice formula to roll
     * @param {string} [params.label="Custom Roll"] - Label for the roll
     * @param {string} [params.type="custom"] - Type identifier for the roll
     * @param {Object} [params.rollData] - Additional data to merge with actor roll data
     * @param {string} [params.rollMode] - Roll mode for the roll
     * @returns {Promise<Roll>} The evaluated roll
     */
    async rollCustom({
      formula,
      label = "Custom Roll",
      type = "custom",
      rollData = {},
      rollMode = null,
    }) {
      Logger.methodEntry("ActorRollsMixin", "rollCustom", {
        formula,
        label,
        type,
      });

      // Validate formula parameter
      if (!formula || typeof formula !== "string") {
        const error = new Error(`Invalid formula parameter: ${formula}`);
        Logger.error("Invalid formula provided to rollCustom", error, "ROLLS");
        throw error;
      }

      try {
        // Merge actor roll data with provided roll data
        const combinedRollData = {
          ...this.getRollData(),
          ...rollData,
        };

        const rollConfig = {
          formula,
          label,
          type,
          rollMode: rollMode || game.settings.get("core", "rollMode"),
          rollData: combinedRollData,
        };

        Logger.debug(`Rolling custom formula: ${formula}`, rollConfig, "ROLLS");

        // Use the imported roll handler
        const roll = await erpsRollHandler.handleRoll(rollConfig, this);

        Logger.info(
          `Custom roll for actor "${this.name}": ${roll.total}`,
          {
            formula,
            result: roll.total,
          },
          "ROLLS",
        );

        Logger.methodExit("ActorRollsMixin", "rollCustom", roll);
        return roll;
      } catch (error) {
        const [, _handledError] = await ErrorHandler.handleAsync(
          Promise.reject(error),
          {
            context: `Custom Roll: ${formula}`,
            errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          },
        );

        Logger.methodExit("ActorRollsMixin", "rollCustom", null);
        throw error;
      }
    }

    /**
     * Get the roll data for this actor, including any derived values
     *
     * @returns {Object} The complete roll data object
     * @override
     */
    getRollData() {
      try {
        // Get base roll data from parent class
        const baseRollData = super.getRollData();

        // Add system-specific roll data if available
        const systemRollData = this.system.getRollData?.() ?? {};

        // Combine all roll data
        const combinedRollData = {
          ...baseRollData,
          ...systemRollData,
        };

        // Only log in testing mode to reduce noise
        if (getSetting("testingMode")) {
          Logger.debug(
            "Generated roll data",
            {
              hasBaseData: !!baseRollData,
              hasSystemData: !!systemRollData,
              abilityCount: combinedRollData.abilities
                ? Object.keys(combinedRollData.abilities).length
                : 0,
            },
            "ROLLS",
          );
        }

        return combinedRollData;
      } catch (error) {
        Logger.error("Error generating roll data", error, "ROLLS");

        // Return minimal roll data as fallback
        return {
          name: this.name || "Unknown",
          type: this.type || "character",
        };
      }
    }

    /**
     * Validate if an ability exists and can be rolled
     *
     * @param {string} ability - The ability identifier to validate
     * @returns {boolean} Whether the ability is valid for rolling
     */
    canRollAbility(ability) {
      if (!ability || typeof ability !== "string") {
        return false;
      }

      // Unaugmented is always available
      if (ability === "unaugmented") {
        return true;
      }

      // Check if ability exists in system configuration
      if (!CONFIG?.EVENTIDE_RP_SYSTEM?.abilities?.[ability]) {
        return false;
      }

      // Check if ability exists in actor's roll data
      const rollData = this.getRollData();
      return !!(rollData.abilities && rollData.abilities[ability]);
    }

    /**
     * Get a list of all rollable abilities for this actor
     *
     * @returns {string[]} Array of ability identifiers that can be rolled
     */
    getRollableAbilities() {
      try {
        const abilities = [];

        // Always include unaugmented
        abilities.push("unaugmented");

        // Add configured abilities that are available on this actor
        if (CONFIG?.EVENTIDE_RP_SYSTEM?.abilities) {
          const configuredAbilities = Object.keys(
            CONFIG.EVENTIDE_RP_SYSTEM.abilities,
          );
          const rollData = this.getRollData();

          for (const ability of configuredAbilities) {
            if (rollData.abilities && rollData.abilities[ability]) {
              abilities.push(ability);
            }
          }
        }

        // Only log in testing mode to reduce noise
        if (getSetting("testingMode")) {
          Logger.debug(
            `Found ${abilities.length} rollable abilities: ${abilities.join(", ")}`,
            null,
            "ROLLS",
          );
        }

        return abilities;
      } catch (error) {
        Logger.error("Error getting rollable abilities", error, "ROLLS");

        // Return minimal fallback
        return ["unaugmented"];
      }
    }
  };
