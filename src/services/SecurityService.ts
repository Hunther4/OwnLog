import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PIN_SALT_KEY = 'pin_salt';
const PIN_HASH_KEY = 'pin_hash';
const RECOVERY_KEY_HASH_KEY = 'recovery_key_hash';
const PIN_ATTEMPTS_KEY = 'pin_attempts';
const PIN_LOCKOUT_KEY = 'pin_lockout';

const MAX_ATTEMPTS = 5;
const LOCKOUT_BASE_MS = 30_000; // 30 seconds initial lockout

const SecurityService = {
  /**
   * Hashes a PIN using SHA-256 with a given salt and 10,000 iterations.
   * Strictly follows the project blueprint for key stretching.
   */
  async hashPin(pin: string, salt: string): Promise<string> {
    let currentHash = `${pin}:${salt}`;

    for (let i = 0; i < 10000; i++) {
      currentHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        currentHash
      );
    }

    return currentHash;
  },

  /**
   * Generates a new salt and recovery key, hashes the PIN and recovery key,
   * and stores them securely.
   * @returns The plain-text recovery key (should be shown to user once).
   */
  async setupPin(pin: string): Promise<{ recoveryKey: string }> {
    const salt = Crypto.randomUUID();
    const pinHash = await this.hashPin(pin, salt);

    const recoveryKey = Crypto.randomUUID();
    const recoveryHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      recoveryKey
    );

    await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
    await SecureStore.setItemAsync(PIN_HASH_KEY, pinHash);
    await SecureStore.setItemAsync(RECOVERY_KEY_HASH_KEY, recoveryHash);

    return { recoveryKey };
  },

  /**
   * Validates the provided PIN against the stored hash.
   * Includes brute-force protection with exponential lockout.
   */
  async verifyPin(pin: string): Promise<boolean> {
    const salt = await SecureStore.getItemAsync(PIN_SALT_KEY);
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);

    if (!salt || !storedHash) {
      return false;
    }

    // Check lockout
    const lockoutUntil = await SecureStore.getItemAsync(PIN_LOCKOUT_KEY);
    if (lockoutUntil) {
      const lockoutMs = parseInt(lockoutUntil, 10);
      if (Date.now() < lockoutMs) {
        const remainingSec = Math.ceil((lockoutMs - Date.now()) / 1000);
        throw new Error(`Demasiados intentos. Espera ${remainingSec} segundos.`);
      }
      // Lockout expired, reset
      await SecureStore.deleteItemAsync(PIN_LOCKOUT_KEY);
      await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, '0');
    }

    const calculatedHash = await this.hashPin(pin, salt);
    if (calculatedHash === storedHash) {
      // Success: reset attempts
      await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, '0');
      return true;
    }

    // Failure: increment attempts
    const attemptsStr = await SecureStore.getItemAsync(PIN_ATTEMPTS_KEY);
    const attempts = (parseInt(attemptsStr || '0', 10)) + 1;
    await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, attempts.toString());

    if (attempts >= MAX_ATTEMPTS) {
      // Exponential lockout: 30s, 60s, 120s, capped at 5 min
      const lockoutMs = Math.min(LOCKOUT_BASE_MS * Math.pow(2, attempts - MAX_ATTEMPTS), 300_000);
      await SecureStore.setItemAsync(PIN_LOCKOUT_KEY, (Date.now() + lockoutMs).toString());
      throw new Error(`Demasiados intentos fallidos. Cuenta bloqueada temporalmente.`);
    }

    return false;
  },

  /**
   * Resets the PIN using the recovery key.
   */
  async resetPinWithRecoveryKey(key: string, newPin: string): Promise<boolean> {
    const storedRecoveryHash = await SecureStore.getItemAsync(RECOVERY_KEY_HASH_KEY);

    if (!storedRecoveryHash) {
      return false;
    }

    const calculatedRecoveryHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      key
    );

    if (calculatedRecoveryHash !== storedRecoveryHash) {
      return false;
    }

    // Recovery key is valid, update PIN and salt only.
    // Keep existing recovery key (sovereign recovery principle).
    const newSalt = Crypto.randomUUID();
    const pinHash = await this.hashPin(newPin, newSalt);

    await SecureStore.setItemAsync(PIN_SALT_KEY, newSalt);
    await SecureStore.setItemAsync(PIN_HASH_KEY, pinHash);
    return true;
  },

  /**
   * Checks if a PIN has been configured.
   */
  async isPinConfigured(): Promise<boolean> {
    const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    return !!hash;
  },
};

export default SecurityService;
