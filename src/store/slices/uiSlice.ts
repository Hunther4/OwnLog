import { StateCreator } from 'zustand';
import { FinanceStore } from '../../types/master';
import { SettingsRepository } from '../../repositories/SettingsRepository';
import { ThemeMode, Currency } from '../../types/master';

export const createUISlice: StateCreator<
  FinanceStore,
  [],
  [],
  {
    themeMode: ThemeMode;
    hapticsEnabled: boolean;
    currency: Currency;
    isDbInitialized: boolean;
    isInitializing: boolean;
    lastError: string | null;
    privacyMode: boolean;
    setThemeMode: (mode: ThemeMode) => Promise<void>;
    setCurrency: (currency: Currency) => Promise<void>;
    setHapticsEnabled: (enabled: boolean) => Promise<void>;
    setDbInitialized: (value: boolean) => void;
    setPrivacyMode: (value: boolean) => Promise<void>;
    clearError: () => void;
  }
> = (set, get) => ({
  themeMode: 'dark',
  hapticsEnabled: false,
  currency: 'CLP',
  isDbInitialized: false,
  isInitializing: false,
  lastError: null,
  privacyMode: false,

  setThemeMode: async (mode) => {
    try {
      await SettingsRepository.setSetting('theme_mode', mode);
      set({ themeMode: mode });
    } catch (error) {
      set({ lastError: 'Failed to save theme preference' });
    }
  },

  setCurrency: async (currency) => {
    try {
      await SettingsRepository.setSetting('selected_currency', currency);
      set({ currency });
    } catch (error) {
      set({ lastError: 'Failed to save currency preference' });
    }
  },

  setHapticsEnabled: async (enabled) => {
    try {
      await SettingsRepository.setSetting('haptics_enabled', enabled ? 'true' : 'false');
      set({ hapticsEnabled: enabled });
    } catch (error) {
      set({ lastError: 'Failed to save haptics preference' });
    }
  },

  setPrivacyMode: async (value) => {
    // Optimistic in-memory update first so the UI feels instant. The
    // persistence to SQLite is fire-and-forget; if it fails the in-memory
    // state is still correct for this session.
    set({ privacyMode: value });
    try {
      await SettingsRepository.setSetting('privacy_mode', value ? 'true' : 'false');
    } catch (error) {
      console.warn('[uiSlice] Failed to persist privacy_mode setting:', error);
    }
  },

  setDbInitialized: (value) => set({ isDbInitialized: value }),
  clearError: () => set({ lastError: null }),
});
