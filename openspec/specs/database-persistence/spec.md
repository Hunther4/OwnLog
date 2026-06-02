# Database Persistence Specification

## Purpose

Provide a reliable, performant, and consistent SQLite persistence layer for the HuntherWallet application.

## Requirements

### Requirement: Singleton Engine
The system MUST ensure that only one connection to the SQLite database is active throughout the application lifecycle to prevent locking issues.

#### Scenario: Shared Connection
- GIVEN the application is running
- WHEN multiple services request the database engine
- THEN they all receive the same singleton instance

### Requirement: WAL Mode
The system MUST enable Write-Ahead Logging (WAL) mode to allow concurrent reads and writes, improving performance on low-end Android devices.

#### Scenario: Concurrent Access
- GIVEN WAL mode is enabled
- WHEN a read operation occurs during a write operation
- THEN the read operation completes without being blocked by the writer

### Requirement: Foreign Key Support
The system MUST enable `PRAGMA foreign_keys = ON` on every connection to ensure referential integrity between tables (e.g., transactions and categories).

#### Scenario: Prevent Orphaned Transactions
- GIVEN a category exists
- WHEN a user attempts to delete the category while it has linked transactions
- THEN the system prevents the deletion (or cascades according to schema) to avoid orphaned records

### Requirement: Transaction Wrapper
The system SHALL provide a method to execute multiple database operations within a single atomic transaction.

#### Scenario: Atomic Update
- GIVEN a balance update and a transaction record creation
- WHEN both are wrapped in a transaction and the second operation fails
- THEN the first operation is rolled back automatically

### Requirement: Data Integrity (CLP)
All monetary values MUST be stored as `INTEGER` representing the smallest unit (1 = 1 Chilean peso cent) to avoid floating-point precision errors.

#### Scenario: Precise Calculation
- GIVEN a transaction of 100.50 CLP
- WHEN stored in the database
- THEN it is stored as the integer 10050

### Requirement: Schema Migrations
The system MUST support a migration mechanism to incrementally update the database schema version.

#### Scenario: Automatic Upgrade
- GIVEN a database at version 1 and a migration script available for version 2
- WHEN the engine initializes
- THEN the migration is applied and the internal version is updated to 2
