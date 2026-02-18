import { EventidePopupHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  cleanupThemeManager,
  applyThemeImmediate,
  InventoryUtils,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/logger.mjs";
import { TargetResolver } from "../../services/target-resolver.mjs";

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
    position: {
      width: 600,
      height: "auto",
    },
    window: {
      icon: "fas fa-bolt",
    },
    form: {
      handler: this.#onSubmit,
    },
    actions: {
      onStatusEffectChange: ActionCardPopup.prototype._onStatusEffectChange,
      selectAllEffects: ActionCardPopup.prototype._onSelectAllEffects,
      deselectAllEffects: ActionCardPopup.prototype._onDeselectAllEffects,
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
    this._selectedEffectIds = null;
    this._lockedTargets = null;

    if (!this.item || this.item.type !== "actionCard") {
      throw new Error("ActionCardPopup requires an action card item");
    }

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

    // Initialize transformation selection styling
    this._initializeTransformationSelection();
  }

  /**
   * Initialize transformation selection styling and click handlers
   * @private
   */
  _initializeTransformationSelection() {
    const transformationRows = this.element.querySelectorAll(
      "[data-transformation-option]",
    );

    transformationRows.forEach((row) => {
      const targetId = row.dataset.transformationOption;
      const value = row.dataset.transformationValue;
      const radio = this.element.querySelector(
        `input[name="transformation-${targetId}"][value="${value}"]`,
      );

      // Set initial border based on radio state
      if (radio && radio.checked) {
        row.style.border = "2px solid #007bff";
        row.style.backgroundColor = "rgba(0, 123, 255, 0.1)";
      }

      // Add click handler
      row.addEventListener("click", (event) => {
        event.preventDefault();

        // Clear all selections for this target
        const allRows = this.element.querySelectorAll(
          `[data-transformation-option="${targetId}"]`,
        );
        allRows.forEach((r) => {
          r.style.border = "2px solid transparent";
          r.style.backgroundColor = "transparent";
          const radioInput = this.element.querySelector(
            `input[name="transformation-${targetId}"][value="${r.dataset.transformationValue}"]`,
          );
          if (radioInput) radioInput.checked = false;
        });

        // Select this option
        row.style.border = "2px solid #007bff";
        row.style.backgroundColor = "rgba(0, 123, 255, 0.1)";
        if (radio) {
          radio.checked = true;
        }

      });

      // Add hover effects
      row.addEventListener("mouseenter", () => {
        if (!radio || !radio.checked) {
          row.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
        }
      });

      row.addEventListener("mouseleave", () => {
        if (!radio || !radio.checked) {
          row.style.backgroundColor = "transparent";
        }
      });
    });
  }

  /**
   * Handle the first render of the action card popup application
   * @override
   * @protected
   */
  async _onFirstRender() {
    super._onFirstRender();

    // Apply theme immediately to prevent flashing
    applyThemeImmediate(this.element);

    // Initialize theme management only on first render (non-blocking like actor/item sheets)
    if (!this.themeManager) {
      initThemeManager(this, THEME_PRESETS.CREATOR_APPLICATION)
        .then((manager) => {
          this.themeManager = manager;
        })
        .catch((error) => {
          Logger.error(
            "Failed to initialize theme manager for action card popup",
            error,
            "THEME",
          );
        });
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
    context.transformationConfig = this.item.system.transformationConfig;

    // Prepare embedded status effects data for display
    context.embeddedStatusEffects = (this.item.system.embeddedStatusEffects || []).map(
      (effect, index) => {
        const effectId = effect._id || `effect-${index}`;
        // Check if this effect is selected (default to true if no saved data)
        const isSelected = this._savedFormData?._selectedEffectIds
          ? this._savedFormData._selectedEffectIds.includes(effectId)
          : true;
        return {
          id: effectId,
          name: effect.name,
          img: effect.img,
          type: effect.type,
          description: effect.system?.description || "",
          selected: isSelected,
        };
      },
    );

    // Prepare embedded transformations data for display
    const embeddedTransformations =
      await this.item.getEmbeddedTransformations();
    context.embeddedTransformations = embeddedTransformations.map(
      (transformation) => ({
        id: transformation.originalId || transformation.id,
        name: transformation.name,
        img: transformation.img,
        description: transformation.system.description,
      }),
    );

    // Lock targets at popup open - this is the single source of truth
    let targetArray = await erps.utils.getTargetArray();

    // Handle self-targeting mode: use actor's token instead of selected targets
    if (this.item.system.selfTarget) {
      const actor = this.item.actor;
      if (actor) {
        const selfToken = TargetResolver.getSelfTargetToken(actor);
        if (selfToken) {
          targetArray = [selfToken];
        } else {
          Logger.warn(
            "Self-targeting enabled but no token found for actor",
            { actorId: actor.id, actorName: actor.name },
            "ACTION_CARD",
          );
        }
      }
    }

    this._lockedTargets = TargetResolver.lockTargets(targetArray);

    // Use locked targets for display context
    context.targets = this._lockedTargets.map((t) => ({
      id: t.actorId,
      name: t.actorName,
      img: t.img,
    }));


    return context;
  }

  /**
   * Checks if the action card is eligible for use based on targeting, embedded item, and gear requirements.
   * Uses comprehensive gear validation for action items.
   * @returns {Object} An object containing the eligibility status for each check.
   * @override
   */
  async checkEligibility() {

    const problems = {
      targeting: false,
      embeddedItem: false,
      power: false,
      quantity: false,
      equipped: false,
      gearValidation: [], // Array to store detailed gear validation errors
      statusChoice: false, // Track status choice validation
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

    // For saved damage mode, perform target validation but skip embedded item validation
    if (this.item.system.mode === "savedDamage") {
      // Skip target validation if self-targeting is enabled
      if (!this.item.system.selfTarget) {
        // Check if targets are required and available
        const targetArray = await erps.utils.getTargetArray();
        if (targetArray.length === 0) {
          problems.targeting = true;
          problems.targetingMessage = game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.NoTargetsSavedDamage",
          );
        }
      }

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

    // General target validation for attack chain mode (if not already validated by embedded item)
    if (this.item.system.mode === "attackChain" && !problems.targeting) {
      // Skip target validation if self-targeting is enabled
      if (!this.item.system.selfTarget) {
        const targetArray = await erps.utils.getTargetArray();
        if (targetArray.length === 0) {
          problems.targeting = true;
          problems.targetingMessage = game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.NoTargetsAttackChain",
          );
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

    // Check status effect selection if enforceStatusChoice is enabled
    if (this.item.system.enforceStatusChoice) {
      // Get selected effect IDs from saved data (during re-render) or form (initial render)
      let selectedEffectIds;
      if (
        this._savedFormData &&
        this._savedFormData._selectedEffectIds !== undefined
      ) {
        // During re-render, use saved data
        selectedEffectIds = this._savedFormData._selectedEffectIds;
      } else if (this.element) {
        // Initial render with DOM available, read from form
        const checkboxes = this.element.querySelectorAll(
          ".erps-form__status-effect-checkbox:checked",
        );
        selectedEffectIds =
          !checkboxes || checkboxes.length === 0
            ? []
            : Array.from(checkboxes).map((cb) => cb.value);
      } else {
        // Initial render before DOM is ready - assume all effects are selected (default behavior)
        const embeddedStatusEffects = this.item.system.embeddedStatusEffects || [];
        selectedEffectIds = embeddedStatusEffects.length > 0
          ? embeddedStatusEffects.map((effect, index) => effect._id || `effect-${index}`)
          : [];
      }
      const embeddedStatusEffects =
        this.item.system.embeddedStatusEffects || [];

      // Count how many status effects are currently checked
      // selectedEffectIds is null when all effects are applied (treat as all checked)
      // selectedEffectIds is an array when specific effects are selected (including empty array for 0)
      let checkedCount = 0;

      if (selectedEffectIds == null) {
        // When null, all embedded effects are considered checked
        checkedCount = embeddedStatusEffects.length;
      } else {
        // When an array, count the explicitly selected effects (including 0 for empty array)
        checkedCount = selectedEffectIds.length;
      }

      // Only enforce if there are actually status effects on the card
      // 0 or 1 selected is allowed, 2+ selected is invalid
      if (embeddedStatusEffects.length > 0 && checkedCount > 1) {
        problems.statusChoice = true;
        problems.statusChoiceCount = checkedCount;
      }
    }

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

    // Add power validation callout for embedded combat powers
    if (this.problems.power) {
      const embeddedItem = this.item.getEmbeddedItem();
      if (embeddedItem && embeddedItem.type === "combatPower") {
        callouts.push({
          type: "warning",
          faIcon: "fas fa-exclamation-triangle",
          text: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Forms.Callouts.Power.InsufficientPower",
            {
              cost: embeddedItem.system.cost,
              actorPower: this.item.actor.system.power.value,
            },
          ),
        });
      }
    }

    // Add quantity validation callout for embedded gear
    if (this.problems.quantity) {
      const embeddedItem = this.item.getEmbeddedItem();
      if (embeddedItem && embeddedItem.type === "gear") {
        // Get the ACTUAL gear item from inventory to show real quantity
        // (embeddedItem.system.quantity is just a snapshot from creation time)
        const actualGearItem = InventoryUtils.findGearByName(
          this.item.actor,
          embeddedItem.name,
          embeddedItem.system.cost,
        );
        const actualQuantity = actualGearItem?.system?.quantity ?? 0;

        callouts.push({
          type: "warning",
          faIcon: "fas fa-exclamation-triangle",
          text: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Forms.Callouts.Gear.InsufficientQuantity",
            {
              cost: embeddedItem.system.cost,
              quantity: actualQuantity,
            },
          ),
        });
      }
    }

    // Add equipped validation callout for embedded gear
    if (this.problems.equipped) {
      callouts.push({
        type: "warning",
        faIcon: "fas fa-exclamation-triangle",
        text: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Gear.NotEquipped",
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
    // IMPORTANT: Skip if we already added a specific callout for quantity/equipped
    // to avoid duplicate callouts for the same issue
    if (
      this.problems.gearValidation &&
      this.problems.gearValidation.length > 0 &&
      !this.problems.quantity &&
      !this.problems.equipped
    ) {
      for (const error of this.problems.gearValidation) {
        callouts.push({
          type: "warning",
          faIcon: "fas fa-exclamation-triangle",
          text: error,
        });
      }
    }

    // Add status choice validation callout
    if (this.problems.statusChoice) {
      callouts.push({
        type: "warning",
        faIcon: "fas fa-exclamation-triangle",
        text: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.ActionCard.TooManyStatuses",
          {
            count: this.problems.statusChoiceCount,
          },
        ),
      });
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
   * Handle status effect checkbox changes by re-rendering the form
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The clicked element
   * @returns {Promise<void>}
   */
  async _onStatusEffectChange(event, target) {
    const savedData = ActionCardPopup._saveFormData(this);
    // Update the checkbox state based on the event target
    if (target && target.classList.contains("erps-form__status-effect-checkbox")) {
      const effectId = target.value;
      const isChecked = target.checked;
      if (isChecked) {
        if (!savedData._selectedEffectIds.includes(effectId)) {
          savedData._selectedEffectIds.push(effectId);
        }
      } else {
        savedData._selectedEffectIds = savedData._selectedEffectIds.filter(id => id !== effectId);
      }
    }

    // Capture scroll position before rendering
    const contentElement = this.element.querySelector(".erps-form__content");
    const oldScrollPosition = contentElement ? contentElement.scrollTop : 0;

    this._savedFormData = savedData;
    await this.render();
    ActionCardPopup._restoreFormData(this, savedData);
    const newContentElement = this.element.querySelector(".erps-form__content");
    if (newContentElement) {
      newContentElement.scrollTop = oldScrollPosition;
    }
  }

  /**
   * Handle "Select All" button click by selecting all checkboxes and re-rendering
   * @param {Event} event - The triggering event
   * @param {HTMLElement} _target - The clicked element
   * @returns {Promise<void>}
   */
  async _onSelectAllEffects(event, _target) {
    event.preventDefault();
    const savedData = ActionCardPopup._saveFormData(this);
    // Select all checkboxes
    savedData._selectedEffectIds = Array.from(
      this.element.querySelectorAll(".erps-form__status-effect-checkbox"),
    ).map((cb) => cb.value);

    // Capture scroll position before rendering
    const contentElement = this.element.querySelector(".erps-form__content");
    const oldScrollPosition = contentElement ? contentElement.scrollTop : 0;

    // Update instance property with modified data
    this._savedFormData = savedData;
    await this.render();
    ActionCardPopup._restoreFormData(this, savedData);
    const newContentElement = this.element.querySelector(".erps-form__content");
    if (newContentElement) {
      newContentElement.scrollTop = oldScrollPosition;
    }
  }

  /**
   * Handle "Deselect All" button click by deselecting all checkboxes and re-rendering
   * @param {Event} event - The triggering event
   * @param {HTMLElement} _target - The clicked element
   * @returns {Promise<void>}
   */
  async _onDeselectAllEffects(event, _target) {
    event.preventDefault();
    const savedData = ActionCardPopup._saveFormData(this);
    savedData._selectedEffectIds = [];

    // Capture scroll position before rendering
    const contentElement = this.element.querySelector(".erps-form__content");
    const oldScrollPosition = contentElement ? contentElement.scrollTop : 0;

    // Update instance property with modified data
    this._savedFormData = savedData;
    await this.render();
    ActionCardPopup._restoreFormData(this, savedData);
    const newContentElement = this.element.querySelector(".erps-form__content");
    if (newContentElement) {
      newContentElement.scrollTop = oldScrollPosition;
    }
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
   * Save the current form state before re-rendering
   * @param {ActionCardPopup} app - The application instance
   * @returns {Object} The saved form data including scroll position
   * @protected
   */
  static _saveFormData(app) {
    if (!app || !app.element) return {};

    const form =
      app.element.tagName === "FORM"
        ? app.element
        : app.element.querySelector("form");
    if (!form) return {};

    const savedData = {};

    // Save checkbox states
    const checkboxes = form.querySelectorAll(
      ".erps-form__status-effect-checkbox",
    );
    savedData._selectedEffectIds = Array.from(checkboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    // Save scroll position
    const contentElement = app.element.querySelector(".erps-form__content");
    if (contentElement) {
      savedData._scrollTop = contentElement.scrollTop;
    }

    return savedData;
  }

  /**
   * Restore saved form data after re-rendering
   * @param {ActionCardPopup} app - The application instance
   * @param {Object} savedData - The saved form data
   * @protected
   */
  static _restoreFormData(app, savedData) {
    if (!app || !app.element || !savedData) return;

    const form =
      app.element.tagName === "FORM"
        ? app.element
        : app.element.querySelector("form");
    if (!form) return;

    // Restore checkbox states
    if (savedData._selectedEffectIds) {
      const checkboxes = form.querySelectorAll(
        ".erps-form__status-effect-checkbox",
      );
      checkboxes.forEach((cb) => {
        cb.checked = savedData._selectedEffectIds.includes(cb.value);
      });
    }

    // Restore scroll position
    if (savedData._scrollTop !== undefined) {
      const contentElement = app.element.querySelector(".erps-form__content");
      if (contentElement) {
        contentElement.scrollTop = savedData._scrollTop;
      }
    }
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
  static async #onSubmit(event, form, formData) {

    try {
      event.preventDefault();


      // Extract transformation selections from form data
      const transformationSelections = new Map();

      for (const [key, value] of formData.entries()) {
        if (key.startsWith("transformation-")) {
          const targetId = key.replace("transformation-", "");
          if (value !== "none") {
            transformationSelections.set(targetId, value);
          }
        }
      }

      // Extract selected status effect IDs from form data
      // Note: Foundry VTT includes unchecked checkboxes with value "null" (string)
      const selectedEffectIds = [];
      for (const [key, value] of formData.entries()) {
        if (key.startsWith("statusEffect-")) {
          // Only include if the value is truthy and not the string "null"
          // Checked boxes have value = effectId, unchecked have value = "null"
          if (value && value !== "null") {
            const effectId = key.replace("statusEffect-", "");
            selectedEffectIds.push(effectId);
          }
        }
      }

      Logger.debug(
        "Status effect selection captured from form",
        {
          selectedEffectIds,
          totalEffects: this.item.system.embeddedStatusEffects?.length || 0,
        },
        "ACTION_CARD",
      );


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
                // Add messageId to the roll object
                roll.messageId = message.id;
                resolved = true;
                Hooks.off("createChatMessage", hookId);
                resolve(roll);
              } else {
                // Non-roll message from our actor - still counts as completion
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
      // Create actionCardContext as a mutable object that can be flagged by handleBypass
      const actionCardContext = {
        actionCard: this.item,
        isFromActionCard: true,
        executionMode: this.item.system.mode,
        // resourceDepleted will be set by handleBypass if quantity runs out
      };

      if (embeddedItem && this.item.system.mode !== "savedDamage") {
        try {
          // Call the embedded item's roll method with bypass parameter and action card context
          await embeddedItem.roll({
            bypass: true,
            actionCardContext,
            lockedTargets: this._lockedTargets,
          });

          // Wait for the roll result
          if (rollResultPromise) {
            rollResult = await rollResultPromise;
          }

        } catch (error) {
          Logger.warn(
            "Failed to execute embedded item with bypass or capture result",
            error,
            "ACTION_CARD",
          );
          // Continue without roll result for non-roll items or errors
        }
      }

      // Resolve locked targets - validates they still exist
      const { valid: resolvedTargets, invalid } = TargetResolver.resolveLockedTargets(
        this._lockedTargets,
      );

      // Handle all targets deleted scenario
      if (resolvedTargets.length === 0 && this._lockedTargets.length > 0) {
        ui.notifications.warn(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.AllTargetsDeleted"),
        );
        Logger.warn(
          "All locked targets were deleted before execution",
          { invalidTargets: invalid },
          "ACTION_CARD",
        );
        return;
      }

      // Notify about any deleted targets but continue with remaining
      if (invalid.length > 0) {
        ui.notifications.info(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SomeTargetsDeleted", {
            count: invalid.length,
            names: invalid.map((t) => t.lockedTarget.actorName).join(", "),
          }),
        );
      }

      // Extract tokens from resolved targets for ownership check
      const targets = resolvedTargets.map((r) => r.token).filter(Boolean);
      const playerOwnsAllTargets =
        targets.length === 0 || targets.every((target) => target.actor?.isOwner);

      if (!playerOwnsAllTargets) {
        // Player doesn't own all targets - send to GM for approval

        try {
          const { erpsMessageHandler } = await import(
            "../../services/managers/system-messages.mjs"
          );

          await erpsMessageHandler.createPlayerActionApprovalRequest({
            actor,
            actionCard: this.item,
            playerId: game.user.id,
            playerName: game.user.name,
            targets: targets.map((t) => t.actor),
            rollResult,
            transformationSelections: Object.fromEntries(
              transformationSelections,
            ),
            selectedEffectIds,
            lockedTargets: this._lockedTargets,
          });

          ui.notifications.info(
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Chat.PlayerActionApproval.RequestSent",
            ),
          );

          Logger.info("GM approval request sent for action card", {
            actionCardId: this.item.id,
            actorId: actor.id,
            playerId: game.user.id,
            targetCount: targets.length,
          });

          return;
        } catch (error) {
          Logger.error("Failed to create GM approval request", error);
          ui.notifications.error(
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.ApprovalRequestFailed",
            ),
          );
          return;
        }
      }

      // Player owns all targets - execute normally
      // Pass actionCardContext so the repetition loop can check resourceDepleted flag
      const result = await this.item.executeWithRollResult(actor, rollResult, {
        transformationSelections,
        selectedEffectIds,
        actionCardContext,
        lockedTargets: this._lockedTargets,
      });

      if (result.success) {
        if (result.mode === "attackChain") {
          ui.notifications.info(
            game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.AttackChainExecuted"),
          );
          Logger.info("Action card attack chain executed from popup", {
            itemId: this.item.id,
            targetsHit:
              result.targetResults?.filter((r) => r.oneHit).length || 0,
          });
        } else if (result.mode === "savedDamage") {
          ui.notifications.info(
            `Saved damage applied to ${result.damageResults.length} target(s)`,
          );
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
    } catch (error) {
      Logger.error("Failed to execute action card from popup", error);
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ActionCardExecuteFailed"),
      );
    }
  }
}
