import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBoundStore } from '../../src/store/useBoundStore';
import { theme, ThemeMode, getPalette } from '../../src/theme/theme';
import { LocalBackupService } from '../../src/services/LocalBackupService';
import { PerformanceAuditor } from '../../src/services/PerformanceAuditor';
import { AuthService } from '../../src/services/AuthService';
import { SyncEngine } from '../../src/services/SyncEngine';
import * as Haptics from 'expo-haptics';
import * as AuthSession from 'expo-auth-session';

const CURRENCIES = ['CLP', 'USD', 'EUR'];
const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const router = useRouter();
  
  // ATOMIC CONSUMPTION
  const themeMode = useBoundStore((state) => state.themeMode);
  const setThemeMode = useBoundStore((state) => state.setThemeMode);
  const currency = useBoundStore((state) => state.currency);
  const setCurrency = useBoundStore((state) => state.setCurrency);
  const hapticsEnabled = useBoundStore((state) => state.hapticsEnabled);
  const setHapticsEnabled = useBoundStore((state) => state.setHapticsEnabled);
  const currentBalance = useBoundStore((state) => state.currentBalance);
  const setInitialBalance = useBoundStore((state) => state.setInitialBalance);
  const resetAllData = useBoundStore((state) => state.resetAllData);

  const palette = getPalette(themeMode);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialBalanceInput, setInitialBalanceInput] = useState('');

  // GOOGLE AUTH SETUP
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      scopes: [
        'https://www.googleapis.com/auth/drive.appdata',
        'openid',
        'profile',
        'email',
        'offline_access',
      ],
      redirectUri: AuthSession.makeRedirectUri({ scheme: 'com.drack.ownlog' }),
    },
    { authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth' }
  );

  useEffect(() => {
    if (response?.type === 'success') {
      handleLoginSuccess();
    }
  }, [response]);

  const handleLoginSuccess = async () => {
    try {
      // We wrap promptAsync to satisfy the AuthService interface
      const authResult = await response;
      if (authResult) {
        await AuthService.login(async () => authResult);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Conectados', 'Ahora puedes sincronizar tus datos con Google Drive.');
    } catch (e) {
      Alert.alert('Error de Auth', 'No se pudo completar el inicio de sesión.');
    }
  };

  const handleSync = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSyncing(true);
    try {
      const result = await SyncEngine.sync();
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Sincronización Exitosa', 'Tus datos están actualizados y seguros en la nube.');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Sincronización Fallida', result.message);
      }
    } catch (e) {
      Alert.alert('Error Crítico', 'Ocurrió un problema durante la sincronización.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSetInitialBalance = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const value = parseInt(initialBalanceInput, 10);
    if (isNaN(value) || value < 0 || value > 999999999) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Por favor, ingresa un monto válido (0 - 999,999,999).');
      return;
    }
    const amount = value;
    await setInitialBalance(amount);
    setInitialBalanceInput('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Éxito', 'Saldo inicial actualizado.');
  };

  const handleExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    const result = await LocalBackupService.exportDatabase();
    setIsLoading(false);
    Alert.alert(result.success ? 'Éxito' : 'Error', result.message);
  };

  const handleOptimize = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    const result = await LocalBackupService.optimizeDatabase();
    setIsLoading(false);
    Alert.alert(result.success ? 'Éxito' : 'Error', result.message);
  };

  const handleResetData = async () => {
    Alert.alert(
      'Zona de Peligro ⚠️',
      '¿Estás seguro de que quieres reiniciar todos los datos? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await resetAllData();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Éxito', 'Todos los datos han sido reiniciados.');
            } catch (e) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'No se pudieron reiniciar los datos.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text allowFontScaling style={[styles.header, { color: palette.text }]}>
          Ajustes
        </Text>

        <View style={[styles.section, { backgroundColor: palette.card }]}>
          <Text allowFontScaling style={[styles.sectionTitle, { color: palette.primary }]}>
            Balance
          </Text>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text allowFontScaling style={[styles.label, { color: palette.text }]}>
                Saldo Actual
              </Text>
              <Text
                allowFontScaling
                style={[
                  styles.subLabel,
                  { fontWeight: 'bold', fontSize: 18, color: palette.balanceValue },
                ]}
              >
                {currentBalance.toLocaleString()} {currency}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <TextInput
              style={[
                styles.balanceInput,
                { borderColor: palette.textSecondary + '33', color: palette.text },
              ]}
              placeholder="Nuevo Saldo Inicial"
              placeholderTextColor={palette.textSecondary}
              keyboardType="numeric"
              value={initialBalanceInput}
              onChangeText={setInitialBalanceInput}
            />
            <TouchableOpacity
              style={[styles.smallButton, { backgroundColor: palette.primary }]}
              onPress={handleSetInitialBalance}
            >
              <Text style={styles.smallButtonText}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: palette.card }]}>
          <Text allowFontScaling style={[styles.sectionTitle, { color: palette.primary }]}>
            Apariencia
          </Text>
          <Text allowFontScaling style={[styles.label, { marginBottom: 12, color: palette.text }]}>
            Elige tu tema
          </Text>
          <View style={styles.themeGrid}>
            {(['light', 'dark', 'purple'] as ThemeMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.themeOption,
                  themeMode === mode && styles.themeOptionSelected,
                  { borderColor: mode === 'purple' ? '#8b5cf6' : palette.textSecondary + '33' },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setThemeMode(mode);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.themeDot,
                    {
                      backgroundColor:
                        mode === 'light' ? '#fff' : mode === 'dark' ? '#000' : '#8b5cf6',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.themeText,
                    themeMode === mode && styles.themeTextSelected,
                    { color: palette.text },
                  ]}
                >
                  {mode === 'light' ? 'Claro' : mode === 'dark' ? 'Oscuro' : 'Púrpura'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.row, { marginTop: 20 }]}>
            <View>
              <Text allowFontScaling style={[styles.label, { color: palette.text }]}>
                Vibración táctil
              </Text>
              <Text allowFontScaling style={[styles.subLabel, { color: palette.textSecondary }]}>
                Feedback táctil en acciones importantes
              </Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={(value) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setHapticsEnabled(value);
              }}
              accessibilityLabel="Alternar vibración"
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: palette.card }]}>
          <Text allowFontScaling style={[styles.sectionTitle, { color: palette.primary }]}>
            Preferencias
          </Text>
          <Text allowFontScaling style={[styles.label, { color: palette.text }]}>
            Moneda Base
          </Text>
          <View style={styles.currencyGrid}>
            {CURRENCIES.map((curr) => (
              <TouchableOpacity
                key={curr}
                style={[
                  styles.currencyOption,
                  currency === curr && {
                    backgroundColor: palette.primary,
                    borderColor: palette.primary,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCurrency(curr as any);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Establecer moneda a ${curr}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  allowFontScaling
                  style={[
                    styles.currencyText,
                    currency === curr && { color: '#fff', fontWeight: 'bold' },
                  ]}
                >
                  {curr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: palette.card }]}>
          <Text allowFontScaling style={[styles.sectionTitle, { color: palette.primary }]}>
            Sincronización y Respaldo
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              promptAsync();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Conectar con Google Drive"
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          >
            <Text allowFontScaling style={styles.buttonText}>
              Conectar Google Drive
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: palette.primary, opacity: isSyncing ? 0.6 : 1 },
            ]}
            onPress={handleSync}
            disabled={isSyncing}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Sincronizar datos ahora"
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          >
            {isSyncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text allowFontScaling style={styles.buttonText}>
                Sincronizar Ahora
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings/backup');
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Respaldo en la nube"
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          >
            <Text allowFontScaling style={styles.buttonText}>
              Cloud Backup
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#f44336' }]}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await AuthService.logout();
              Alert.alert('Sesión Cerrada', 'Ya no estás conectado a Google Drive.');
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Desconectar cuenta de Google"
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          >
            <Text allowFontScaling style={styles.buttonText}>
              Desconectar Cuenta
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: palette.card }]}>
          <Text allowFontScaling style={[styles.sectionTitle, { color: palette.primary }]}>
            Gestión de Datos
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.primary }]}
            onPress={handleExport}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Exportar copia local de la base de datos"
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text allowFontScaling style={styles.buttonText}>
                Exportar Copia Local
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.textSecondary + '33' }]}
            onPress={handleOptimize}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Optimizar base de datos"
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          >
            {isLoading ? (
              <ActivityIndicator color={palette.text} />
            ) : (
              <Text allowFontScaling style={[styles.buttonText, { color: palette.text }]}>
                Optimizar Base de Datos
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.textSecondary + '33' }]}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsLoading(true);
              try {
                await PerformanceAuditor.runFullAudit();
              } catch (e) {
                Alert.alert('Error', 'La auditoría falló.');
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Ejecutar auditoría de rendimiento"
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          >
            {isLoading ? (
              <ActivityIndicator color={palette.text} />
            ) : (
              <Text allowFontScaling style={[styles.buttonText, { color: palette.text }]}>
                Ejecutar Auditoría de Rendimiento
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#ef4444' }]}
            onPress={handleResetData}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reiniciar todos los datos"
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text allowFontScaling style={styles.buttonText}>
                Reiniciar Todos los Datos ⚠️
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text allowFontScaling style={[styles.versionText, { color: palette.textSecondary }]}>
            OwnLog Versión {APP_VERSION}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 14,
  },
  balanceInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  smallButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  currencyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  themeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
    gap: 8,
  },
  themeOptionSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: '#8b5cf6',
  },
  themeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  themeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeTextSelected: {
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  currencyOption: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  currencyOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  currencyTextSelected: {
    color: '#fff',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
    paddingBottom: 16,
  },
  versionText: {
    fontSize: 14,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
