/**
 * @file Contains all chat message listeners and item event hooks for the Eventide RP System
 * @module helpers/chat-listeners
 */

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
    addGMApplyButtonFunctionality(html, message);
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
 * Add GM apply button functionality to chat messages
 *
 * @private
 * @param {HTMLElement} html - The chat message HTML element
 * @param {ChatMessage} message - The chat message document
 */
const addGMApplyButtonFunctionality = (html, message) => {
  // Only show GM apply sections to GMs
  if (!game.user.isGM) {
    html.querySelectorAll(".chat-card__gm-apply-section").forEach((el) => {
      el.remove();
    });
    return;
  }

  // Add click event listeners for apply buttons
  const applyButtons = html.querySelectorAll(".chat-card__apply-button");
  applyButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const action = button.dataset.action;

      try {
        if (action === "applyActionCardDamage") {
          await handleApplyActionCardDamage(button, message);
        } else if (action === "applyActionCardStatus") {
          await handleApplyActionCardStatus(button, message);
        }
      } catch (error) {
        console.error("Error handling GM apply action:", error);
        ui.notifications.error("Failed to apply action card effect");
      }
    });
  });

  // Check target validity on render
  updateTargetValidity(html, message);
};

/**
 * Handle applying action card damage
 *
 * @private
 * @param {HTMLElement} button - The clicked button
 * @param {ChatMessage} message - The chat message document
 */
const handleApplyActionCardDamage = async (button, message) => {
  const targetId = button.dataset.targetId;
  const formula = button.dataset.formula;
  const type = button.dataset.type;

  // Find the target actor
  const target = game.actors.get(targetId);
  if (!target) {
    ui.notifications.warn("Target actor no longer exists");
    await updateMessageApplyState(message, "damage", {
      applied: false,
      targetValid: false,
    });
    return;
  }

  // Apply the damage
  const damageRoll = await target.damageResolve({
    formula,
    label: "Action Card Damage",
    description: "Damage from action card attack chain",
    type,
  });

  // Mark as applied in the message
  await updateMessageApplyState(message, "damage", {
    applied: true,
    targetValid: true,
  });

  ui.notifications.info(
    `Applied ${damageRoll.total} ${type} to ${target.name}`,
  );
};

/**
 * Handle applying action card status effects
 *
 * @private
 * @param {HTMLElement} button - The clicked button
 * @param {ChatMessage} message - The chat message document
 */
const handleApplyActionCardStatus = async (button, message) => {
  const targetId = button.dataset.targetId;

  // Find the target actor
  const target = game.actors.get(targetId);
  if (!target) {
    ui.notifications.warn("Target actor no longer exists");
    await updateMessageApplyState(message, "status", {
      applied: false,
      targetValid: false,
    });
    return;
  }

  // Get status effects from message flags
  const gmApplySection = message.flags?.["eventide-rp-system"]?.gmApplySection;
  if (!gmApplySection?.status?.effects) {
    ui.notifications.error("No status effects found in message");
    return;
  }

  // Apply each status effect
  let appliedCount = 0;
  for (const statusData of gmApplySection.status.effects) {
    try {
      // Create the status item on the target
      const createdItems = await target.createEmbeddedDocuments("Item", [
        statusData,
      ]);

      // Trigger appropriate message for different effect types
      if (statusData.type === "status" && createdItems[0]) {
        await erps.messages.createStatusMessage(createdItems[0], null);
      } else if (statusData.type === "gear" && createdItems[0]) {
        await erps.messages.gearEffectMessage(createdItems[0], target);
      }

      appliedCount++;
    } catch (error) {
      console.error("Failed to apply status effect:", error);
    }
  }

  // Mark as applied in the message
  await updateMessageApplyState(message, "status", {
    applied: true,
    targetValid: true,
  });

  ui.notifications.info(
    `Applied ${appliedCount} status effect(s) to ${target.name}`,
  );
};

/**
 * Update the apply state in a chat message
 *
 * @private
 * @param {ChatMessage} message - The chat message document
 * @param {string} type - The type of application ("damage" or "status")
 * @param {Object} state - The new state
 */
const updateMessageApplyState = async (message, type, state) => {
  const flags = foundry.utils.deepClone(message.flags || {});
  flags["eventide-rp-system"] = flags["eventide-rp-system"] || {};
  flags["eventide-rp-system"].gmApplySection =
    flags["eventide-rp-system"].gmApplySection || {};
  flags["eventide-rp-system"].gmApplySection[type] = {
    ...flags["eventide-rp-system"].gmApplySection[type],
    ...state,
  };

  await message.update({ flags });
};

/**
 * Update target validity in GM apply sections
 *
 * @private
 * @param {HTMLElement} html - The chat message HTML element
 * @param {ChatMessage} message - The chat message document
 */
const updateTargetValidity = async (html, message) => {
  const gmApplySection = message.flags?.["eventide-rp-system"]?.gmApplySection;
  if (!gmApplySection) return;

  let needsUpdate = false;
  const updates = {};

  // Check damage target validity
  if (gmApplySection.damage && !gmApplySection.damage.applied) {
    const targetExists = game.actors.get(gmApplySection.damage.targetId);
    if (gmApplySection.damage.targetValid !== !!targetExists) {
      updates.damage = {
        ...gmApplySection.damage,
        targetValid: !!targetExists,
      };
      needsUpdate = true;
    }
  }

  // Check status target validity
  if (gmApplySection.status && !gmApplySection.status.applied) {
    const targetExists = game.actors.get(gmApplySection.status.targetId);
    if (gmApplySection.status.targetValid !== !!targetExists) {
      updates.status = {
        ...gmApplySection.status,
        targetValid: !!targetExists,
      };
      needsUpdate = true;
    }
  }

  // Update the message if needed
  if (needsUpdate) {
    const flags = foundry.utils.deepClone(message.flags || {});
    flags["eventide-rp-system"] = flags["eventide-rp-system"] || {};
    flags["eventide-rp-system"].gmApplySection = {
      ...flags["eventide-rp-system"].gmApplySection,
      ...updates,
    };
    await message.update({ flags });
  }
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
