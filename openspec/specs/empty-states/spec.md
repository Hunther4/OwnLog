# Empty States Specification

## Purpose
Prevent "blank screen" syndrome by providing contextual guidance when no data is present.

## Requirements

### Requirement: Contextual Empty State UI
The system SHALL display a dedicated `EmptyState` component when a view's primary data source is empty.

#### Scenario: Empty Dashboard
- GIVEN the user has no recorded transactions
- WHEN the Dashboard is loaded
- THEN the system MUST show an illustration with the text "Start your first entry" and a "Add Transaction" CTA button.

#### Scenario: Empty Category List
- GIVEN the user has not created any custom categories
- WHEN the Category Manager is opened
- THEN the system MUST show a message "Add a category to organize your finances" and an "Add Category" CTA button.

#### Scenario: Empty Backup List
- GIVEN no cloud backups are found in the account
- WHEN the Backup screen is accessed
- THEN the system MUST show a message "Your cloud is empty" and a "Create Backup" CTA button.
