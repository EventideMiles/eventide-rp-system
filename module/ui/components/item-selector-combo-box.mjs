import { ItemSourceCollector } from "../../helpers/item-source-collector.mjs";
import { Logger } from "../../services/logger.mjs";

/**
 * Reusable combo box component for selecting items from various sources
 */
export class ItemSelectorComboBox {
  constructor(options = {}) {
    this.container = options.container;
    this.itemTypes = options.itemTypes || [];
    this.onSelect = options.onSelect || (() => {});
    this.placeholder = options.placeholder || "Search for items...";
    this.selectorType = options.selectorType || "generic";

    this.allItems = [];
    this.filteredItems = [];
    this.selectedIndex = -1;
    this.isOpen = false;
    this.isLoading = false;

    // Debounce search to improve performance
    this.searchDebounceTime = 300;
    this.searchTimeout = null;
    this.blurTimeout = null;

    // DOM elements will be stored here after initialization
    this.element = null;
    this.input = null;
    this.dropdown = null;
    this.list = null;
    this.loading = null;
    this.empty = null;
    this.dropdownArrow = null;

    // Initialize the component
    this.init();
  }

  getData() {
    return {
      selectorType: this.selectorType,
      placeholder: this.placeholder,
      ariaLabel: this.placeholder
    };
  }

  /**
   * Initialize the combo box component
   */
  async init() {
    Logger.debug("Initializing item selector combo box", {
      container: this.container,
      containerType: this.container?.constructor?.name,
      itemTypes: this.itemTypes,
      selectorType: this.selectorType
    }, "ITEM_SELECTOR");

    if (!this.container) {
      Logger.error("No container provided", null, "ItemSelectorComboBox");
      return;
    }

    // Handle both native DOM elements and jQuery objects
    const containerElement = this.container.nodeType ? this.container : this.container[0];
    if (!containerElement) {
      Logger.error("Invalid container", null, "ItemSelectorComboBox");
      return;
    }

    // Render the component template into the container
    const templatePath = "systems/eventide-rp-system/templates/components/item-selector-combo-box.hbs";
    const html = await foundry.applications.handlebars.renderTemplate(templatePath, this.getData());
    containerElement.innerHTML = html;

    // Cache DOM elements for performance (native DOM)
    this.element = containerElement.querySelector(".erps-item-selector-combo-box");
    this.input = this.element?.querySelector(".erps-item-selector-combo-box__input");
    this.dropdown = this.element?.querySelector(".erps-item-selector-combo-box__dropdown");
    this.list = this.element?.querySelector(".erps-item-selector-combo-box__list");
    this.loading = this.element?.querySelector(".erps-item-selector-combo-box__loading");
    this.empty = this.element?.querySelector(".erps-item-selector-combo-box__empty");
    this.dropdownArrow = this.element?.querySelector(".erps-item-selector-combo-box__dropdown-arrow");


    if (!this.element || !this.input) {
      Logger.error("Required DOM elements not found", null, "ItemSelectorComboBox");
      return;
    }

    // Attach event listeners
    this.attachEventListeners();

    // Load items initially
    await this.loadItems();

  }

  /**
   * Attach all event listeners
   */
  attachEventListeners() {
    // Store bound event handlers for proper cleanup
    this.boundInputFocus = this.onInputFocus.bind(this);
    this.boundInputBlur = this.onInputBlur.bind(this);
    this.boundInputChange = this.onInputChange.bind(this);
    this.boundInputKeydown = this.onInputKeydown.bind(this);
    this.boundDropdownArrowClick = this.onDropdownArrowClick.bind(this);
    this.boundDocumentClick = this.onDocumentClick.bind(this);

    // Input events
    this.input.addEventListener("focus", this.boundInputFocus);
    this.input.addEventListener("blur", this.boundInputBlur);
    this.input.addEventListener("input", this.boundInputChange);
    this.input.addEventListener("keydown", this.boundInputKeydown);

    // Dropdown arrow click
    if (this.dropdownArrow) {
      this.dropdownArrow.addEventListener("click", this.boundDropdownArrowClick);
    }

    // List item clicks (delegated with capture to ensure we get it first)
    this.boundListClick = (event) => {
      const item = event.target.closest(".erps-item-selector-combo-box__item");
      if (item) {
        this.onItemClick(event, item);
      }
    };
    this.list.addEventListener("click", this.boundListClick, true); // Use capture phase

    // List item hover (delegated)
    this.boundListHover = (event) => {
      const item = event.target.closest(".erps-item-selector-combo-box__item");
      if (item) {
        this.onItemHover(event, item);
      }
    };
    this.list.addEventListener("mouseenter", this.boundListHover, true);

    // Close dropdown when clicking outside
    document.addEventListener("click", this.boundDocumentClick);
  }

  /**
   * Load all available items based on item types
   */
  async loadItems() {
    Logger.debug("Starting to load items", {
      itemTypes: this.itemTypes,
      selectorType: this.selectorType
    }, "ITEM_SELECTOR");

    this.showLoading(true);

    try {
      this.allItems = await ItemSourceCollector.getAllAccessibleItems(game.user, this.itemTypes);

      // For action items, filter out items with roll type "none"
      if (this.selectorType === "action-item") {
        this.allItems = await ItemSourceCollector.filterActionItemsByRollType(this.allItems);
      }

      this.filteredItems = [...this.allItems];


      this.renderItems();
    } catch (error) {
      Logger.error("Failed to load items", error, "ItemSelectorComboBox");
      ui.notifications.error(game.i18n.localize("EVENTIDE_RP_SYSTEM.UI.FailedToLoadItems"));
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Filter items based on search text
   */
  filterItems(searchText) {
    this.filteredItems = ItemSourceCollector.filterItems(this.allItems, searchText);
    this.selectedIndex = -1; // Reset selection
    this.renderItems();
  }

  /**
   * Render the filtered items in the dropdown
   */
  renderItems() {
    this.list.innerHTML = "";

    if (this.filteredItems.length === 0) {
      this.showEmpty(true);
      return;
    }

    this.showEmpty(false);

    // Limit items for performance (virtual scrolling could be added later)
    const maxItems = 100;
    const itemsToShow = this.filteredItems.slice(0, maxItems);

    for (let i = 0; i < itemsToShow.length; i++) {
      const item = itemsToShow[i];
      const listItem = this.createItemElement(item, i);
      this.list.appendChild(listItem);
    }

    if (this.filteredItems.length > maxItems) {
      const moreItem = document.createElement("li");
      moreItem.className = "erps-item-selector-combo-box__more";
      moreItem.innerHTML = `
        <div class="erps-item-selector-combo-box__more-content">
          <i class="fas fa-ellipsis-h"></i>
          <span>... and ${this.filteredItems.length - maxItems} more items</span>
        </div>
      `;
      this.list.appendChild(moreItem);
    }
  }

  /**
   * Create a DOM element for a single item
   */
  createItemElement(item, index) {
    const listItem = document.createElement("li");
    listItem.className = "erps-item-selector-combo-box__item";
    listItem.setAttribute("data-index", index);
    listItem.setAttribute("data-item-id", item.id);
    listItem.setAttribute("data-item-uuid", item.uuid);
    listItem.setAttribute("role", "option");
    listItem.setAttribute("aria-selected", "false");

    // Create icon container
    const iconDiv = document.createElement("div");
    iconDiv.className = "erps-item-selector-combo-box__item-icon";
    const img = document.createElement("img");
    img.src = item.img;
    img.alt = item.name;
    img.width = 50;
    img.height = 50;
    iconDiv.appendChild(img);

    // Create name element with textContent (auto-escapes)
    const nameDiv = document.createElement("div");
    nameDiv.className = "erps-item-selector-combo-box__item-name";
    nameDiv.textContent = item.name;

    // Create type element
    const typeDiv = document.createElement("div");
    typeDiv.className = "erps-item-selector-combo-box__item-type";
    typeDiv.textContent = item.type;

    // Create source element
    const sourceDiv = document.createElement("div");
    sourceDiv.className = "erps-item-selector-combo-box__item-source";
    sourceDiv.textContent = item.source;

    listItem.appendChild(iconDiv);
    listItem.appendChild(nameDiv);
    listItem.appendChild(typeDiv);
    listItem.appendChild(sourceDiv);

    return listItem;
  }

  /**
   * Show or hide the dropdown
   */
  setDropdownOpen(open) {
    this.isOpen = open;
    this.dropdown.setAttribute("aria-hidden", !open);
    this.input.setAttribute("aria-expanded", open);

    if (open) {
      this.dropdown.style.display = "";
      this.element.classList.add("erps-item-selector-combo-box--open");
    } else {
      this.dropdown.style.display = "none";
      this.element.classList.remove("erps-item-selector-combo-box--open");
      this.selectedIndex = -1;
      this.updateSelection();
    }
  }

  /**
   * Update visual selection highlighting
   */
  updateSelection() {
    const items = this.list.querySelectorAll(".erps-item-selector-combo-box__item");
    items.forEach((element, index) => {
      const isSelected = index === this.selectedIndex;
      element.classList.toggle("erps-item-selector-combo-box__item--selected", isSelected);
      element.setAttribute("aria-selected", isSelected);
    });
  }

  /**
   * Select an item by index
   */
  async selectItem(index) {

    if (index < 0 || index >= this.filteredItems.length) {
      Logger.warn("Invalid index provided for item selection", { index, maxIndex: this.filteredItems.length - 1 }, "ITEM_SELECTOR");
      return;
    }

    const selectedItem = this.filteredItems[index];

    if (!selectedItem) {
      Logger.error("No item found at index", { index }, "ITEM_SELECTOR");
      return;
    }

    // Get the actual Foundry document using UUID
    await this.selectItemByUuid(selectedItem.uuid);
  }

  /**
   * Select an item by UUID and pass the Foundry document to callback
   */
  async selectItemByUuid(uuid) {

    if (!uuid) {
      Logger.error("No UUID provided", null, "ItemSelectorComboBox");
      return;
    }

    try {
      // Get the actual Foundry document like drag-and-drop does
      const itemDoc = await fromUuid(uuid);
      if (!itemDoc) {
        Logger.error("No document found for UUID", { uuid }, "ITEM_SELECTOR");
        return;
      }


      // Pass the Foundry document to the callback (same as drag-and-drop)
      this.onSelect(itemDoc);
      this.setDropdownOpen(false);
      this.input.blur();

    } catch (error) {
      Logger.error("Failed to retrieve document", { error }, "ITEM_SELECTOR");
    }
  }

  /**
   * Show or hide loading state
   */
  showLoading(show) {
    this.isLoading = show;
    this.loading.style.display = show ? "" : "none";
    this.list.style.display = show ? "none" : "";
    this.empty.style.display = "none";
  }

  /**
   * Show or hide empty state
   */
  showEmpty(show) {
    this.empty.style.display = show ? "" : "none";
    this.list.style.display = show ? "none" : "";
  }

  // Event Handlers

  onInputFocus(_event) {
    this.setDropdownOpen(true);
  }

  onInputBlur(_event) {
    // Clear any existing blur timeout
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }

    // Longer delay to allow for item clicks and better focus detection
    this.blurTimeout = setTimeout(() => {
      // Check if any element within the combo box has focus
      if (!this.element.contains(document.activeElement) && this.isOpen) {
        this.setDropdownOpen(false);
      }
    }, 300);
  }

  onInputChange(_event) {
    const searchText = this.input.value;

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce the search
    this.searchTimeout = setTimeout(() => {
      this.filterItems(searchText);
      if (!this.isOpen) {
        this.setDropdownOpen(true);
      }
    }, this.searchDebounceTime);
  }

  onInputKeydown(event) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!this.isOpen) {
          this.setDropdownOpen(true);
        } else {
          this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredItems.length - 1);
          this.updateSelection();
        }
        break;

      case "ArrowUp":
        event.preventDefault();
        if (this.isOpen) {
          this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
          this.updateSelection();
        }
        break;

      case "Enter":
        event.preventDefault();
        if (this.isOpen && this.selectedIndex >= 0) {
          this.selectItem(this.selectedIndex);
        }
        break;

      case "Escape":
        event.preventDefault();
        this.setDropdownOpen(false);
        break;

      case "Tab":
        this.setDropdownOpen(false);
        break;
    }
  }

  onDropdownArrowClick(event) {
    event.preventDefault();
    this.setDropdownOpen(!this.isOpen);
    this.input.focus();
  }

  onItemClick(event, itemElement) {
    // Prevent event from bubbling up and causing conflicts
    event.preventDefault();
    event.stopPropagation();


    // Clear any pending blur timeouts that might close the dropdown
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }

    const index = parseInt(itemElement.dataset.index, 10);
    const uuid = itemElement.dataset.itemUuid;

    // Try index-based selection first
    if (!isNaN(index)) {
      this.selectItem(index);
    } else if (uuid) {
      // Fallback to UUID-based selection
      this.selectItemByUuid(uuid);
    } else {
      Logger.error("Neither index nor UUID available for selection", null, "ItemSelectorComboBox");
    }
  }

  onItemHover(event, itemElement) {
    const index = parseInt(itemElement.dataset.index, 10);
    this.selectedIndex = index;
    this.updateSelection();
  }

  onDocumentClick(event) {
    // Don't close if clicking within the combo box
    if (this.element.contains(event.target)) {
      return;
    }

    // Add a small delay to allow other event handlers to process first
    setTimeout(() => {
      if (this.isOpen) {
        this.setDropdownOpen(false);
      }
    }, 50);
  }

  /**
   * Clean up event listeners and resources
   */
  destroy() {
    // Clear all timeouts
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }

    // Remove event listeners using stored bound functions
    if (this.boundDocumentClick) {
      document.removeEventListener("click", this.boundDocumentClick);
    }

    if (this.input) {
      if (this.boundInputFocus) this.input.removeEventListener("focus", this.boundInputFocus);
      if (this.boundInputBlur) this.input.removeEventListener("blur", this.boundInputBlur);
      if (this.boundInputChange) this.input.removeEventListener("input", this.boundInputChange);
      if (this.boundInputKeydown) this.input.removeEventListener("keydown", this.boundInputKeydown);
    }

    if (this.dropdownArrow && this.boundDropdownArrowClick) {
      this.dropdownArrow.removeEventListener("click", this.boundDropdownArrowClick);
    }

    if (this.list) {
      if (this.boundListClick) this.list.removeEventListener("click", this.boundListClick);
      if (this.boundListHover) this.list.removeEventListener("mouseenter", this.boundListHover);
    }

    // Clear bound function references
    this.boundInputFocus = null;
    this.boundInputBlur = null;
    this.boundInputChange = null;
    this.boundInputKeydown = null;
    this.boundDropdownArrowClick = null;
    this.boundDocumentClick = null;
    this.boundListClick = null;
    this.boundListHover = null;
  }
}