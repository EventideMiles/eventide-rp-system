/**
 * Helper functions for enhanced number inputs
 * @module helpers/number-inputs
 */

/**
 * Initialize number inputs with increment/decrement buttons
 * @param {string} selector - The selector for the number input wrappers
 */
export function initNumberInputs(selector = '.base-form__number-input-wrapper') {
  // Use a slight delay to ensure the DOM is fully rendered
  setTimeout(() => {
    const numberInputWrappers = document.querySelectorAll(selector);
    
    numberInputWrappers.forEach(wrapper => {
      const input = wrapper.querySelector('input[type="number"]');
      const incrementBtn = wrapper.querySelector('.increment');
      const decrementBtn = wrapper.querySelector('.decrement');
      
      if (!input || !incrementBtn || !decrementBtn) return;
      
      // Clean up any previous event listeners
      wrapper.dataset.initialized = wrapper.dataset.initialized || "false";
      
      if (wrapper.dataset.initialized === "true") {
        incrementBtn.removeEventListener('click', handleIncrement);
        decrementBtn.removeEventListener('click', handleDecrement);
      }
      
      // Mark as initialized
      wrapper.dataset.initialized = "true";
      
      // Add the event listeners
      incrementBtn.addEventListener('click', handleIncrement);
      decrementBtn.addEventListener('click', handleDecrement);
      
      // Event handlers
      function handleIncrement() {
        const step = parseFloat(input.step || "1");
        const max = input.hasAttribute('max') ? parseFloat(input.max) : Infinity;
        const currentValue = parseFloat(input.value) || 0;
        const newValue = Math.min(currentValue + step, max);
        
        input.value = newValue;
        // Trigger change event to ensure any listeners update
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      function handleDecrement() {
        const step = parseFloat(input.step || "1");
        const min = input.hasAttribute('min') ? parseFloat(input.min) : -Infinity;
        const currentValue = parseFloat(input.value) || 0;
        const newValue = Math.max(currentValue - step, min);
        
        input.value = newValue;
        // Trigger change event to ensure any listeners update
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }, 100);
}

// Initialize number inputs when relevant hooks fire
Hooks.on('ready', () => {
  initNumberInputs();
});

// Initialize when relevant sheets render
Hooks.on('renderApplicationV2', (context, element, options) => {
  if (element.querySelector('.base-form__number-input-wrapper')) {
    initNumberInputs();
  }
});
