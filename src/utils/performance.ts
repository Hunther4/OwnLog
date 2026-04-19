/**
 * Performance monitoring utility for HuntherWallet.
 * Tracks render times and database query performance to ensure
 * the app meets low-end Android device requirements.
 */

export const PERFORMANCE_THRESHOLD = {
  MAX_RENDER_TIME_MS: 150,    // Maximum acceptable render time for a component
  MAX_DB_QUERY_MS: 50,        // Maximum acceptable database query time
  MAX_LIST_RENDER_MS: 100,    // Maximum acceptable list render time
};

/**
 * Measures the execution time of an async function
 * @param name - Identifier for the measurement
 * @param fn - Async function to measure
 * @returns Object with duration and whether it passed the threshold
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  thresholdMs: number = PERFORMANCE_THRESHOLD.MAX_RENDER_TIME_MS
): Promise<{ result: T; duration: number; passed: boolean }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  
  const passed = duration <= thresholdMs;
  
  if (!passed) {
    console.warn(`PERFORMANCE WARNING: ${name} took ${duration}ms (threshold: ${thresholdMs}ms)`);
  } else {
    console.debug(`PERFORMANCE OK: ${name} took ${duration}ms`);
  }
  
  return { result, duration, passed };
}

/**
 * Measures component render time
 * @param componentName - Name of the component being measured
 * @param renderFn - Function that renders the component
 * @returns Whether the render passed the performance threshold
 */
export async function measureRender(
  componentName: string,
  renderFn: () => Promise<void>
): Promise<boolean> {
  const { passed } = await measurePerformance(
    `Render: ${componentName}`,
    renderFn,
    PERFORMANCE_THRESHOLD.MAX_RENDER_TIME_MS
  );
  return passed;
}

/**
 * Measures database query performance
 * @param queryName - Name of the query being measured
 * @param queryFn - Function that executes the query
 * @returns Query result and whether it passed the performance threshold
 */
export async function measureQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<{ result: T; passed: boolean }> {
  const { result, passed } = await measurePerformance(
    `Query: ${queryName}`,
    queryFn,
    PERFORMANCE_THRESHOLD.MAX_DB_QUERY_MS
  );
  return { result, passed };
}

/**
 * Performance auditor singleton for app-wide performance monitoring
 */
export const PerformanceMonitor = {
  /**
   * Track render performance of a component
   */
  async trackRender(componentName: string, renderFn: () => Promise<void>): Promise<boolean> {
    return measureRender(componentName, renderFn);
  },

  /**
   * Track database query performance
   */
  async trackQuery<T>(queryName: string, queryFn: () => Promise<T>): Promise<{ result: T; passed: boolean }> {
    return measureQuery(queryName, queryFn);
  },

  /**
   * Check if performance is within acceptable limits
   */
  isWithinLimits(duration: number, type: 'render' | 'query' | 'list'): boolean {
    switch (type) {
      case 'render':
        return duration <= PERFORMANCE_THRESHOLD.MAX_RENDER_TIME_MS;
      case 'query':
        return duration <= PERFORMANCE_THRESHOLD.MAX_DB_QUERY_MS;
      case 'list':
        return duration <= PERFORMANCE_THRESHOLD.MAX_LIST_RENDER_MS;
      default:
        return duration <= PERFORMANCE_THRESHOLD.MAX_RENDER_TIME_MS;
    }
  },

  /**
   * Get performance thresholds
   */
  getThresholds() {
    return { ...PERFORMANCE_THRESHOLD };
  },
};