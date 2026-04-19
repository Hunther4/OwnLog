import { TelemetryService } from '../TelemetryService';
import * as Sentry from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  captureEvent: jest.fn(),
}));

describe('TelemetryService', () => {
  let telemetry: TelemetryService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    telemetry = new TelemetryService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Development Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should log to console in development', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      telemetry.log('test message', { foo: 'bar' });
      expect(consoleSpy).toHaveBeenCalledWith('LOG: test message', { foo: 'bar' });
      consoleSpy.mockRestore();
    });

    it('should log error to console in development', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('test error');
      telemetry.error(error, { context: 'test' });
      expect(consoleSpy).toHaveBeenCalledWith('ERROR: test error', { context: 'test' }, error);
      consoleSpy.mockRestore();
    });

    it('should log event to console in development', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      telemetry.trackEvent('test_event', { prop: 'val' });
      expect(consoleSpy).toHaveBeenCalledWith('EVENT: test_event', { prop: 'val' });
      consoleSpy.mockRestore();
    });

    it('should NOT call Sentry in development', () => {
      telemetry.log('test');
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should call Sentry.captureMessage in production', () => {
      telemetry.log('test message', { foo: 'bar' });
      expect(Sentry.captureMessage).toHaveBeenCalledWith('test message', expect.any(Object));
    });

    it('should call Sentry.captureException in production', () => {
      const error = new Error('test error');
      telemetry.error(error, { context: 'test' });
      expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.any(Object));
    });

    it('should call Sentry.captureEvent in production', () => {
      telemetry.trackEvent('test_event', { prop: 'val' });
      expect(Sentry.captureEvent).toHaveBeenCalledWith(expect.objectContaining({
        message: 'test_event',
        extra: { prop: 'val' }
      }));
    });

    it('should NOT log to console in production', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      telemetry.log('test');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
