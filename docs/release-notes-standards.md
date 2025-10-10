# Release Notes Standards - Eventide RP System

## Overview

This document defines the standards and structure for creating release notes in the Eventide RP System. Proper release notes help users understand changes, plan updates, and track system evolution over time.

## Directory Structure

```text
docs/
├── WHATS_NEW.md                    # Main index with links to all releases
└── release-notes/
    ├── v13.10.0.md                 # Individual version files
    ├── v13.11.0.md
    ├── v13.13.3.md
    ├── v13.14.0.md
    ├── v13.15.0.md
    └── v13.15.5.md
```

### Why This Structure?

1. **Markdown Linting Compliance**: Each version file has unique headings, avoiding duplicate heading violations
2. **Scalability**: Easy to add new versions without file bloat
3. **Maintainability**: Simple to update individual version notes without affecting others
4. **Git-Friendly**: Changes to one version don't pollute history of others
5. **Navigation**: Clear separation makes finding specific version info easier

## Version File Naming

### Format

`vMAJOR.MINOR.PATCH.md` following semantic versioning:

- **MAJOR**: Breaking changes or compatibility updates (e.g., Foundry v13 compatibility)
- **MINOR**: New features, non-breaking enhancements
- **PATCH**: Bug fixes, stability improvements

### Naming Examples

- `v13.10.0.md` - Major feature release (Feature Roll System)
- `v13.15.0.md` - Minor feature release (Embedded Transformations)
- `v13.15.5.md` - Patch release (Stability & Polish)

## Individual Version File Structure

### Template for Major/Minor Releases

```markdown
# vX.Y.Z - Release Title

**Release Date**: Month Year

## Major Features and Improvements

### 🎯 Feature Category - Feature Name

**Brief description of the feature and its impact.**

#### What is [Feature Name]?

[Detailed explanation of what the feature does and why it matters]

#### Key Capabilities

- **Capability 1**: Description
- **Capability 2**: Description
- **Capability 3**: Description

#### [Optional Subsections]

Add as needed for complex features:
- Implementation details
- Configuration options
- Use cases

### 🔧 Technical Improvements

#### Category Name

- **Improvement 1**: Description
- **Improvement 2**: Description

### 🐛 Bug Fixes and Stability

#### Category Name

- **Fix 1**: Description
- **Fix 2**: Description

## Getting Started

### For Players

1. **Step 1**: Description
2. **Step 2**: Description

### For Game Masters

1. **Step 1**: Description
2. **Step 2**: Description

## Version Information

- **Release Version**: X.Y.Z
- **Foundry Compatibility**: vXX+ minimum, vXX+ verified
- **Major Features**: List key features
- **Previous Version**: vX.Y.Z introduced [feature]

## Documentation

- [Relevant Guide 1](../path/to/guide.md) - Description
- [Relevant Guide 2](../path/to/guide.md) - Description
```

### Template for Patch Releases

```markdown
# vX.Y.Z - Focus Area

**Release Date**: Month Year

## Patch Releases (vX.Y.A - vX.Y.Z)

This series of patch releases focused on [main theme] following the vX.Y.0 feature release.

## Bug Fixes and Improvements

### 🐛 Critical Fixes

#### Issue Category (vX.Y.Z)

- **Fix Name**: Description of what was fixed
- **Impact**: What this fix resolves

### 🎨 UI and UX Improvements

#### Category (vX.Y.Z)

- **Improvement**: Description

### ⚙️ Configuration Changes

#### Category (vX.Y.Z)

- **Change**: Description and rationale

## Version History Summary

### vX.Y.Z (Current)

- Brief summary of changes

### vX.Y.Z-1

- Brief summary of changes

## Getting Started

### For All Users

1. **Update Recommendation**: Description
2. **Testing**: What to verify

## Version Information

- **Release Version**: X.Y.Z
- **Foundry Compatibility**: vXX+ minimum, vXX+ verified
- **Focus**: Main focus areas
- **Previous Version**: vX.Y.0 introduced [feature]

## Known Issues

List any known issues or "None at this time."

## Documentation

- [Relevant Guide](../path/to/guide.md) - Description
```

## WHATS_NEW.md Index Structure

The main `WHATS_NEW.md` file serves as an index and overview:

```markdown
# Release Notes

Welcome message and purpose statement.

## Latest Release

**[vX.Y.Z](release-notes/vX.Y.Z.md)** - Release Title *(Month Year)*

Brief description of the release.

**Key Highlights:**
- Highlight 1
- Highlight 2

## Recent Major Releases

### [vX.Y.Z](release-notes/vX.Y.Z.md) - Release Title *(Month Year)*

Brief description.

**Key Features:**
- Feature 1
- Feature 2

## Version Timeline

| Version | Release Date | Focus |
|---------|--------------|-------|
| **vX.Y.Z** | Month Year | Focus Area |

## Quick Navigation

### By Feature Area

- **Feature Category**: [vX.Y.Z](release-notes/vX.Y.Z.md), [vX.Y.Z](release-notes/vX.Y.Z.md)

### Documentation Links

- [Guide Name](path/to/guide.md) - Description

## Community and Support

Information about feedback, issues, and getting help.

---

**Current Version**: vX.Y.Z | **Foundry VTT Compatibility**: vXX+ | **Last Updated**: Month Year
```

## Writing Guidelines

### Release Titles

Use clear, descriptive titles that capture the essence of the release:

- **Good**: "Action Modes & Advanced Repetition System"
- **Good**: "Player Action Workflows & Item Selection"
- **Bad**: "Bug Fixes"
- **Bad**: "Various Updates"

### Feature Descriptions

#### Structure

1. **Opening Statement**: Brief overview of feature impact
2. **What It Is**: Detailed explanation
3. **Key Capabilities**: Bulleted list of main features
4. **Use Cases**: "Perfect For" or similar section

#### Tone

- **Positive and Exciting**: Highlight benefits and capabilities
- **Clear and Concise**: Avoid jargon unless necessary
- **User-Focused**: Explain how it helps players/GMs
- **Technical When Needed**: Include technical details for developers

### Icons and Emojis

Use sparingly and consistently:

- 🎯 Features and capabilities
- 🔧 Technical improvements
- 🐛 Bug fixes
- 🎨 UI/UX improvements
- 🎴 Action Cards related
- 🦋 Transformations related
- 🎵 Sound/Audio related
- ⚙️ Configuration/Settings
- 📚 Documentation
- 🔄 Workflows/Processes
- 🎮 Player features

### Section Ordering

1. **Major Features** (most important first)
2. **Technical Improvements**
3. **UI/UX Improvements**
4. **Bug Fixes**
5. **Getting Started**
6. **Version Information**
7. **Documentation Links**

### Cross-References

Always use relative paths for documentation links:

```markdown
- [Action Cards Guide](../advanced-usage/action-cards.md)
- [Features System](../system-features/features.md)
```

## Creating New Release Notes

### Process

1. **Identify Version Type**
   - Major/Minor: New features or significant changes
   - Patch: Bug fixes and minor improvements

2. **Gather Information**
   - Review git commits since last release
   - Check git tags for version increments
   - Identify major themes and changes
   - Note bug fixes and improvements

3. **Choose Template**
   - Major/Minor: Use full feature template
   - Patch: Use patch template or combine multiple patches

4. **Write Content**
   - Start with highest-impact features
   - Group related changes
   - Include user-facing benefits
   - Add technical details for developers

5. **Review and Edit**
   - Check for duplicate headings (markdown linting)
   - Verify all links work
   - Ensure consistent formatting
   - Proofread for clarity

6. **Update Index**
   - Add new release to WHATS_NEW.md
   - Update "Latest Release" section
   - Add to version timeline table
   - Update "Current Version" in footer

### Git Workflow for Research

Use git to identify changes:

```bash
# Find version changes
git log --all --oneline -p -- system.json | grep -E '^\+\s+"version"|^commit'

# Get commits between versions
git log --oneline v13.14.0..v13.15.0 --no-merges

# View changes for specific commit
git show <commit-hash>
```

### Categorizing Changes

Group commits into categories:

- **New Features**: New capabilities or systems
- **Enhancements**: Improvements to existing features
- **Bug Fixes**: Corrections and stability improvements
- **UI/UX**: Interface and user experience changes
- **Technical**: Code quality, refactoring, performance
- **Documentation**: Doc updates and improvements

## Markdown Linting Compliance

### Avoiding Duplicate Headings

**Problem**: Multiple versions in one file create duplicate headings:

```markdown
# v13.15.0
## Major Features    ← Duplicate
# v13.14.0
## Major Features    ← Duplicate (linting error!)
```

**Solution**: Separate files with unique headings per file:

```markdown
# v13.15.0 - Release Title
## Major Features    ← Unique within this file
```

### Heading Hierarchy

Maintain proper heading levels:

- `#` - Version title (one per file)
- `##` - Major sections
- `###` - Subsections
- `####` - Details within subsections

### Link Formatting

Use relative paths from the file location:

```markdown
<!-- In release-notes/v13.15.0.md -->
[Action Cards Guide](../advanced-usage/action-cards.md)

<!-- In WHATS_NEW.md -->
[v13.15.0](release-notes/v13.15.0.md)
```

## Quality Checklist

Before finalizing release notes:

- [ ] Version number is correct in filename and content
- [ ] Release date is accurate
- [ ] No duplicate headings within the file
- [ ] All links use relative paths and work correctly
- [ ] Icons/emojis are consistent with other releases
- [ ] User-facing language is clear and accessible
- [ ] Technical details are accurate
- [ ] Getting Started section provides actionable steps
- [ ] Version Information section is complete
- [ ] Documentation links are current
- [ ] WHATS_NEW.md index is updated
- [ ] File follows template structure

## Sample Release Notes

### Good Release Note Example

```markdown
# v13.15.0 - Embedded Transformations & Export Features

**Release Date**: October 2025

## Major Features and Improvements

### 🦋 Embedded Transformations in Action Cards

**Action cards can now contain embedded transformations with sophisticated application rules.**

#### Transformation Embedding

- **Action Card Transformations**: Embed transformation items directly into action cards
- **Application Rules**: Configure when and how transformations apply to targets
[...]
```

### Bad Release Note Example

```markdown
# Version 13.15.0

We made some updates.

## Changes

- Fixed bugs
- Added features
- Updated code

See git log for details.
```

## Maintenance

### When to Update

- **Every Release**: Create new version file
- **After Patches**: Update or create patch summary
- **Breaking Changes**: Clearly document migration path
- **Deprecations**: Note deprecated features and alternatives

### Long-Term Maintenance

- Archive old release notes in separate directory if needed (e.g., `archive/`)
- Keep WHATS_NEW.md focused on recent releases (last 6-12 months)
- Link to archived releases for historical reference
- Update documentation links if file paths change

## Related Documentation

- [JSDoc Standards](developer-jsdoc-standards.md) - Code documentation standards
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute to the project
- [Developer Guide](advanced-usage/developer-guide.md) - System architecture and development

---

_This document is part of the comprehensive documentation standards for the Eventide RP System. Following these guidelines ensures consistent, useful, and maintainable release notes._
