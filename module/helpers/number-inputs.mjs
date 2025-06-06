/**
 * Helper functions for enhanced number inputs
 *
 * This module provides functionality for creating and managing enhanced number inputs
 * with increment/decrement buttons and responsive sizing.
 *
 * @module helpers/number-inputs
 */
import { Logger } from "../services/_module.mjs";

// Track initialization to prevent duplicate handlers
let isInitialized = false;

/**
 * Initialize number input functionality
 *
 * Sets up event listeners for number input buttons and initializes responsive behavior.
 * This function is designed to be called only once, with subsequent calls
 * only updating the responsive behavior.
 */
export const initNumberInputs = () => {
  // Prevent multiple initializations of event handlers
  if (isInitialized) {
    // If already initialized, just update the responsive behavior
    updateNumberInputResponsiveness();
    return;
  }

  isInitialized = true;

  try {
    // Add the global click handler for all number input buttons
    document.addEventListener("click", handleNumberInputClick);

    // Initial check of number input sizes
    updateNumberInputResponsiveness();

    // Listen for window resize events to update compact state
    window.addEventListener(
      "resize",
      debounce(updateNumberInputResponsiveness, 250),
    );

    Logger.debug(
      "Number inputs initialized with responsive behavior",
      {},
      "NUMBER_INPUT",
    );
  } catch (error) {
    Logger.error("Failed to initialize number inputs", error, "NUMBER_INPUT");
  }
};

/**
 * Enhance number inputs that may have been added dynamically
 *
 * This function initializes ERPS number inputs and updates responsive behavior.
 * Legacy base-form support has been removed as it's no longer used.
 */
export const enhanceExistingNumberInputs = () => {
  try {
    // Initialize ERPS number inputs (they come pre-structured, just need event handling)
    const erpsNumberInputs = document.querySelectorAll(".erps-number-input");
    Logger.debug(
      "Found ERPS number inputs",
      { count: erpsNumberInputs.length },
      "NUMBER_INPUT",
    );

    // Update responsive behavior for all wrappers
    updateNumberInputResponsiveness();
  } catch (error) {
    Logger.error(
      "Failed to enhance existing number inputs",
      error,
      "NUMBER_INPUT",
    );
  }
};

/**
 * Clean up number input enhancements for a specific application element
 *
 * This function removes event listeners from number inputs and tab containers
 * by replacing them with clones, preserving their current values. It should be
 * called in the _preClose method of applications that use enhanced number inputs.
 *
 * @param {HTMLElement} element - The application's element (typically this.element)
 */
export const cleanupNumberInputs = (element) => {
  if (!element) {
    Logger.debug("No element provided for cleanup", {}, "NUMBER_INPUT");
    return;
  }

  Logger.debug(
    "Cleaning up number inputs",
    { elementTag: element.tagName },
    "NUMBER_INPUT",
  );

  try {
    // Remove any tab click listeners that might have been added for number inputs
    cleanupTabListeners(element);

    // Clean up any number input wrappers
    cleanupNumberInputWrappers(element);
  } catch (error) {
    Logger.error("Failed to cleanup number inputs", error, "NUMBER_INPUT");
  }
};

/**
 * Handle click events for number input buttons
 *
 * @private
 * @param {MouseEvent} event - The click event
 */
const handleNumberInputClick = (event) => {
  const target = event.target;

  // Check for ERPS number input buttons
  if (
    target.matches(
      ".erps-number-input__button--increment, .erps-number-input__button--decrement",
    )
  ) {
    const wrapper = target.closest(".erps-number-input");
    if (!wrapper) return;

    const input = wrapper.querySelector(".erps-number-input__input");
    if (!input) return;

    const isIncrement = target.classList.contains(
      "erps-number-input__button--increment",
    );

    Logger.debug(
      "Global number input handler processing click",
      {
        isIncrement,
        currentValue: input.value,
        inputName: input.name || input.id,
      },
      "NUMBER_INPUT",
    );

    updateNumberInputValue(input, isIncrement);
    return;
  }

  // Also handle clicks on icons within ERPS number input buttons
  if (
    target.matches(
      ".erps-number-input__button--increment i, .erps-number-input__button--decrement i",
    )
  ) {
    const button = target.closest(
      ".erps-number-input__button--increment, .erps-number-input__button--decrement",
    );
    if (!button) return;

    const wrapper = button.closest(".erps-number-input");
    if (!wrapper) return;

    const input = wrapper.querySelector(".erps-number-input__input");
    if (!input) return;

    const isIncrement = button.classList.contains(
      "erps-number-input__button--increment",
    );

    Logger.debug(
      "Global number input handler processing icon click",
      {
        isIncrement,
        currentValue: input.value,
        inputName: input.name || input.id,
      },
      "NUMBER_INPUT",
    );

    updateNumberInputValue(input, isIncrement);
  }
};

/**
 * Update a number input's value based on increment/decrement action
 *
 * @private
 * @param {HTMLInputElement} input - The number input element
 * @param {boolean} isIncrement - Whether to increment (true) or decrement (false)
 */
const updateNumberInputValue = (input, isIncrement) => {
  const value = parseFloat(input.value) || 0;
  const step = parseFloat(input.step) || 1;
  const min = input.hasAttribute("min") ? parseFloat(input.min) : -Infinity;
  const max = input.hasAttribute("max") ? parseFloat(input.max) : Infinity;

  // Increment or decrement the value
  if (isIncrement) {
    input.value = Math.min(value + step, max);
  } else {
    input.value = Math.max(value - step, min);
  }

  // Trigger change event
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
};

/**
 * Check all number input wrappers and add compact class if needed
 *
 * @private
 */
const updateNumberInputResponsiveness = () => {
  const MIN_WIDTH_FOR_BUTTONS = 110; // Width in pixels needed for comfortable display of buttons

  // Handle ERPS number inputs
  document.querySelectorAll(".erps-number-input").forEach((wrapper) => {
    const wrapperWidth = wrapper.offsetWidth;

    // If the wrapper is too narrow, make it compact
    if (wrapperWidth < MIN_WIDTH_FOR_BUTTONS) {
      wrapper.classList.add("compact");
    } else {
      wrapper.classList.remove("compact");
    }
  });
};

/**
 * Clean up tab container event listeners
 *
 * @private
 * @param {HTMLElement} element - The element containing tabs
 */
const cleanupTabListeners = (element) => {
  const tabsContainer = element.querySelector(".tabs");
  if (tabsContainer) {
    const clone = tabsContainer.cloneNode(true);
    tabsContainer.parentNode.replaceChild(clone, tabsContainer);
  }
};

/**
 * Clean up number input wrappers by replacing inputs with clones
 *
 * @private
 * @param {HTMLElement} element - The element containing number inputs
 */
const cleanupNumberInputWrappers = (element) => {
  // Clean up ERPS number inputs
  const erpsNumberInputs = element.querySelectorAll(".erps-number-input");

  Logger.debug(
    "Found ERPS number inputs to clean up",
    { count: erpsNumberInputs.length },
    "NUMBER_INPUT",
  );

  erpsNumberInputs.forEach((wrapper) => {
    // Remove event listeners by cloning and replacing the input
    const input = wrapper.querySelector(".erps-number-input__input");
    if (input) {
      const newInput = input.cloneNode(true);
      // Preserve the current value
      newInput.value = input.value;
      input.parentNode.replaceChild(newInput, input);
    }

    // Also clone and replace the buttons to remove event listeners
    const buttons = wrapper.querySelectorAll(".erps-number-input__button");
    buttons.forEach((button) => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
    });
  });
};

/**
 * Debounce function to limit how often a function is called
 *
 * @private
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce delay in milliseconds
 * @returns {Function} The debounced function
 */
const debounce = (func, wait) => {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

// Initialize number inputs when relevant hooks fire
Hooks.on("ready", () => {
  initNumberInputs();
});

// Hook into all relevant render events to ensure number inputs are enhanced
Hooks.on("renderItemV2", (_app, _html) => {
  enhanceExistingNumberInputs();
});

Hooks.on("renderEventideRpSystemItemSheet", (_app, html) => {
  enhanceExistingNumberInputs();

  const tabsContainer = html.querySelector(".tabs");
  if (tabsContainer) {
    tabsContainer.addEventListener("click", (_event) => {
      setTimeout(() => {
        updateNumberInputResponsiveness();
      }, 50);
    });
  }
});

// Catch any other application renders
Hooks.on("renderApplicationV2", () => {
  updateNumberInputResponsiveness();
  Logger.debug("Number inputs updated", {}, "NUMBER_INPUT");
});
