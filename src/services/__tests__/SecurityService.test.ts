import SecurityService from '../SecurityService';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(),
  randomUUID: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'sha256',
  },
}));

describe('SecurityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PIN Hashing (Task 2.1)', () => {
    it('should produce a hash for a given pin and salt using 10,000 iterations', async () => {
      const pin = '1234';
      const salt = 'random-salt';
      const mockHash = 'hashed-pin-123';
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash);

      const hash = await SecurityService.hashPin(pin, salt);
      
      expect(Crypto.digestStringAsync).toHaveBeenCalledTimes(10000);
      expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
        'sha256', 
        expect.any(String)
      );
      expect(hash).toBe(mockHash);
    });

    it('should produce the same hash for the same pin and salt', async () => {
      const pin = '1234';
      const salt = 'random-salt';
      const mockHash = 'hashed-pin-123';
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHash);

      const hash1 = await SecurityService.hashPin(pin, salt);
      const hash2 = await SecurityService.hashPin(pin, salt);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('setupPin (Task 2.2)', () => {
    it('should generate salt, hash PIN, store them, and return a recovery key', async () => {
      const pin = '1234';
      const mockSalt = 'mock-salt';
      const mockHash = 'mock-hash';
      const mockRecoveryKey = 'recovery-key-123';
      const mockRecoveryHash = 'recovery-hash-123';

      (Crypto.randomUUID as jest.Mock)
        .mockReturnValueOnce(mockSalt)
        .mockReturnValueOnce(mockRecoveryKey);
      (Crypto.digestStringAsync as jest.Mock)
        .mockResolvedValueOnce(mockHash)
        .mockResolvedValueOnce(mockRecoveryHash);
      
      const result = await SecurityService.setupPin(pin);
      
      expect(result.recoveryKey).toBe(mockRecoveryKey);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('pin_salt', mockSalt);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('pin_hash', mockHash);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('recovery_key_hash', mockRecoveryHash);
    });
  });

  describe('verifyPin (Task 2.3)', () => {
    it('should return true if the provided pin matches the stored hash', async () => {
      const pin = '1234';
      const salt = 'mock-salt';
      const hash = 'mock-hash';
      
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(salt)
        .mockResolvedValueOnce(hash);
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(hash);

      const isValid = await SecurityService.verifyPin(pin);
      expect(isValid).toBe(true);
    });

    it('should return false if the provided pin does not match the stored hash', async () => {
      const pin = 'wrong';
      const salt = 'mock-salt';
      const storedHash = 'mock-hash';
      const calculatedHash = 'wrong-hash';
      
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(salt)
        .mockResolvedValueOnce(storedHash);
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(calculatedHash);

      const isValid = await SecurityService.verifyPin(pin);
      expect(isValid).toBe(false);
    });
  });

  describe('resetPinWithRecoveryKey (Task 2.4)', () => {
    it('should reset PIN if recovery key is valid', async () => {
      const recoveryKey = 'correct-key';
      const newPin = '5678';
      const storedRecoveryHash = 'recovery-hash-123';
      const calculatedRecoveryHash = 'recovery-hash-123';
      const mockSalt = 'new-salt';
      const mockHash = 'new-hash';
      const mockNewRecoveryKey = 'new-recovery-key';
      const mockNewRecoveryHash = 'new-recovery-hash';

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(storedRecoveryHash);
      (Crypto.digestStringAsync as jest.Mock)
        .mockResolvedValueOnce(calculatedRecoveryHash)
        .mockResolvedValueOnce(mockHash)
        .mockResolvedValueOnce(mockNewRecoveryHash);
      (Crypto.randomUUID as jest.Mock).mockReturnValueOnce(mockSalt).mockReturnValueOnce(mockNewRecoveryKey);

      const success = await SecurityService.resetPinWithRecoveryKey(recoveryKey, newPin);
      
      expect(success).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('pin_salt', mockSalt);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('pin_hash', mockHash);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('recovery_key_hash', mockNewRecoveryHash);
    });

    it('should fail to reset PIN if recovery key is invalid', async () => {
      const recoveryKey = 'wrong-key';
      const newPin = '5678';
      const storedRecoveryHash = 'recovery-hash-123';
      const calculatedRecoveryHash = 'wrong-recovery-hash';

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(storedRecoveryHash);
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(calculatedRecoveryHash);

      const success = await SecurityService.resetPinWithRecoveryKey(recoveryKey, newPin);
      expect(success).toBe(false);
    });
  });

  describe('isPinConfigured (Task 2.5)', () => {
    it('should return true if pin_hash exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('some-hash');
      const configured = await SecurityService.isPinConfigured();
      expect(configured).toBe(true);
    });

    it('should return false if pin_hash does not exist', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const configured = await SecurityService.isPinConfigured();
      expect(configured).toBe(false);
    });
  });
});
