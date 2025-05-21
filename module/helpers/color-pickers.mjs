/**
 * Helper functions for enhanced color pickers with hex input
 *
 * This module provides functionality for creating and managing color pickers
 * with hex input fields, allowing for more precise color selection.
 *
 * @module helpers/color-pickers
 */
import { CommonFoundryTasks } from "../utils/_module.mjs";

const logIfTesting = CommonFoundryTasks.logIfTesting;

/**
 * Initialize color pickers with hex input fields
 *
 * This function finds all color picker containers matching the selector
 * and enhances them with synchronized hex input fields and color previews.
 * It sets up event listeners to keep the color picker, hex input, and preview in sync.
 *
 * @param {string} selector - The selector for the color picker containers
 */
export function initColorPickersWithHex(selector = ".color-picker-with-hex") {
  // Use a slight delay to ensure the DOM is fully rendered
  setTimeout(() => {
    logIfTesting("Color Pickers | Initializing color pickers with hex input");

    const colorPickers = document.querySelectorAll(selector);
    logIfTesting(`Color Pickers | Found ${colorPickers.length} color pickers`);

    colorPickers.forEach((container, index) => {
      setupSingleColorPicker(container, index);
    });
  }, 100); // Short delay to ensure DOM is fully rendered
}

/**
 * Enhance color pickers that may have been added dynamically
 *
 * This function ensures all color pickers are properly initialized even if they weren't
 * present during the initial render. It's useful to call this after dynamic content updates.
 */
export function enhanceExistingColorPickers() {
  logIfTesting("Color Pickers | Enhancing existing color pickers");

  // Find all color pickers and initialize them
  initColorPickersWithHex();
}

/**
 * Clean up color picker enhancements for a specific application element
 *
 * This function removes event listeners from color pickers by replacing them
 * with clones. It should be called in the _preClose method of applications
 * that use enhanced color pickers to prevent memory leaks.
 *
 * @param {HTMLElement} element - The application's element (typically this.element)
 */
export function cleanupColorPickers(element) {
  if (!element) {
    logIfTesting("Color Pickers | No element provided for cleanup");
    return;
  }

  logIfTesting("Color Pickers | Cleaning up color pickers", element);

  // Find all color pickers within the element
  const colorPickers = element.querySelectorAll(".color-picker-with-hex");
  logIfTesting(
    `Color Pickers | Found ${colorPickers.length} color pickers to clean up`
  );

  colorPickers.forEach((container) => {
    cleanupSingleColorPicker(container);
  });
}

/**
 * Set up a single color picker with hex input
 *
 * @private
 * @param {HTMLElement} container - The color picker container
 * @param {number} index - Index for generating unique IDs
 */
function setupSingleColorPicker(container, index) {
  const colorInput = container.querySelector(".color-picker");
  const hexInput = container.querySelector(".hex-input");
  const preview = container.querySelector(".color-preview");

  if (!colorInput || !hexInput || !preview) {
    logIfTesting("Missing required elements for color picker", {
      colorInput,
      hexInput,
      preview,
    });
    return;
  }

  // Generate unique IDs for these elements if they don't already have them
  const uniqueId = colorInput.id || `color-picker-${Date.now()}-${index}`;

  // Store the initial values
  const initialColor = colorInput.value;
  preview.style.backgroundColor = initialColor;
  hexInput.value = initialColor.toUpperCase();

  // Clean up any previous event listeners
  cleanupColorPickerListeners(colorInput, hexInput);

  // Mark as initialized
  colorInput.dataset.initialized = "true";
  hexInput.dataset.initialized = "true";

  // Add the event listeners
  colorInput.addEventListener("input", handleColorInput);
  colorInput.addEventListener("change", handleColorInput); // For better browser compatibility
  hexInput.addEventListener("input", handleHexInput);
  hexInput.addEventListener("blur", handleHexBlur);

  /**
   * Event handler for color picker changes
   * @param {Event} event - The input event
   */
  function handleColorInput(event) {
    logIfTesting("Color input changed:", event.target.value);
    hexInput.value = event.target.value.toUpperCase();
    updatePreview();
  }

  /**
   * Event handler for hex input changes
   * @param {Event} event - The input event
   */
  function handleHexInput(event) {
    let value = event.target.value;
    logIfTesting("Hex input changed:", value);

    // Add # if it's missing
    if (value.charAt(0) !== "#") {
      value = "#" + value;
      event.target.value = value;
    }

    // Validate the hex color
    const isValid = /^#([A-Fa-f0-9]{6})$/.test(value);
    const isShort = /^#([A-Fa-f0-9]{3})$/.test(value);

    if (isValid) {
      colorInput.value = value;
      updatePreview();
      event.target.classList.remove("invalid");
    } else if (isShort) {
      // Convert short hex (#RGB) to full hex (#RRGGBB)
      const expandedValue = expandShortHex(value);
      colorInput.value = expandedValue;
      updatePreview();
    } else {
      event.target.classList.add("invalid");
    }
  }

  /**
   * Event handler for hex input blur
   * @param {Event} event - The blur event
   */
  function handleHexBlur(event) {
    if (event.target.classList.contains("invalid")) {
      event.target.value = colorInput.value.toUpperCase();
      event.target.classList.remove("invalid");
      updatePreview();
    }
  }

  /**
   * Update the preview element
   */
  function updatePreview() {
    preview.style.backgroundColor = colorInput.value;
  }
}

/**
 * Clean up event listeners for a color picker
 *
 * @private
 * @param {HTMLElement} colorInput - The color input element
 * @param {HTMLElement} hexInput - The hex input element
 */
function cleanupColorPickerListeners(colorInput, hexInput) {
  colorInput.dataset.initialized = colorInput.dataset.initialized || "false";
  hexInput.dataset.initialized = hexInput.dataset.initialized || "false";

  if (colorInput.dataset.initialized === "true") {
    colorInput.removeEventListener("input", handleColorInput);
    colorInput.removeEventListener("change", handleColorInput);
  }

  if (hexInput.dataset.initialized === "true") {
    hexInput.removeEventListener("input", handleHexInput);
    hexInput.removeEventListener("blur", handleHexBlur);
  }
}

/**
 * Clean up a single color picker by replacing inputs with clones
 *
 * @private
 * @param {HTMLElement} container - The color picker container
 */
function cleanupSingleColorPicker(container) {
  const colorInput = container.querySelector(".color-picker");
  const hexInput = container.querySelector(".hex-input");

  if (!colorInput || !hexInput) return;

  // Create a clone of each input to remove event listeners
  if (colorInput.parentNode) {
    const newColorInput = colorInput.cloneNode(true);
    colorInput.parentNode.replaceChild(newColorInput, colorInput);
    newColorInput.dataset.initialized = "false";
  }

  if (hexInput.parentNode) {
    const newHexInput = hexInput.cloneNode(true);
    hexInput.parentNode.replaceChild(newHexInput, hexInput);
    newHexInput.dataset.initialized = "false";
  }
}

/**
 * Convert short hex format (#RGB) to full hex format (#RRGGBB)
 *
 * @private
 * @param {string} shortHex - The short hex color (e.g., "#F00")
 * @returns {string} The full hex color (e.g., "#FF0000")
 */
function expandShortHex(shortHex) {
  // Remove the # and split into characters
  const hex = shortHex.substring(1).split("");
  // Duplicate each character and join back with #
  return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
}

// Hook initialization at key points in the application lifecycle
Hooks.on("ready", () => {
  initColorPickersWithHex();
});

// Initialize when relevant sheets render
Hooks.on("renderApplicationV2", (context, element, options) => {
  if (element.querySelector(".color-picker-with-hex")) {
    initColorPickersWithHex();
  }
});

// Hook into all relevant item and sheet renders to ensure color pickers are enhanced
Hooks.on("renderItemV2", (app, html) => {
  enhanceExistingColorPickers();
});

// Handle color pickers in creator applications
Hooks.on("renderCreatorApplication", (app, html) => {
  enhanceExistingColorPickers();
});
