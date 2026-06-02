import haptics from '../../utils/haptics';
import { useBoundStore } from '../../store/useBoundStore';

// Mock console.debug to avoid cluttering test output
const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

// Mock the store
jest.mock('../../store/useBoundStore', () => ({
  useBoundStore: {
    getState: jest.fn(() => ({
      hapticsEnabled: false,
      setHapticsEnabled: jest.fn(),
    })),
  },
}));

describe('HapticService', () => {
  const mockGetState = useBoundStore.getState as jest.Mock;
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

    it('should accept SUCCESS, WARNING, and ERROR types', () => {
      // Fire-and-forget: should not throw synchronously for valid types
      expect(() => haptics.trigger('SUCCESS')).not.toThrow();
      expect(() => haptics.trigger('WARNING')).not.toThrow();
      expect(() => haptics.trigger('ERROR')).not.toThrow();
    });
  });

  describe('graceful degradation', () => {
    it('should not throw when expo-haptics is not available', () => {
      haptics.enabled = true;

      // The implementation should handle missing expo-haptics gracefully
      expect(() => haptics.trigger('SUCCESS')).not.toThrow();
    });
  });
});
