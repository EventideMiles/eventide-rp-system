/**
 * Adds event listeners to chat messages for formula toggling
 */
export const initChatListeners = () => {
  // Add a hook for when chat messages are rendered
  Hooks.on("renderChatMessage", (message, html, data) => {
    // Find formula toggle elements
    const formulaToggle = html.find(".chat-card__formula-toggle");
    
    // Add click event listener
    formulaToggle.on("click", (event) => {
      const toggleElement = $(event.currentTarget);
      const rollContainer = toggleElement.closest(".chat-card__initiative, .chat-card__combat-roll");
      const rollDetails = rollContainer.find(".chat-card__roll-details");
      
      // Toggle the active class for the formula toggle
      toggleElement.toggleClass("active");
      
      // Toggle the visibility of the roll details
      if (rollDetails.is(":visible")) {
        rollDetails.slideUp(200);
      } else {
        rollDetails.slideDown(200);
      }
    });
  });
};
