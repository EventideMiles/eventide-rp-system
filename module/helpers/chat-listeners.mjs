/**
 * @file Contains all chat message listeners and item event hooks for the Eventide RP System
 * @module helpers/chat-listeners
 */

/**
 * Initializes all chat-related event listeners for the Eventide RP System
 * This includes formula toggle functionality and hiding certain elements from non-GM users
 * @function
 */
export const initChatListeners = () => {
  Hooks.on("renderChatMessageHTML", (message, html, data) => {
    // Find formula toggle elements
    const formulaToggle = html.querySelectorAll(".chat-card__formula-toggle");

    // Add click event listener for formula toggle
    formulaToggle.forEach((toggle) => {
      toggle.addEventListener("click", (event) => {
        const toggleElement = event.currentTarget;
        const rollContainer = toggleElement.closest(
          ".chat-card__initiative, .chat-card__combat-roll"
        );
        const rollDetails = rollContainer.querySelector(
          ".chat-card__roll-details"
        );

        // Toggle the active class for the formula toggle
        toggleElement.classList.toggle("active");

        // Toggle the visibility of the roll details
        if (
          rollDetails.style.display !== "none" &&
          rollDetails.style.display !== ""
        ) {
          rollDetails.style.display = "none";
          // For animation, you could use a transition in CSS instead of jQuery's slideUp/Down
        } else {
          rollDetails.style.display = "block";
        }
      });
    });

    // Remove ac check and secret elements for non-GMs
    if (game.user.isGM) return;

    html
      .querySelectorAll(".chat-card__effects--ac-check, .secret")
      .forEach((el) => {
        el.remove();
      });
  });

  /**
   * Hook that triggers when an item is updated
   * Handles status message creation and gear effect toggling based on equipped state
   * @param {Item} item - The item being updated
   * @param {Object} changed - The data that was changed
   * @param {Object} options - Additional options for the update operation
   * @param {string} triggerPlayer - ID of the player who triggered the update
   */
  Hooks.on("erpsUpdateItem", (item, changed, options, triggerPlayer) => {
    if (game.user.id !== triggerPlayer) return;
    if (item.actor === null || item.actor === undefined) return;
    if (item.type === "status") erps.messages.createStatusMessage(item);
  });

  Hooks.on("updateItem", (item, changed, options, triggerPlayer) => {
    if (game.user.id !== triggerPlayer) return;
    if (item.actor === null || item.actor === undefined) return;
    if (item.type === "gear") {
      if (item.system.quantity >= 1 && item.system.equipped) {
        item.effects.forEach((effect) => effect.update({ disabled: false }));
      } else {
        item.effects.forEach((effect) => effect.update({ disabled: true }));
        item.update({ "system.equipped": false });
      }
    }
  });

  /**
   * Hook that triggers when a new item is created
   * Handles status and feature message creation in chat
   * @param {Item} item - The item being created
   * @param {Object} options - Additional options for the create operation
   * @param {string} triggerPlayer - ID of the player who triggered the creation
   */
  Hooks.on("createItem", (item, options, triggerPlayer) => {
    if (item.actor === null || item.actor === undefined) return;
    if (game.user.id !== triggerPlayer) return;
    if (item.type === "status" && item.system.description) {
      erps.messages.createStatusMessage(item);
    }
    if (item.type === "feature" && item.system.description) {
      erps.messages.createFeatureMessage(item);
    }

    if (item.type === "gear") {
      if (item.system.quantity >= 1 && item.system.equipped) {
        item.effects.forEach((effect) => effect.update({ disabled: false }));
      } else {
        item.effects.forEach((effect) => effect.update({ disabled: true }));
        item.update({ "system.equipped": false });
      }
    }
  });

  /**
   * Hook that triggers when an item is deleted
   * Handles status removal messages in chat
   * @param {Item} item - The item being deleted
   * @param {Object} options - Additional options for the delete operation
   * @param {string} triggerPlayer - ID of the player who triggered the deletion
   */
  Hooks.on("deleteItem", (item, options, triggerPlayer) => {
    if (item.actor === null || item.actor === undefined) return;
    if (game.user.id !== triggerPlayer) return;
    if (item.type === "status" && item.system.description) {
      erps.messages.createDeleteStatusMessage(item);
    }
  });
};
