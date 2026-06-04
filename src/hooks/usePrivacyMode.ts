import { useCallback } from 'react';
import { useBoundStore } from '../store/useBoundStore';

/**
 * Privacy mode hook — returns the current privacy state and a toggle
 * function. The hook is intentionally not yet wired into any screen: it
 * establishes the foundation (store field + persistence + typed selector)
 * so a follow-up round can plug it into Dashboard, TransactionList, etc.
 *
 * Privacy mode hides monetary amounts when active (caller responsibility).
 */
export function usePrivacyMode(): readonly [
  privacyMode: boolean,
  toggle: () => void,
  setPrivacyMode: (value: boolean) => Promise<void>,
] {
  const privacyMode = useBoundStore((s) => s.privacyMode);
  const setPrivacyMode = useBoundStore((s) => s.setPrivacyMode);

  const toggle = useCallback(() => {
    void setPrivacyMode(!privacyMode);
  }, [privacyMode, setPrivacyMode]);

  return [privacyMode, toggle, setPrivacyMode] as const;
}
