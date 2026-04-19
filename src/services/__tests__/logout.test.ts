import { GoogleDriveService } from '../GoogleDriveService';
import * as SecureStore from 'expo-secure-store';
import { useBackupStore } from '../../store/useBackupStore';

const mockStore = {
  setCloudAuthStatus: jest.fn(),
  setCloudUser: jest.fn(),
};

jest.mock('expo-secure-store');
jest.mock('../../store/useBackupStore', () => ({
  useBackupStore: {
    getState: jest.fn(() => mockStore),
  },
}));

describe('GoogleDriveService Logout', () => {
  it('should clear refresh token and reset store state', async () => {
    await GoogleDriveService.logout();
    
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('google_drive_refresh_token');
    expect(mockStore.setCloudAuthStatus).toHaveBeenCalledWith('unknown');
    expect(mockStore.setCloudUser).toHaveBeenCalledWith(null);
  });
});
