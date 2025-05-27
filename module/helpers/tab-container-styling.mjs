import { Logger } from "../services/_module.mjs";

/**
 * Tab Container Styling Manager
 *
 * Handles dynamic styling of tab containers based on the active tab.
 * Automatically applies border radius and other styling based on tab content.
 */

/**
 * Initialize tab container styling for a character sheet
 * @param {HTMLElement} element - The character sheet element
 */
export const initTabContainerStyling = (element) => {
  if (!element) {
    Logger.debug("No element provided for tab container styling", {}, "TAB_STYLING");
    return;
  }

  const tabsContainer = element.querySelector(".tabs");
  if (!tabsContainer) {
    Logger.debug("No tabs container found", {}, "TAB_STYLING");
    return;
  }

  // Set up initial styling based on current active tab
  updateTabContainerStyling(element);

  // Add event listener for tab changes
  tabsContainer.addEventListener("click", (event) => {
    const tabLink = event.target.closest('a[data-action="tab"]');
    if (tabLink) {
      // Use setTimeout to ensure the tab change has been processed
      setTimeout(() => {
        updateTabContainerStyling(element);
      }, 50);
    }
  });

  Logger.debug("Tab container styling initialized", {
    elementTag: element.tagName,
    hasTabsContainer: !!tabsContainer
  }, "TAB_STYLING");
};

/**
 * Update tab container styling based on the currently active tab
 * @param {HTMLElement} element - The character sheet element
 */
export const updateTabContainerStyling = (element) => {
  if (!element) return;

  const tabsContainer = element.querySelector(".tabs");
  if (!tabsContainer) return;

  // Find the currently active tab
  const activeTab = element.querySelector('.tab.active');
  if (!activeTab) return;

  const activeTabId = activeTab.getAttribute('data-tab');

  // Remove all existing tab-specific classes
  tabsContainer.classList.remove(
    'erps-tabs__container--rounded',
    'erps-tabs__container--flat'
  );

  // Apply styling based on the active tab
  switch (activeTabId) {
    case 'gear':
      // Gear tab has its own navigation, so round the container
      tabsContainer.classList.add('erps-tabs__container--rounded');
      Logger.debug("Applied rounded styling for gear tab", { activeTabId }, "TAB_STYLING");
      break;

    case 'features':
    case 'statuses':
    case 'combatPowers':
      // These tabs connect directly to data tables, so keep flat bottom
      tabsContainer.classList.add('erps-tabs__container--flat');
      Logger.debug("Applied flat styling for connected tab", { activeTabId }, "TAB_STYLING");
      break;

    case 'biography':
    default:
      // Biography and other tabs don't connect to data tables, so round them
      tabsContainer.classList.add('erps-tabs__container--rounded');
      Logger.debug("Applied rounded styling for standalone tab", { activeTabId }, "TAB_STYLING");
      break;
  }
};

/**
 * Clean up tab container styling event listeners
 * @param {HTMLElement} element - The character sheet element
 */
export const cleanupTabContainerStyling = (element) => {
  if (!element) {
    Logger.debug("No element provided for cleanup", {}, "TAB_STYLING");
    return;
  }

  const tabsContainer = element.querySelector(".tabs");
  if (tabsContainer) {
    // Clone the container to remove all event listeners
    const clone = tabsContainer.cloneNode(true);
    tabsContainer.parentNode.replaceChild(clone, tabsContainer);

    Logger.debug("Tab container styling cleaned up", {
      elementTag: element.tagName
    }, "TAB_STYLING");
  }
};
