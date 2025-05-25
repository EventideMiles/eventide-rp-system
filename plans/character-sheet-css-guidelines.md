# Character Sheet CSS Development Guidelines

## Project Overview
This document outlines the established rules and guidelines for CSS development in the Eventide RP System character sheet project. These rules were developed through iterative design and user feedback to ensure maintainable, consistent, and visually appealing character sheets.

## Core Principles

### 1. File Organization
- **Single File Development**: During active development, work entirely within `src/scss/global/_character-sheet.scss`
- **No File Splitting**: Avoid moving styles to other files until the design is finalized
- **Reason**: Maintains focus and prevents fragmentation during rapid iteration

### 2. Color Scheme Philosophy
- **Darker Backgrounds for Text Contrast**: Use darker theme colors to ensure white text remains readable
- **Flat Design for Base States**: Avoid overly complex gradients and effects in default/non-interactive states
- **Enhanced Interactivity**: Reserve visual flourishes (patterns, glows, animations) for hover and focus states

## Theme System Rules

### Theme Color Variables
Each theme must define these CSS custom properties:
```scss
--theme-primary: // Main theme color (darker for contrast)
--theme-secondary: // Secondary accent color
--theme-accent: // Darkest color for backgrounds
--theme-light: // Lighter accent for highlights
--theme-glow: // Color for glow effects
--theme-text: // Text color (always #ffffff for consistency)
--theme-pattern: // SVG pattern for interactive states
```

### Theme Implementation Standards
1. **Blue Theme (Night)**: Default theme, navy/dark blue palette
2. **Gold Theme (Twilight)**: Amber/brown palette, not bright yellow
3. **Green Theme (Dawn)**: Forest green palette, not bright lime

### Pattern Visibility Rules
- **Base Opacity**: Patterns should be `fill-opacity='0.15'` for visibility
- **Interactive Enhancement**: Patterns become prominent on hover/focus
- **Subtle Animation**: Use `patternShift` animation for movement

## Input Styling Guidelines

### Character Name Input Specific Rules
1. **Flat Base State**:
   - Single color background (`var(--theme-accent)`)
   - Simple drop shadow (`0 2px 8px rgba(0, 0, 0, 0.3)`)
   - Minimal text shadow (`0 1px 2px rgba(0, 0, 0, 0.8)`)
   - Subtle border (`2px solid rgba(255, 255, 255, 0.2)`)

2. **Enhanced Interactive States**:
   - Complex gradients and patterns on hover/focus
   - Animated pattern backgrounds
   - Enhanced glow effects
   - Multiple text shadows

### Typography Hierarchy
```scss
--erps-display-font: 'Cinzel', 'Libre Baskerville', serif; // Character names
--erps-info-font: 'Crimson Text', 'Times New Roman', serif; // Information
--erps-ui-font: 'Roboto Condensed', 'Arial Narrow', sans-serif; // UI elements
--erps-mono-font: 'Consolas', 'Monaco', 'Courier New', monospace; // Numbers
```

## User Experience Rules

### Theme Persistence
- **User-Level Flags**: Themes are stored per-user, not per-actor
- **Global Application**: Theme applies to all character sheets for that user
- **Immediate Updates**: Theme changes trigger re-renders of all open sheets
- **Fallback Handling**: Always default to "blue" theme if no preference exists

### Visual Feedback Standards
1. **Immediate Response**: Visual changes must be instant on interaction
2. **Clear State Indication**: Hover, focus, and active states must be distinct
3. **Accessibility**: Maintain sufficient contrast ratios
4. **Performance**: Avoid expensive animations on frequently triggered events

## Technical Implementation Rules

### CSS Architecture
1. **BEM-like Naming**: Use `eventide-component__element--modifier` pattern
2. **Component Isolation**: Each major UI component gets its own section
3. **Utility Classes**: Minimal use, prefer component-specific styles
4. **CSS Custom Properties**: Use for theme variables and reusable values

### Animation Guidelines
1. **Subtle by Default**: Base animations should be understated
2. **Performance First**: Use `transform` and `opacity` for animations
3. **Reasonable Duration**: 0.2s-0.3s for micro-interactions, 3s+ for ambient effects
4. **Easing Functions**: Use `ease-in-out` for most transitions

### Responsive Considerations
1. **Fixed Dimensions**: Character sheets have defined width/height constraints
2. **Flexible Content**: Internal elements should adapt to content
3. **Scrolling Strategy**: Use overflow handling for content that exceeds bounds

## Status Card System Rules

### Card Structure Standards
All status cards follow this pattern:
```scss
.eventide-[type]-card {
  // Base card styling
  &__header { /* Card header container */ }
  &__icon { /* Icon container with animation */ }
  &__info { /* Text information container */ }
  &__label { /* Small uppercase label */ }
  &__details { /* Main content text */ }
  &__indicator { /* Action button or status indicator */ }
}
```

### Card Variants
1. **Transformation Cards**: Blue/purple themes with magic-themed icons
2. **Health Cards**: Red themes with health-related icons and urgency animations
3. **Effects Cards**: Gold themes with sparkle animations
4. **Cursed Cards**: Dark purple themes with ominous animations

### Animation Consistency
- **Glow Effects**: Use `[type]Glow` keyframes for background sweeps
- **Icon Animations**: Subtle movement (heartbeat, sparkle, float)
- **Timing**: Stagger animations to avoid visual chaos

## Development Workflow Rules

### Iteration Process
1. **User Feedback Integration**: Implement feedback immediately in the working file
2. **Visual Balance**: Always consider the overall visual hierarchy
3. **Progressive Enhancement**: Start simple, add complexity gradually
4. **Cross-Component Consistency**: Ensure new styles work with existing components

### Testing Requirements
1. **Theme Switching**: Test all themes with new components
2. **State Testing**: Verify hover, focus, active, and disabled states
3. **Content Variation**: Test with different text lengths and content types
4. **Performance Check**: Ensure animations don't cause jank

## Code Quality Standards

### SCSS Best Practices
1. **Nesting Limit**: Maximum 3 levels deep
2. **Variable Usage**: Use CSS custom properties for theme-related values
3. **Mixins**: Create mixins for repeated patterns
4. **Comments**: Document complex calculations and design decisions

### Browser Compatibility
1. **Modern CSS**: Use CSS Grid, Flexbox, and custom properties freely
2. **Fallbacks**: Provide fallbacks for critical functionality
3. **Vendor Prefixes**: Include where necessary for animations

---

## AI Assistant Summary

For future AI assistants working on this project, here are the key constraints and patterns:

**CRITICAL RULES:**
- Work only in `src/scss/global/_character-sheet.scss` during development
- Use darker theme colors with white text (#ffffff) for all themes
- Flat design for base states, enhanced interactivity for hover/focus
- User-level theme persistence (not per-actor)
- Pattern opacity at 0.15 for visibility
- Always trigger re-renders after theme changes

**THEME STRUCTURE:**
Each theme needs: primary, secondary, accent, light, glow, text (white), pattern (SVG)
Themes: blue (night/default), gold (twilight/amber), green (dawn/forest)

**COMPONENT PATTERNS:**
- Status cards: `eventide-[type]-card` with `__header`, `__icon`, `__info`, `__label`, `__details`, `__indicator`
- Animations: subtle base, enhanced interactive, performance-focused
- Typography: Display font for names, info font for content, UI font for controls, mono for numbers

**USER FEEDBACK INTEGRATION:**
- Implement visual feedback immediately
- Test all themes and states
- Maintain visual hierarchy and consistency
- Balance complexity with usability

**TECHNICAL CONSTRAINTS:**
- BEM-like naming convention
- CSS custom properties for themes
- Maximum 3-level nesting
- Modern CSS features acceptable
- Performance-first animations
