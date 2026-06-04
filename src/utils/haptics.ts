import { Platform, AccessibilityInfo } from 'react-native';
import * as expoHaptics from 'expo-haptics';
import { useBoundStore } from '../store/useBoundStore';

export type HapticType = 'SUCCESS' | 'WARNING' | 'ERROR' | 'LIGHT' | 'MEDIUM' | 'HEAVY';
export type HapticNotification = 'NOTIFICATION_SUCCESS' | 'NOTIFICATION_ERROR' | 'NOTIFICATION_WARNING';

class Haptics {
  private isHapticsSupported = Platform.OS === 'android' || Platform.OS === 'ios';
  private reduceMotionEnabled = false;
  private reduceMotionSubscription: ReturnType<typeof AccessibilityInfo.addEventListener> | null = null;

  constructor() {
    this.setupReduceMotion();
  }

  private setupReduceMotion(): void {
    try {
      AccessibilityInfo.isReduceMotionEnabled()
        .then((value) => {
          this.reduceMotionEnabled = value;
        })
        .catch(() => {
          this.reduceMotionEnabled = false;
        });
      this.reduceMotionSubscription = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        (value) => {
          this.reduceMotionEnabled = value;
        },
      );
    } catch {
      this.reduceMotionEnabled = false;
    }
  }

  get enabled(): boolean {
    try {
      return useBoundStore.getState()?.hapticsEnabled ?? false;
    } catch {
      return false;
    }
  }

  set enabled(value: boolean) {
    try {
      useBoundStore.getState()?.setHapticsEnabled(value);
    } catch {
      // Store not ready, ignore
    }
  }

  /**
   * Fire-and-forget haptic trigger. Returns immediately.
   * The native module resolves its own promise — no need to await on the JS side.
   */
  trigger(type: HapticType): void {
    if (!this.enabled || !this.isHapticsSupported || this.reduceMotionEnabled) return;
    try {
      switch (type) {
        case 'SUCCESS':
        case 'LIGHT':
          void expoHaptics.impactAsync(expoHaptics.ImpactFeedbackStyle.Light);
          break;
        case 'WARNING':
        case 'MEDIUM':
          void expoHaptics.impactAsync(expoHaptics.ImpactFeedbackStyle.Medium);
          break;
        case 'ERROR':
        case 'HEAVY':
          void expoHaptics.impactAsync(expoHaptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } catch {
      // Silently fail
    }
  }

  /**
   * Fire-and-forget haptic notification. Returns immediately.
   */
  notify(type: HapticNotification): void {
    if (!this.enabled || !this.isHapticsSupported || this.reduceMotionEnabled) return;
    try {
      switch (type) {
        case 'NOTIFICATION_SUCCESS':
          void expoHaptics.notificationAsync(expoHaptics.NotificationFeedbackType.Success);
          break;
        case 'NOTIFICATION_ERROR':
          void expoHaptics.notificationAsync(expoHaptics.NotificationFeedbackType.Error);
          break;
        case 'NOTIFICATION_WARNING':
          void expoHaptics.notificationAsync(expoHaptics.NotificationFeedbackType.Warning);
          break;
      }
    } catch {
      // Silently fail
    }
  }

  /**
   * Lightweight selection feedback for picker changes, switch toggles, etc.
   */
  selection(): void {
    if (!this.enabled || !this.isHapticsSupported) return;
    try {
      void expoHaptics.selectionAsync();
    } catch {
      // Silently fail
    }
  }

  success(): void {
    this.notify('NOTIFICATION_SUCCESS');
  }

  warning(): void {
    this.notify('NOTIFICATION_WARNING');
  }

  error(): void {
    this.notify('NOTIFICATION_ERROR');
  }
}

export default new Haptics();
