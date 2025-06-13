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
 * Safe logging function that works before Logger is initialized
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} message - Message to log
 * @param {*} data - Optional data to log
 */
function safeLog(level, message, data = null) {
  try {
    // Try to use Logger if available and settings are registered
    if (typeof Logger !== "undefined" && game?.settings?.get) {
      Logger[level](message, data || {}, "COLOR_PICKER");
    } else {
      // Fall back to console logging
      const logMessage = `ERPS | COLOR_PICKER | ${message}`;
      if (data) {
        console[level](logMessage, data);
      } else {
        console[level](logMessage);
      }
    }
  } catch {
    // If all else fails, use basic console logging
    console.info(`ERPS | COLOR_PICKER | ${message}`, data || "");
  }
}

/**
 * Initialize color pickers with hex input fields
 *
 * This function finds all color picker containers matching the selector
 * and enhances them with synchronized hex input fields and color previews.
 * It sets up event listeners to keep the color picker, hex input, and preview in sync.
 * Supports both legacy .color-picker-with-hex and new .erps-color-picker components.
 *
 * @param {string} selector - The selector for the color picker containers
 */
export function initColorPickersWithHex(
  selector = ".color-picker-with-hex, .erps-color-picker",
) {
  // Use a slight delay to ensure the DOM is fully rendered
  setTimeout(() => {
    safeLog("debug", "Initializing color pickers with hex input", { selector });

    try {
      const colorPickers = document.querySelectorAll(selector);
      safeLog("debug", "Found color pickers", { count: colorPickers.length });

      colorPickers.forEach((container, index) => {
        try {
          setupSingleColorPicker(container, index);
        } catch (error) {
          safeLog("warn", `Failed to setup color picker ${index}`, error);
        }
      });
    } catch (error) {
      safeLog("error", "Failed to initialize color pickers", error);
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
  safeLog("debug", "Enhancing existing color pickers", {});

  try {
    // Find all color pickers and initialize them
    initColorPickersWithHex();
  } catch (error) {
    safeLog("error", "Failed to enhance existing color pickers", error);
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
    safeLog("debug", "No element provided for cleanup", {});
    return;
  }

  safeLog("debug", "Cleaning up color pickers", {
    elementTag: element.tagName,
  });

  try {
    // Find all color pickers within the element (both legacy and ERPS)
    const colorPickers = element.querySelectorAll(
      ".color-picker-with-hex, .erps-color-picker",
    );
    safeLog("debug", "Found color pickers to clean up", {
      count: colorPickers.length,
    });

    colorPickers.forEach((container, index) => {
      try {
        cleanupSingleColorPicker(container);
      } catch (error) {
        safeLog("warn", `Failed to cleanup color picker ${index}`, error);
      }
    });
  } catch (error) {
    safeLog("error", "Failed to cleanup color pickers", error);
  }
}

/**
 * Clean up global color picker resources
 * This should be called when the system is being disabled or reloaded
 */
export function cleanupGlobalColorPickers() {
  safeLog("debug", "Cleaning up global color picker resources", {});

  try {
    // Clear the WeakMap to help with garbage collection
    // Note: WeakMaps don't have a clear method, but removing references helps

    // Find any orphaned color pickers in the document and clean them up
    const orphanedColorPickers = document.querySelectorAll(
      ".color-picker-with-hex, .erps-color-picker",
    );

    orphanedColorPickers.forEach((container) => {
      try {
        cleanupSingleColorPicker(container);
      } catch (error) {
        safeLog("warn", "Failed to cleanup orphaned color picker", error);
      }
    });

    safeLog("debug", "Global color picker cleanup completed", {});
  } catch (error) {
    safeLog("error", "Failed to cleanup global color pickers", error);
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
  // Support both legacy and ERPS color picker structures
  const isERPSColorPicker = container.classList.contains("erps-color-picker");

  let colorInput, hexInput, preview;

  if (isERPSColorPicker) {
    // ERPS color picker structure
    colorInput =
      container.querySelector(".erps-color-picker__input") ||
      container.querySelector(".color-picker");
    hexInput =
      container.querySelector(".erps-color-picker__hex") ||
      container.querySelector(".hex-input");
    preview =
      container.querySelector(".erps-color-picker__preview") ||
      container.querySelector(".color-preview");
  } else {
    // Legacy color picker structure
    colorInput = container.querySelector(".color-picker");
    hexInput = container.querySelector(".hex-input");
    preview = container.querySelector(".color-preview");
  }

  if (!colorInput || !hexInput || !preview) {
    safeLog("debug", "Missing required elements for color picker", {
      colorInput: !!colorInput,
      hexInput: !!hexInput,
      preview: !!preview,
      isERPSColorPicker,
      containerClasses: container.className,
    });
    return;
  }

  // Store the initial values
  const initialColor = colorInput.value || "#000000";
  preview.style.backgroundColor = initialColor;
  hexInput.value = initialColor.toUpperCase();

  // Clean up any previous event listeners
  cleanupColorPickerListeners(colorInput, hexInput);

  // Mark as initialized
  colorInput.dataset.initialized = "true";
  hexInput.dataset.initialized = "true";

  safeLog("debug", "Setting up color picker", {
    isERPSColorPicker,
    initialColor,
    containerClasses: container.className,
  });

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
    safeLog(
      "debug",
      "Color input changed:",
      event.target.value,
      "COLOR_PICKER",
    );
    hexInput.value = event.target.value.toUpperCase();
    updatePreview();
  }

  /**
   * Event handler for hex input changes
   * @param {Event} event - The input event
   */
  function handleHexInput(event) {
    let value = event.target.value;
    safeLog("debug", "Hex input changed:", value, "COLOR_PICKER");

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
  // Support both legacy and ERPS color picker structures
  const isERPSColorPicker = container.classList.contains("erps-color-picker");

  let colorInput, hexInput;

  if (isERPSColorPicker) {
    // ERPS color picker structure
    colorInput =
      container.querySelector(".erps-color-picker__input") ||
      container.querySelector(".color-picker");
    hexInput =
      container.querySelector(".erps-color-picker__hex") ||
      container.querySelector(".hex-input");
  } else {
    // Legacy color picker structure
    colorInput = container.querySelector(".color-picker");
    hexInput = container.querySelector(".hex-input");
  }

  if (!colorInput || !hexInput) {
    // Clean up event listeners before replacing
    if (colorInput && hexInput) {
      cleanupColorPickerListeners(colorInput, hexInput);
    }
    return;
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
  if (element.querySelector(".color-picker-with-hex, .erps-color-picker")) {
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
