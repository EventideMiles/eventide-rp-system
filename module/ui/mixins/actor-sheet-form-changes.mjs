/**
 * Actor Sheet Form Changes Mixin
 *
 * Provides form change handlers for actor sheets.
 * Handles resource input validation (power, resolve).
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with form change functionality
 */
export const ActorSheetFormChangesMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Handle form input changes with resource validation
     *
     * Validates and constrains resource inputs (power and resolve) to ensure
     * values stay within their defined bounds. Also handles action card group
     * name changes through the _handleGroupNameChange method.
     *
     * @param {Object} formConfig - The form configuration object
     * @param {Event} event - The change event
     * @protected
     * @async
     */
    async _onChangeForm(formConfig, event) {
      // Handle power value changes
      if (event.target.name === "system.power.value") {
        const newValue = parseInt(event.target.value, 10);
        const maxValue = parseInt(this.actor.system.power.max, 10);
        if (newValue > maxValue) {
          event.target.value = maxValue;
        }
      }

      // Handle power max changes
      if (event.target.name === "system.power.max") {
        const newMax = parseInt(event.target.value, 10);
        const currentValue = parseInt(this.actor.system.power.value, 10);
        if (newMax < currentValue) {
          await this.actor.update({
            "system.power.value": newMax,
          });
        }
      }

      // Handle resolve value changes
      if (event.target.name === "system.resolve.value") {
        const newValue = parseInt(event.target.value, 10);
        const maxValue = parseInt(this.actor.system.resolve.max, 10);
        if (newValue > maxValue) {
          event.target.value = maxValue;
        }
      }

      // Handle resolve max changes
      if (event.target.name === "system.resolve.max") {
        const newMax = parseInt(event.target.value, 10);
        const currentValue = parseInt(this.actor.system.resolve.value, 10);
        if (newMax < currentValue) {
          await this.actor.update({
            "system.resolve.value": newMax,
          });
        }
      }

      // Handle action card group name changes
      if (
        event.target.dataset?.groupId &&
        event.target.className === "erps-action-card-group__name"
      ) {
        this._handleGroupNameChange(event);
      }

      // Call parent _onChangeForm
      await super._onChangeForm(formConfig, event);
    }
  };
