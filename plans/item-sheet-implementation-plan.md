# Eventide RP System Modular Item Sheet Implementation Plan

## Overview

This plan details the step-by-step process to implement a new modular, ApplicationV2-style item sheet for the Eventide RP System. The sheet will be universal for all item types, use custom ActiveEffect management, live updating, and a modern, toggleable UI inspired by the gear-creator.

---

## 1. Project Structure & Initial Setup

- **File Structure:**
  - `module/sheets/item-sheet.mjs` (main class, ApplicationV2 pattern)
  - `templates/item/parts/` (partial templates for each section; no main template file)
  - `scss/item-sheet.scss` (sheet-specific styles; **all SCSS will follow BEM naming conventions**)
- **Preparation:**
  - Ensure all previous item sheet code is archived or removed.
  - Set up new files as above.
  - **Note:** The item sheet is built entirely from partials using the static `PARTS` property and does not use a single wrapping `.hbs` file. Each section is rendered as a part, and the sheet is assembled programmatically.

---

## 2. Data Model & Context Preparation

- **Active Effect:**
  - Ensure each item always has a single ActiveEffect (matching item name) managed via Foundry API. If it has more than one always make the editor handle the first one.
  - Icon: option to match item or set custom.
  - Duration: hidden from UI, set to large value in code if "apply to token" is checked.
- **Section Visibility:**
  - Hard-code which sections are relevant for each item type.
  - All sections open by default; show/hide toggle per session (add per-user persistence hook for future).
- **Attribute/Hidden Attribute Effects:**
  - Store all effects in a single array on the ActiveEffect data.
  - At runtime, parse and display them as either visible or hidden attribute effects using `.map` and filtering logic.
  - Addition functions will only allow valid types for each section (no blanks or inappropriate types).

---

## 3. Main Sheet Template & UI

- **Main Layout:**
  - Render all relevant sections as toggleable panels (all open by default).
  - Use gear-creator's layout and class conventions.
- **Section Partials (In Order):**
  - Description
  - Attributes (Any item-type-specific fields)
  - Prerequisites
  - Effects (ability/hidden ability sections that modify the player attributes)
- **Toggle Logic:**
  - Add JS to handle show/hide for each section header.
  - Architect for future per-user persistence.

---

## 4. Attribute Effects Management

- **UI:**
  - Each effect row: dropdown for attribute, dropdown for mode (add/override/advantage/disadvantage), value input (default 0), remove (−) button.
  - - button to add new effect (GM-only for hidden attributes).
  - Confirmation dialog on remove.
  - Tooltips for all controls (add after core functionality).
- **Live Update:**
  - On any change, immediately update the item document (mirror current item-sheet logic).
  - Use logging for effect changes and errors.

---

## 5. Active Effect Management

- **API Integration:**
  - Use Foundry API to create/update/delete the single ActiveEffect.
  - Ensure effect is disabled if no character effects are present / if gear is unequipped.
  - Sync effect data with sheet state on all changes.
- **Icon & Duration:**
  - Checkbox to match item icon or set custom icon.
  - Checkbox for "apply to token" (controls hidden duration logic).

---

## 6. Permissions & GM Controls

- **Hidden Attributes:**
  - Section visible to all, editable only by GMs.
  - Add (+) button for hidden attributes visible to GMs only.
- **Section Visibility:**
  - Show/hide sections based on item type (hard-coded logic).

---

## 7. Styling & UX

- **SCSS:**
  - Mirror gear-creator's SCSS structure.
  - Add new classes for modularity and maintainability.
- **Accessibility:**
  - Ensure tooltips and ARIA labels where appropriate.
- **Logging:**
  - Add useful logs for effect changes, errors, and API calls.

---

## 8. Testing & Debugging

- **Manual Testing:**
  - Test all item types for correct section visibility and effect logic.
  - Test as GM and player for permission handling.
- **Debug Tools:**
  - Add temporary debug output/logging for initial implementation.
- **Error Handling:**
  - Handle all API and data errors gracefully.

---

## 9. Future Enhancements (for roadmap)

- Per-user section toggle persistence (system setting)
- Attribute/hidden attribute search/filter in selectors
- Advanced effect configuration (if needed)
- Enhanced tooltips and help overlays

---

## 10. Milestones & Deliverables

1. **File scaffolding and base ApplicationV2 class**
2. **Context/data model and ActiveEffect logic**
3. **Section partials and toggle logic**
4. **Attribute/hidden attribute management**
5. **Live update and logging**
6. **GM controls and permissions**
7. **Styling and polish**
8. **Testing, debug, and documentation**

---

**Please review this plan and suggest any changes before implementation begins.**
