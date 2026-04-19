import { useBackupStore } from '../../store/useBackupStore';

describe('useBackupStore', () => {
  beforeEach(() => {
    useBackupStore.setState({
      isAuth: false,
      lastBackupDate: null,
      backupStatus: 'idle',
      errorMessage: null,
      cloudAuthStatus: 'unknown',
      cloudUser: null,
    });
  });

  it('should have cloudAuthStatus field', () => {
    const state = useBackupStore.getState();
    expect(state).toHaveProperty('cloudAuthStatus');
    expect(state.cloudAuthStatus).toBe('unknown');
  });

  it('should have cloudUser field', () => {
    const state = useBackupStore.getState();
    expect(state).toHaveProperty('cloudUser');
    expect(state.cloudUser).toBeNull();
  });

  it('should have setCloudAuthStatus action', () => {
    const { setCloudAuthStatus } = useBackupStore.getState();
    expect(typeof setCloudAuthStatus).toBe('function');
    setCloudAuthStatus('authenticated');
    expect(useBackupStore.getState().cloudAuthStatus).toBe('authenticated');
  });

  it('should have setCloudUser action', () => {
    const { setCloudUser } = useBackupStore.getState();
    expect(typeof setCloudUser).toBe('function');
    const user = { email: 'test@example.com', name: 'Test' };
    setCloudUser(user);
    expect(useBackupStore.getState().cloudUser).toEqual(user);
  });
});