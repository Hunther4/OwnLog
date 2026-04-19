import haptics from '../haptics';
import { useFinanceStore } from '../../store/useFinanceStore';

// Mock console.debug to avoid cluttering test output
const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

// Mock the store
jest.mock('../../store/useFinanceStore', () => ({
  useFinanceStore: {
    getState: jest.fn(() => ({
      hapticsEnabled: false,
      setHapticsEnabled: jest.fn(),
    })),
  },
}));

describe('HapticService', () => {
  const mockGetState = useFinanceStore.getState as jest.Mock;
  const mockSetHapticsEnabled = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({
      hapticsEnabled: false,
      setHapticsEnabled: mockSetHapticsEnabled,
    });
  });

  afterAll(() => {
    consoleDebugSpy.mockRestore();
  });

  describe('basic functionality', () => {
    it('should have enabled property defaulting to false', () => {
      expect(haptics.enabled).toBe(false);
    });

    it('should allow setting enabled property', () => {
      // First call returns false
      expect(haptics.enabled).toBe(false);
      
      // Change mock to return true
      mockGetState.mockReturnValue({
        hapticsEnabled: true,
        setHapticsEnabled: mockSetHapticsEnabled,
      });
      
      // Now should return true
      expect(haptics.enabled).toBe(true);
      
      // Verify setter was called when we set the property
      haptics.enabled = false;
      expect(mockSetHapticsEnabled).toHaveBeenCalledWith(false);
    });

    it('should have trigger method', () => {
      expect(typeof haptics.trigger).toBe('function');
    });

    it('should accept SUCCESS, WARNING, and ERROR types', async () => {
      // Just test that the method doesn't throw for valid types
      await expect(haptics.trigger('SUCCESS')).resolves.not.toThrow();
      await expect(haptics.trigger('WARNING')).resolves.not.toThrow();
      await expect(haptics.trigger('ERROR')).resolves.not.toThrow();
    });
  });

  describe('graceful degradation', () => {
    it('should not throw when expo-haptics is not available', async () => {
      haptics.enabled = true;
      
      // The implementation should handle missing expo-haptics gracefully
      await expect(haptics.trigger('SUCCESS')).resolves.not.toThrow();
    });
  });
});