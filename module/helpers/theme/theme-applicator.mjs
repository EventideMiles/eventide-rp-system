import { Logger } from "../../services/_module.mjs";
import { CommonFoundryTasks } from "../../utils/_module.mjs";

/**
 * Apply global theme to body element for global UI elements
 * @param {string} theme - The theme to apply
 * @param {string} [appId] - Optional app ID for logging context
 */
export const applyGlobalTheme = (theme, appId = null) => {
  if (document.body) {
    const currentBodyTheme = document.body.getAttribute("data-theme");

    // Only update if different to avoid unnecessary DOM manipulation
    if (currentBodyTheme !== theme) {
      document.body.setAttribute("data-theme", theme);

      Logger.debug(
        "Global theme applied to body",
        {
          appId,
          previousTheme: currentBodyTheme,
          newTheme: theme,
        },
        "THEME_MANAGER",
      );
    }
  }
};

/**
 * Fast, synchronous theme application to prevent flashing
 * This should be called immediately when an element is available, before async operations
 * @param {Element} element - The element to apply themes to
 * @param {string} [theme] - Theme to apply (defaults to current user theme or 'blue' fallback)
 * @param {Object} [options] - Theme application options
 * @param {string} [options.backgroundSelector=".eventide-sheet"] - Background selector
 * @param {string} [options.backgroundAttribute="data-bg-theme"] - Background attribute
 */
export const applyThemeImmediate = (element, theme = null, options = {}) => {
  if (!element) return;

  // Get current theme if not provided (retrieveSheetTheme handles null game.user)
  const currentTheme = theme || CommonFoundryTasks.retrieveSheetTheme();

  const {
    backgroundSelector = ".eventide-sheet",
    backgroundAttribute = "data-bg-theme",
  } = options;

  // Apply to the element itself if it matches the background selector
  if (element.matches && element.matches(backgroundSelector)) {
    element.setAttribute(backgroundAttribute, currentTheme);
  }

  // Apply to child elements that match the background selector
  const backgroundElements = element.querySelectorAll(backgroundSelector);
  backgroundElements.forEach((bgElement) => {
    bgElement.setAttribute(backgroundAttribute, currentTheme);
  });

  // Apply global theme to body
  applyGlobalTheme(currentTheme);

  Logger.debug(
    "Immediate theme applied",
    {
      theme: currentTheme,
      elementsUpdated:
        backgroundElements.length +
        (element.matches && element.matches(backgroundSelector) ? 1 : 0),
    },
    "THEME_MANAGER",
  );
};

/**
 * Inject immediate theme styles into the document head to prevent flashing
 * This should be called as early as possible, ideally in the document head
 * @param {string} [theme] - Theme to apply (defaults to current user theme or 'blue' fallback)
 */
export const injectImmediateThemeStyles = (theme = null) => {
  // Get current theme if not provided (retrieveSheetTheme handles null game.user)
  const currentTheme = theme || CommonFoundryTasks.retrieveSheetTheme();

  // Check if we already have an immediate theme style tag
  const existingStyle = document.getElementById("eventide-immediate-theme");
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create a style element with immediate theme application
  const styleElement = document.createElement("style");
  styleElement.id = "eventide-immediate-theme";
  styleElement.textContent = `
    /* Immediate theme application to prevent flashing */
    .eventide-sheet:not([data-bg-theme]) {
      opacity: 0 !important;
      transition: opacity 0.1s ease-in-out !important;
    }

    .eventide-sheet[data-bg-theme] {
      opacity: 1 !important;
    }

    /* Apply user's preferred theme immediately */
    .eventide-sheet[data-bg-theme="${currentTheme}"] {
      opacity: 1 !important;
    }
  `;

  // Insert at the beginning of head to ensure it loads first
  document.head.insertBefore(styleElement, document.head.firstChild);

  Logger.debug(
    "Immediate theme styles injected",
    {
      theme: currentTheme,
      styleElementId: styleElement.id,
    },
    "THEME_MANAGER",
  );
};

/**
 * Remove immediate theme styles (call after full theme system is loaded)
 */
export const removeImmediateThemeStyles = () => {
  const existingStyle = document.getElementById("eventide-immediate-theme");
  if (existingStyle) {
    existingStyle.remove();
    Logger.debug("Immediate theme styles removed", {}, "THEME_MANAGER");
  }
};

/**
 * Apply theme to elements matching a selector
 * @param {Element} rootElement - Root element to search within
 * @param {string} selector - CSS selector for target elements
 * @param {string} attribute - Data attribute to set
 * @param {string} theme - Theme value to apply
 * @param {string} type - Type of theme for logging
 * @param {string} [appId] - Optional app ID for logging context
 */
export const applyThemeToSelector = (
  rootElement,
  selector,
  attribute,
  theme,
  type,
  appId = null,
) => {
  // Skip empty selectors
  if (!selector || selector.trim() === "") {
    Logger.debug(
      `Skipping ${type} theme - empty selector`,
      {
        appId,
        selector,
        attribute,
      },
      "THEME_MANAGER",
    );
    return;
  }

  const elements = rootElement.querySelectorAll(selector);

  // Also check if the root element matches the selector
  const rootMatches = rootElement.matches && rootElement.matches(selector);
  const allElements = rootMatches ? [rootElement, ...elements] : [...elements];

  if (allElements.length === 0) {
    Logger.debug(
      `No elements found for ${type} theme`,
      {
        appId,
        selector,
        attribute,
      },
      "THEME_MANAGER",
    );
    return;
  }

  let updatedCount = 0;
  allElements.forEach((element, index) => {
    const currentValue = element.getAttribute(attribute);

    // Only update if different to avoid unnecessary DOM manipulation
    if (currentValue !== theme) {
      element.setAttribute(attribute, theme);
      updatedCount++;

      Logger.debug(
        `${type} theme applied`,
        {
          appId,
          elementIndex: index,
          previousTheme: currentValue,
          newTheme: theme,
          attribute,
        },
        "THEME_MANAGER",
      );
    }
  });

  if (updatedCount > 0) {
    Logger.debug(
      `Updated ${updatedCount} ${type} theme elements`,
      {
        appId,
        totalElements: allElements.length,
        theme,
      },
      "THEME_MANAGER",
    );
  }
};

/**
 * Apply multiple theme selectors to an element
 * @param {Element} rootElement - Root element to apply themes to
 * @param {Array} themeSelectors - Array of theme selector configurations
 * @param {string} theme - Theme to apply
 * @param {string} [appId] - Optional app ID for logging context
 */
export const applyMultipleThemes = (
  rootElement,
  themeSelectors,
  theme,
  appId = null,
) => {
  if (!rootElement || !Array.isArray(themeSelectors)) {
    Logger.warn(
      "Invalid parameters for applying multiple themes",
      {
        appId,
        hasRootElement: !!rootElement,
        themeSelectorsType: typeof themeSelectors,
      },
      "THEME_MANAGER",
    );
    return;
  }

  themeSelectors.forEach(({ selector, attribute, type }) => {
    applyThemeToSelector(rootElement, selector, attribute, theme, type, appId);
  });

  Logger.debug(
    "Multiple themes applied",
    {
      appId,
      theme,
      selectorCount: themeSelectors.length,
    },
    "THEME_MANAGER",
  );
};

/**
 * Remove theme attributes from elements
 * @param {Element} rootElement - Root element to search within
 * @param {string} selector - CSS selector for target elements
 * @param {string} attribute - Data attribute to remove
 * @param {string} type - Type of theme for logging
 * @param {string} [appId] - Optional app ID for logging context
 */
export const removeThemeFromSelector = (
  rootElement,
  selector,
  attribute,
  type,
  appId = null,
) => {
  if (!selector || selector.trim() === "") {
    return;
  }

  const elements = rootElement.querySelectorAll(selector);
  const rootMatches = rootElement.matches && rootElement.matches(selector);
  const allElements = rootMatches ? [rootElement, ...elements] : [...elements];

  let removedCount = 0;
  allElements.forEach((element) => {
    if (element.hasAttribute(attribute)) {
      element.removeAttribute(attribute);
      removedCount++;
    }
  });

  if (removedCount > 0) {
    Logger.debug(
      `Removed ${type} theme from ${removedCount} elements`,
      {
        appId,
        totalElements: allElements.length,
        attribute,
      },
      "THEME_MANAGER",
    );
  }
};

/**
 * Verify theme application on elements
 * @param {Element} rootElement - Root element to search within
 * @param {string} selector - CSS selector for target elements
 * @param {string} attribute - Data attribute to check
 * @param {string} expectedTheme - Expected theme value
 * @param {string} type - Type of theme for logging
 * @param {string} [appId] - Optional app ID for logging context
 * @returns {boolean} Whether verification passed
 */
export const verifyThemeApplication = (
  rootElement,
  selector,
  attribute,
  expectedTheme,
  type,
  appId = null,
) => {
  if (!selector || selector.trim() === "") {
    return true;
  }

  const elements = rootElement.querySelectorAll(selector);
  const rootMatches = rootElement.matches && rootElement.matches(selector);
  const allElements = rootMatches ? [rootElement, ...elements] : [...elements];

  if (allElements.length === 0) {
    return true;
  }

  let verificationPassed = true;
  const failedElements = [];

  allElements.forEach((element, index) => {
    const appliedTheme = element.getAttribute(attribute);
    if (appliedTheme !== expectedTheme) {
      verificationPassed = false;
      failedElements.push({
        index,
        appliedTheme,
        expectedTheme,
      });
    }
  });

  if (!verificationPassed) {
    Logger.warn(
      `${type} theme verification failed`,
      {
        appId,
        selector,
        attribute,
        expectedTheme,
        failedElements,
        totalElements: allElements.length,
      },
      "THEME_MANAGER",
    );
  } else {
    Logger.debug(
      `${type} theme verification passed`,
      {
        appId,
        expectedTheme,
        elementsChecked: allElements.length,
      },
      "THEME_MANAGER",
    );
  }

  return verificationPassed;
};
