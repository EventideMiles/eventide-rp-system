import { EventidePopupHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  cleanupThemeManager,
  InventoryUtils,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/logger.mjs";

/**
 * Action Card Popup Application
 *
 * Displays the embedded item's details and handles roll submission
 * to trigger the action card's chain logic.
 * @extends {EventidePopupHelpers}
 */
export class ActionCardPopup extends EventidePopupHelpers {
  /** @override */
  static PARTS = {
    actionCardPopup: {
      template:
        "systems/eventide-rp-system/templates/macros/popups/action-card-popup.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: [
      "eventide-sheet",
      "eventide-sheet--scrollbars",
      "action-card-popup",
    ],
    // position: {
    //   width: 500,
    //   height: "auto",
    // },
    window: {
      icon: "fas fa-bolt",
    },
    form: {
      handler: this.#onSubmit,
    },
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return `${game.i18n.localize("EVENTIDE_RP_SYSTEM.Item.ActionCard.PopupTitle")}: ${this.item.name}`;
  }

  constructor({ item }) {
    super({ item });
    this.type = "actionCard";

    if (!this.item || this.item.type !== "actionCard") {
      throw new Error("ActionCardPopup requires an action card item");
    }

    Logger.debug("ActionCardPopup created", {
      itemName: this.item.name,
      itemId: this.item.id,
    });
  }

  /**
   * Handle rendering of the action card popup application
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  _onRender(context, options) {
    super._onRender(context, options);

    // Re-apply themes on re-render (but don't reinitialize)
    if (this.themeManager) {
      this.themeManager.applyThemes();
    }
  }

  /**
   * Handle the first render of the action card popup application
   * @override
   * @protected
   */
  _onFirstRender() {
    super._onFirstRender();

    // Initialize theme management only on first render
    if (!this.themeManager) {
      this.themeManager = initThemeManager(
        this,
        THEME_PRESETS.CREATOR_APPLICATION,
      );
    }
  }

  /**
   * Clean up resources before closing the application
   * @param {Object} options - The options for closing
   * @returns {Promise<void>}
   * @override
   */
  async _preClose(options) {
    // Clean up theme management for this specific instance
    if (this.themeManager) {
      cleanupThemeManager(this);
      this.themeManager = null;
    }

    await super._preClose(options);
  }

  /**
   * Prepare context data for the popup template
   * @override
   */
  async _prepareContext(options) {
    Logger.methodEntry("ActionCardPopup", "_prepareContext", {
      itemName: this.item.name,
    });

    const context = await super._prepareContext(options);
    context.cssClass = ActionCardPopup.DEFAULT_OPTIONS.classes.join(" ");

    // Get the embedded item
    const embeddedItem = this.item.getEmbeddedItem({
      executionContext: true,
    });

    // For saved damage mode, embedded item is not required
    if (!embeddedItem && this.item.system.mode !== "savedDamage") {
      Logger.warn("No embedded item found for action card popup", {
        actionCardId: this.item.id,
        mode: this.item.system.mode,
      });
      ui.notifications.warn(
        game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Errors.ActionCardNoEmbeddedItem",
        ),
      );
      this.close();
      return context;
    }

    // Prepare embedded item data for display (if it exists)
    let embeddedItemData = null;
    if (embeddedItem) {
      embeddedItemData = {
        id: embeddedItem.id,
        name: embeddedItem.name,
        img: embeddedItem.img,
        type: embeddedItem.type,
        description: embeddedItem.system.description,
        cost: embeddedItem.system.cost,
        usageInfo: embeddedItem.system.usageInfo,
        canRoll: embeddedItem.canRoll ? embeddedItem.canRoll() : false,
      };

      // Add roll formula if the embedded item can roll
      if (embeddedItemData.canRoll && embeddedItem.getCombatRollFormula) {
        try {
          embeddedItemData.formula = embeddedItem.getCombatRollFormula();
        } catch (error) {
          Logger.warn("Failed to get roll formula for embedded item", error);
          embeddedItemData.formula = "0";
        }
      }
    }

    context.actionCard = this.item;
    context.embeddedItem = embeddedItemData;
    context.mode = this.item.system.mode;
    context.attackChain = this.item.system.attackChain;
    context.savedDamage = this.item.system.savedDamage;

    Logger.methodExit("ActionCardPopup", "_prepareContext", context);
    return context;
  }

  /**
   * Checks if the action card is eligible for use based on targeting, embedded item, and gear requirements.
   * Uses comprehensive gear validation for action items.
   * @returns {Object} An object containing the eligibility status for each check.
   * @override
   */
  async checkEligibility() {
    Logger.methodEntry("ActionCardPopup", "checkEligibility", {
      actionCardName: this.item.name,
      mode: this.item.system.mode,
    });

    const problems = {
      targeting: false,
      embeddedItem: false,
      power: false,
      quantity: false,
      equipped: false,
      gearValidation: [], // Array to store detailed gear validation errors
    };

    // Get the actor that owns this action card
    const actor = this.item.actor;
    if (!actor) {
      Logger.warn("No actor found for action card eligibility check", {
        actionCardId: this.item.id,
      });
      problems.embeddedItem = true;
      return problems;
    }

    // Check if embedded item exists (not required for saved damage mode)
    const embeddedItem = this.item.getEmbeddedItem();
    if (!embeddedItem && this.item.system.mode !== "savedDamage") {
      problems.embeddedItem = true;
      return problems;
    }

    // For saved damage mode, skip embedded item validation
    if (this.item.system.mode === "savedDamage") {
      Logger.methodExit("ActionCardPopup", "checkEligibility", problems);
      return problems;
    }

    // Perform comprehensive gear validation using InventoryUtils
    try {
      const gearValidation = InventoryUtils.validateActionCardGearRequirements(
        actor,
        this.item,
      );

      if (!gearValidation.isValid) {
        Logger.debug("Gear validation failed for action card", {
          actionCardName: this.item.name,
          errors: gearValidation.errors,
          gearChecks: gearValidation.gearChecks,
        });

        // Set general flags based on gear validation results
        for (const gearCheck of gearValidation.gearChecks) {
          if (!gearCheck.isValid) {
            for (const error of gearCheck.errors) {
              if (error.includes("not equipped")) {
                problems.equipped = true;
              }
              if (error.includes("Insufficient quantity")) {
                problems.quantity = true;
              }
            }
          }
        }

        // Store detailed validation errors for callouts
        problems.gearValidation = gearValidation.errors;
      }
    } catch (error) {
      Logger.error("Error during gear validation", error);
      problems.gearValidation = [`Gear validation error: ${error.message}`];
    }

    // Use the embedded item's own eligibility checking if it has popup support
    if (
      embeddedItem &&
      embeddedItem.hasPopupSupport &&
      embeddedItem.hasPopupSupport()
    ) {
      try {
        // Create a temporary popup helper to get the embedded item's validation
        const tempPopupType =
          embeddedItem.type === "combatPower" ? "power" : embeddedItem.type;
        const tempPopup = {
          item: embeddedItem,
          type: tempPopupType,
          async checkEligibility() {
            const itemProblems = {
              targeting: false,
              power: false,
              quantity: false,
              equipped: false,
            };

            if (embeddedItem.system.targeted) {
              const targetArray = await erps.utils.getTargetArray();
              if (targetArray.length === 0) itemProblems.targeting = true;
            }

            if (embeddedItem.type === "gear") {
              // Use inventory validation for gear items instead of simple checks
              const gearStatus = InventoryUtils.getGearStatus(
                actor,
                embeddedItem.name,
              );
              if (!gearStatus.canUse) {
                if (!gearStatus.equipped) {
                  itemProblems.equipped = true;
                }
                if (gearStatus.quantity < gearStatus.cost) {
                  itemProblems.quantity = true;
                }
              }
            }

            if (embeddedItem.type === "combatPower") {
              if (
                embeddedItem.system.cost >
                embeddedItem.actor?.system?.power?.value
              ) {
                itemProblems.power = true;
              }
            }

            return itemProblems;
          },
        };

        const embeddedProblems = await tempPopup.checkEligibility();

        // Merge the embedded item's problems into our problems (but don't override gear validation)
        problems.targeting = problems.targeting || embeddedProblems.targeting;
        problems.power = problems.power || embeddedProblems.power;
        // Only use embedded item validation for gear if we don't have comprehensive validation
        if (problems.gearValidation.length === 0) {
          problems.quantity = problems.quantity || embeddedProblems.quantity;
          problems.equipped = problems.equipped || embeddedProblems.equipped;
        }
      } catch (error) {
        Logger.warn("Failed to check embedded item eligibility", error);
        // Fall back to basic checks
        if (embeddedItem.system.targeted) {
          const targetArray = await erps.utils.getTargetArray();
          if (targetArray.length === 0) problems.targeting = true;
        }

        if (
          embeddedItem.type === "gear" &&
          problems.gearValidation.length === 0
        ) {
          // Only use fallback gear checks if comprehensive validation wasn't performed
          const gearStatus = InventoryUtils.getGearStatus(
            actor,
            embeddedItem.name,
          );
          if (!gearStatus.canUse) {
            if (!gearStatus.equipped) {
              problems.equipped = true;
            }
            if (gearStatus.quantity < gearStatus.cost) {
              problems.quantity = true;
            }
          }
        }

        if (embeddedItem.type === "combatPower") {
          if (
            embeddedItem.system.cost > this.item.actor?.system?.power?.value
          ) {
            problems.power = true;
          }
        }
      }
    }

    // Turn validation for advanceInitiative
    if (this.item.system.advanceInitiative) {
      const combat = game.combat;
      if (combat) {
        const currentCombatant = combat.combatant;
        if (!currentCombatant || currentCombatant.actorId !== actor.id) {
          problems.turn = true;
          problems.turnMessage = game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Item.ActionCard.AdvanceInitiativeTurnError",
          );
        }
      }
    }

    Logger.debug("Action card eligibility check complete", {
      actionCardName: this.item.name,
      problems,
      hasGearValidationErrors: problems.gearValidation.length > 0,
      embeddedItemName: embeddedItem?.name,
      embeddedItemType: embeddedItem?.type,
    });

    Logger.methodExit("ActionCardPopup", "checkEligibility", problems);
    return problems;
  }

  /**
   * Prepare callouts for action card specific issues
   * @override
   */
  async _prepareCallouts() {
    // Don't call super._prepareCallouts() to avoid duplicate validation messages
    // Action cards have their own comprehensive validation system
    const callouts = [];

    if (this.problems.embeddedItem) {
      callouts.push({
        type: "error",
        faIcon: "fas fa-exclamation-circle",
        text: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.ActionCard.NoEmbeddedItem",
        ),
      });
    }

    // Add targeting validation callout
    if (this.problems.targeting) {
      callouts.push({
        type: "error",
        faIcon: "fas fa-exclamation-circle",
        text:
          this.problems.targetingMessage ||
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Forms.Callouts.ActionCard.TargetingError",
          ),
      });
    }

    // Add turn validation callout
    if (this.problems.turn) {
      callouts.push({
        type: "error",
        faIcon: "fas fa-exclamation-circle",
        text: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.AdvanceInitiativeTurnError",
        ),
      });
    }

    // Add detailed gear validation error callouts
    if (
      this.problems.gearValidation &&
      this.problems.gearValidation.length > 0
    ) {
      for (const error of this.problems.gearValidation) {
        callouts.push({
          type: "warning",
          faIcon: "fas fa-exclamation-triangle",
          text: error,
        });
      }
    }

    return callouts;
  }

  /**
   * Check if there are any actual validation problems
   * @param {Object} problems - The problems object from checkEligibility
   * @returns {boolean} True if there are problems that should block execution
   * @private
   */
  _hasValidationProblems(problems) {
    return ActionCardPopup._hasValidationProblems(problems);
  }

  /**
   * Static version of validation problems check for use in static methods
   * @param {Object} problems - The problems object from checkEligibility
   * @returns {boolean} True if there are problems that should block execution
   * @private
   * @static
   */
  static _hasValidationProblems(problems) {
    if (!problems) return false;

    return Object.entries(problems).some(([key, value]) => {
      if (key === "gearValidation") {
        // For gearValidation, check if the array has any items
        return Array.isArray(value) && value.length > 0;
      }
      // For other problems, check truthiness
      return value;
    });
  }

  /**
   * Prepare footer buttons for action card
   * @override
   */
  async _prepareFooterButtons() {
    const buttons = [];

    if (!this._hasValidationProblems(this.problems)) {
      const mode = this.item.system.mode;
      let buttonLabel;

      if (mode === "attackChain") {
        buttonLabel = "EVENTIDE_RP_SYSTEM.Item.ActionCard.ExecuteChain";
      } else if (mode === "savedDamage") {
        buttonLabel = "EVENTIDE_RP_SYSTEM.Item.ActionCard.ApplyDamage";
      } else {
        buttonLabel = "EVENTIDE_RP_SYSTEM.Item.ActionCard.Execute";
      }

      buttons.push({
        label: game.i18n.localize(buttonLabel),
        type: "submit",
        cssClass: "erps-button erps-button--primary",
      });
    }

    buttons.push({
      label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Close"),
      type: "button",
      cssClass: "erps-button",
      action: "close",
    });

    return buttons;
  }

  /**
   * Handle form submission - use embedded item's roll handler with bypass, then action card chain processing
   * @param {Event} event - The form submission event
   * @param {HTMLElement} form - The form element
   * @param {FormData} formData - The form data
   * @private
   */
  static async #onSubmit(event, _form, _formData) {
    Logger.methodEntry("ActionCardPopup", "#onSubmit", {
      actionCardName: this.item?.name,
    });

    try {
      event.preventDefault();

      // Check eligibility before execution
      const problems = await this.checkEligibility();

      if (ActionCardPopup._hasValidationProblems(problems)) {
        return ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ActionCardError"),
        );
      }

      // Get the actor that owns this action card
      const actor = this.item.actor;
      if (!actor) {
        Logger.warn("No actor found for action card", {
          actionCardId: this.item.id,
        });
        ui.notifications.warn(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ActionCardNoActor"),
        );
        return;
      }

      // Get the embedded item (not required for saved damage mode)
      const embeddedItem = this.item.getEmbeddedItem({
        executionContext: true,
      });
      if (!embeddedItem && this.item.system.mode !== "savedDamage") {
        ui.notifications.warn(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ActionCardNoEmbeddedItem",
          ),
        );
        return;
      }

      // Close this popup
      this.close();

      // Set up a promise to capture the roll result from the embedded item's execution
      // (only needed if we have an embedded item and not in saved damage mode)
      let rollResultPromise = null;
      if (embeddedItem && this.item.system.mode !== "savedDamage") {
        rollResultPromise = new Promise((resolve, reject) => {
          let resolved = false;

          // Set up a one-time hook to capture the chat message
          const hookId = Hooks.on("createChatMessage", (message) => {
            // Only process if we haven't already resolved
            if (resolved) return;

            // Check if this message is from our actor
            const isFromOurActor =
              message.speaker?.actor === actor.id ||
              message.speaker?.alias === actor.name ||
              message.speaker?.token === actor.token?.id;

            if (isFromOurActor) {
              const roll = message.rolls?.[0];
              if (roll) {
                Logger.debug(
                  "Captured roll result from embedded item execution",
                  {
                    total: roll.total,
                    formula: roll.formula,
                    messageId: message.id,
                  },
                  "ACTION_CARD",
                );
                // Add messageId to the roll object
                roll.messageId = message.id;
                resolved = true;
                Hooks.off("createChatMessage", hookId);
                resolve(roll);
              } else {
                // Non-roll message from our actor - still counts as completion
                Logger.debug(
                  "Captured non-roll message from embedded item execution",
                  { messageId: message.id },
                  "ACTION_CARD",
                );
                resolved = true;
                Hooks.off("createChatMessage", hookId);
                resolve(null);
              }
            }
          });

          // Set up a timeout to prevent hanging
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              Hooks.off("createChatMessage", hookId);
              reject(
                new Error("Timeout waiting for embedded item roll result"),
              );
            }
          }, 5000); // Reduced timeout to 5 seconds
        });
      }

      // Execute the embedded item's roll handler with bypass=true (skip for saved damage mode)
      let rollResult = null;
      if (embeddedItem && this.item.system.mode !== "savedDamage") {
        try {
          // Call the embedded item's roll method with bypass parameter and action card context
          await embeddedItem.roll({
            bypass: true,
            actionCardContext: {
              actionCard: this.item,
              isFromActionCard: true,
              executionMode: this.item.system.mode,
            },
          });

          // Wait for the roll result
          if (rollResultPromise) {
            rollResult = await rollResultPromise;
          }

          Logger.debug(
            "Embedded item executed with bypass, captured roll result",
            {
              rollResult,
              total: rollResult?.total,
              formula: rollResult?.formula,
            },
            "ACTION_CARD",
          );
        } catch (error) {
          Logger.warn(
            "Failed to execute embedded item with bypass or capture result",
            error,
            "ACTION_CARD",
          );
          // Continue without roll result for non-roll items or errors
        }
      } else if (this.item.system.mode === "savedDamage") {
        Logger.debug(
          "Skipping embedded item execution for saved damage mode",
          { actionCardId: this.item.id },
          "ACTION_CARD",
        );
      }

      // Execute the action card chain processing with the roll result
      const result = await this.item.executeWithRollResult(actor, rollResult);

      if (result.success) {
        if (result.mode === "attackChain") {
          // Attack chain mode - create follow-up message if needed
          const followUpMessage = await this.item.createAttackChainMessage(
            result,
            actor,
          );

          if (followUpMessage) {
            ui.notifications.info(
              "Attack chain executed - GM apply effects created",
            );
          } else {
            ui.notifications.info(
              game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.AttackChainExecuted"),
            );
          }
          Logger.info("Action card attack chain executed from popup", {
            itemId: this.item.id,
            targetsHit:
              result.targetResults?.filter((r) => r.oneHit).length || 0,
          });
        } else if (result.mode === "savedDamage") {
          // Saved damage mode - create follow-up message if needed
          const followUpMessage = await this.item.createSavedDamageMessage(
            result,
            actor,
          );

          if (followUpMessage) {
            ui.notifications.info(
              "Saved damage executed - GM apply effects created",
            );
          } else {
            ui.notifications.info(
              `Saved damage applied to ${result.damageResults.length} target(s)`,
            );
          }
          Logger.info("Action card saved damage executed from popup", {
            itemId: this.item.id,
            targetsAffected: result.damageResults.length,
          });
        }
      } else {
        ui.notifications.warn(`Action card execution failed: ${result.reason}`);
        Logger.warn("Action card execution failed from popup", {
          itemId: this.item.id,
          reason: result.reason,
        });
      }

      Logger.methodExit("ActionCardPopup", "#onSubmit");
    } catch (error) {
      Logger.error("Failed to execute action card from popup", error);
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ActionCardExecuteFailed"),
      );
      Logger.methodExit("ActionCardPopup", "#onSubmit");
    }
  }
}
