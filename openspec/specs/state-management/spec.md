# State Management Specification

## Purpose

Manage application state reactively using Zustand, providing a seamless bridge between the UI and the SQLite persistence layer.

## Requirements

### Requirement: Reactive Store
The system MUST provide a global, reactive store for finance data (transactions, categories, balances) using Zustand.

#### Scenario: UI Update on State Change
- GIVEN the transaction list is displayed
- WHEN a new transaction is added to the store
- THEN the UI automatically re-renders to show the new transaction

### Requirement: Optimistic Updates
When updating finance data, the store SHALL update its internal state immediately before the asynchronous SQLite persistence operation completes.

#### Scenario: Instant Feedback
- GIVEN a user adds a transaction
- WHEN the "Save" action is triggered
- THEN the transaction appears in the list immediately, regardless of DB latency

### Requirement: Rollback on Failure
If the SQLite persistence operation fails, the store MUST rollback the state to the snapshot taken immediately before the optimistic update.

#### Scenario: DB Error Recovery
- GIVEN a state was updated optimistically
- WHEN the database write fails due to a constraint violation
- THEN the store reverts to the previous state and an error is notified to the user

### Requirement: Initial Sync
On application startup, the store MUST populate its state by reading the current data from the SQLite database.

#### Scenario: Data Hydration
- GIVEN the app starts
- WHEN the store initializes
- THEN it queries SQLite for all transactions and categories and populates the Zustand state
