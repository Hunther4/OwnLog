import { Platform } from 'react-native';
import { useFinanceStore } from '../store/useFinanceStore';

export type HapticType = 'SUCCESS' | 'WARNING' | 'ERROR';

export interface HapticService {
  trigger(type: HapticType): Promise<void>;
  enabled: boolean;
}

class Haptics implements HapticService {
  private isHapticsSupported = Platform.OS === 'android' || Platform.OS === 'ios'; // Both platforms support haptics

  // Get enabled state from store - with guard for uninitialized store
  get enabled(): boolean {
    try {
      return useFinanceStore.getState()?.hapticsEnabled ?? false;
    } catch {
      return false;
    }
  }

  // Set enabled state in store - with guard for uninitialized store
  set enabled(value: boolean) {
    try {
      useFinanceStore.getState()?.setHapticsEnabled(value);
    } catch {
      // Store not ready, ignore
    }
  }

  async trigger(type: HapticType): Promise<void> {
    if (!this.enabled || !this.isHapticsSupported) {
      return;
    }

    try {
      // Try to import expo-haptics dynamically to avoid breaking the app if not installed
      const expoHaptics = await import('expo-haptics');

      switch (type) {
        case 'SUCCESS':
          await expoHaptics.impactAsync(expoHaptics.ImpactFeedbackStyle.Light);
          break;
        case 'WARNING':
          await expoHaptics.impactAsync(expoHaptics.ImpactFeedbackStyle.Medium);
          break;
        case 'ERROR':
          await expoHaptics.impactAsync(expoHaptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } catch (error) {
      // Silently fail if expo-haptics is not installed
      console.debug('Haptics not available:', error);
    }
  }
}

export default new Haptics(); // singleton
