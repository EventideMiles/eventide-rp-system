# Eventide RP System SCSS Guidelines

## Structure Overview

The SCSS codebase is organized into the following structure:

```
scss/
├── components/        # Component-specific styles
├── global/            # Global styles and layouts
├── utils/             # Utilities, tokens, variables, and mixins
│   ├── _colors.scss   # Color system
│   ├── _mixins.scss   # Reusable mixins
│   ├── _tokens.scss   # Design tokens (spacing, sizing, etc.)
│   ├── _typography.scss # Typography settings
│   └── _variables.scss # Other variables
└── eventide-rp-system.scss  # Main entry file
```

## Style Guide

### BEM Methodology

This project follows the BEM (Block, Element, Modifier) naming convention:

- **Block**: The main component (e.g., `.data-table`)
- **Element**: Child parts of the block (e.g., `.data-table__row`)
- **Modifier**: Variants of blocks or elements (e.g., `.data-table--striped`)

Example:
```scss
.block {
  &__element {
    // Element styles
    
    &--modifier {
      // Modified element styles
    }
  }
  
  &--modifier {
    // Modified block styles
  }
}
```

### File Naming

- Partial files (imported into other files) should begin with an underscore: `_filename.scss`
- Component files should be named after the component they style: `_data-table.scss`
- Utility files should describe their purpose: `_mixins.scss`, `_colors.scss`

### Imports and Organization

- Use the SASS module system with `@use` instead of `@import`
- Organize imports in the following order:
  1. SASS core modules (e.g., `@use "sass:meta"`)
  2. Design tokens and variables
  3. Mixins and functions
  4. Global styles
  5. Component styles

## CSS Best Practices

### Selectors and Specificity

- Keep specificity as low as possible
- Avoid nesting selectors more than 3 levels deep
- Use classes instead of IDs for styling
- Limit the use of `!important`

### Responsive Design

- Use relative units (rem, em, %) instead of pixels where possible
- Implement responsive layouts with CSS Grid and Flexbox
- Use media queries for significant layout changes

### Performance

- Group related properties together
- Avoid redundant declarations
- Combine common styles using mixins
- Minimize the use of expensive properties (box-shadow, border-radius, etc.)

## Design Tokens

Design tokens (`_tokens.scss`) are used to maintain consistency across the system:

- **Spacing**: Use the spacing scale for margins, padding, and layout spacing
- **Colors**: Use the color variables defined in `_colors.scss`
- **Typography**: Use the typography mixins and variables for consistent text styling
- **Shadows**: Use shadow tokens for consistent elevation effects
- **Animation**: Use the timing tokens for consistent animations and transitions

## Future Improvements

- Consolidate redundant mixins in `_mixins.scss`
- Improve BEM compliance across all components
- Create a comprehensive set of utility classes for common styling needs
- Implement a systematic approach to responsive breakpoints
- Add automated linting for SCSS files 