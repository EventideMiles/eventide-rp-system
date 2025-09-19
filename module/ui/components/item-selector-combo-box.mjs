import { ItemSourceCollector } from "../../helpers/item-source-collector.mjs";

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
    console.log("ItemSelectorComboBox: Initializing...", {
      container: this.container,
      containerType: this.container?.constructor?.name,
      itemTypes: this.itemTypes,
      selectorType: this.selectorType
    });

    if (!this.container) {
      console.error("ItemSelectorComboBox: No container provided");
      return;
    }

    // Handle both native DOM elements and jQuery objects
    const containerElement = this.container.nodeType ? this.container : this.container[0];
    if (!containerElement) {
      console.error("ItemSelectorComboBox: Invalid container");
      return;
    }

    // Render the component template into the container
    const templatePath = "systems/eventide-rp-system/templates/components/item-selector-combo-box.hbs";
    const html = await renderTemplate(templatePath, this.getData());
    containerElement.innerHTML = html;

    // Cache DOM elements for performance (native DOM)
    this.element = containerElement.querySelector(".erps-item-selector-combo-box");
    this.input = this.element?.querySelector(".erps-item-selector-combo-box__input");
    this.dropdown = this.element?.querySelector(".erps-item-selector-combo-box__dropdown");
    this.list = this.element?.querySelector(".erps-item-selector-combo-box__list");
    this.loading = this.element?.querySelector(".erps-item-selector-combo-box__loading");
    this.empty = this.element?.querySelector(".erps-item-selector-combo-box__empty");
    this.dropdownArrow = this.element?.querySelector(".erps-item-selector-combo-box__dropdown-arrow");

    console.log("ItemSelectorComboBox: DOM elements found:", {
      element: !!this.element,
      input: !!this.input,
      dropdown: !!this.dropdown,
      list: !!this.list,
      loading: !!this.loading,
      empty: !!this.empty,
      dropdownArrow: !!this.dropdownArrow
    });

    if (!this.element || !this.input) {
      console.error("ItemSelectorComboBox: Required DOM elements not found");
      return;
    }

    // Attach event listeners
    this.attachEventListeners();

    // Load items initially
    await this.loadItems();

    console.log("ItemSelectorComboBox: Initialization complete");
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
      console.log("ItemSelectorComboBox: List click event:", event.target);
      const item = event.target.closest(".erps-item-selector-combo-box__item");
      if (item) {
        console.log("ItemSelectorComboBox: Found item element:", item);
        this.onItemClick(event, item);
      } else {
        console.log("ItemSelectorComboBox: No item element found for click");
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
    console.log("ItemSelectorComboBox: Starting to load items...", {
      itemTypes: this.itemTypes,
      selectorType: this.selectorType
    });

    this.showLoading(true);

    try {
      this.allItems = await ItemSourceCollector.getAllAccessibleItems(game.user, this.itemTypes);

      // For action items, filter out items with roll type "none"
      if (this.selectorType === "action-item") {
        console.log("ItemSelectorComboBox: Filtering action items by roll type...");
        this.allItems = await ItemSourceCollector.filterActionItemsByRollType(this.allItems);
        console.log(`ItemSelectorComboBox: After roll type filtering: ${this.allItems.length} items remain`);
      }

      this.filteredItems = [...this.allItems];

      console.log("ItemSelectorComboBox: Items loaded successfully", {
        totalItems: this.allItems.length,
        selectorType: this.selectorType,
        sampleItems: this.allItems.slice(0, 3).map(item => ({
          name: item.name,
          type: item.type,
          uuid: item.uuid,
          id: item.id
        }))
      });

      this.renderItems();
    } catch (error) {
      console.error("ItemSelectorComboBox: Failed to load items:", error);
      ui.notifications.error("Failed to load available items.");
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

    listItem.innerHTML = `
      <div class="erps-item-selector-combo-box__item-icon">
        <img src="${item.img}" alt="${item.name}" width="50" height="50">
      </div>
      <div class="erps-item-selector-combo-box__item-name">
        ${item.name}
      </div>
      <div class="erps-item-selector-combo-box__item-type">
        ${item.type}
      </div>
      <div class="erps-item-selector-combo-box__item-source">
        ${item.source}
      </div>
    `;

    return listItem;
  }

  /**
   * Show or hide the dropdown
   */
  setDropdownOpen(open) {
    console.log("ItemSelectorComboBox: Setting dropdown open:", open, "current items:", this.filteredItems.length);
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
    console.log("ItemSelectorComboBox: selectItem called with index:", index);
    console.log("ItemSelectorComboBox: filteredItems.length:", this.filteredItems.length);

    if (index < 0 || index >= this.filteredItems.length) {
      console.warn("ItemSelectorComboBox: Invalid index:", index);
      return;
    }

    const selectedItem = this.filteredItems[index];
    console.log("ItemSelectorComboBox: selectedItem:", selectedItem);

    if (!selectedItem) {
      console.error("ItemSelectorComboBox: No item found at index:", index);
      return;
    }

    // Get the actual Foundry document using UUID
    await this.selectItemByUuid(selectedItem.uuid);
  }

  /**
   * Select an item by UUID and pass the Foundry document to callback
   */
  async selectItemByUuid(uuid) {
    console.log("ItemSelectorComboBox: selectItemByUuid called with uuid:", uuid);

    if (!uuid) {
      console.error("ItemSelectorComboBox: No UUID provided");
      return;
    }

    try {
      // Get the actual Foundry document like drag-and-drop does
      const itemDoc = await fromUuid(uuid);
      if (!itemDoc) {
        console.error("ItemSelectorComboBox: No document found for UUID:", uuid);
        return;
      }

      console.log("ItemSelectorComboBox: Retrieved document:", itemDoc);

      // Pass the Foundry document to the callback (same as drag-and-drop)
      this.onSelect(itemDoc);
      this.setDropdownOpen(false);
      this.input.blur();

    } catch (error) {
      console.error("ItemSelectorComboBox: Failed to retrieve document:", error);
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

  onInputFocus(event) {
    console.log("ItemSelectorComboBox: Input focused");
    this.setDropdownOpen(true);
  }

  onInputBlur(event) {
    console.log("ItemSelectorComboBox: Input blurred");
    // Clear any existing blur timeout
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }

    // Longer delay to allow for item clicks and better focus detection
    this.blurTimeout = setTimeout(() => {
      // Check if any element within the combo box has focus
      if (!this.element.contains(document.activeElement) && this.isOpen) {
        console.log("ItemSelectorComboBox: Closing dropdown due to blur");
        this.setDropdownOpen(false);
      }
    }, 300);
  }

  onInputChange(event) {
    const searchText = this.input.value;
    console.log("ItemSelectorComboBox: Input changed:", searchText);

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce the search
    this.searchTimeout = setTimeout(() => {
      console.log("ItemSelectorComboBox: Filtering items for:", searchText);
      this.filterItems(searchText);
      if (!this.isOpen) {
        this.setDropdownOpen(true);
      }
    }, this.searchDebounceTime);
  }

  onInputKeydown(event) {
    console.log("ItemSelectorComboBox: Key pressed:", event.key);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        console.log("ItemSelectorComboBox: ArrowDown - isOpen:", this.isOpen, "filteredItems:", this.filteredItems.length);
        if (!this.isOpen) {
          this.setDropdownOpen(true);
        } else {
          this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredItems.length - 1);
          console.log("ItemSelectorComboBox: Selected index:", this.selectedIndex);
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

    console.log("ItemSelectorComboBox: onItemClick triggered");
    console.log("ItemSelectorComboBox: itemElement:", itemElement);
    console.log("ItemSelectorComboBox: itemElement.dataset:", itemElement.dataset);

    // Clear any pending blur timeouts that might close the dropdown
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }

    const index = parseInt(itemElement.dataset.index);
    const uuid = itemElement.dataset.itemUuid;
    console.log("ItemSelectorComboBox: parsed index:", index, "uuid:", uuid);

    // Try index-based selection first
    if (!isNaN(index)) {
      console.log("ItemSelectorComboBox: Using index-based selection");
      this.selectItem(index);
    } else if (uuid) {
      // Fallback to UUID-based selection
      console.log("ItemSelectorComboBox: Using UUID fallback");
      this.selectItemByUuid(uuid);
    } else {
      console.error("ItemSelectorComboBox: Neither index nor UUID available for selection");
    }
  }

  onItemHover(event, itemElement) {
    const index = parseInt(itemElement.dataset.index);
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
        console.log("ItemSelectorComboBox: Closing dropdown due to outside click");
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