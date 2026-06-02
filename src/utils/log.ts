/**
 * Dev-only logger. Silenced in production builds.
 * Replace console.log/warn/error with log/warn/error from this module
 * to prevent leaking schema, operations, or PII in APK.
 */
export function log(...args: any[]): void {
  if (__DEV__) {
    console.log(...args);
  }
}

export function warn(...args: any[]): void {
  if (__DEV__) {
    console.warn(...args);
  }
}

export function error(...args: any[]): void {
  // Errors always log — useful for crash diagnostics via logcat
  console.error(...args);
}
