# Local PIN Security Specification

## Purpose

Provide a local access control layer to protect user data on the device, independent of the cloud authentication.

## Requirements

### Requirement: PIN-Based Access Control

The system MUST allow the user to set a 4-6 digit PIN upon first launch or in settings.
The system MUST hash the PIN using SHA-256 with a unique, randomly generated salt via `expo-crypto`.
The hashed PIN and its corresponding salt MUST be stored securely in `expo-secure-store`.
The system MUST present a PIN entry screen on app start if a PIN is configured.

#### Scenario: Successful PIN Entry

- GIVEN a user has set a PIN "1234"
- WHEN the user enters "1234" on the lock screen
- THEN the system hashes the input with the stored salt
- AND the hashes match
- AND the user is granted access to the app

#### Scenario: Invalid PIN Entry

- GIVEN a user has set a PIN "1234"
- WHEN the user enters "5678"
- THEN the hashes do not match
- AND the user is shown an "Incorrect PIN" error
- AND access remains blocked

### Requirement: Sovereign Recovery Key

The system MUST generate a unique, cryptographically strong Recovery Key during the PIN setup process.
The recovery key MUST be hashed and stored in `expo-secure-store`.
The system MUST prompt the user to save this key offline (e.g., printed or written down).
The system MUST allow a user to reset their PIN by providing the recovery key.

#### Scenario: PIN Reset via Recovery Key

- GIVEN a user has forgotten their PIN
- WHEN the user selects "Forgot PIN" and enters their Sovereign Recovery Key
- THEN the system verifies the key against the stored hash
- AND the system allows the user to set a new PIN
- AND the new PIN is hashed and stored
