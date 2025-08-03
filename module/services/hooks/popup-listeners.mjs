/**
 * @file Contains all popup-related listeners and event hooks for the Eventide RP System
 * @module helpers/popup-listeners
 */

import { Logger } from "../logger.mjs";
import { ImageZoomService } from "../image-zoom.mjs";

/**
 * Initializes all popup-related event listeners for the Eventide RP System
 *
 * Sets up hooks for popup rendering to add image zoom functionality to form images.
 *
 * @function
 */
export const initPopupListeners = () => {
  setupPopupRendering();
};

/**
 * Set up popup rendering hooks
 *
 * @private
 */
const setupPopupRendering = () => {
  Hooks.on("renderApplicationV2", (app, html, _data) => {
    // Only process popup applications, not all ApplicationV2 instances
    if (app.constructor.name.includes("Popup") || 
        app.element?.classList?.contains("popup") ||
        html?.querySelector?.(".erps-form__image")) {
      addPopupImageZoomFunctionality(html);
    }
  });
};

/**
 * Add image zoom functionality to popup form images
 *
 * @private
 * @param {HTMLElement} html - The popup HTML element
 */
const addPopupImageZoomFunctionality = (html) => {
  // Find all form images in the popup
  const formImages = html.querySelectorAll(".erps-form__image");

  // Add click event listener for image zoom
  formImages.forEach((image) => {
    image.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const imageSrc = image.src;
      const imageAlt = image.alt || 
                       image.closest('.erps-form')?.querySelector('[name="name"]')?.value || 
                       'Popup form image';

      // Show the zoomed image
      ImageZoomService.showZoom(imageSrc, imageAlt);
    });

    // Add title attribute for better UX
    if (!image.title) {
      image.title = 'Click to enlarge';
    }

    // Add CSS class to indicate the image is clickable
    image.classList.add('erps-form__image--zoomable');
  });
};

/**
 * Set up popup listeners
 */
export const setupPopupListeners = () => {
  Logger.methodEntry("PopupListeners", "setupPopupListeners");

  setupPopupRendering();

  Logger.methodExit("PopupListeners", "setupPopupListeners", 0);
};

/**
 * Clean up popup listener resources
 */
export const cleanupPopupListeners = () => {
  // No specific cleanup needed for now
};