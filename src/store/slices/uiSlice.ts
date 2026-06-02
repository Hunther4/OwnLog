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
    setThemeMode: (mode: ThemeMode) => Promise<void>;
    setCurrency: (currency: Currency) => Promise<void>;
    setHapticsEnabled: (enabled: boolean) => Promise<void>;
    setDbInitialized: (value: boolean) => void;
    clearError: () => void;
  }
> = (set, get) => ({
  themeMode: 'dark',
  hapticsEnabled: false,
  currency: 'CLP',
  isDbInitialized: false,
  isInitializing: false,
  lastError: null,

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

  setDbInitialized: (value) => set({ isDbInitialized: value }),
  clearError: () => set({ lastError: null }),
});
