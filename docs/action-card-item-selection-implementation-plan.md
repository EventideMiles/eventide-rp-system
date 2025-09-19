# Action Card Item Selection Implementation Plan

## Overview

This document outlines the implementation plan for adding the ability to select combat powers, gear, features, and other items from various sources (compendiums, character sheets, world items) within action cards using a searchable combo box interface.

## Requirements Analysis

### Current State

- Action cards use drag-and-drop for adding embedded items
- Items come from limited sources (current actor, manual drag-drop)
- No search or filtering capabilities for item selection
- Limited visibility into available items across the system

### Target State

- **Action Item Selection**: Combo box to replace current action item with any accessible combat power/gear/feature
- **Effects Selection**: Combo box to add effects from any accessible items (features, statuses, gear)
- **Multi-Source Access**: Items from compendiums, all character sheets, and world items database
- **Rich Display**: 50px+ icons, item names, and type indicators for easy identification
- **Search Interface**: Type-ahead search with instant filtering

## Implementation Plan

### 1. Item Source Collection System

**File**: `/module/helpers/item-source-collector.mjs` (NEW)

**Purpose**: Centralized system for gathering items from all accessible sources

**Key Methods**:

```javascript
class ItemSourceCollector {
  static async getAllAccessibleItems(user, itemTypes = []) {
    // Returns consolidated list from all sources
  }

  static async getCompendiumItems(itemTypes = []) {
    // Scan all accessible compendiums
  }

  static async getCharacterSheetItems(itemTypes = []) {
    // Scan all character sheets user has access to
  }

  static async getWorldItems(itemTypes = []) {
    // Get items from world items database
  }

  static formatItemForDisplay(item, source) {
    // Standardize item data for UI display
  }
}
```

**Data Structure**:

```javascript
{
  id: "item-uuid",
  name: "Item Name",
  type: "combatPower", // or "gear", "feature", etc.
  img: "path/to/icon.png",
  source: "Compendium: Monster Manual", // or "Actor: John Doe", "World Items"
  sourceType: "compendium", // or "actor", "world"
  originalItem: item // Reference to original item
}
```

### 2. Combo Box Component System

**File**: `/module/ui/components/item-selector-combo-box.mjs` (NEW)

**Purpose**: Reusable combo box component for item selection

**Features**:

- Search input with type-ahead filtering
- Dropdown list with virtual scrolling for performance
- Item display with icon (50px+), name, type, and source
- Keyboard navigation (arrow keys, enter, escape)
- Accessibility support (ARIA labels, screen reader friendly)

**Template**: `/templates/components/item-selector-combo-box.hbs` (NEW)

```handlebars
<div class="erps-item-selector-combo-box" data-selector-type="{{selectorType}}">
  <div class="erps-item-selector-combo-box__input-container">
    <input
      type="text"
      class="erps-item-selector-combo-box__input erps-input"
      placeholder="{{placeholder}}"
      autocomplete="off"
      aria-expanded="false"
      aria-haspopup="listbox"
    />
    <button type="button" class="erps-item-selector-combo-box__dropdown-arrow">
      <i class="fas fa-chevron-down"></i>
    </button>
  </div>

  <div
    class="erps-item-selector-combo-box__dropdown"
    role="listbox"
    aria-hidden="true"
  >
    <div class="erps-item-selector-combo-box__loading">
      <i class="fas fa-spinner fa-spin"></i>
      Loading items...
    </div>
    <ul class="erps-item-selector-combo-box__list">
      <!-- Items populated via JavaScript -->
    </ul>
  </div>
</div>
```

### 3. Action Card Sheet Integration

**File**: `/module/ui/mixins/item-sheet-actions.mjs` (MODIFY)

**New Methods**:

```javascript
// Initialize item selectors when sheet opens
async _initializeItemSelectors() {
  if (this.item.type !== "actionCard") return;

  // Initialize action item selector
  this.actionItemSelector = new ItemSelectorComboBox({
    container: this.element.find('[data-selector="action-item"]'),
    itemTypes: ["combatPower", "gear", "feature"],
    onSelect: this._onActionItemSelected.bind(this),
    placeholder: "Search for action item..."
  });

  // Initialize effects selector
  this.effectsSelector = new ItemSelectorComboBox({
    container: this.element.find('[data-selector="effects"]'),
    itemTypes: ["feature", "gear", "status"],
    onSelect: this._onEffectSelected.bind(this),
    placeholder: "Search for effect..."
  });
}

async _onActionItemSelected(selectedItem) {
  // Replace current action item with selected item
  const embeddedItemData = selectedItem.originalItem.toObject();
  await this.item.setEmbeddedItem(embeddedItemData);
  this.render();
}

async _onEffectSelected(selectedItem) {
  // Add selected item to effects
  const effectData = selectedItem.originalItem.toObject();
  await this.item.addEmbeddedEffect(effectData);
  this.render();
}
```

### 4. Template Updates

**File**: `/templates/item/embedded-items.hbs` (MODIFY)

**Action Item Section** (around line 15):

```handlebars
<div class="erps-items-panel__section">
  <div class="erps-items-panel__header">
    <h3 class="erps-items-panel__title">{{localize "ERPS.ActionItem"}}</h3>
  </div>

  <div class="erps-items-panel__content">
    {{#if embeddedItem}}
      <!-- Existing embedded item display -->
      <div class="erps-items-panel__item">
        <!-- Current embedded item display code -->
      </div>
    {{else}}
      <!-- New item selector -->
      <div class="erps-item-selector-container" data-selector="action-item">
        {{> "components/item-selector-combo-box"
            selectorType="action-item"
            placeholder="Search for combat power, gear, or feature..."}}
      </div>
    {{/if}}
  </div>
</div>
```

**Effects Section** (around line 45):

```handlebars
<div class="erps-items-panel__section">
  <div class="erps-items-panel__header">
    <h3 class="erps-items-panel__title">{{localize "ERPS.Effects"}}</h3>
  </div>

  <div class="erps-items-panel__content">
    <!-- Existing effects display -->
    {{#each embeddedEffects}}
      <!-- Current effects display code -->
    {{/each}}

    <!-- New effects selector (always visible) -->
    <div class="erps-item-selector-container" data-selector="effects">
      {{> "components/item-selector-combo-box"
          selectorType="effects"
          placeholder="Search for effect to add..."}}
    </div>
  </div>
</div>
```

### 5. Styling System

**File**: `/src/scss/components/sheet/inputs/_item-selector-combo-box.scss` (NEW)

**Key Features**:

- Theme integration with existing ERPS styling
- Dropdown animation and positioning
- Item display grid (icon + name + type + source)
- Search input styling
- Hover/focus states
- Loading and empty states

**Structure**:

```scss
.erps-item-selector-combo-box {
  position: relative;

  &__input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  &__input {
    @extend .erps-input;
    flex: 1;
    padding-right: 2rem; // Space for dropdown arrow
  }

  &__dropdown-arrow {
    position: absolute;
    right: 0.5rem;
    // Styling for dropdown indicator
  }

  &__dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1000;
    background: var(--erps-color-surface);
    border: 1px solid var(--erps-color-border);
    border-radius: 0.25rem;
    box-shadow: var(--erps-shadow-medium);
    max-height: 300px;
    overflow-y: auto;

    &[aria-hidden="true"] {
      display: none;
    }
  }

  &__item {
    display: grid;
    grid-template-columns: 50px 1fr auto auto;
    gap: 0.5rem;
    padding: 0.5rem;
    cursor: pointer;
    border-bottom: 1px solid var(--erps-color-border-subtle);

    &:hover {
      background: var(--erps-color-surface-hover);
    }

    &--selected {
      background: var(--erps-color-primary-subtle);
    }
  }

  &__item-icon {
    width: 50px;
    height: 50px;
    object-fit: cover;
    border-radius: 0.25rem;
  }

  &__item-name {
    font-weight: 500;
    align-self: center;
  }

  &__item-type {
    align-self: center;
    font-size: 0.875rem;
    color: var(--erps-color-text-muted);
    text-transform: capitalize;
  }

  &__item-source {
    align-self: center;
    font-size: 0.75rem;
    color: var(--erps-color-text-subtle);
  }
}
```

### 6. Language Support

**File**: `/lang/src/en/forms.json` (MODIFY)

**New Localization Keys**:

```json
{
  "ERPS": {
    "ActionItemSelector": {
      "Placeholder": "Search for combat power, gear, or feature...",
      "NoResults": "No items found matching your search",
      "Loading": "Loading available items...",
      "Replace": "Replace Action Item",
      "Clear": "Clear Selection"
    },
    "EffectsSelector": {
      "Placeholder": "Search for effect to add...",
      "NoResults": "No effects found matching your search",
      "Loading": "Loading available effects...",
      "Add": "Add Effect"
    },
    "ItemSource": {
      "Compendium": "Compendium: {name}",
      "Actor": "Character: {name}",
      "World": "World Items"
    }
  }
}
```

### 7. Performance Optimizations

**Caching Strategy**:

- Cache item collections per user session
- Invalidate cache when compendiums/actors change
- Virtual scrolling for large item lists
- Debounced search input (300ms delay)

**File**: `/module/helpers/item-cache.mjs` (NEW)

```javascript
class ItemCache {
  static cache = new Map();
  static cacheExpiry = 5 * 60 * 1000; // 5 minutes

  static async getItems(cacheKey, itemTypes) {
    // Check cache first, then fetch if needed
  }

  static invalidateCache(pattern) {
    // Clear cache entries matching pattern
  }
}
```

### 8. Testing Strategy

**Unit Tests**:

- `ItemSourceCollector` methods
- Cache functionality
- Item filtering and search
- Data formatting

**Integration Tests**:

- Combo box component functionality
- Item selection workflow
- Action card integration
- Template rendering

**Manual Testing Checklist**:

- [ ] Action item selector shows all accessible items
- [ ] Effects selector shows appropriate item types
- [ ] Search filtering works correctly
- [ ] Icons display at correct size (50px+)
- [ ] Item replacement works in action item section
- [ ] Effect addition works in effects section
- [ ] Performance acceptable with large item collections
- [ ] Accessibility features work (keyboard nav, screen readers)
- [ ] Works for both GM and player permissions
- [ ] Cache invalidation works properly

## Implementation Order

1. **Item Source Collection System** (`ItemSourceCollector` class)
2. **Combo Box Component** (reusable UI component)
3. **Styling System** (CSS for combo box appearance)
4. **Template Integration** (embed combo boxes in action card sheet)
5. **Sheet Integration** (JavaScript event handling)
6. **Language Support** (localization)
7. **Performance Optimizations** (caching, virtual scrolling)
8. **Testing and Validation**

## Technical Considerations

### Security

- Validate user permissions before showing items
- Prevent access to items user shouldn't see
- Sanitize search input to prevent XSS

### Performance

- Virtual scrolling for 1000+ items
- Debounced search to reduce API calls
- Efficient filtering algorithms
- Memory management for large datasets

### Accessibility

- ARIA labels and roles for screen readers
- Keyboard navigation support
- Focus management
- High contrast support

### Browser Compatibility

- Modern browser features (async/await, arrow functions)
- Fallbacks for older browsers if needed
- Touch device support for mobile

## Expected User Workflow

### Action Item Selection

1. User opens action card item sheet
2. In Action Item section, user sees search box (if no item selected)
3. User types to search for combat powers, gear, or features
4. Dropdown shows filtered results with icons, names, types
5. User selects item - it replaces current action item
6. User can clear selection to show search box again

### Effects Selection

1. In Effects section, user sees search box below existing effects
2. User types to search for features, gear, or status effects
3. Dropdown shows filtered results
4. User selects item - it's added to effects list
5. Search box remains for adding more effects

### GM vs Player Experience

- **GM**: Sees items from all compendiums, all actors, world items
- **Player**: Sees items from compendiums they can access, their own characters, world items (if permitted)

This implementation provides a comprehensive item selection system that significantly enhances the action card creation workflow while maintaining performance and usability.
