/**
 * Utility to provide type-safe access to environment variables.
 * Throws an error if a required variable is missing.
 */
export function getConfig(key: string, required = false): string | undefined {
  const value = process.env[key];

  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}
