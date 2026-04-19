import { 
  PERFORMANCE_THRESHOLD, 
  measurePerformance, 
  measureRender, 
  measureQuery,
  PerformanceMonitor 
} from '../performance';

// Mock console methods
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

describe('Performance Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('PERFORMANCE_THRESHOLD', () => {
    it('should have correct threshold values', () => {
      expect(PERFORMANCE_THRESHOLD.MAX_RENDER_TIME_MS).toBe(150);
      expect(PERFORMANCE_THRESHOLD.MAX_DB_QUERY_MS).toBe(50);
      expect(PERFORMANCE_THRESHOLD.MAX_LIST_RENDER_MS).toBe(100);
    });
  });

  describe('measurePerformance', () => {
    it('should measure execution time and return result', async () => {
      const mockFn = jest.fn().mockResolvedValue('test result');
      
      const { result, duration, passed } = await measurePerformance('test', mockFn, 100);
      
      expect(result).toBe('test result');
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(passed).toBe(true);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should log warning when threshold is exceeded', async () => {
      const mockFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow'), 50))
      );
      
      const { passed } = await measurePerformance('slow test', mockFn, 10);
      
      expect(passed).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('PERFORMANCE WARNING: slow test took')
      );
    });

    it('should log debug when within threshold', async () => {
      const mockFn = jest.fn().mockResolvedValue('fast');
      
      const { passed } = await measurePerformance('fast test', mockFn, 100);
      
      expect(passed).toBe(true);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('PERFORMANCE OK: fast test took')
      );
    });
  });

  describe('measureRender', () => {
    it('should measure render performance with default threshold', async () => {
      const mockRender = jest.fn().mockResolvedValue(undefined);
      
      const passed = await measureRender('TestComponent', mockRender);
      
      expect(passed).toBe(true);
      expect(mockRender).toHaveBeenCalledTimes(1);
    });

    it('should fail when render exceeds threshold', async () => {
      const mockRender = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );
      
      const passed = await measureRender('SlowComponent', mockRender);
      
      expect(passed).toBe(false);
    });
  });

  describe('measureQuery', () => {
    it('should measure query performance with database threshold', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ data: 'test' });
      
      const { result, passed } = await measureQuery('test query', mockQuery);
      
      expect(result).toEqual({ data: 'test' });
      expect(passed).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should fail when query exceeds threshold', async () => {
      const mockQuery = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({}), 100))
      );
      
      const { passed } = await measureQuery('slow query', mockQuery);
      
      expect(passed).toBe(false);
    });
  });

  describe('PerformanceMonitor', () => {
    it('should track render performance', async () => {
      const mockRender = jest.fn().mockResolvedValue(undefined);
      
      const passed = await PerformanceMonitor.trackRender('Component', mockRender);
      
      expect(passed).toBe(true);
      expect(mockRender).toHaveBeenCalledTimes(1);
    });

    it('should track query performance', async () => {
      const mockQuery = jest.fn().mockResolvedValue('query result');
      
      const { result, passed } = await PerformanceMonitor.trackQuery('Query', mockQuery);
      
      expect(result).toBe('query result');
      expect(passed).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should check if duration is within limits', () => {
      expect(PerformanceMonitor.isWithinLimits(100, 'render')).toBe(true);
      expect(PerformanceMonitor.isWithinLimits(200, 'render')).toBe(false);
      
      expect(PerformanceMonitor.isWithinLimits(30, 'query')).toBe(true);
      expect(PerformanceMonitor.isWithinLimits(60, 'query')).toBe(false);
      
      expect(PerformanceMonitor.isWithinLimits(80, 'list')).toBe(true);
      expect(PerformanceMonitor.isWithinLimits(120, 'list')).toBe(false);
    });

    it('should return performance thresholds', () => {
      const thresholds = PerformanceMonitor.getThresholds();
      
      expect(thresholds.MAX_RENDER_TIME_MS).toBe(150);
      expect(thresholds.MAX_DB_QUERY_MS).toBe(50);
      expect(thresholds.MAX_LIST_RENDER_MS).toBe(100);
    });
  });
});