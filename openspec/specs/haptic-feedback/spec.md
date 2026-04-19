# Haptic Feedback Specification

## Purpose
Improve tactile user experience through targeted haptic triggers.

## Requirements

### Requirement: System-wide Haptic Integration
The system SHALL provide haptic feedback for key user interactions to signal success, warnings, and destructive actions.

#### Scenario: Transaction Success
- GIVEN the user is confirming a transaction
- WHEN the transaction is successfully saved
- THEN the system MUST trigger a `Light` impact haptic feedback.

#### Scenario: PIN Error
- GIVEN the user is on the PIN entry screen
- WHEN the user enters an incorrect PIN
- THEN the system MUST trigger a `Medium` vibration haptic feedback.

#### Scenario: Destructive Action
- GIVEN the user is in the Category Manager
- WHEN the user deletes a category
- THEN the system MUST trigger a `Heavy` or `Distinctive` impact haptic feedback.
