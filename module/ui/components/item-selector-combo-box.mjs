import { ItemSourceCollector } from "../../helpers/item-source-collector.mjs";
import { Logger } from "../../services/logger.mjs";

/**
 * Reusable combo box component for selecting items from various sources.
 * Scope filtering is handled externally by ItemScopeSelector.
 */
export class ItemSelectorComboBox {
  constructor(options = {}) {
    this.container = options.container;
    this.itemTypes = options.itemTypes || [];
    this.onSelect = options.onSelect || (() => {});
    this.placeholder = options.placeholder || "Search for items...";
    this.selectorType = options.selectorType || "generic";
    this.scopes = options.scopes || null;
    this.parentActor = options.parentActor || null;

    // Determine effective scopes from config or defaults
    this.currentScopes = this.scopes ? [...this.scopes] : null;

    this.allItems = [];
    this.filteredItems = [];
    this.selectedIndex = -1;
    this.isOpen = false;
    this.isLoading = false;

    this.searchDebounceTime = 300;
    this.searchTimeout = null;
    this.blurTimeout = null;

    this.element = null;
    this.input = null;
    this.dropdown = null;
    this.list = null;
    this.loading = null;
    this.empty = null;
    this.dropdownArrow = null;

    this.init();
  }

  /**
   * Update the source scopes and reload items.
   * Called by ItemScopeSelector when the user changes scope filters.
   * @param {string[]} newScopes - Array of scope identifiers to include
   */
  async setScopes(newScopes) {
    this.currentScopes = [...newScopes];
    await this.loadItems();
  }

  getData() {
    return {
      selectorType: this.selectorType,
      placeholder: this.placeholder,
      ariaLabel: this.placeholder
    };
  }

  async init() {
    Logger.debug("Initializing item selector combo box", {
      container: this.container,
      containerType: this.container?.constructor?.name,
      itemTypes: this.itemTypes,
      selectorType: this.selectorType,
      scopes: this.currentScopes
    }, "ITEM_SELECTOR");

    if (!this.container) {
      Logger.error("No container provided", null, "ItemSelectorComboBox");
      return;
    }

    const containerElement = this.container.nodeType ? this.container : this.container[0];
    if (!containerElement) {
      Logger.error("Invalid container", null, "ItemSelectorComboBox");
      return;
    }

    const templatePath = "systems/eventide-rp-system/templates/components/item-selector-combo-box.hbs";
    const html = await foundry.applications.handlebars.renderTemplate(templatePath, this.getData());
    containerElement.innerHTML = html;

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

    this.attachEventListeners();
    await this.loadItems();
  }

  attachEventListeners() {
    this.boundInputFocus = this.onInputFocus.bind(this);
    this.boundInputBlur = this.onInputBlur.bind(this);
    this.boundInputChange = this.onInputChange.bind(this);
    this.boundInputKeydown = this.onInputKeydown.bind(this);
    this.boundDropdownArrowClick = this.onDropdownArrowClick.bind(this);
    this.boundDocumentClick = this.onDocumentClick.bind(this);

    this.input.addEventListener("focus", this.boundInputFocus);
    this.input.addEventListener("blur", this.boundInputBlur);
    this.input.addEventListener("input", this.boundInputChange);
    this.input.addEventListener("keydown", this.boundInputKeydown);

    if (this.dropdownArrow) {
      this.dropdownArrow.addEventListener("click", this.boundDropdownArrowClick);
    }

    this.boundListClick = (event) => {
      const item = event.target.closest(".erps-item-selector-combo-box__item");
      if (item) {
        this.onItemClick(event, item);
      }
    };
    this.list.addEventListener("click", this.boundListClick, true);

    this.boundListHover = (event) => {
      const item = event.target.closest(".erps-item-selector-combo-box__item");
      if (item) {
        this.onItemHover(event, item);
      }
    };
    this.list.addEventListener("mouseenter", this.boundListHover, true);

    document.addEventListener("click", this.boundDocumentClick);
  }

  async loadItems() {
    Logger.debug("Starting to load items", {
      itemTypes: this.itemTypes,
      selectorType: this.selectorType,
      scopes: this.currentScopes
    }, "ITEM_SELECTOR");

    this.showLoading(true);

    try {
      const sourceScopes = this.currentScopes || undefined;

      this.allItems = await ItemSourceCollector.getAllAccessibleItems(
        game.user,
        this.itemTypes,
        sourceScopes,
        this.parentActor
      );

      if (this.selectorType === "action-item") {
        this.allItems = await ItemSourceCollector.filterActionItemsByRollType(this.allItems);
      }

      this.filteredItems = [...this.allItems];

      const currentSearch = this.input?.value || "";
      if (currentSearch.trim()) {
        this.filteredItems = ItemSourceCollector.filterItems(this.allItems, currentSearch);
      }

      this.renderItems();
    } catch (error) {
      Logger.error("Failed to load items", error, "ItemSelectorComboBox");
      ui.notifications.error(game.i18n.localize("EVENTIDE_RP_SYSTEM.UI.FailedToLoadItems"));
    } finally {
      this.showLoading(false);
    }
  }

  filterItems(searchText) {
    this.filteredItems = ItemSourceCollector.filterItems(this.allItems, searchText);
    this.selectedIndex = -1;
    this.renderItems();
  }

  renderItems() {
    this.list.innerHTML = "";

    if (this.filteredItems.length === 0) {
      this.showEmpty(true);
      return;
    }

    this.showEmpty(false);

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

  createItemElement(item, index) {
    const listItem = document.createElement("li");
    listItem.className = "erps-item-selector-combo-box__item";
    listItem.setAttribute("data-index", index);
    listItem.setAttribute("data-item-id", item.id);
    listItem.setAttribute("data-item-uuid", item.uuid);
    listItem.setAttribute("role", "option");
    listItem.setAttribute("aria-selected", "false");

    const iconDiv = document.createElement("div");
    iconDiv.className = "erps-item-selector-combo-box__item-icon";
    const img = document.createElement("img");
    img.src = item.img;
    img.alt = item.name;
    img.width = 50;
    img.height = 50;
    iconDiv.appendChild(img);

    const nameDiv = document.createElement("div");
    nameDiv.className = "erps-item-selector-combo-box__item-name";
    nameDiv.textContent = item.name;

    const typeDiv = document.createElement("div");
    typeDiv.className = "erps-item-selector-combo-box__item-type";
    typeDiv.textContent = item.type;

    const sourceDiv = document.createElement("div");
    sourceDiv.className = "erps-item-selector-combo-box__item-source";
    sourceDiv.textContent = item.source;

    listItem.appendChild(iconDiv);
    listItem.appendChild(nameDiv);
    listItem.appendChild(typeDiv);
    listItem.appendChild(sourceDiv);

    return listItem;
  }

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

  updateSelection() {
    const items = this.list.querySelectorAll(".erps-item-selector-combo-box__item");
    items.forEach((element, index) => {
      const isSelected = index === this.selectedIndex;
      element.classList.toggle("erps-item-selector-combo-box__item--selected", isSelected);
      element.setAttribute("aria-selected", isSelected);
    });
  }

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

    await this.selectItemByUuid(selectedItem.uuid);
  }

  async selectItemByUuid(uuid) {
    if (!uuid) {
      Logger.error("No UUID provided", null, "ItemSelectorComboBox");
      return;
    }

    try {
      const itemDoc = await fromUuid(uuid);
      if (!itemDoc) {
        Logger.error("No document found for UUID", { uuid }, "ITEM_SELECTOR");
        return;
      }

      this.onSelect(itemDoc);
      this.setDropdownOpen(false);
      this.input.blur();
    } catch (error) {
      Logger.error("Failed to retrieve document", { error }, "ITEM_SELECTOR");
    }
  }

  showLoading(show) {
    this.isLoading = show;
    this.loading.style.display = show ? "" : "none";
    this.list.style.display = show ? "none" : "";
    this.empty.style.display = "none";
  }

  showEmpty(show) {
    this.empty.style.display = show ? "" : "none";
    this.list.style.display = show ? "none" : "";
  }

  onInputFocus(_event) {
    this.setDropdownOpen(true);
  }

  onInputBlur(_event) {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }

    this.blurTimeout = setTimeout(() => {
      if (!this.element.contains(document.activeElement) && this.isOpen) {
        this.setDropdownOpen(false);
      }
    }, 300);
  }

  onInputChange(_event) {
    const searchText = this.input.value;

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

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
    event.preventDefault();
    event.stopPropagation();

    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }

    const index = parseInt(itemElement.dataset.index, 10);
    const uuid = itemElement.dataset.itemUuid;

    if (!isNaN(index)) {
      this.selectItem(index);
    } else if (uuid) {
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
    if (this.element.contains(event.target)) {
      return;
    }

    setTimeout(() => {
      if (this.isOpen) {
        this.setDropdownOpen(false);
      }
    }, 50);
  }

  destroy() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }

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