# Observability & Telemetry Specification

## Purpose

Establish a production-grade monitoring system to track application health, crashes, and critical business events.

## Requirements

### Requirement: Remote Error Reporting

The system MUST integrate Sentry for Expo to automatically capture all unhandled exceptions and crashes.
The system MUST capture breadcrumbs leading up to a crash (e.g., last 5 navigation changes, last 3 API calls).
The system MUST provide a `TelemetryService` wrapper that routes logs based on the environment:
- **Development**: Log to `console.log`.
- **Production**: Log to Sentry/Remote provider and suppress `console.log`.

#### Scenario: Production Crash Capture

- GIVEN the app is running in production mode
- WHEN an unexpected error occurs in the `RestoreCoordinator`
- THEN the error and stack trace are automatically sent to Sentry
- AND the developer receives a notification via the Sentry dashboard

### Requirement: Business Event Telemetry

The system SHOULD track specific high-value events (e.g., `RESTORE_SUCCESS`, `RESTORE_INTEGRITY_FAIL`, `PIN_RESET_SUCCESS`).
Telemetry events MUST be sent asynchronously to avoid blocking the main UI thread.

#### Scenario: Tracking Restore Failure

- GIVEN a restore process fails due to integrity check
- WHEN the failure occurs
- THEN the system sends a `RESTORE_INTEGRITY_FAIL` event to the telemetry provider
- AND the event includes the database version and timestamp
