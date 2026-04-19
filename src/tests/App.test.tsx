import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import App from '../App';
import SQLiteEngine from '../database/SQLiteEngine';
import { useFinanceStore } from '../store/useFinanceStore';
import { auditBalance } from '../utils/balanceChecksum';

jest.mock('../database/SQLiteEngine');
jest.mock('../store/useFinanceStore');
jest.mock('../utils/balanceChecksum');

describe('App', () => {
  it('should render and not block on auditBalance', async () => {
    // Mock hydrate to resolve slowly
    (useFinanceStore as any).mockReturnValue({
      hydrate: jest.fn().mockReturnValue(new Promise((resolve) => setTimeout(resolve, 50))),
      transactions: [],
      categories: [],
      currentBalance: 0,
      isInitializing: false,
      lastError: null,
      clearError: jest.fn(),
    });
    (SQLiteEngine.initialize as jest.Mock).mockResolvedValue(undefined);
    (auditBalance as jest.Mock).mockReturnValue(
      new Promise((resolve) => setTimeout(() => resolve(true), 100))
    );

    const { getByText } = render(<App />);

    // Initial render
    expect(getByText('Loading OwnLog...')).toBeDefined();

    // After hydrate resolves, it should render the content
    await waitFor(() => {
      expect(getByText('OwnLog')).toBeDefined();
    });
  });
});
