/**
 * Helper functions for enhanced color pickers with hex input
 * @module helpers/color-pickers
 */
import { CommonFoundryTasks } from "../utils/common-foundry-tasks.mjs";

/**
 * Initialize color pickers with hex input fields
 * @param {string} selector - The selector for the color picker containers
 */
export function initColorPickersWithHex(selector = ".color-picker-with-hex") {
  // Use a slight delay to ensure the DOM is fully rendered
  setTimeout(() => {
    if (CommonFoundryTasks.isTestingMode) {
      console.log("Color Pickers | Initializing color pickers with hex input");
    }

    const colorPickers = document.querySelectorAll(selector);

    if (CommonFoundryTasks.isTestingMode) {
      console.log(`Color Pickers | Found ${colorPickers.length} color pickers`);
    }

    colorPickers.forEach((container, index) => {
      const colorInput = container.querySelector(".color-picker");
      const hexInput = container.querySelector(".hex-input");
      const preview = container.querySelector(".color-preview");

      if (!colorInput || !hexInput || !preview) {
        if (CommonFoundryTasks.isTestingMode) {
          console.warn("Missing required elements for color picker", {
            colorInput,
            hexInput,
            preview,
          });
        }
        return;
      }

      // Generate unique IDs for these elements if they don't already have them
      const uniqueId = colorInput.id || `color-picker-${Date.now()}-${index}`;

      // Store the initial values
      const initialColor = colorInput.value;
      preview.style.backgroundColor = initialColor;
      hexInput.value = initialColor.toUpperCase();

      // Clean up any previous event listeners
      colorInput.dataset.initialized =
        colorInput.dataset.initialized || "false";
      hexInput.dataset.initialized = hexInput.dataset.initialized || "false";

      if (colorInput.dataset.initialized === "true") {
        colorInput.removeEventListener("input", handleColorInput);
        colorInput.removeEventListener("change", handleColorInput);
      }

      if (hexInput.dataset.initialized === "true") {
        hexInput.removeEventListener("input", handleHexInput);
        hexInput.removeEventListener("blur", handleHexBlur);
      }

      // Mark as initialized
      colorInput.dataset.initialized = "true";
      hexInput.dataset.initialized = "true";

      // Add the event listeners
      colorInput.addEventListener("input", handleColorInput);
      colorInput.addEventListener("change", handleColorInput); // For better browser compatibility
      hexInput.addEventListener("input", handleHexInput);
      hexInput.addEventListener("blur", handleHexBlur);

      // Event handler for color picker changes
      function handleColorInput(event) {
        if (CommonFoundryTasks.isTestingMode) {
          console.log("Color input changed:", event.target.value);
        }
        hexInput.value = event.target.value.toUpperCase();
        updatePreview();
      }

      // Event handler for hex input changes
      function handleHexInput(event) {
        let value = event.target.value;
        if (CommonFoundryTasks.isTestingMode) {
          console.log("Hex input changed:", value);
        }

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
          colorInput.value = `${value}${value.slice(1)}`;
          updatePreview();
        } else {
          event.target.classList.add("invalid");
        }
      }

      // Event handler for hex input blur
      function handleHexBlur(event) {
        if (event.target.classList.contains("invalid")) {
          event.target.value = colorInput.value.toUpperCase();
          event.target.classList.remove("invalid");
          updatePreview();
        }
      }

      // Update the preview element
      function updatePreview() {
        preview.style.backgroundColor = colorInput.value;
      }
    });
  }, 100); // Short delay to ensure DOM is fully rendered
}

/**
 * Enhance color pickers that may have been added dynamically
 * This ensures all color pickers are properly initialized even if they weren't
 * present during the initial render
 */
export function enhanceExistingColorPickers() {
  if (CommonFoundryTasks.isTestingMode) {
    console.log("Color Pickers | Enhancing existing color pickers");
  }

  // Find all color pickers and initialize them
  initColorPickersWithHex();
}

/**
 * Clean up color picker enhancements for a specific application element
 * This should be called in the _preClose method of applications that use enhanced color pickers
 * @param {HTMLElement} element - The application's element (typically this.element)
 */
export function cleanupColorPickers(element) {
  if (!element) {
    if (CommonFoundryTasks.isTestingMode) {
      console.log("Color Pickers | No element provided for cleanup");
    }
    return;
  }

  if (CommonFoundryTasks.isTestingMode) {
    console.log("Color Pickers | Cleaning up color pickers", element);
  }

  // Find all color pickers within the element
  const colorPickers = element.querySelectorAll(".color-picker-with-hex");

  if (CommonFoundryTasks.isTestingMode) {
    console.log(
      `Color Pickers | Found ${colorPickers.length} color pickers to clean up`
    );
  }

  colorPickers.forEach((container) => {
    const colorInput = container.querySelector(".color-picker");
    const hexInput = container.querySelector(".hex-input");

    if (!colorInput || !hexInput) return;

    // Create a clone of each input to remove event listeners
    let newColorInput, newHexInput;

    if (colorInput.parentNode) {
      newColorInput = colorInput.cloneNode(true);
      colorInput.parentNode.replaceChild(newColorInput, colorInput);
      newColorInput.dataset.initialized = "false";
    }

    if (hexInput.parentNode) {
      newHexInput = hexInput.cloneNode(true);
      hexInput.parentNode.replaceChild(newHexInput, hexInput);
      newHexInput.dataset.initialized = "false";
    }
  });
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
