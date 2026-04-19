import * as Sentry from '@sentry/react-native';
import { getConfig } from '../utils/config';

export class TelemetryService {
  private get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Logs a general message.

   * In dev: console.log
   * In prod: Sentry.captureMessage
   */
  log(message: string, data?: any): void {
    if (this.isProduction) {
      Sentry.captureMessage(message, { extra: data });
    } else {
      console.log(`LOG: ${message}`, data);
    }
  }

  /**
   * Logs an error.
   * In dev: console.error
   * In prod: Sentry.captureException
   */
  error(error: Error, context?: any): void {
    if (this.isProduction) {
      Sentry.captureException(error, { extra: context });
    } else {
      console.error(`ERROR: ${error.message}`, context, error);
    }
  }

  /**
   * Tracks a business event.
   * In dev: console.log
   * In prod: Sentry.captureEvent
   */
  trackEvent(eventName: string, properties?: any): void {
    if (this.isProduction) {
      Sentry.captureEvent({
        message: eventName,
        level: 'info',
        extra: properties,
      });
    } else {
      console.log(`EVENT: ${eventName}`, properties);
    }
  }
}

export const telemetry = new TelemetryService();
