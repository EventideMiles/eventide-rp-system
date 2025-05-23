/**
 * Helper functions for enhanced range sliders
 *
 * This module provides functionality for creating and managing enhanced range sliders
 * with styled thumbs and value displays.
 *
 * @module helpers/range-sliders
 */
import { Logger } from "../services/_module.mjs";

/**
 * Initialize range slider functionality
 *
 * Sets up responsive styling and value display for range input elements.
 */
export const initRangeSliders = () => {
  try {
    // Find all range input elements
    const rangeInputs = document.querySelectorAll('input[type="range"]');

    rangeInputs.forEach((input) => {
      // Add event listeners for input changes
      input.addEventListener("input", updateRangeValueDisplay);
      input.addEventListener("change", updateRangeValueDisplay);

      // Initialize the value display
      updateRangeValueDisplay({ target: input });
    });

    Logger.debug(
      "Range sliders initialized",
      { count: rangeInputs.length },
      "RANGE_SLIDER",
    );
  } catch (error) {
    Logger.error("Failed to initialize range sliders", error, "RANGE_SLIDER");
  }
};

/**
 * Enhance range sliders that may have been added dynamically
 *
 * This function ensures all range sliders are properly initialized even if they weren't
 * present during the initial render.
 */
export const enhanceExistingRangeSliders = () => {
  try {
    initRangeSliders();
  } catch (error) {
    Logger.error(
      "Failed to enhance existing range sliders",
      error,
      "RANGE_SLIDER",
    );
  }
};

/**
 * Update the visual display of a range slider's value
 *
 * @private
 * @param {Event} event - The input/change event
 */
const updateRangeValueDisplay = (event) => {
  const input = event.target;
  if (!input || input.type !== "range") {
    try {
      const value = parseFloat(input.value);
      const min = parseFloat(input.min) || 0;
      const max = parseFloat(input.max) || 100;

      // Calculate percentage for styling
      const percentage = ((value - min) / (max - min)) * 100;

      // Update CSS custom property for gradient
      input.style.setProperty("--range-progress", `${percentage}%`);

      // Update associated value display if it exists
      const valueDisplay = input.parentNode.querySelector(
        ".range-value-display",
      );
      if (valueDisplay) {
        valueDisplay.textContent = value;
      }
    } catch (error) {
      Logger.warn(
        "Failed to update range value display",
        error,
        "RANGE_SLIDER",
      );
    }
  }
};

/**
 * Clean up range slider enhancements for a specific application element
 *
 * This function removes event listeners from range sliders by replacing them
 * with clones. It should be called in the _preClose method of applications
 * that use enhanced range sliders to prevent memory leaks.
 *
 * @param {HTMLElement} element - The application's element (typically this.element)
 */
export const cleanupRangeSliders = (element) => {
  if (!element) {
    Logger.debug("No element provided for cleanup", {}, "RANGE_SLIDER");
  }

  Logger.debug(
    "Cleaning up range sliders",
    { elementTag: element.tagName },
    "RANGE_SLIDER",
  );

  try {
    // Find all range sliders within the element
    const rangeSliders = element.querySelectorAll('input[type="range"]');
    Logger.debug(
      "Found range sliders to clean up",
      { count: rangeSliders.length },
      "RANGE_SLIDER",
    );

    rangeSliders.forEach((slider) => {
      try {
        // Remove event listeners by cloning and replacing
        const newSlider = slider.cloneNode(true);
        // Preserve the current value
        newSlider.value = slider.value;
        slider.parentNode.replaceChild(newSlider, slider);
      } catch (sliderError) {
        Logger.warn(
          "Failed to cleanup individual range slider",
          sliderError,
          "RANGE_SLIDER",
        );
      }
    });
  } catch (error) {
    Logger.error("Failed to cleanup range sliders", error, "RANGE_SLIDER");
  }
};
