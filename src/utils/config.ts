/**
 * Utility to provide type-safe access to environment variables.
 * In Expo, environment variables are accessed via Constants.expoConfig.extra
 * or must be set via babel plugin for build-time replacement.
 */
import Constants from 'expo-constants';

export function getConfig(key: string, required = false): string | undefined {
  // Try Expo Constants first (runtime)
  const value = Constants.expoConfig?.extra?.[key];

  // Fallback to process.env for development/build-time vars
  // (Note: In production build, process.env may be replaced at build time via babel)
  const buildTimeValue = process.env?.[key];

  const finalValue = value || buildTimeValue;

  if (!finalValue && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return finalValue;
}
