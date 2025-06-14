import { Logger } from "../../services/logger.mjs";

/**
 * Actor Sheet Form Override Mixin
 *
 * Provides form validation and field disabling functionality for actor sheets.
 * Handles custom form validation and field state management.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with form override functionality
 */
export const ActorSheetFormOverrideMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Override the default form validation to handle custom validation rules
     * @param {Event} event - The form submission event
     * @param {Object} formData - The form data being submitted
     * @returns {boolean} Whether the form is valid
     * @protected
     */
    _validateForm(event, formData) {
      Logger.debug(
        "Validating actor sheet form",
        {
          actorName: this.actor?.name,
          formDataKeys: Object.keys(formData || {}),
        },
        "FORM_OVERRIDE",
      );

      // Call parent validation first
      const parentValid = super._validateForm?.(event, formData) ?? true;

      if (!parentValid) {
        Logger.warn(
          "Parent form validation failed",
          { actorName: this.actor?.name },
          "FORM_OVERRIDE",
        );
        return false;
      }

      // Custom validation logic can be added here
      // For now, we'll just log and return true
      Logger.debug(
        "Form validation passed",
        { actorName: this.actor?.name },
        "FORM_OVERRIDE",
      );

      return true;
    }

    /**
     * Disable form fields based on actor state or permissions
     * @private
     */
    #disableFormFields() {
      if (!this.element) return;

      const form = this.element.querySelector("form");
      if (!form) return;

      // Check if actor has an active transformation - if so, disable certain fields
      const activeTransformation = this.actor.getFlag(
        "eventide-rp-system",
        "activeTransformation",
      );

      if (activeTransformation) {
        // Disable image editing when transformed
        const imageInputs = form.querySelectorAll('input[name="img"]');
        imageInputs.forEach((input) => {
          input.disabled = true;
          input.title = game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Warnings.CannotChangeImageWhileTransformed",
          );
        });

        // Disable name editing when transformed (optional)
        const nameInputs = form.querySelectorAll('input[name="name"]');
        nameInputs.forEach((input) => {
          input.classList.add("transformation-locked");
          input.title = game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Warnings.FieldLockedDuringTransformation",
          );
        });

        Logger.debug(
          "Form fields disabled due to active transformation",
          {
            actorName: this.actor.name,
            transformationId: activeTransformation,
            imageInputsDisabled: imageInputs.length,
            nameInputsLocked: nameInputs.length,
          },
          "FORM_OVERRIDE",
        );
      }

      // Check for limited editing permissions
      if (!this.document.isOwner) {
        // Disable all form inputs for non-owners
        const allInputs = form.querySelectorAll("input, select, textarea");
        allInputs.forEach((input) => {
          if (!input.disabled) {
            input.disabled = true;
            input.classList.add("permission-locked");
            input.title = game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Warnings.InsufficientPermissions",
            );
          }
        });

        Logger.debug(
          "Form fields disabled due to insufficient permissions",
          {
            actorName: this.actor.name,
            userId: game.user.id,
            inputsDisabled: allInputs.length,
          },
          "FORM_OVERRIDE",
        );
      }
    }

    /**
     * Enable form fields by removing disabled state
     * @private
     */
    #enableFormFields() {
      if (!this.element) return;

      const form = this.element.querySelector("form");
      if (!form) return;

      // Re-enable fields that were disabled by transformation
      const transformationLockedInputs = form.querySelectorAll(
        ".transformation-locked",
      );
      transformationLockedInputs.forEach((input) => {
        input.classList.remove("transformation-locked");
        input.removeAttribute("title");
      });

      // Re-enable image inputs if no longer transformed
      const activeTransformation = this.actor.getFlag(
        "eventide-rp-system",
        "activeTransformation",
      );
      if (!activeTransformation) {
        const imageInputs = form.querySelectorAll('input[name="img"]');
        imageInputs.forEach((input) => {
          if (input.disabled) {
            input.disabled = false;
            input.removeAttribute("title");
          }
        });
      }

      Logger.debug(
        "Form fields re-enabled",
        {
          actorName: this.actor.name,
          transformationLockedRemoved: transformationLockedInputs.length,
        },
        "FORM_OVERRIDE",
      );
    }

    /**
     * Initialize form override functionality during render
     * Call this from your _onRender method
     * @protected
     */
    _initFormOverrides() {
      this.#disableFormFields();

      Logger.debug(
        "Form overrides initialized",
        {
          actorName: this.actor?.name,
          hasActiveTransformation: !!this.actor.getFlag(
            "eventide-rp-system",
            "activeTransformation",
          ),
          isOwner: this.document.isOwner,
        },
        "FORM_OVERRIDE",
      );
    }

    /**
     * Clean up form override functionality during close
     * Call this from your _preClose method
     * @protected
     */
    _cleanupFormOverrides() {
      this.#enableFormFields();

      Logger.debug(
        "Form overrides cleaned up",
        {
          appId: this.id,
          appName: this.constructor.name,
        },
        "FORM_OVERRIDE",
      );
    }
  };
