# Balance Audit Specification

## Purpose

Detect and log discrepancies between the cached stored balance and the actual sum of all transactions to ensure data integrity.

## Requirements

### Requirement: Silent Checksum
The system MUST perform a balance audit silently in the background during the application startup process.

#### Scenario: Background Audit
- GIVEN the application is starting
- WHEN the engine is initialized
- THEN the balance audit runs without blocking the main UI thread

### Requirement: Audit Logic
The system SHALL compute the current balance by summing all transaction amounts and compare it with the value stored in the balance table.

#### Scenario: Precise Summation
- GIVEN 3 transactions of 100, 200, and -50
- WHEN the audit computes the balance
- THEN the result is 250

### Requirement: Drift Detection
If the computed balance differs from the stored balance, the system MUST log a "balance drift" warning including the discrepancy amount.

#### Scenario: Drift Logged
- GIVEN computed balance is 10,000 and stored balance is 10,500
- WHEN the audit completes
- THEN a log entry is created: "Balance drift detected: 500 CLP"

### Requirement: Non-Blocking Execution
The audit MUST NOT block the application's ability to reach the home screen, even if the database is large.

#### Scenario: Fast Startup
- GIVEN a large history of transactions
- WHEN the audit runs
- THEN the user can still interact with the app while the audit processes in the background
