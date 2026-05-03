import { ALL_SCOPES, SOURCE_SCOPES } from "../../helpers/item-source-collector.mjs";
import { Logger } from "../../services/logger.mjs";

const SCOPE_LABELS = {
  thisCharacter: "EVENTIDE_RP_SYSTEM.Forms.ItemSelector.ScopeThisCharacter",
  actor: "EVENTIDE_RP_SYSTEM.Forms.ItemSelector.ScopeAllCharacters",
  compendium: "EVENTIDE_RP_SYSTEM.Forms.ItemSelector.ScopeCompendiums",
  world: "EVENTIDE_RP_SYSTEM.Forms.ItemSelector.ScopeWorldItems",
};

const SCOPE_ICONS = {
  thisCharacter: "fas fa-user",
  actor: "fas fa-users",
  compendium: "fas fa-book",
  world: "fas fa-globe",
};

let scopeIdCounter = 0;

/**
 * A shared scope selector bar that sits at the top of a selector tab
 * and controls which source scopes all combo boxes in that tab search.
 * Renders as an always-visible row of toggle switches.
 */
export class ItemScopeSelector {
  constructor(options = {}) {
    this.container = options.container;
    this.parentActor = options.parentActor || null;
    this.scopes = options.scopes || [...ALL_SCOPES];
    this.onScopeChange = options.onScopeChange || (() => {});

    if (!this.parentActor) {
      this.scopes = this.scopes.filter(s => s !== "thisCharacter");
    }

    this.currentScopes = [...this.scopes];
    this.element = null;
    this.boundChange = null;
    this._id = `scope-sel-${++scopeIdCounter}`;

    this._init();
  }

  async _init() {
    if (!this.container) {
      Logger.error("No container provided for ItemScopeSelector", null, "ItemScopeSelector");
      return;
    }

    const containerElement = this.container.nodeType ? this.container : this.container[0];
    if (!containerElement) {
      Logger.error("Invalid container for ItemScopeSelector", null, "ItemScopeSelector");
      return;
    }

    this._build(containerElement);
  }

  _build(containerElement) {
    const availableScopes = this._getAvailableScopes();
    const label = game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.ItemSelector.ScopeFilter");

    const wrapper = document.createElement("div");
    wrapper.className = "erps-item-scope-selector";

    const header = document.createElement("span");
    header.className = "erps-item-scope-selector__header";
    header.innerHTML = `<i class="fas fa-filter"></i> <span>${label}</span>`;

    const options = document.createElement("div");
    options.className = "erps-item-scope-selector__options";

    for (const scope of availableScopes) {
      const scopeId = `${this._id}-${scope}`;
      const isChecked = this.currentScopes.includes(scope);
      const scopeLabel = game.i18n.localize(SCOPE_LABELS[scope] || scope);
      const scopeIcon = SCOPE_ICONS[scope] || "fas fa-circle";

      const toggleLabel = document.createElement("label");
      toggleLabel.className = "erps-toggles erps-toggles--label-left erps-toggles--compact";
      toggleLabel.setAttribute("for", scopeId);

      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "erps-toggles__input erps-item-scope-selector__input";
      input.id = scopeId;
      input.value = scope;
      input.checked = isChecked;
      input.setAttribute("data-scope", scope);

      const container = document.createElement("div");
      container.className = "erps-toggles__container";

      const text = document.createElement("span");
      text.className = "erps-toggles__label";
      text.innerHTML = `<i class="${scopeIcon}"></i> ${scopeLabel}`;

      const track = document.createElement("span");
      track.className = "erps-toggles__track";

      const thumb = document.createElement("span");
      thumb.className = "erps-toggles__thumb";
      track.appendChild(thumb);

      container.appendChild(text);
      container.appendChild(track);

      toggleLabel.appendChild(input);
      toggleLabel.appendChild(container);
      options.appendChild(toggleLabel);
    }

    wrapper.appendChild(header);
    wrapper.appendChild(options);
    containerElement.innerHTML = "";
    containerElement.appendChild(wrapper);

    this.element = wrapper;
    this._attachListeners();
  }

  _getAvailableScopes() {
    const scopes = [...SOURCE_SCOPES];
    if (!this.parentActor) {
      const idx = scopes.indexOf("thisCharacter");
      if (idx !== -1) scopes.splice(idx, 1);
    }
    return scopes;
  }

  _attachListeners() {
    this.boundChange = this._onChange.bind(this);
    this.element.addEventListener("change", this.boundChange);
  }

  _onChange(_event) {
    const newScopes = [];
    const inputs = this.element.querySelectorAll(".erps-item-scope-selector__input");

    for (const input of inputs) {
      if (input.checked) {
        newScopes.push(input.value);
      }
    }

    if (newScopes.length === 0) {
      for (const input of inputs) {
        input.checked = true;
      }
      this.currentScopes = this._getAvailableScopes();
    } else {
      this.currentScopes = newScopes;
    }

    this.onScopeChange(this.currentScopes);
  }

  setScopes(scopes) {
    this.currentScopes = [...scopes];
    const inputs = this.element?.querySelectorAll(".erps-item-scope-selector__input");
    if (!inputs) return;

    for (const input of inputs) {
      input.checked = this.currentScopes.includes(input.value);
    }
  }

  destroy() {
    if (this.element && this.boundChange) {
      this.element.removeEventListener("change", this.boundChange);
    }
    this.boundChange = null;
  }
}