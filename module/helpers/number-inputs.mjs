/**
 * Helper functions for enhanced number inputs
 *
 * This module provides functionality for creating and managing enhanced number inputs
 * with increment/decrement buttons and responsive sizing.
 *
 * @module helpers/number-inputs
 */
import { Logger } from "../services/_module.mjs";

// Global state tracking
let isInitialized = false;
let globalClickHandler = null;
let globalResizeHandler = null;

/**
 * Initialize number input functionality
 *
 * Sets up global event handlers for number input increment/decrement buttons
 * and responsive behavior.
 */
export const initNumberInputs = () => {
  if (isInitialized) {
    Logger.debug("Number inputs already initialized", {}, "NUMBER_INPUT");
    return;
  }

  Logger.debug("Initializing number inputs", {}, "NUMBER_INPUT");

  try {
    // Store references to handlers for cleanup
    globalClickHandler = handleNumberInputClick;
    globalResizeHandler = debounce(updateNumberInputResponsiveness, 250);

    // Add the global click handler for all number input buttons
    document.addEventListener("click", globalClickHandler);

    // Initial check of number input sizes
    updateNumberInputResponsiveness();

    // Listen for window resize events to update compact state
    window.addEventListener("resize", globalResizeHandler);

    isInitialized = true;

    // Set a flag on document for diagnostics detection
    document._erpsNumberInputsInitialized = true;

    Logger.debug("Number inputs initialized successfully", {}, "NUMBER_INPUT");
  } catch (error) {
    Logger.error("Failed to initialize number inputs", error, "NUMBER_INPUT");
  }
};

/**
 * Enhance number inputs that may have been added dynamically
 *
 * This function updates responsive behavior for all number inputs.
 */
export const enhanceExistingNumberInputs = () => {
  try {
    // Just update responsive behavior - the global click handler will handle functionality
    updateNumberInputResponsiveness();

    Logger.debug("Enhanced existing number inputs", {}, "NUMBER_INPUT");
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
 * This removes any state markers and attributes we've added
 *
 * @param {HTMLElement} element - The application's element (typically this.element)
 */
export const cleanupNumberInputs = (element) => {
  if (!element) {
    Logger.debug("No element provided for cleanup", {}, "NUMBER_INPUT");
    return;
  }

  try {
    // Find all number inputs within the element and clean up our state
    const numberInputs = element.querySelectorAll(".erps-number-input");

    if (numberInputs.length > 0) {
      Logger.debug(
        "Cleaning up number input state",
        { count: numberInputs.length },
        "NUMBER_INPUT",
      );

      numberInputs.forEach((wrapper) => {
        // Remove any processing markers we've added
        if (wrapper.dataset.erpsProcessed) {
          delete wrapper.dataset.erpsProcessed;
        }

        // Remove compact class to reset state
        wrapper.classList.remove("compact");
      });
    }
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
      "Number input button clicked",
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
      "Number input icon clicked",
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

// Global cleanup function for number inputs
export const cleanupNumberInputsGlobal = () => {
  if (!isInitialized) {
    Logger.debug(
      "Number inputs not initialized, nothing to cleanup",
      {},
      "NUMBER_INPUT",
    );
    return;
  }

  Logger.debug("Cleaning up global number input handlers", {}, "NUMBER_INPUT");

  try {
    // Remove global event listeners
    if (globalClickHandler) {
      document.removeEventListener("click", globalClickHandler);
      globalClickHandler = null;
    }

    if (globalResizeHandler) {
      window.removeEventListener("resize", globalResizeHandler);
      globalResizeHandler = null;
    }

    isInitialized = false;

    // Clear the diagnostics flag
    document._erpsNumberInputsInitialized = false;

    Logger.debug(
      "Global number input handlers cleaned up successfully",
      {},
      "NUMBER_INPUT",
    );
  } catch (error) {
    Logger.error(
      "Failed to cleanup global number input handlers",
      error,
      "NUMBER_INPUT",
    );
  }
};

// Initialize number inputs when ready
Hooks.on("ready", () => {
  initNumberInputs();
});

// Hook into render events to update responsiveness
Hooks.on("renderApplication", () => {
  setTimeout(() => {
    enhanceExistingNumberInputs();
  }, 100);
});

Hooks.on("renderApplicationV2", () => {
  setTimeout(() => {
    enhanceExistingNumberInputs();
  }, 100);
});

// Hook into application close events to clean up number input state
Hooks.on("closeApplication", (app) => {
  if (app.element) {
    cleanupNumberInputs(app.element);
  }
});

Hooks.on("closeApplicationV2", (app) => {
  if (app.element) {
    cleanupNumberInputs(app.element);
  }
});
