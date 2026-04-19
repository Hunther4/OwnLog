import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CloudBackupScreen from '../../../../app/settings/backup';
import { useBackupStore } from '../../../store/useBackupStore';
import { GoogleDriveService } from '../../../services/GoogleDriveService';

// Mock the store and service
jest.mock('../../../store/useBackupStore');
jest.mock('../../../services/GoogleDriveService');
// Mock theme
jest.mock('../../../../src/theme/theme', () => ({
  theme: {
    colors: {
      background: '#f5f5f5',
      card: '#fff',
      text: '#333',
      textSecondary: '#666',
      primary: '#007AFF',
      white: '#fff',
      error: '#ff3b30',
    },
    spacing: {
      s: 8,
      m: 16,
      l: 24,
      xl: 32,
    },
    shadows: {
      card: {},
    },
  },
}));

describe('CloudBackupScreen', () => {
  const mockSetBackupStatus = jest.fn();
  const mockPerformCloudBackup = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useBackupStore as unknown as jest.Mock).mockReturnValue({
      backupStatus: 'idle',
      errorMessage: null,
      cloudAuthStatus: 'authenticated',
      cloudUser: { email: 'test@example.com' },
      lastBackupDate: null,
      setBackupStatus: mockSetBackupStatus,
    });
    (GoogleDriveService.performCloudBackup as jest.Mock) = mockPerformCloudBackup;
  });

  it('renders the screen title', () => {
    render(<CloudBackupScreen />);
    expect(screen.getByText('Cloud Backup')).toBeTruthy();
  });

  it('shows authenticated user email', () => {
    render(<CloudBackupScreen />);
    expect(screen.getByText('Connected as:')).toBeTruthy();
    expect(screen.getByText('test@example.com')).toBeTruthy();
  });

  it('renders backup now button', () => {
    render(<CloudBackupScreen />);
    expect(screen.getByText('Backup Now')).toBeTruthy();
  });

  it('calls performCloudBackup when button pressed', async () => {
    mockPerformCloudBackup.mockResolvedValue({ success: true });
    render(<CloudBackupScreen />);
    const button = screen.getByText('Backup Now');
    fireEvent.press(button);
    expect(mockPerformCloudBackup).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator while backup in progress', async () => {
    let resolveBackup: (value: { success: boolean }) => void;
    const backupPromise = new Promise<{ success: boolean }>((resolve) => {
      resolveBackup = resolve;
    });
    mockPerformCloudBackup.mockReturnValue(backupPromise);
    render(<CloudBackupScreen />);
    const button = screen.getByText('Backup Now');
    fireEvent.press(button);
    // After pressing, button should be replaced with ActivityIndicator
    expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    // Resolve the promise
    resolveBackup!({ success: true });
    // Wait for next tick
    await Promise.resolve();
    // Button should be back
    expect(screen.getByText('Backup Now')).toBeTruthy();
  });

  it('shows success alert on backup success', async () => {
    const alertSpy = jest.spyOn(require('react-native'), 'Alert').mockImplementation({
      alert: jest.fn(),
    });
    mockPerformCloudBackup.mockResolvedValue({ success: true });
    render(<CloudBackupScreen />);
    const button = screen.getByText('Backup Now');
    fireEvent.press(button);
    await Promise.resolve(); // wait for async
    expect(alertSpy.alert).toHaveBeenCalledWith('Success', 'Backup created and uploaded successfully.');
    alertSpy.mockRestore();
  });

  it('shows error alert on backup failure', async () => {
    const alertSpy = jest.spyOn(require('react-native'), 'Alert').mockImplementation({
      alert: jest.fn(),
    });
    mockPerformCloudBackup.mockResolvedValue({ success: false, error: 'Network error' });
    render(<CloudBackupScreen />);
    const button = screen.getByText('Backup Now');
    fireEvent.press(button);
    await Promise.resolve();
    expect(alertSpy.alert).toHaveBeenCalledWith('Error', 'Network error');
    alertSpy.mockRestore();
  });

  it('disables backup button when not authenticated', () => {
    (useBackupStore as unknown as jest.Mock).mockReturnValue({
      backupStatus: 'idle',
      errorMessage: null,
      cloudAuthStatus: 'unknown',
      cloudUser: null,
      lastBackupDate: null,
    });
    render(<CloudBackupScreen />);
    const button = screen.getByText('Backup Now');
    expect(button.props.disabled).toBe(true);
  });
});