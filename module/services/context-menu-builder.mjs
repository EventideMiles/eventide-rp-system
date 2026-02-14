/**
 * ContextMenuBuilder Service
 *
 * Provides context menu construction and management for item sheets.
 * Handles overflow fixes, drop zone management, and menu lifecycle.
 *
 * @module ContextMenuBuilder
 * @see module:item-sheet-actions
 */

import { Logger } from "./logger.mjs";

/**
 * ContextMenuBuilder class for handling context menu operations
 *
 * This service provides methods for creating and managing context menus
 * in transformation item sheets. All methods accept a `sheet` parameter
 * to access the sheet's context (item, element, etc.).
 *
 * @class ContextMenuBuilder
 */
export class ContextMenuBuilder {
  /**
   * Enhance a context menu with overflow fix functionality
   *
   * This fixes the issue where context menus get clipped by parent containers
   * with overflow:hidden and disables drop zones to prevent focus fighting.
   *
   * @param {ContextMenu} contextMenu - The context menu instance to enhance
   * @param {string} stopSelector - CSS selector for the container to stop at when searching for overflow parents
   * @param {object} sheet - The item sheet instance for context access
   * @param {Item} sheet.item - The parent item
   * @param {HTMLElement} sheet.element - The sheet element
   * @param {string} sheet.id - The sheet ID
   * @returns {void}
   */
  enhanceContextMenuWithOverflowFix(
    contextMenu,
    stopSelector = ".window-content",
    sheet,
  ) {
    if (!contextMenu) return;

    // Check if this context menu has already been enhanced
    // This prevents duplicate onOpen/onClose handlers when context menus are rebound
    if (contextMenu._erpsOverflowFixApplied) {
      return;
    }

    // Mark this context menu as enhanced to prevent duplicate enhancement
    contextMenu._erpsOverflowFixApplied = true;

    // Override the onOpen callback to fix overflow clipping and disable drop zones
    const originalOnOpen = contextMenu.onOpen;
    contextMenu.onOpen = (target) => {
      // Check if a context menu is already open for this sheet
      // Multiple context menus can match the same click target (e.g., row selector + tab selector)
      // Only the first one should create the scrollbar hide style
      if (sheet._contextMenuOpen) {
        if (originalOnOpen) originalOnOpen.call(contextMenu, target);
        return;
      }

      // Cancel any pending cleanup from a previous menu close
      // This handles rapid open/close/reopen scenarios where the cleanup
      // timer hasn't fired yet but a new menu is being opened
      if (sheet._contextMenuCleanupTimer) {
        clearTimeout(sheet._contextMenuCleanupTimer);
        sheet._contextMenuCleanupTimer = null;
      }

      // Mark that a context menu is now open
      sheet._contextMenuOpen = true;

      // Find parent containers with overflow hidden
      const containers = [];
      let current = target;

      // Stop at the specified container
      const stopElement = target.closest(stopSelector);

      while (current && current !== stopElement) {
        const computedStyle = window.getComputedStyle(current);

        // Check any element with overflow hidden
        if (
          computedStyle.overflow === "hidden" ||
          computedStyle.overflowY === "hidden"
        ) {
          containers.push({
            element: current,
            overflow: current.style.overflow,
            overflowY: current.style.overflowY,
          });
          current.style.setProperty("overflow", "visible", "important");
          current.style.setProperty("overflowY", "visible", "important");
        }
        current = current.parentElement;
      }
      // Store for restoration
      sheet._overflowContainers = containers;

      // Disable ALL drop zones globally while context menu is open
      this.disableAllDropZones();

      // Add scoped style to hide scrollbars only for this specific sheet instance
      const scrollbarHideStyle = document.createElement("style");
      scrollbarHideStyle.id = `erps-context-menu-scrollbar-hide-${sheet.id}`;

      // Get unique identifier for this sheet to scope the style
      const sheetId =
        sheet.element.id || sheet.element.getAttribute("data-appid");

      scrollbarHideStyle.textContent = `
          #${sheetId} *,
          #${sheetId} *::before,
          #${sheetId} *::after {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          #${sheetId} *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        `;
      document.head.appendChild(scrollbarHideStyle);
      sheet._scrollbarHideStyle = scrollbarHideStyle;

      if (originalOnOpen) originalOnOpen.call(contextMenu, target);
    };

    // Override the onClose callback to restore overflow and re-enable drop zones
    const originalOnClose = contextMenu.onClose;
    contextMenu.onClose = () => {
      // Clear the context menu open flag immediately to allow rapid reopen
      // This must happen synchronously to handle double right-click scenarios
      sheet._contextMenuOpen = false;

      // Call original close first to allow animation to complete
      if (originalOnClose) originalOnClose.call(contextMenu);

      // Delay restoration to allow ContextMenu animation to complete
      // The animation uses getBoundingClientRect which needs the menu visible
      window.requestAnimationFrame(() => {
        sheet._contextMenuCleanupTimer = window.setTimeout(() => {
          // Restore all overflow values
          if (sheet._overflowContainers) {
            for (const {
              element,
              overflow,
              overflowY,
            } of sheet._overflowContainers) {
              element.style.overflow = overflow;
              element.style.overflowY = overflowY;
            }
            sheet._overflowContainers = [];
          }

          // Remove scrollbar hide style
          if (sheet._scrollbarHideStyle) {
            sheet._scrollbarHideStyle.remove();
            sheet._scrollbarHideStyle = null;
          }

          // Force scrollbars to redisplay by triggering a reflow
          // This ensures the browser recalculates scrollbar visibility
          if (sheet.element) {
            // eslint-disable-next-line no-unused-expressions
            sheet.element.offsetHeight; // Force reflow
          }

          // Re-enable ALL drop zones globally
          this.enableAllDropZones();

          // Clear the cleanup timer reference
          sheet._contextMenuCleanupTimer = null;
        }, 100); // Wait for animation to complete (Foundry's default is ~50ms)
      });
    };
  }

  /**
   * Disable ALL drop zones globally to prevent focus fighting with context menus
   * This affects drop zones across all sheets, including other item sheets
   *
   * @returns {void}
   */
  disableAllDropZones() {
    const dropZones = document.querySelectorAll("[data-drop-zone]");
    dropZones.forEach((zone) => {
      zone.classList.add("erps-drop-zone-disabled");
      zone.style.pointerEvents = "none";
    });
  }

  /**
   * Re-enable ALL drop zones globally after context menu closes
   *
   * @returns {void}
   */
  enableAllDropZones() {
    const dropZones = document.querySelectorAll("[data-drop-zone]");
    dropZones.forEach((zone) => {
      zone.classList.remove("erps-drop-zone-disabled");
      zone.style.pointerEvents = "";
    });
  }

  /**
   * Create context menu for transformation action cards to move them between groups
   *
   * @param {object} sheet - The item sheet instance for context access
   * @param {Item} sheet.item - The parent item
   * @param {HTMLElement} sheet.element - The sheet element
   * @param {Function} sheet._createContextMenu - Factory function for context menus
   * @returns {void}
   */
  createTransformationActionCardContextMenu(sheet) {
    try {
      const contextMenu = sheet._createContextMenu(
        () => this.getTransformationActionCardContextOptions(sheet),
        ".tab.embedded-action-cards .erps-data-table__row[data-item-id]",
      );

      // Store reference for potential cleanup
      if (contextMenu) {
        sheet._transformationActionCardContextMenu = contextMenu;

        // Apply overflow fix - stop at the embedded action cards tab (same as actor sheet)
        this.enhanceContextMenuWithOverflowFix(
          contextMenu,
          ".tab.embedded-action-cards",
          sheet,
        );
      } else {
        Logger.warn(
          "Context menu not created for transformation action cards",
          {},
          "ITEM_SHEET_ACTIONS",
        );
      }
    } catch (error) {
      Logger.error(
        "Failed to create transformation action card context menu",
        error,
        "ITEM_SHEET_ACTIONS",
      );
    }
  }

  /**
   * Get context menu options for transformation action cards
   *
   * @param {object} sheet - The item sheet instance for context access
   * @param {Item} sheet.item - The parent item
   * @returns {Array<ContextMenuEntry>} Array of context menu entries
   */
  getTransformationActionCardContextOptions(sheet) {
    const groups = sheet.item.system.actionCardGroups || [];

    return [
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.MoveToGroup",
        icon: '<i class="fas fa-folder-open"></i>',
        callback: (target) => {
          const itemId = target.dataset.itemId;
          this.showMoveToGroupDialogForTransformation(itemId, groups, sheet);
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.RemoveFromGroup",
        icon: '<i class="fas fa-folder-minus"></i>',
        condition: (target) => {
          const itemId = target.dataset.itemId;
          const actionCards = sheet.item.system.embeddedActionCards || [];
          const actionCard = actionCards.find((card) => card._id === itemId);
          return actionCard && actionCard.system.groupId;
        },
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          const actionCards = sheet.item.system.embeddedActionCards || [];
          const actionCard = actionCards.find((card) => card._id === itemId);

          if (actionCard && actionCard.system.groupId) {
            const removedGroupId = actionCard.system.groupId;

            // Update the embedded action card's groupId using deepClone
            const updatedActionCards = actionCards.map((card) => {
              if (card._id === itemId) {
                const updatedCard = foundry.utils.deepClone(card);
                updatedCard.system.groupId = null;
                return updatedCard;
              }
              return card;
            });

            // Check if the group is now empty
            let updatedGroups = sheet.item.system.actionCardGroups || [];
            const cardsInGroup = updatedActionCards.filter(
              (card) => card.system?.groupId === removedGroupId,
            );

            if (cardsInGroup.length === 0) {
              // Remove the empty group
              updatedGroups = updatedGroups.filter(
                (g) => g._id !== removedGroupId,
              );
            }

            await sheet.item.update({
              "system.embeddedActionCards": updatedActionCards,
              "system.actionCardGroups": updatedGroups,
            });
          }
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewGroup",
        icon: '<i class="fas fa-folder-plus"></i>',
        callback: async (target) => {
          const itemId = target.dataset.itemId;

          // Create the new group first
          const existingGroups = sheet.item.system.actionCardGroups || [];
          const newGroupId = foundry.utils.randomID();

          // Find highest group number
          let highestNumber = 0;
          for (const group of existingGroups) {
            const match = group.name.match(/^Group (\d+)$/);
            if (match) {
              highestNumber = Math.max(highestNumber, parseInt(match[1], 10));
            }
          }

          const newGroupNumber = highestNumber + 1;
          const newGroupName = `Group ${newGroupNumber}`;

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

          // Update the action card's groupId
          const actionCards = sheet.item.system.embeddedActionCards || [];
          const updatedActionCards = actionCards.map((card) => {
            if (card._id === itemId) {
              const updatedCard = foundry.utils.deepClone(card);
              updatedCard.system.groupId = newGroupId;
              return updatedCard;
            }
            return card;
          });

          // Update both groups and action cards
          await sheet.item.update({
            "system.actionCardGroups": updatedGroups,
            "system.embeddedActionCards": updatedActionCards,
          });
        },
      },
    ];
  }

  /**
   * Show dialog to select a group for moving a transformation action card
   *
   * @param {string} itemId - The ID of the action card
   * @param {Array} groups - Available groups
   * @param {object} sheet - The item sheet instance for context access
   * @param {Item} sheet.item - The parent item
   * @returns {Promise<void>}
   */
  async showMoveToGroupDialogForTransformation(itemId, groups, sheet) {
    // Get the current group of this action card
    const actionCards = sheet.item.system.embeddedActionCards || [];
    const actionCard = actionCards.find((card) => card._id === itemId);
    const currentGroupId = actionCard?.system.groupId;

    // Filter out the current group from available options
    const availableGroups = currentGroupId
      ? groups.filter((group) => group._id !== currentGroupId)
      : groups;

    // Check if there are no groups available
    if (availableGroups.length === 0) {
      ui.notifications.warn(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.ContextMenu.NoGroupsAvailable"),
      );
      return;
    }

    const groupChoices = availableGroups.reduce((acc, group) => {
      acc[group._id] = group.name;
      return acc;
    }, {});

    const result = await foundry.applications.api.DialogV2.prompt({
      window: {
        title: game.i18n.localize("EVENTIDE_RP_SYSTEM.ContextMenu.MoveToGroup"),
      },
      content: `
          <form>
            <div class="form-group">
              <label>${game.i18n.localize("EVENTIDE_RP_SYSTEM.ContextMenu.SelectGroup")}</label>
              <select name="groupId">
                ${Object.entries(groupChoices)
                  .map(([id, name]) => `<option value="${id}">${name}</option>`)
                  .join("")}
              </select>
            </div>
          </form>
        `,
      rejectClose: false,
      modal: true,
      ok: {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Confirm"),
        callback: (event, button) => button.form.elements.groupId.value,
      },
    });

    if (result) {
      // Update the action card's groupId
      const actionCards = sheet.item.system.embeddedActionCards || [];
      const updatedActionCards = actionCards.map((card) => {
        if (card._id === itemId) {
          const updatedCard = foundry.utils.deepClone(card);
          updatedCard.system.groupId = result;
          return updatedCard;
        }
        return card;
      });

      await sheet.item.update({
        "system.embeddedActionCards": updatedActionCards,
      });
    }
  }

  /**
   * Create context menu for transformation group headers
   *
   * @param {object} sheet - The item sheet instance for context access
   * @param {Function} sheet._createContextMenu - Factory function for context menus
   * @returns {void}
   */
  createTransformationGroupHeaderContextMenu(sheet) {
    const contextMenu = sheet._createContextMenu(
      () => this.getTransformationGroupHeaderContextOptions(sheet),
      ".erps-action-card-group__header",
    );

    if (contextMenu) {
      sheet._transformationGroupHeaderContextMenu = contextMenu;
      this.enhanceContextMenuWithOverflowFix(
        contextMenu,
        ".tab.embedded-action-cards",
        sheet,
      );
    }
  }

  /**
   * Get context menu options for transformation group headers
   *
   * @param {object} sheet - The item sheet instance for context access
   * @param {Item} sheet.item - The parent item
   * @returns {Array<ContextMenuEntry>} Array of context menu entries
   */
  getTransformationGroupHeaderContextOptions(sheet) {
    return [
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateActionInGroup",
        icon: '<i class="fas fa-plus"></i>',
        callback: async (target) => {
          const groupId =
            target.dataset.groupId ||
            target.closest("[data-group-id]")?.dataset.groupId;
          if (groupId) {
            // Create new embedded action card with groupId
            const existingCards = sheet.item.system.embeddedActionCards || [];
            const newCard = {
              _id: foundry.utils.randomID(),
              name: game.i18n.localize(
                "EVENTIDE_RP_SYSTEM.Item.New.ActionCard",
              ),
              type: "actionCard",
              img: "icons/svg/item-bag.svg",
              system: {
                groupId,
                mode: "attackChain",
                bgColor: "#8B4513",
                textColor: "#ffffff",
              },
            };

            await sheet.item.update({
              "system.embeddedActionCards": [...existingCards, newCard],
            });

            // Open embedded item sheet for editing
            const EmbeddedItemSheet = (
              await import("../ui/sheets/embedded-item-sheet.mjs")
            ).default;
            const embeddedSheet = new EmbeddedItemSheet({
              document: sheet.item,
              embeddedItemId: newCard._id,
            });
            embeddedSheet.render(true);
          }
        },
      },
    ];
  }

  /**
   * Create context-sensitive context menus for transformation tab content areas
   *
   * @param {object} sheet - The item sheet instance for context access
   * @param {Function} sheet._createContextMenu - Factory function for context menus
   * @returns {void}
   */
  createTransformationTabContentContextMenus(sheet) {
    // Embedded items tab
    this.createTransformationTabContextMenu("embeddedItems", "feature", sheet);
    // Embedded combat powers tab
    this.createTransformationTabContextMenu(
      "embeddedCombatPowers",
      "combatPower",
      sheet,
    );
    // Embedded action cards tab
    this.createTransformationTabContextMenu(
      "embeddedActionCards",
      "actionCard",
      sheet,
    );
  }

  /**
   * Create a context menu for a specific transformation tab
   *
   * @param {string} tabName - The tab name (e.g., "embeddedItems")
   * @param {string} itemType - The item type to create (e.g., "feature")
   * @param {object} sheet - The item sheet instance for context access
   * @param {Function} sheet._createContextMenu - Factory function for context menus
   * @returns {void}
   */
  createTransformationTabContextMenu(tabName, itemType, sheet) {
    const tabClass = tabName
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "");
    const contextMenu = sheet._createContextMenu(
      () => this.getTransformationTabContextOptions(itemType, sheet),
      `.tab.${tabClass}`,
    );

    if (contextMenu) {
      sheet[`_${tabName}TabContextMenu`] = contextMenu;
      this.enhanceContextMenuWithOverflowFix(
        contextMenu,
        `.tab.${tabClass}`,
        sheet,
      );
    }
  }

  /**
   * Get context menu options for transformation tab content areas
   *
   * @param {string} itemType - The item type to create
   * @param {object} sheet - The item sheet instance for context access
   * @returns {Array<ContextMenuEntry>} Array of context menu entries
   */
  getTransformationTabContextOptions(itemType, sheet) {
    return [
      {
        name: `EVENTIDE_RP_SYSTEM.ContextMenu.CreateNew${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
        icon: '<i class="fas fa-plus"></i>',
        callback: async () => {
          await this._createEmbeddedItemInTab(itemType, sheet);
        },
      },
    ];
  }

  /**
   * Create an embedded item in the appropriate transformation tab
   *
   * @param {string} itemType - The item type to create
   * @param {object} sheet - The item sheet instance for context access
   * @param {Item} sheet.item - The parent item
   * @param {Function} sheet.changeTab - Function to change tabs
   * @param {string} sheet.tabGroups - Tab group state
   * @returns {Promise<void>}
   * @private
   */
  async _createEmbeddedItemInTab(itemType, sheet) {
    // Map item types to tab IDs and embedded fields
    const tabMap = {
      feature: { tabId: "embeddedItems", field: "embeddedActionCards" },
      status: { tabId: "embeddedItems", field: "embeddedActionCards" },
      gear: { tabId: "embeddedItems", field: "embeddedActionCards" },
      combatPower: {
        tabId: "embeddedCombatPowers",
        field: "embeddedCombatPowers",
      },
      actionCard: {
        tabId: "embeddedActionCards",
        field: "embeddedActionCards",
      },
    };

    const mapping = tabMap[itemType];
    if (!mapping) return;

    // Switch to the correct tab
    if (sheet.tabGroups.primary !== mapping.tabId) {
      await sheet.changeTab(mapping.tabId, "primary");
    }

    // Create the embedded item
    const newId = foundry.utils.randomID();
    const existingItems = sheet.item.system[mapping.field] || [];

    const newItem = {
      _id: newId,
      name: game.i18n.localize(
        `EVENTIDE_RP_SYSTEM.Item.New.${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
      ),
      type: itemType,
      img: "icons/svg/item-bag.svg",
      system: this._getDefaultSystemData(itemType),
    };

    await sheet.item.update({
      [`system.${mapping.field}`]: [...existingItems, newItem],
    });

    // Open embedded item sheet for editing
    const EmbeddedItemSheet = (
      await import("../ui/sheets/embedded-item-sheet.mjs")
    ).default;
    const embeddedSheet = new EmbeddedItemSheet({
      document: sheet.item,
      embeddedItemId: newId,
    });
    embeddedSheet.render(true);
  }

  /**
   * Get default system data for a given item type
   *
   * @param {string} itemType - The item type
   * @returns {object} Default system data
   * @private
   */
  _getDefaultSystemData(itemType) {
    const defaults = {
      feature: {
        bgColor: "#70B87A",
        textColor: "#ffffff",
        targeted: false,
        roll: {
          type: "none",
          ability: "unaugmented",
          bonus: 0,
          diceAdjustments: { advantage: 0, disadvantage: 0, total: 0 },
        },
      },
      status: {
        bgColor: "#7A70B8",
        textColor: "#ffffff",
      },
      gear: {
        bgColor: "#8B4513",
        textColor: "#ffffff",
        equipped: true,
        quantity: 1,
        className: "other",
      },
      combatPower: {
        bgColor: "#B8860B",
        textColor: "#ffffff",
        cost: 1,
        targeted: true,
        roll: {
          type: "none",
          ability: "unaugmented",
          bonus: 0,
          diceAdjustments: { advantage: 0, disadvantage: 0, total: 0 },
        },
      },
      actionCard: {
        mode: "attackChain",
        bgColor: "#8B4513",
        textColor: "#ffffff",
      },
    };

    return defaults[itemType] || {};
  }
}

export default ContextMenuBuilder;
