import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PIN_SALT_KEY = 'pin_salt';
const PIN_HASH_KEY = 'pin_hash';
const RECOVERY_KEY_HASH_KEY = 'recovery_key_hash';

const SecurityService = {
  /**
   * Hashes a PIN using SHA-256 with a given salt.
   * Used by verifyPin and setupPin.
   */
  async hashPin(pin: string, salt: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${pin}:${salt}`
    );
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
   */
  async verifyPin(pin: string): Promise<boolean> {
    const salt = await SecureStore.getItemAsync(PIN_SALT_KEY);
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);

    if (!salt || !storedHash) {
      return false;
    }

    const calculatedHash = await this.hashPin(pin, salt);
    return calculatedHash === storedHash;
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

    // Recovery key is valid, setup new PIN.
    // We reuse setupPin but this also generates a new recovery key.
    // According to the design, the recovery key is sovereign and can be used to reset.
    // The design doesn't explicitly say if the recovery key changes on reset, 
    // but generating a new one is safer. 
    // However, the interface returns the new recovery key.
    await this.setupPin(newPin);
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
