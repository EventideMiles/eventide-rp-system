import { Logger } from "./logger.mjs";

/**
 * Image zoom service for chat card images
 * Provides modal overlay functionality for enlarging chat card images
 */
export class ImageZoomService {
  static OVERLAY_ID = "erps-image-zoom-overlay";
  static BODY_CLASS = "erps-image-zoom-active";

  // Configuration for image sizing constraints
  static MAX_VIEWPORT_PERCENTAGE = 0.8; // Maximum 80% of viewport
  static MAX_ZOOM_SCALE = 1.0; // Don't enlarge beyond original size
  static MIN_SIZE = 200; // Minimum size in pixels

  /**
   * Initialize the image zoom functionality
   * Creates the overlay element and attaches keyboard listeners
   */
  static init() {
    this.createOverlay();
    this.attachKeyboardListeners();
    this.attachResizeListener();
  }

  /**
   * Create the zoom overlay element and attach event handlers
   * @private
   */
  static createOverlay() {
    // Check if overlay already exists
    if (document.getElementById(this.OVERLAY_ID)) return;

    // Create overlay element
    const overlay = document.createElement("div");
    overlay.id = this.OVERLAY_ID;
    overlay.className = "erps-image-zoom__overlay";
    overlay.innerHTML = `
      <div class="erps-image-zoom__container">
        <img class="erps-image-zoom__image" src="" alt="">
        <button class="erps-image-zoom__close" type="button" aria-label="Close">&times;</button>
      </div>
    `;

    // Append to body
    document.body.appendChild(overlay);

    // Attach click handlers
    overlay.addEventListener("click", (event) => {
      // Close if clicking on overlay background (not on container)
      if (event.target === overlay) {
        this.hideZoom();
      }
    });

    // Attach close button handler
    const closeButton = overlay.querySelector(".erps-image-zoom__close");
    closeButton.addEventListener("click", () => {
      this.hideZoom();
    });

    // Prevent container clicks from bubbling to overlay
    const container = overlay.querySelector(".erps-image-zoom__container");
    container.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  /**
   * Show zoomed image in overlay
   * @param {string} imageSrc - Source URL of the image to display
   * @param {string} imageAlt - Alt text for the image
   */
  static showZoom(imageSrc, imageAlt = "") {
    const overlay = document.getElementById(this.OVERLAY_ID);
    if (!overlay) {
      Logger.warn("Overlay not initialized", null, "ImageZoomService");
      return;
    }

    const image = overlay.querySelector(".erps-image-zoom__image");

    // Clear any existing event handlers to prevent conflicts
    image.onload = null;
    image.onerror = null;

    // Set image source and alt text
    image.src = imageSrc;
    image.alt = imageAlt;

    // Wait for image to load to get natural dimensions
    image.onload = () => {
      // Only proceed if overlay should still be showing (prevent race conditions)
      if (image.src === imageSrc) {
        this.applySizeConstraints(image);
      }
    };

    // Handle load errors
    image.onerror = () => {
      // Only show warning if this is still the intended image
      if (image.src === imageSrc) {
        Logger.warn("Failed to load image", imageSrc, "ImageZoomService");
      }
    };

    // Show overlay immediately (sizing will be applied when image loads)
    globalThis.requestAnimationFrame(() => {
      overlay.classList.add("erps-image-zoom__overlay--visible");
    });

    // Prevent background scrolling
    document.body.classList.add(this.BODY_CLASS);

    // Focus the overlay for keyboard navigation
    overlay.focus();
  }

  /**
   * Apply size constraints to prevent images from being too large for the window
   * @param {HTMLImageElement} image - The image element to constrain
   * @private
   */
  static applySizeConstraints(image) {
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;

    // Get current viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate maximum allowed dimensions based on viewport percentage
    const maxWidth = viewportWidth * this.MAX_VIEWPORT_PERCENTAGE;
    const maxHeight = viewportHeight * this.MAX_VIEWPORT_PERCENTAGE;

    // Don't enlarge images beyond their natural size (unless they're very small)
    const constrainedMaxWidth = Math.min(
      maxWidth,
      naturalWidth * this.MAX_ZOOM_SCALE,
    );
    const constrainedMaxHeight = Math.min(
      maxHeight,
      naturalHeight * this.MAX_ZOOM_SCALE,
    );

    // Ensure minimum size for very small images
    const finalMaxWidth = Math.max(constrainedMaxWidth, this.MIN_SIZE);
    const finalMaxHeight = Math.max(constrainedMaxHeight, this.MIN_SIZE);

    // Apply calculated constraints
    image.style.maxWidth = `${finalMaxWidth}px`;
    image.style.maxHeight = `${finalMaxHeight}px`;

    // Log for debugging (can be removed in production)
    console.info("ImageZoomService: Applied size constraints", {
      natural: { width: naturalWidth, height: naturalHeight },
      viewport: { width: viewportWidth, height: viewportHeight },
      applied: { maxWidth: finalMaxWidth, maxHeight: finalMaxHeight },
    });
  }

  /**
   * Hide the zoomed image overlay
   */
  static hideZoom() {
    const overlay = document.getElementById(this.OVERLAY_ID);
    if (!overlay) return;

    // Remove visible class to trigger transition
    overlay.classList.remove("erps-image-zoom__overlay--visible");

    // Restore background scrolling
    document.body.classList.remove(this.BODY_CLASS);

    // Clear image source and reset styles after transition to prevent flashing
    setTimeout(() => {
      const image = overlay.querySelector(".erps-image-zoom__image");
      if (
        image &&
        !overlay.classList.contains("erps-image-zoom__overlay--visible")
      ) {
        // Clear event handlers first to prevent them from firing when we clear src
        image.onload = null;
        image.onerror = null;
        // Clear image data
        image.src = "";
        image.alt = "";
        // Reset inline styles to use CSS defaults
        image.style.maxWidth = "";
        image.style.maxHeight = "";
      }
    }, 300); // Match CSS transition duration
  }

  /**
   * Attach keyboard event listeners for accessibility
   * @private
   */
  static attachKeyboardListeners() {
    document.addEventListener("keydown", (event) => {
      // Close on Escape key
      if (event.key === "Escape") {
        const overlay = document.getElementById(this.OVERLAY_ID);
        if (
          overlay &&
          overlay.classList.contains("erps-image-zoom__overlay--visible")
        ) {
          event.preventDefault();
          this.hideZoom();
        }
      }
    });
  }

  /**
   * Attach window resize listener to recalculate image constraints
   * @private
   */
  static attachResizeListener() {
    let resizeTimeout;
    window.addEventListener("resize", () => {
      // Debounce resize events to avoid excessive recalculations
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const overlay = document.getElementById(this.OVERLAY_ID);
        if (
          overlay &&
          overlay.classList.contains("erps-image-zoom__overlay--visible")
        ) {
          const image = overlay.querySelector(".erps-image-zoom__image");
          if (image && image.src) {
            this.applySizeConstraints(image);
          }
        }
      }, 150); // 150ms debounce
    });
  }

  /**
   * Check if the zoom overlay is currently visible
   * @returns {boolean} True if overlay is visible
   */
  static isVisible() {
    const overlay = document.getElementById(this.OVERLAY_ID);
    return (
      overlay && overlay.classList.contains("erps-image-zoom__overlay--visible")
    );
  }

  /**
   * Cleanup method to remove overlay and event listeners
   * Useful for module unloading or cleanup
   */
  static cleanup() {
    const overlay = document.getElementById(this.OVERLAY_ID);
    if (overlay) {
      const image = overlay.querySelector(".erps-image-zoom__image");
      if (image) {
        // Clear event handlers to prevent memory leaks
        image.onload = null;
        image.onerror = null;
      }
      overlay.remove();
    }

    // Remove body class if it exists
    document.body.classList.remove(this.BODY_CLASS);
  }
}
