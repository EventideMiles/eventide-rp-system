# Transformation Action Cards Implementation Plan

## Overview

This document outlines the implementation plan for adding action card support to transformations in the Eventide RP System. This feature will allow transformations to override a character's action cards while transformed, similar to how transformations currently handle combat powers.

## Current State Analysis

- **Transformations** already support embedded combat powers via `embeddedCombatPowers`
- **Action Cards** exist with sophisticated embedding and execution systems
- **Combat Powers** serve as the reference implementation for how items work with action cards
- The transformation system handles stat changes, token updates, and power replacement

## Target Implementation

Extend transformations to also support action cards, following the same pattern as combat powers. Transformation action cards will **override** character action cards while transformed.

## Implementation Plan

### 1. Data Model Extension

**File**: `/module/data/item-transformation.mjs`
- Add `embeddedActionCards` field to transformation schema
- Add methods for managing embedded action cards:
  - `addActionCard(actionCard)`
  - `removeActionCard(actionCardId)`
  - `getActionCards()`

### 2. Transformation Creator UI Enhancement

**File**: `/module/ui/creators/transformation-creator.mjs`
- Add action card drag-and-drop support (mirror combat powers implementation)
- Add action card management UI (add/remove buttons, display list)

**File**: `/templates/macros/transformation-creator.hbs`
- Add action cards section to creation form
- Include drag-and-drop area and action card list display

### 3. Actor Transformation Logic Extension

**File**: `/module/documents/mixins/actor-transformation.mjs`
- Extend `applyTransformation()` to handle action cards
- Extend `removeTransformation()` to restore original action cards
- Add methods to get current action cards (accounting for transformation override)

### 4. Actor Sheet Integration

**File**: `/templates/actor/action-cards.hbs`
- Update to show transformation action cards when transformed
- Add visual indication when action cards come from transformation

**File**: `/module/ui/mixins/actor-sheet-additional-actions.mjs`
- Update action card execution to work with transformation action cards

### 5. Template Updates

**File**: `/templates/item/attribute-parts/transformation.hbs`
- Add action cards display section
- Show embedded action cards with management controls

### 6. Documentation and Language Updates

**File**: `/lang/src/en/transformations.json`
- Add localization strings for action card-related UI elements

**File**: `/docs/for-gms/transformations.md`
- Update documentation to include action card functionality

### 7. Testing Strategy

- **Unit Tests**: Test data model changes and actor methods
- **Integration Tests**: Test transformation application/removal with action cards
- **UI Tests**: Verify creator UI and actor sheet display
- **Manual Testing**: Test complete workflow in browser

## Implementation Order

1. Data model changes (foundation)
2. Actor transformation logic (core functionality)
3. Creator UI updates (creation workflow)
4. Actor sheet updates (display/execution)
5. Template and styling updates
6. Documentation updates
7. Testing and validation

## Design Decisions

1. **Follow Existing Patterns**: Mirror the `embeddedCombatPowers` implementation for consistency
2. **Preserve Backward Compatibility**: Ensure existing transformations continue to work
3. **Override Behavior**: Action cards from transformations will **override** character action cards
4. **Visual Indicators**: Clear UI indication when action cards come from transformations
5. **Error Handling**: Robust validation and error messages for action card management

## Expected User Workflow

1. **Creation**: GM creates transformation and drags action cards into it (similar to combat powers)
2. **Application**: When transformation is applied, character's action cards are replaced with transformation action cards
3. **Usage**: Player sees and can use only transformation action cards while transformed
4. **Removal**: When transformation is removed, original action cards are restored

## Technical Notes

- Action cards will be stored as embedded data similar to combat powers
- Transformation action cards will have temporary document IDs when active
- Original character action cards will be preserved during transformation
- Visual indicators will distinguish transformation action cards from character action cards