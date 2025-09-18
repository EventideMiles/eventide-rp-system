/**
 * @file Contains all chat message listeners and item event hooks for the Eventide RP System
 * @module helpers/chat-listeners
 */

import { Logger } from "../logger.mjs";
import { MessageFlags } from "../../helpers/message-flags.mjs";
import { gmControlManager } from "../managers/gm-control.mjs";
import { ImageZoomService } from "../image-zoom.mjs";

/**
 * Initializes all chat-related event listeners for the Eventide RP System
 *
 * Sets up hooks for chat message rendering, item creation/update/deletion, and
 * handles special behaviors like formula toggles, status effects, and item equipping.
 *
 * @function
 */
export const initChatListeners = () => {
  setupChatMessageRendering();
  setupItemUpdateHooks();
  setupItemCreationHooks();
  setupItemDeletionHooks();
};

/**
 * Set up chat message rendering hooks
 *
 * @private
 */
const setupChatMessageRendering = () => {
  Hooks.on("renderChatMessageHTML", (message, html, _data) => {
    addFormulaToggleFunctionality(html);
    addPlayerActionApprovalButtons(html, message);
    addImageZoomFunctionality(html);
    removeRestrictedElementsForNonGMs(html);
  });
};

/**
 * Add formula toggle functionality to chat messages
 *
 * @private
 * @param {HTMLElement} html - The chat message HTML element
 */
const addFormulaToggleFunctionality = (html) => {
  // Find formula toggle elements
  const formulaToggle = html.querySelectorAll(".chat-card__formula-toggle");

  // Add click event listener for formula toggle
  formulaToggle.forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
      const toggleElement = event.currentTarget;
      const rollContainer = toggleElement.closest(
        ".chat-card__initiative, .chat-card__combat-roll",
      );
      const rollDetails = rollContainer.querySelector(
        ".chat-card__roll-details",
      );

      // Toggle the active class for the formula toggle
      toggleElement.classList.toggle("active");

      // Toggle the visibility of the roll details
      if (
        rollDetails.style.display !== "none" &&
        rollDetails.style.display !== ""
      ) {
        rollDetails.style.display = "none";
      } else {
        rollDetails.style.display = "block";
      }
    });
  });
};

/**
 * Add image zoom functionality to chat card images
 *
 * @private
 * @param {HTMLElement} html - The chat message HTML element
 */
const addImageZoomFunctionality = (html) => {
  // Find all primary chat card images
  const primaryImages = html.querySelectorAll(".chat-card__image--primary");

  // Add click event listener for image zoom
  primaryImages.forEach((image) => {
    image.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const imageSrc = image.src;
      const imageAlt = image.alt || image.closest('.chat-card')?.querySelector('.chat-card__header div')?.textContent || 'Chat card image';

      // Show the zoomed image
      ImageZoomService.showZoom(imageSrc, imageAlt);
    });

    // Add title attribute for better UX
    if (!image.title) {
      image.title = 'Click to enlarge';
    }
  });
};

/**
 * Add player action approval button functionality to chat messages
 *
 * @private
 * @param {HTMLElement} html - The chat message HTML element
 * @param {ChatMessage} message - The chat message document
 */
const addPlayerActionApprovalButtons = (html, message) => {
  // Only show approval buttons to GMs
  if (!game.user.isGM) {
    return;
  }

  // Add click event listeners for approval buttons
  const actionButtons = html.querySelectorAll(
    "[data-action='approvePlayerAction'], [data-action='denyPlayerAction']",
  );
  actionButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const action = button.dataset.action;

      try {
        if (action === "approvePlayerAction") {
          await handleApprovePlayerAction(button, message);
        } else if (action === "denyPlayerAction") {
          await handleDenyPlayerAction(button, message);
        }
      } catch (error) {
        Logger.error("Error handling player action approval", error, "CHAT_LISTENERS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ActionCardEffectFailed",
          ),
        );
      }
    });
  });
};


/**
 * Handle approving a player action request
 *
 * @private
 * @param {HTMLElement} button - The clicked button
 * @param {ChatMessage} message - The chat message document
 */
const handleApprovePlayerAction = async (button, message) => {
  // Use the GM control manager to approve the player action
  await gmControlManager.approvePlayerAction(message, true);
};

/**
 * Handle denying a player action request
 *
 * @private
 * @param {HTMLElement} button - The clicked button
 * @param {ChatMessage} message - The chat message document
 */
const handleDenyPlayerAction = async (button, message) => {
  // Use the GM control manager to deny the player action
  await gmControlManager.approvePlayerAction(message, false);
};


/**
 * Remove elements that should not be visible to non-GM users
 *
 * @private
 * @param {HTMLElement} html - The chat message HTML element
 */
function removeRestrictedElementsForNonGMs(html) {
  if (game.user.isGM) return;

  html
    .querySelectorAll(".chat-card__effects--ac-check, .secret")
    .forEach((el) => {
      el.remove();
    });
}

/**
 * Set up item update hooks
 *
 * @private
 */
function setupItemUpdateHooks() {
  // Handle custom erpsUpdateItem hook
  Hooks.on("erpsUpdateItem", (item, _changed, _options, triggerPlayer) => {
    if (game.user.id !== triggerPlayer) return;
    if (!item.actor) return;

    if (item.type === "status") {
      erps.messages.createStatusMessage(item, null);
    }
  });

  // Handle core updateItem hook
  Hooks.on("updateItem", (item, _changed, _options, triggerPlayer) => {
    if (game.user.id !== triggerPlayer) return;
    if (!item.actor) return;
    if (item.type === "gear") {
      handleGearEquipState(item);
    }
  });
}

/**
 * Handle gear equip state changes
 *
 * @private
 * @param {Item} item - The gear item
 */
const handleGearEquipState = (item) => {
  if (item.system.quantity >= 1 && item.system.equipped) {
    // Enable effects when equipped and has quantity
    item.effects.forEach((effect) => effect.update({ disabled: false }));
  } else {
    // Disable effects when unequipped or no quantity
    item.effects.forEach((effect) => effect.update({ disabled: true }));
    item.update({ "system.equipped": false });
  }
};

/**
 * Set up item creation hooks
 *
 * @private
 */
function setupItemCreationHooks() {
  Hooks.on("createItem", (item, _options, triggerPlayer) => {
    if (!item.actor) return;
    if (game.user.id !== triggerPlayer) return;

    // Handle status message creation
    if (item.type === "status" && item.system.description) {
      erps.messages.createStatusMessage(
        item,
        item.flags?.["eventide-rp-system"]?.isEffect
          ? "Applied as effect from action card"
          : null,
      );
    }

    // Handle feature message creation
    if (item.type === "feature" && item.system.description) {
      erps.messages.createFeatureMessage(item);
    }

    // Handle gear message creation (show what any new gear does)
    if (item.type === "gear" && item.system.description) {
      // Use new gear message to show what the gear does
      erps.messages.createGearMessage(
        item,
        item.flags?.["eventide-rp-system"]?.isEffect
          ? "Applied as effect from action card"
          : "New gear acquired",
      );
    }

    // Handle gear equip state
    if (item.type === "gear") {
      handleGearEquipState(item);
    }
  });
}

/**
 * Set up item deletion hooks
 *
 * @private
 */
function setupItemDeletionHooks() {
  Hooks.on("deleteItem", (item, _options, triggerPlayer) => {
    if (!item.actor) return;
    if (game.user.id !== triggerPlayer) return;

    // Handle status removal message
    if (item.type === "status" && item.system.description) {
      erps.messages.createDeleteStatusMessage(item);
    }
  });
}

/**
 * Set up chat message hooks
 */
export const setupChatListeners = () => {
  Logger.methodEntry("ChatListeners", "setupChatListeners");

  setupChatMessageRendering();
  setupItemUpdateHooks();
  setupItemCreationHooks();
  setupItemDeletionHooks();

  Logger.methodExit("ChatListeners", "setupChatListeners", 0);
};

/**
 * Clean up chat listener resources
 */
export const cleanupChatListeners = () => {
  // No cleanup needed for current implementation
};
