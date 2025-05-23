/**
 * Helper functions for enhanced color pickers with hex input
 *
 * This module provides functionality for creating and managing color pickers
 * with hex input fields, allowing for more precise color selection.
 *
 * @module helpers/color-pickers
 */
import { Logger } from "../services/_module.mjs";

// Store event handlers with their elements
const eventHandlers = new WeakMap();

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
    Logger.debug(
      "Initializing color pickers with hex input",
      { selector },
      "COLOR_PICKER",
    );

    try {
      const colorPickers = document.querySelectorAll(selector);
      Logger.debug(
        "Found color pickers",
        { count: colorPickers.length },
        "COLOR_PICKER",
      );

      colorPickers.forEach((container, index) => {
        try {
          setupSingleColorPicker(container, index);
        } catch (error) {
          Logger.warn(
            `Failed to setup color picker ${index}`,
            error,
            "COLOR_PICKER",
          );
        }
      });
    } catch (error) {
      Logger.error("Failed to initialize color pickers", error, "COLOR_PICKER");
    }
  }, 100); // Short delay to ensure DOM is fully rendered
}

/**
 * Enhance color pickers that may have been added dynamically
 *
 * This function ensures all color pickers are properly initialized even if they weren't
 * present during the initial render. It's useful to call this after dynamic content updates.
 */
export function enhanceExistingColorPickers() {
  Logger.debug("Enhancing existing color pickers", {}, "COLOR_PICKER");

  try {
    // Find all color pickers and initialize them
    initColorPickersWithHex();
  } catch (error) {
    Logger.error(
      "Failed to enhance existing color pickers",
      error,
      "COLOR_PICKER",
    );
  }
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
    Logger.debug("No element provided for cleanup", {}, "COLOR_PICKER");
  }

  Logger.debug(
    "Cleaning up color pickers",
    { elementTag: element.tagName },
    "COLOR_PICKER",
  );

  try {
    // Find all color pickers within the element
    const colorPickers = element.querySelectorAll(".color-picker-with-hex");
    Logger.debug(
      "Found color pickers to clean up",
      { count: colorPickers.length },
      "COLOR_PICKER",
    );

    colorPickers.forEach((container, index) => {
      try {
        cleanupSingleColorPicker(container);
      } catch (error) {
        Logger.warn(
          `Failed to cleanup color picker ${index}`,
          error,
          "COLOR_PICKER",
        );
      }
    });
  } catch (error) {
    Logger.error("Failed to cleanup color pickers", error, "COLOR_PICKER");
  }
}

/**
 * Set up a single color picker with hex input
 *
 * @private
 * @param {HTMLElement} container - The color picker container
 * @param {number} index - Index for generating unique IDs
 */
function setupSingleColorPicker(container, _index) {
  const colorInput = container.querySelector(".color-picker");
  const hexInput = container.querySelector(".hex-input");
  const preview = container.querySelector(".color-preview");

  if (!colorInput || !hexInput || !preview) {
    Logger.debug(
      "Missing required elements for color picker",
      {
        colorInput,
        hexInput,
        preview,
      },
      "COLOR_PICKER",
    );
  }

  // Store the initial values
  const initialColor = colorInput.value;
  preview.style.backgroundColor = initialColor;
  hexInput.value = initialColor.toUpperCase();

  // Clean up any previous event listeners
  cleanupColorPickerListeners(colorInput, hexInput);

  // Mark as initialized
  colorInput.dataset.initialized = "true";
  hexInput.dataset.initialized = "true";

  /**
   * Update the preview element
   */
  function updatePreview() {
    preview.style.backgroundColor = colorInput.value;
  }

  /**
   * Event handler for color picker changes
   * @param {Event} event - The input event
   */
  function handleColorInput(event) {
    Logger.debug("Color input changed:", event.target.value, "COLOR_PICKER");
    hexInput.value = event.target.value.toUpperCase();
    updatePreview();
  }

  /**
   * Event handler for hex input changes
   * @param {Event} event - The input event
   */
  function handleHexInput(event) {
    let value = event.target.value;
    Logger.debug("Hex input changed:", value, "COLOR_PICKER");

    // Add # if it's missing
    if (value.charAt(0) !== "#") {
      value = `#${value}`;
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

  // Store the handler functions for this specific input
  eventHandlers.set(colorInput, {
    handleColorInput,
    handleHexInput,
    handleHexBlur,
  });

  // Add the event listeners
  colorInput.addEventListener("input", handleColorInput);
  colorInput.addEventListener("change", handleColorInput); // For better browser compatibility
  hexInput.addEventListener("input", handleHexInput);
  hexInput.addEventListener("blur", handleHexBlur);
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

  if (
    colorInput.dataset.initialized === "true" &&
    eventHandlers.has(colorInput)
  ) {
    const handlers = eventHandlers.get(colorInput);
    colorInput.removeEventListener("input", handlers.handleColorInput);
    colorInput.removeEventListener("change", handlers.handleColorInput);
    hexInput.removeEventListener("input", handlers.handleHexInput);
    hexInput.removeEventListener("blur", handlers.handleHexBlur);

    // Clear the event handlers for this input
    eventHandlers.delete(colorInput);
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

  if (!colorInput || !hexInput) {
    // Clean up event listeners before replacing
    cleanupColorPickerListeners(colorInput, hexInput);
  }

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
Hooks.on("renderApplicationV2", (_context, element, _options) => {
  if (element.querySelector(".color-picker-with-hex")) {
    initColorPickersWithHex();
  }
});

// Hook into all relevant item and sheet renders to ensure color pickers are enhanced
Hooks.on("renderItemV2", (_app, _html) => {
  enhanceExistingColorPickers();
});

// Handle color pickers in creator applications
Hooks.on("renderCreatorApplication", (_app, _html) => {
  enhanceExistingColorPickers();
});
