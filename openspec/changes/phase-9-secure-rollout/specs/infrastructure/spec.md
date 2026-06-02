# Infrastructure Specification

## Purpose

Ensure secure management of environment-specific configurations and secrets to prevent leakage in source control.

## Requirements

### Requirement: Secure Configuration Management

The system SHALL NOT contain hardcoded API keys, OAuth client IDs, or secrets in the source code.
The system MUST load sensitive configurations from environment variables (e.g., `.env` files) using a secure provider at build time.
Config files containing secrets MUST be listed in `.gitignore` to prevent accidental commits.

#### Scenario: App Startup with Config

- GIVEN a configured `.env` file with `GOOGLE_CLIENT_ID`
- WHEN the app initializes the `AuthService`
- THEN the `AuthService` retrieves the ID from the environment
- AND the app functions correctly without hardcoded strings in the JS bundle
