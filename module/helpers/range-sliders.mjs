/**
 * Helper functions for range slider inputs
 * @module helpers/range-sliders
 */
import { CommonFoundryTasks } from "../utils/common-foundry-tasks.mjs";

// Track initialization to prevent duplicate handlers
let isInitialized = false;

/**
 * Initialize range slider functionality
 */
export function initRangeSliders() {
  // Prevent multiple initializations of event handlers
  if (isInitialized) {
    // If already initialized, just update the displays
    updateRangeSliderDisplays();
    return;
  }

  isInitialized = true;

  // Add the global input handler for all range sliders
  document.addEventListener("input", handleRangeSliderInput);

  // Initial update of all range slider displays
  updateRangeSliderDisplays();

  if (CommonFoundryTasks.isTestingMode) {
    console.log("Range sliders initialized");
  }
}

/**
 * Update range slider displays for any sliders that may have been added dynamically
 */
export function updateRangeSliderDisplays() {
  // Find all range sliders
  document.querySelectorAll('.base-form__range-slider').forEach((slider) => {
    // Find the associated display value element
    const wrapper = slider.closest('.base-form__slider-wrapper');
    if (!wrapper) return;
    
    const display = wrapper.querySelector('.base-form__range-value');
    if (!display) return;
    
    // Update the display with the current value
    display.textContent = `${slider.value}×`;
  });
}

/**
 * Handle input events for range sliders
 * @param {Event} event - The input event
 */
function handleRangeSliderInput(event) {
  const target = event.target;

  // Check if the event target is a range slider
  if (target.matches('.base-form__range-slider')) {
    const wrapper = target.closest('.base-form__slider-wrapper');
    if (!wrapper) return;
    
    const display = wrapper.querySelector('.base-form__range-value');
    if (!display) return;
    
    // Update the display with the current value
    display.textContent = `${target.value}×`;
  }
}

/**
 * Clean up range slider enhancements for a specific application element
 * @param {HTMLElement} element - The application's element
 */
export function cleanupRangeSliders(element) {
  if (!element) {
    if (CommonFoundryTasks.isTestingMode) {
      console.log("Range Sliders | No element provided for cleanup");
    }
    return;
  }

  if (CommonFoundryTasks.isTestingMode) {
    console.log("Range Sliders | Cleaning up range sliders", element);
  }

  // Find all range sliders
  const rangeSliders = element.querySelectorAll('.base-form__range-slider');
  
  if (CommonFoundryTasks.isTestingMode) {
    console.log(`Range Sliders | Found ${rangeSliders.length} range sliders to clean up`);
  }
  
  rangeSliders.forEach((slider) => {
    // Remove event listeners by cloning and replacing
    const newSlider = slider.cloneNode(true);
    // Preserve the current value
    newSlider.value = slider.value;
    slider.parentNode.replaceChild(newSlider, slider);
  });
}

// Initialize range sliders when relevant hooks fire
Hooks.on("ready", () => {
  initRangeSliders();
});

// Hook into all relevant render events to ensure range sliders are updated
Hooks.on("renderItemV2", () => {
  updateRangeSliderDisplays();
});

Hooks.on("renderEventideRpSystemItemSheet", () => {
  updateRangeSliderDisplays();
});

// Catch any other application renders
Hooks.on("renderApplicationV2", () => {
  updateRangeSliderDisplays();
}); 