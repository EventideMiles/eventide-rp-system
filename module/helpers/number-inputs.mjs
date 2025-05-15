/**
 * Helper functions for enhanced number inputs
 * @module helpers/number-inputs
 */
import { CommonFoundryTasks } from "./common-foundry-tasks.mjs";

// Track initialization to prevent duplicate handlers
let isInitialized = false;

/**
 * Initialize number input functionality
 */
export function initNumberInputs() {
  // Prevent multiple initializations of event handlers
  if (isInitialized) {
    // If already initialized, just update the responsive behavior
    updateNumberInputResponsiveness();
    return;
  }

  isInitialized = true;

  // Add the global click handler for all number input buttons
  document.addEventListener("click", handleNumberInputClick);

  // Initial check of number input sizes
  updateNumberInputResponsiveness();

  // Listen for window resize events to update compact state
  window.addEventListener(
    "resize",
    debounce(updateNumberInputResponsiveness, 250)
  );

  if (CommonFoundryTasks.isTestingMode()) {
    console.log("Number inputs initialized with responsive behavior");
  }
}

/**
 * Enhance number inputs that may have been added dynamically
 * This doesn't add new event listeners, just ensures all wrappers are properly set up
 */
export function enhanceExistingNumberInputs() {
  // Find all number inputs not properly wrapped
  document.querySelectorAll('input[type="number"]').forEach((input) => {
    const wrapper = input.closest(".base-form__number-input-wrapper");

    // If this input isn't in a wrapper but has the base-form__number-input class,
    // we need to wrap it with increment/decrement buttons
    if (!wrapper && input.classList.contains("base-form__number-input")) {
      if (CommonFoundryTasks.isTestingMode()) {
        console.log("Found unwrapped number input, wrapping it");
      }
      wrapNumberInput(input);
    }
  });

  // Update responsive behavior for all wrappers
  updateNumberInputResponsiveness();
}

/**
 * Wrap a number input with the proper wrapper and buttons
 * @param {HTMLInputElement} input - The number input to wrap
 */
function wrapNumberInput(input) {
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
}

/**
 * Handle click events for number input buttons
 * @param {MouseEvent} event - The click event
 */
function handleNumberInputClick(event) {
  const target = event.target;

  // Check if the clicked element is an increment or decrement button
  if (target.matches(".increment, .decrement")) {
    const wrapper = target.closest(".base-form__number-input-wrapper");
    if (!wrapper) return;

    const input = wrapper.querySelector('input[type="number"]');
    if (!input) return;

    const value = parseFloat(input.value) || 0;
    const step = parseFloat(input.step) || 1;
    const min = input.hasAttribute("min") ? parseFloat(input.min) : -Infinity;
    const max = input.hasAttribute("max") ? parseFloat(input.max) : Infinity;

    // Increment or decrement the value
    if (target.classList.contains("increment")) {
      input.value = Math.min(value + step, max);
    } else {
      input.value = Math.max(value - step, min);
    }

    // Trigger change event
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

/**
 * Check all number input wrappers and add compact class if needed
 */
function updateNumberInputResponsiveness() {
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
}

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce delay in milliseconds
 * @returns {Function} The debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Initialize number inputs when relevant hooks fire
Hooks.on("ready", () => {
  initNumberInputs();
});

// Hook into all relevant render events to ensure number inputs are enhanced
Hooks.on("renderItemV2", (app, html) => {
  enhanceExistingNumberInputs();
});

Hooks.on("renderEventideRpSystemItemSheet", (app, html) => {
  enhanceExistingNumberInputs();

  const tabsContainer = html.querySelector(".tabs");
  if (tabsContainer) {
    tabsContainer.addEventListener("click", (event) => {
      setTimeout(() => {
        updateNumberInputResponsiveness();
      }, 50);
    });
  }
});

// Catch any other application renders
Hooks.on("renderApplicationV2", () => {
  updateNumberInputResponsiveness();
  if (CommonFoundryTasks.isTestingMode()) {
    console.log("Number inputs updated");
  }
});

/**
 * Clean up number input enhancements for a specific application element
 * This should be called in the _preClose method of applications that use enhanced number inputs
 * @param {HTMLElement} element - The application's element (typically this.element)
 */
export function cleanupNumberInputs(element) {
  if (!element) {
    if (CommonFoundryTasks.isTestingMode()) {
      console.log("Number Inputs | No element provided for cleanup");
    }
    return;
  }

  if (CommonFoundryTasks.isTestingMode()) {
    console.log("Number Inputs | Cleaning up number inputs", element);
  }

  // Remove any tab click listeners that might have been added for number inputs
  const tabsContainer = element.querySelector(".tabs");
  if (tabsContainer) {
    const clone = tabsContainer.cloneNode(true);
    tabsContainer.parentNode.replaceChild(clone, tabsContainer);
  }

  // Clean up any number input wrappers
  const numberWrappers = element.querySelectorAll(
    ".base-form__number-input-wrapper"
  );
  
  if (CommonFoundryTasks.isTestingMode()) {
    console.log(`Number Inputs | Found ${numberWrappers.length} number inputs to clean up`);
  }
  
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
}
