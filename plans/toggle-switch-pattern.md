# Toggle Switch Pattern for Eventide RP System

This document outlines the standardized pattern for implementing toggle switches throughout the Eventide RP System.

## HTML Structure

```html
<div class="toggle-switch-wrapper">
  <input class="base-form__toggle-switch" type="checkbox" id="toggleName" name="toggleName">
  <label class="toggle-switch-display" for="toggleName"></label>
</div>
```

When implemented within a form group:

```html
<div class="base-form__group base-form__group--checkbox">
  <label class="base-form__label" for="toggleName">Label Text:</label>
  <div class="toggle-switch-wrapper">
    <input class="base-form__toggle-switch" type="checkbox" id="toggleName" name="toggleName">
    <label class="toggle-switch-display" for="toggleName"></label>
  </div>
</div>
```

## Key Components

1. **Toggle Switch Wrapper** - `toggle-switch-wrapper`:
   - Contains the input and its visual toggle display
   - Ensures proper positioning of the toggle elements

2. **Checkbox Input** - `base-form__toggle-switch`:
   - Uses a standard checkbox input type
   - Must have an ID that matches the "for" attribute of the toggle-switch-display
   - Has class `base-form__toggle-switch` to apply toggle styling

3. **Visual Toggle Element** - `toggle-switch-display`:
   - A label element with class `toggle-switch-display`
   - Must have a "for" attribute that matches the ID of the checkbox
   - Creates the visual toggle switch appearance
   - No content needed inside this element - styling is applied via CSS

## Why This Pattern Works

- Uses native HTML behavior (label + input connection) for accessibility
- Makes both the label text and the toggle itself clickable
- Requires no JavaScript to function
- Maintains a consistent appearance across the system
- Works with Foundry VTT's form handling system

## CSS Dependencies

This pattern relies on:
- `_form-elements.scss` for base styles
- `_mixins.scss` for the `grid-compliant-toggle-switch` mixin
