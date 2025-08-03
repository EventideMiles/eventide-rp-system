/**
 * Image zoom service for chat card images
 * Provides modal overlay functionality for enlarging chat card images
 */
export class ImageZoomService {
  static OVERLAY_ID = 'erps-image-zoom-overlay';
  static BODY_CLASS = 'erps-image-zoom-active';
  
  /**
   * Initialize the image zoom functionality
   * Creates the overlay element and attaches keyboard listeners
   */
  static init() {
    this.createOverlay();
    this.attachKeyboardListeners();
  }
  
  /**
   * Create the zoom overlay element and attach event handlers
   * @private
   */
  static createOverlay() {
    // Check if overlay already exists
    if (document.getElementById(this.OVERLAY_ID)) return;
    
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.id = this.OVERLAY_ID;
    overlay.className = 'erps-image-zoom__overlay';
    overlay.innerHTML = `
      <div class="erps-image-zoom__container">
        <img class="erps-image-zoom__image" src="" alt="">
        <button class="erps-image-zoom__close" type="button" aria-label="Close">&times;</button>
      </div>
    `;
    
    // Append to body
    document.body.appendChild(overlay);
    
    // Attach click handlers
    overlay.addEventListener('click', (event) => {
      // Close if clicking on overlay background (not on container)
      if (event.target === overlay) {
        this.hideZoom();
      }
    });
    
    // Attach close button handler
    const closeButton = overlay.querySelector('.erps-image-zoom__close');
    closeButton.addEventListener('click', () => {
      this.hideZoom();
    });
    
    // Prevent container clicks from bubbling to overlay
    const container = overlay.querySelector('.erps-image-zoom__container');
    container.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  }
  
  /**
   * Show zoomed image in overlay
   * @param {string} imageSrc - Source URL of the image to display
   * @param {string} imageAlt - Alt text for the image
   */
  static showZoom(imageSrc, imageAlt = '') {
    const overlay = document.getElementById(this.OVERLAY_ID);
    if (!overlay) {
      console.warn('ImageZoomService: Overlay not initialized');
      return;
    }
    
    const image = overlay.querySelector('.erps-image-zoom__image');
    
    // Set image source and alt text
    image.src = imageSrc;
    image.alt = imageAlt;
    
    // Show overlay with transition
    globalThis.requestAnimationFrame(() => {
      overlay.classList.add('erps-image-zoom__overlay--visible');
    });
    
    // Prevent background scrolling
    document.body.classList.add(this.BODY_CLASS);
    
    // Focus the overlay for keyboard navigation
    overlay.focus();
  }
  
  /**
   * Hide the zoomed image overlay
   */
  static hideZoom() {
    const overlay = document.getElementById(this.OVERLAY_ID);
    if (!overlay) return;
    
    // Remove visible class to trigger transition
    overlay.classList.remove('erps-image-zoom__overlay--visible');
    
    // Restore background scrolling
    document.body.classList.remove(this.BODY_CLASS);
    
    // Clear image source after transition to prevent flashing
    setTimeout(() => {
      const image = overlay.querySelector('.erps-image-zoom__image');
      if (image && !overlay.classList.contains('erps-image-zoom__overlay--visible')) {
        image.src = '';
        image.alt = '';
      }
    }, 300); // Match CSS transition duration
  }
  
  /**
   * Attach keyboard event listeners for accessibility
   * @private
   */
  static attachKeyboardListeners() {
    document.addEventListener('keydown', (event) => {
      // Close on Escape key
      if (event.key === 'Escape') {
        const overlay = document.getElementById(this.OVERLAY_ID);
        if (overlay && overlay.classList.contains('erps-image-zoom__overlay--visible')) {
          event.preventDefault();
          this.hideZoom();
        }
      }
    });
  }
  
  /**
   * Check if the zoom overlay is currently visible
   * @returns {boolean} True if overlay is visible
   */
  static isVisible() {
    const overlay = document.getElementById(this.OVERLAY_ID);
    return overlay && overlay.classList.contains('erps-image-zoom__overlay--visible');
  }
  
  /**
   * Cleanup method to remove overlay and event listeners
   * Useful for module unloading or cleanup
   */
  static cleanup() {
    const overlay = document.getElementById(this.OVERLAY_ID);
    if (overlay) {
      overlay.remove();
    }
    
    // Remove body class if it exists
    document.body.classList.remove(this.BODY_CLASS);
  }
}