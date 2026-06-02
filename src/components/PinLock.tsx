import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import SecurityService from '../services/SecurityService';
import { getPalette } from '../theme/theme';
import { useBoundStore } from '../store/useBoundStore';
import Haptics from '../utils/haptics';

interface PinLockProps {
  onUnlock: () => void;
}

export default function PinLock({ onUnlock }: PinLockProps) {
  const themeMode = useBoundStore((state) => state.themeMode);
  const palette = getPalette(themeMode);

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupPin, setSetupPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

  useEffect(() => {
    SecurityService.isPinConfigured().then((configured) => {
      setIsSetupMode(!configured);
      setIsLoading(false);
    });
  }, []);

  const handleUnlock = useCallback(async () => {
    if (pin.length < 4) return;
    const valid = await SecurityService.verifyPin(pin);
    if (valid) {
      Haptics.notify('NOTIFICATION_SUCCESS');
      onUnlock();
    } else {
      Haptics.notify('NOTIFICATION_ERROR');
      setError('PIN incorrecto');
      setPin('');
    }
  }, [pin, onUnlock]);

  const handleSetupSubmit = useCallback(async () => {
    if (setupPin.length < 4) {
      setError('El PIN debe tener al menos 4 dígitos');
      return;
    }
    if (setupPin !== confirmPin) {
      setError('Los PIN no coinciden');
      setConfirmPin('');
      return;
    }
    const result = await SecurityService.setupPin(setupPin);
    setRecoveryKey(result.recoveryKey);
    Haptics.notify('NOTIFICATION_SUCCESS');
  }, [setupPin, confirmPin]);

  const handlePinInput = (digit: string) => {
    Haptics.trigger('LIGHT');
    if (isSetupMode) {
      if (!recoveryKey) {
        if (setupPin.length < 6) setSetupPin(setupPin + digit);
      }
    } else {
      if (pin.length < 6) {
        setPin(pin + digit);
        setError('');
      }
    }
  };

  const handleDelete = () => {
    Haptics.trigger('LIGHT');
    if (isSetupMode && !recoveryKey) {
      setSetupPin(setupPin.slice(0, -1));
    } else if (!isSetupMode) {
      setPin(pin.slice(0, -1));
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <Text allowFontScaling style={[styles.title, { color: palette.text }]}>Cargando...</Text>
      </View>
    );
  }

  if (isSetupMode) {
    if (recoveryKey) {
      return (
        <View style={[styles.container, { backgroundColor: palette.background }]}>
          <Text allowFontScaling style={[styles.emoji, { color: palette.text }]}>🔑</Text>
          <Text allowFontScaling style={[styles.title, { color: palette.text }]}>¡PIN configurado!</Text>
          <Text allowFontScaling style={[styles.subtitle, { color: palette.textSecondary }]}>
            Guarda esta clave de recuperación en un lugar seguro. La necesitarás si olvidas tu PIN.
          </Text>
          <View style={[styles.recoveryBox, { backgroundColor: palette.card, borderColor: palette.goldBorder || '#FFD700' }]}>
            <Text allowFontScaling selectable style={[styles.recoveryKey, { color: palette.text }]}>
              {recoveryKey}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.primary }]}
            onPress={() => setIsSetupMode(false)}
          >
            <Text allowFontScaling style={styles.buttonText}>Entendido, continuar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <Text allowFontScaling style={[styles.emoji, { color: palette.text }]}>🔐</Text>
        <Text allowFontScaling style={[styles.title, { color: palette.text }]}>Configura tu PIN</Text>
        <Text allowFontScaling style={[styles.subtitle, { color: palette.textSecondary }]}>
          {!confirmPin ? 'Elige un PIN de 4 a 6 dígitos' : 'Confirma tu PIN'}
        </Text>

        <View style={styles.dots}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  borderColor: palette.textSecondary,
                  backgroundColor: (confirmPin || setupPin).length > i ? palette.primary : 'transparent',
                },
              ]}
            />
          ))}
        </View>

        {error ? (
          <Text allowFontScaling style={[styles.errorText, { color: palette.delete }]}>{error}</Text>
        ) : null}

        <View style={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.key, { borderColor: palette.textSecondary + '33' }]}
              onPress={() => handlePinInput(n.toString())}
            >
              <Text allowFontScaling style={[styles.keyText, { color: palette.text }]}>{n}</Text>
            </TouchableOpacity>
          ))}
          <View style={[styles.key, { borderColor: 'transparent' }]} />
          <TouchableOpacity
            style={[styles.key, { borderColor: palette.textSecondary + '33' }]}
            onPress={() => handlePinInput('0')}
          >
            <Text allowFontScaling style={[styles.keyText, { color: palette.text }]}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.key, { borderColor: palette.textSecondary + '33' }]}
            onPress={handleDelete}
          >
            <Text allowFontScaling style={[styles.keyText, { color: palette.text }]}>⌫</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: confirmPin ? palette.primary : palette.textSecondary + '33', marginTop: 16 }]}
          onPress={() => {
            if (!confirmPin && setupPin.length >= 4) {
              setConfirmPin('');
            } else if (confirmPin) {
              handleSetupSubmit();
            }
          }}
          disabled={confirmPin ? confirmPin.length < 4 : setupPin.length < 4}
        >
          <Text allowFontScaling style={[styles.buttonText, { color: confirmPin ? palette.white : palette.textSecondary }]}>
            {confirmPin ? 'Confirmar PIN' : 'Continuar'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Text allowFontScaling style={[styles.emoji, { color: palette.text }]}>🔒</Text>
      <Text allowFontScaling style={[styles.title, { color: palette.text }]}>Desbloquear</Text>
      <Text allowFontScaling style={[styles.subtitle, { color: palette.textSecondary }]}>
        Ingresa tu PIN para acceder
      </Text>

      <View style={styles.dots}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                borderColor: palette.textSecondary,
                backgroundColor: pin.length > i ? palette.primary : 'transparent',
              },
            ]}
          />
        ))}
      </View>

      {error ? (
        <Text allowFontScaling style={[styles.errorText, { color: palette.delete }]}>{error}</Text>
      ) : null}

      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.key, { borderColor: palette.textSecondary + '33' }]}
            onPress={() => handlePinInput(n.toString())}
          >
            <Text allowFontScaling style={[styles.keyText, { color: palette.text }]}>{n}</Text>
          </TouchableOpacity>
        ))}
        <View style={[styles.key, { borderColor: 'transparent' }]} />
        <TouchableOpacity
          style={[styles.key, { borderColor: palette.textSecondary + '33' }]}
          onPress={() => handlePinInput('0')}
        >
          <Text allowFontScaling style={[styles.keyText, { color: palette.text }]}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.key, { borderColor: palette.textSecondary + '33' }]}
          onPress={handleDelete}
        >
          <Text allowFontScaling style={[styles.keyText, { color: palette.text }]}>⌫</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: palette.primary, marginTop: 16 }]}
        onPress={handleUnlock}
        disabled={pin.length < 4}
      >
        <Text allowFontScaling style={styles.buttonText}>Desbloquear</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '600',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 240,
    gap: 12,
  },
  key: {
    width: 64,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  recoveryBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 24,
    alignItems: 'center',
  },
  recoveryKey: {
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
