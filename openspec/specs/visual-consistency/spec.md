# Visual Consistency Specification

## Purpose
Ensure professional portfolio-grade UI through strict adherence to the design system's spacing and typography.

## Requirements

### Requirement: Theme-Driven Spacing and Typography
All screens MUST use constants from `theme.spacing` and `theme.typography` instead of hardcoded values.

#### Scenario: Spacing Audit - CategoryManager
- GIVEN the CategoryManager screen
- WHEN auditing the layout
- THEN all margins and paddings MUST match the standard increments defined in `theme.spacing`.

#### Scenario: Spacing Audit - Settings
- GIVEN the Settings screen
- WHEN auditing the layout
- THEN all element spacing MUST be consistent with the `theme.spacing` constants.

#### Scenario: Typography Audit
- GIVEN any text element in the app
- WHEN rendering
- THEN the font size and weight MUST be derived from `theme.typography` constants.
