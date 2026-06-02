import * as Sentry from '@sentry/react-native';
import { getConfig } from '../utils/config';

export class TelemetryService {
  private get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Logs a general message.
   * Strips any data payload before sending to Sentry in production
   * to prevent accidental PII or financial data leaks.
   * In dev: console.log
   * In prod: Sentry.captureMessage (message only, no extra data)
   */
  log(message: string): void {
    if (this.isProduction) {
      Sentry.captureMessage(message);
    } else {
      console.log(`LOG: ${message}`);
    }
  }

  /**
   * Logs an error.
   * In dev: console.error with full context.
   * In prod: Sentry.captureException (exception only, no extra context)
   */
  error(error: Error): void {
    if (this.isProduction) {
      Sentry.captureException(error);
    } else {
      console.error(`ERROR: ${error.message}`, error);
    }
  }

  /**
   * Tracks a business event.
   * In dev: console.log
   * In prod: Sentry.captureMessage (event name only, no properties)
   */
  trackEvent(eventName: string): void {
    if (this.isProduction) {
      Sentry.captureMessage(`[Event] ${eventName}`);
    } else {
      console.log(`EVENT: ${eventName}`);
    }
  }
}

export const telemetry = new TelemetryService();
