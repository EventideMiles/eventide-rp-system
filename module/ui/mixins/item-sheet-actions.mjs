import { Logger } from "../../services/logger.mjs";
import { EffectManager } from "../../services/effect-manager.mjs";
import { DocumentActionHandler } from "../../services/document-action-handler.mjs";
import { ContextMenuBuilder } from "../../services/context-menu-builder.mjs";
import { EmbeddedItemManager } from "../../services/embedded-item-manager.mjs";

const FilePicker = foundry.applications.apps.FilePicker.implementation;

/** @type {ContextMenuBuilder} Singleton context menu builder instance */
const _contextMenuBuilder = new ContextMenuBuilder();

/**
 * Item Sheet Actions Mixin
 *
 * Provides action methods for item sheets including:
 * - Image editing (reused from actor sheet pattern)
 * - Combat power management for transformations
 * - Embedded item and effect management for action cards
 * - Effect creation, deletion, and toggling
 * - Document viewing and editing
 *
 * @param {class} BaseClass - The base item sheet class to extend
 * @returns {class} Extended class with action functionality
 */
export const ItemSheetActionsMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Handle changing a Document's image.
     * Reused pattern from actor sheet for consistency.
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise}
     * @protected
     */
    static async _onEditImage(_event, target) {
      // CRITICAL FIX: Detect if this is being called on an embedded item sheet
      // and delegate to the correct embedded item method
      if (this.constructor.name === "EmbeddedItemSheet" || this.parentItem) {
        // Call the embedded item sheet's image editing method directly
        if (typeof this._onEditImageEmbedded === "function") {
          return this._onEditImageEmbedded(_event, target);
        } else if (this.constructor._onEditImageEmbedded) {
          return this.constructor._onEditImageEmbedded.call(
            this,
            _event,
            target,
          );
        }
        return;
      }

      try {
        const attr = target.dataset.edit;
        const current = foundry.utils.getProperty(this.document, attr);
        const { img } =
          this.document.constructor.getDefaultArtwork?.(
            this.document.toObject(),
          ) ?? {};
        const fp = new FilePicker({
          current,
          type: "image",
          redirectToRoot: img ? [img] : [],
          callback: (path) => {
            this.document.update({ [attr]: path });
          },
          top: this.position.top + 40,
          left: this.position.left + 10,
        });

        return fp.browse();
      } catch (error) {
        Logger.error("Failed to open image picker", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.ImagePickerFailed", {
            itemName: this.item?.name || "Unknown",
          }),
        );
        throw error;
      }
    }

    /**
     * Handle removing a combat power from a transformation
     * Delegates to EmbeddedItemManager service
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _removeCombatPower(_event, target) {
      await EmbeddedItemManager.removeCombatPower(this.item, target?.dataset?.powerId);
    }

    /**
     * Handle removing an action card from a transformation
     * Delegates to EmbeddedItemManager service
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _removeActionCard(_event, target) {
      await EmbeddedItemManager.removeActionCard(this.item, target?.dataset?.actionCardId);
    }

    /**
     * Handle editing an embedded action card from a transformation
     * Delegates to EmbeddedItemManager service
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _editEmbeddedActionCard(_event, target) {
      await EmbeddedItemManager.editEmbeddedActionCard(this.item, target?.dataset?.actionCardId);
    }

    /**
     * Handle dice adjustment input changes to recalculate totals
     *
     * @param {Event} _event - The originating change event
     * @param {HTMLElement} _target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _onDiceAdjustmentChange(_event, _target) {
      // The form submission will handle the actual update and recalculation
      // This is just a placeholder for any additional logic if needed
    }

    /**
     * Renders an embedded document's sheet.
     * Delegates to DocumentActionHandler service.
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @protected
     */
    static async _viewDoc(_event, target) {
      return DocumentActionHandler.viewDoc(this.item, target);
    }

    /**
     * Handles item deletion.
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @protected
     */
    /**
     * Delete an effect from an item
     * Delegates to EffectManager service
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @protected
     */
    static async _deleteEffect(_event, target) {
      return EffectManager.deleteEffect(this.item, target);
    }

    /**
     * Creates a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset.
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @private
     */
    /**
     * Create a new effect on an item
     * Delegates to EffectManager service
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @protected
     */
    static async _createEffect(_event, target) {
      return EffectManager.createEffect(this.item, target);
    }

    /**
     * Create a new document (like ActiveEffect) on this item
     * Delegates to DocumentActionHandler service
     *
     * @param {Event} _event - The triggering event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @protected
     */
    static async _createDoc(_event, target) {
      return DocumentActionHandler.createDoc(this.item, target);
    }

    /**
     * Delete a document (like ActiveEffect) from this item
     * Delegates to DocumentActionHandler service
     *
     * @param {Event} _event - The triggering event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @protected
     */
    static async _deleteDoc(_event, target) {
      return DocumentActionHandler.deleteDoc(this.item, target);
    }

    /**
     * Toggles the disabled state of an effect.
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @private
     */
    /**
     * Toggle the disabled state of an effect
     * Delegates to EffectManager service
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @protected
     */
    static async _toggleEffect(_event, target) {
      return EffectManager.toggleEffect(this.item, target);
    }

    /**
     * Handle clearing the embedded item from an action card
     * Delegates to EmbeddedItemManager service
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @protected
     */
    static async _clearEmbeddedItem(_event, _target) {
      await EmbeddedItemManager.clearEmbeddedItem(this.item);
      this.render();
    }

    /**
     * Handle creating a new power as an embedded item in an action card
     * Delegates to EmbeddedItemManager service
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @protected
     */
    static async _createNewPower(_event, _target) {
      await EmbeddedItemManager.createNewPower(this.item);
      this.render();
    }

    /**
     * Handle creating a new status effect as an embedded effect in an action card
     * Delegates to EmbeddedItemManager service
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @protected
     */
    static async _createNewStatus(_event, _target) {
      await EmbeddedItemManager.createNewStatus(this.item);
      this.render();
    }

    /**
     * Handle creating a new transformation as an embedded transformation in an action card
     * Delegates to EmbeddedItemManager service
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @protected
     */
    static async _createNewTransformation(_event, _target) {
      await EmbeddedItemManager.createNewTransformation(this.item);
      this.render();
    }

    /**
     * Handle editing an embedded item from an action card
     * Delegates to EmbeddedItemManager service
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @protected
     */
    static async _editEmbeddedItem(_event, _target) {
      await EmbeddedItemManager.editEmbeddedItem(this.item);
    }

    /**
     * Handle editing an embedded effect from an action card
     * Delegates to EmbeddedItemManager service
     * @param {Event} _event - The click event
     * @param {HTMLElement} target - The target element
     * @protected
     */
    static async _editEmbeddedEffect(_event, target) {
      await EmbeddedItemManager.editEmbeddedEffect(this.item, target?.dataset?.effectId);
    }

    /**
     * Handle removing an embedded effect from an action card
     * Delegates to EmbeddedItemManager service
     * @param {Event} _event - The click event
     * @param {HTMLElement} target - The target element
     * @protected
     */
    static async _removeEmbeddedEffect(_event, target) {
      await EmbeddedItemManager.removeEmbeddedEffect(this.item, target?.dataset?.effectId);
      this.render();
    }

    /**
     * Handle editing an embedded transformation on an action card
     * Delegates to EmbeddedItemManager service
     * @param {Event} _event - The click event
     * @param {HTMLElement} target - The target element
     * @protected
     */
    static async _editEmbeddedTransformation(_event, target) {
      await EmbeddedItemManager.editEmbeddedTransformation(this.item, target?.dataset?.transformationId);
    }

    /**
     * Handle creating a new combat power for a transformation
     * Delegates to EmbeddedItemManager service
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @protected
     */
    static async _createNewCombatPower(_event, _target) {
      await EmbeddedItemManager.createNewCombatPower(this.item);
      this.render();
    }

    /**
     * Handle creating a new action card for a transformation
     * Delegates to EmbeddedItemManager service
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @protected
     */
    static async _createNewActionCard(_event, _target) {
      await EmbeddedItemManager.createNewActionCard(this.item);
      this.render();
    }

    /**
     * Handle removing an embedded transformation from an action card
     * Delegates to EmbeddedItemManager service
     * @param {Event} _event - The click event
     * @param {HTMLElement} target - The target element
     * @protected
     */
    static async _removeEmbeddedTransformation(_event, target) {
      await EmbeddedItemManager.removeEmbeddedTransformation(this.item, target?.dataset?.transformationId);
      this.render();
    }

    /**
     * Fetches the row with the data for the rendered embedded document.
     *
     * @param {HTMLElement} target - The element with the action
     * @returns {HTMLLIElement} The document's row
     * @private
     */
    _getEffect(target) {
      const li = target.closest(".effect");
      return this.item.effects.get(li?.dataset?.effectId);
    }

    /**
     * Attach change listeners to group name inputs
     * @private
     */
    _attachGroupNameListeners() {
      if (!this.element) return;

      // Initialize bound handler storage if it doesn't exist
      if (!this._boundGroupNameHandlers) {
        this._boundGroupNameHandlers = new WeakMap();
      }

      const nameInputs = this.element.querySelectorAll(
        ".erps-action-card-group__name",
      );
      nameInputs.forEach((input) => {
        // Get or create bound handler for this input
        let boundHandler = this._boundGroupNameHandlers.get(input);

        if (boundHandler) {
          // Remove existing listeners to avoid duplicates
          input.removeEventListener("change", boundHandler);
          input.removeEventListener("blur", boundHandler);
        } else {
          // Create and store bound handler
          boundHandler = this._handleGroupNameChange.bind(this);
          this._boundGroupNameHandlers.set(input, boundHandler);
        }

        // Add listeners with consistent bound reference
        input.addEventListener("change", boundHandler);
        input.addEventListener("blur", boundHandler);
      });
    }

    /**
     * Handle group name input change
     * @param {Event} event - The change/blur event
     * @private
     */
    async _handleGroupNameChange(event) {
      const input = event.target;
      const groupId = input.dataset.groupId;
      const newName = input.value.trim();

      if (!groupId || !newName) return;

      try {
        const existingGroups = this.item.system.actionCardGroups || [];
        const groupIndex = existingGroups.findIndex((g) => g._id === groupId);

        if (groupIndex === -1) return;

        // Only update if name changed
        if (newName !== existingGroups[groupIndex].name) {
          const updatedGroups = [...existingGroups];
          updatedGroups[groupIndex] = {
            ...updatedGroups[groupIndex],
            name: newName,
            _id: groupId,
          };
          await this.item.update({ "system.actionCardGroups": updatedGroups });

          Logger.debug(
            `Renamed group to: ${newName}`,
            { groupId },
            "ITEM_SHEET_ACTIONS",
          );
        }
      } catch (error) {
        Logger.error("Failed to rename group", error, "ITEM_SHEET_ACTIONS");
        // Revert input to original value
        const existingGroups = this.item.system.actionCardGroups || [];
        const group = existingGroups.find((g) => g._id === groupId);
        if (group) {
          input.value = group.name;
        }
      }
    }

    /**
     * Create a new action card group for transformation
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The button element
     * @returns {Promise<void>}
     * @private
     */
    static async _createActionCardGroup(_event, _target) {
      if (this.item.type !== "transformation") {
        Logger.warn(
          "Can only create action card groups on transformations",
          {},
          "ITEM_SHEET_ACTIONS",
        );
        return;
      }

      try {
        const existingGroups = this.item.system.actionCardGroups || [];
        const newGroupId = foundry.utils.randomID();

        // Find highest group number to generate unique name
        let highestNumber = 0;
        for (const group of existingGroups) {
          const match = group.name.match(/^Group (\d+)$/);
          if (match) {
            highestNumber = Math.max(highestNumber, parseInt(match[1], 10));
          }
        }

        const newGroupNumber = highestNumber + 1;
        const newGroupName = `Group ${newGroupNumber}`;

        // Determine sort order for new group
        const maxSort =
          existingGroups.length > 0
            ? Math.max(...existingGroups.map((g) => g.sort || 0))
            : 0;

        const newGroup = {
          _id: newGroupId,
          name: newGroupName,
          sort: maxSort + 1,
        };

        const updatedGroups = [...existingGroups, newGroup];
        await this.item.update({ "system.actionCardGroups": updatedGroups });

        Logger.debug(
          "Created action card group",
          { groupId: newGroupId },
          "ITEM_SHEET_ACTIONS",
        );

        ui.notifications.info(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.CreateGroupSuccess",
            {
              name: newGroup.name,
            },
          ),
        );
      } catch (error) {
        Logger.error(
          "Failed to create action card group",
          error,
          "ITEM_SHEET_ACTIONS",
        );
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.CreateGroupError"),
        );
      }
    }

    /**
     * Delete an action card group from transformation
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The button element
     * @returns {Promise<void>}
     * @private
     */
    static async _deleteActionCardGroup(event, target) {
      if (this.item.type !== "transformation") {
        Logger.warn(
          "Can only delete action card groups from transformations",
          {},
          "ITEM_SHEET_ACTIONS",
        );
        return;
      }

      try {
        const groupId =
          target.dataset.groupId ||
          target.closest("[data-group-id]")?.dataset.groupId;
        if (!groupId) {
          Logger.warn(
            "No group ID found for delete",
            { target },
            "ITEM_SHEET_ACTIONS",
          );
          return;
        }

        const existingGroups = this.item.system.actionCardGroups || [];
        const group = existingGroups.find((g) => g._id === groupId);

        if (!group) {
          Logger.warn("Group not found", { groupId }, "ITEM_SHEET_ACTIONS");
          return;
        }

        // Confirm deletion
        const confirmed = await foundry.applications.api.DialogV2.confirm({
          title: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.DeleteGroup",
          ),
          content: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.DeleteGroupConfirm",
            {
              name: group.name,
            },
          ),
        });

        if (!confirmed) return;

        // Remove the group
        const updatedGroups = existingGroups.filter((g) => g._id !== groupId);

        // Un-group all action cards in this group
        const actionCards = this.item.system.embeddedActionCards || [];
        const updatedActionCards = actionCards.map((card) => {
          if (card.system?.groupId === groupId) {
            const updatedCard = foundry.utils.deepClone(card);
            delete updatedCard.system.groupId;
            return updatedCard;
          }
          return card;
        });

        await this.item.update({
          "system.actionCardGroups": updatedGroups,
          "system.embeddedActionCards": updatedActionCards,
        });

        Logger.debug(
          "Deleted action card group",
          { groupId },
          "ITEM_SHEET_ACTIONS",
        );

        ui.notifications.info(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.DeleteGroupSuccess",
            {
              name: group.name,
            },
          ),
        );
      } catch (error) {
        Logger.error(
          "Failed to delete action card group",
          error,
          "ITEM_SHEET_ACTIONS",
        );
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.DeleteGroupError"),
        );
      }
    }

    /**
     * Wrapper for creating context menus with overflow handling and drop zone disabling
     * This fixes the issue where context menus get clipped by parent containers with overflow:hidden
     * and disables drop zones to prevent focus fighting between context menu and drop zones
     *
     * @param {ContextMenu} contextMenu - The context menu instance to enhance
     * @param {string} stopSelector - CSS selector for the container to stop at when searching for overflow parents
     * @private
     */
    _enhanceContextMenuWithOverflowFix(contextMenu, stopSelector = ".window-content") {
      _contextMenuBuilder.enhanceContextMenuWithOverflowFix(contextMenu, stopSelector, this);
    }

    /**
     * Disable ALL drop zones globally to prevent focus fighting with context menus
     * This affects drop zones across all sheets, including other item sheets
     * @private
     */
    _disableAllDropZones() {
      _contextMenuBuilder.disableAllDropZones();
    }

    /**
     * Re-enable ALL drop zones globally after context menu closes
     * @private
     */
    _enableAllDropZones() {
      _contextMenuBuilder.enableAllDropZones();
    }

    /**
     * Create context menu for transformation action cards to move them between groups
     * @private
     */
    _createTransformationActionCardContextMenu() {
      _contextMenuBuilder.createTransformationActionCardContextMenu(this);
    }

    /**
     * Get context menu options for transformation action cards
     * @returns {Array<ContextMenuEntry>} Array of context menu entries
     * @private
     */
    _getTransformationActionCardContextOptions() {
      return _contextMenuBuilder.getTransformationActionCardContextOptions(this);
    }

    /**
     * Show dialog to select a group for moving a transformation action card
     * @param {string} itemId - The ID of the action card
     * @param {Array} groups - Available groups
     * @private
     */
    async _showMoveToGroupDialogForTransformation(itemId, groups) {
      return _contextMenuBuilder.showMoveToGroupDialogForTransformation(itemId, groups, this);
    }

    /**
     * Create context menu for transformation group headers
     * @private
     */
    _createTransformationGroupHeaderContextMenu() {
      _contextMenuBuilder.createTransformationGroupHeaderContextMenu(this);
    }

    /**
     * Get context menu options for transformation group headers
     * @returns {Array<ContextMenuEntry>} Array of context menu entries
     * @private
     */
    _getTransformationGroupHeaderContextOptions() {
      return _contextMenuBuilder.getTransformationGroupHeaderContextOptions(this);
    }

    /**
     * Create context-sensitive context menus for transformation tab content areas
     * @private
     */
    _createTransformationTabContentContextMenus() {
      _contextMenuBuilder.createTransformationTabContentContextMenus(this);
    }

    /**
     * Create a context menu for a specific transformation tab
     * @param {string} tabName - The tab name (e.g., "embeddedItems")
     * @param {string} itemType - The item type to create (e.g., "feature")
     * @private
     */
    _createTransformationTabContextMenu(tabName, itemType) {
      _contextMenuBuilder.createTransformationTabContextMenu(tabName, itemType, this);
    }

    /**
     * Get context menu options for transformation tab content areas
     * @param {string} itemType - The item type to create
     * @returns {Array<ContextMenuEntry>} Array of context menu entries
     * @private
     */
    _getTransformationTabContextOptions(itemType) {
      return _contextMenuBuilder.getTransformationTabContextOptions(itemType, this);
    }

    /**
     * Create an embedded item in the appropriate transformation tab
     * @param {string} itemType - The item type to create
     * @private
     */
    async _createEmbeddedItemInTab(itemType) {
      return _contextMenuBuilder._createEmbeddedItemInTab(itemType, this);
    }

    /**
     * Get default system data for a given item type
     * @param {string} itemType - The item type
     * @returns {object} Default system data
     * @private
     */
    _getDefaultSystemData(itemType) {
      return _contextMenuBuilder._getDefaultSystemData(itemType);
    }
  };
