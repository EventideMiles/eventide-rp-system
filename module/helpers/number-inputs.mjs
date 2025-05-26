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
 * This function finds unwrapped number inputs with the appropriate class
 * and wraps them with increment/decrement buttons. It also updates the
 * responsive behavior for all number input wrappers.
 */
export const enhanceExistingNumberInputs = () => {
  try {
    // Find all number inputs not properly wrapped
    document.querySelectorAll('input[type="number"]').forEach((input) => {
      const wrapper = input.closest(".base-form__number-input-wrapper");

      // If this input isn't in a wrapper but has the base-form__number-input class,
      // we need to wrap it with increment/decrement buttons
      if (!wrapper && input.classList.contains("base-form__number-input")) {
        Logger.debug(
          "Found unwrapped number input, wrapping it",
          { inputName: input.name },
          "NUMBER_INPUT",
        );
        wrapNumberInput(input);
      }
    });

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
 * Wrap a number input with the proper wrapper and buttons
 *
 * @private
 * @param {HTMLInputElement} input - The number input to wrap
 */
const wrapNumberInput = (input) => {
  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "base-form__number-input-wrapper";

  // Create decrement button
  const decrementBtn = document.createElement("button");
  decrementBtn.type = "button";
  decrementBtn.className = "decrement";
  decrementBtn.dataset.action = "decrement";
  decrementBtn.textContent = "−";

  // Create increment button
  const incrementBtn = document.createElement("button");
  incrementBtn.type = "button";
  incrementBtn.className = "increment";
  incrementBtn.dataset.action = "increment";
  incrementBtn.textContent = "+";

  // Save existing attributes
  const attributes = {};
  for (const attr of input.attributes) {
    if (attr.name !== "class") {
      attributes[attr.name] = attr.value;
    }
  }

  // Replace input with our wrapped version
  const parent = input.parentElement;
  parent.replaceChild(wrapper, input);

  // Add elements to wrapper
  wrapper.appendChild(decrementBtn);
  wrapper.appendChild(input);
  wrapper.appendChild(incrementBtn);
};

/**
 * Handle click events for number input buttons
 *
 * @private
 * @param {MouseEvent} event - The click event
 */
const handleNumberInputClick = (event) => {
  const target = event.target;

  // Check if the clicked element is an increment or decrement button
  if (target.matches(".increment, .decrement")) {
    const wrapper = target.closest(".base-form__number-input-wrapper");
    if (!wrapper) return;

    const input = wrapper.querySelector('input[type="number"]');
    if (!input) return;

    updateNumberInputValue(input, target.classList.contains("increment"));
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

  document
    .querySelectorAll(".base-form__number-input-wrapper")
    .forEach((wrapper) => {
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
  const numberWrappers = element.querySelectorAll(
    ".base-form__number-input-wrapper",
  );

  Logger.debug(
    "Found number inputs to clean up",
    { count: numberWrappers.length },
    "NUMBER_INPUT",
  );

  numberWrappers.forEach((wrapper) => {
    // Remove event listeners by cloning and replacing
    const input = wrapper.querySelector('input[type="number"]');
    if (input) {
      const newInput = input.cloneNode(true);
      // Preserve the current value
      newInput.value = input.value;
      input.parentNode.replaceChild(newInput, input);
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
