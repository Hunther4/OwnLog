import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView, Switch, Modal } from 'react-native';
import { useBoundStore } from '../../src/store/useBoundStore';
import { getPalette } from '../../src/theme/theme';
import Haptics from '../../src/utils/haptics';
import * as Sharing from 'expo-sharing';
import { writeAsStringAsync, EncodingType, cacheDirectory } from 'expo-file-system/legacy';
import { LocalBackupService } from '../../src/services/LocalBackupService';
import { PerformanceAuditor } from '../../src/services/PerformanceAuditor';
import { exportTransactionsToXLSX } from '../../src/utils/exportService';
import { exportToJSON, importFromJSON } from '../../src/utils/shareService';
import { ThemeMode, Currency } from '../../src/types/master';
import CollapsibleSection from '../../src/components/CollapsibleSection';

const CURRENCIES = ['CLP', 'USD', 'EUR'];
const APP_VERSION = '1.2.18';

export default function SettingsScreen() {
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
  const [initialBalanceInput, setInitialBalanceInput] = useState('');
  const [importVisible, setImportVisible] = useState(false);
  const [importText, setImportText] = useState('');

  const handleSetInitialBalance = async () => {
    Haptics.trigger('MEDIUM');
    const value = parseInt(initialBalanceInput, 10);
    if (isNaN(value) || value < 0 || value > 999999999) {
      Haptics.notify('NOTIFICATION_ERROR');
      Alert.alert('Error', 'Por favor, ingresa un monto válido (0 - 999,999,999).');
      return;
    }
    await setInitialBalance(value);
    setInitialBalanceInput('');
    Haptics.notify('NOTIFICATION_SUCCESS');
    Alert.alert('Éxito', 'Saldo inicial actualizado.');
  };

  const handleExport = async () => {
    Haptics.trigger('LIGHT');
    setIsLoading(true);
    const result = await LocalBackupService.exportDatabase();
    setIsLoading(false);
    Alert.alert(result.success ? 'Éxito' : 'Error', result.message);
  };

  const handleXLSXExport = async () => {
    Haptics.trigger('LIGHT');
    setIsLoading(true);
    const result = await exportTransactionsToXLSX();
    setIsLoading(false);
    Alert.alert(result.success ? 'Éxito' : 'Error', result.error || 'Exportación completada.');
  };

  const handleOptimize = async () => {
    Haptics.trigger('LIGHT');
    setIsLoading(true);
    const result = await LocalBackupService.optimizeDatabase();
    setIsLoading(false);
    Alert.alert(result.success ? 'Éxito' : 'Error', result.message);
  };

  const handleLocalRestore = async () => {
    Haptics.trigger('LIGHT');
    Alert.alert(
      'Restaurar Respaldo Local',
      '¿Quieres restaurar la base de datos desde el último respaldo automático (.bak)? La app se reiniciará después.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            setIsLoading(true);
            const result = await LocalBackupService.restoreFromLocalBackup();
            setIsLoading(false);
            Alert.alert(
              result.success ? 'Éxito' : 'Error',
              result.message
            );
          },
        },
      ]
    );
  };

  const handleExportJSON = async () => {
    Haptics.trigger('LIGHT');
    try {
      const json = await exportToJSON();
      const path = `${cacheDirectory ?? ''}OwnLog_Share.json`;
      await writeAsStringAsync(path, json, { encoding: EncodingType.UTF8 });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Error', 'Compartir no está disponible en este dispositivo.');
        return;
      }
      await Sharing.shareAsync(path);
    } catch (e) {
      Alert.alert('Error', 'No se pudo exportar los datos.');
    }
  };

  const handleImportJSON = () => {
    setImportVisible(true);
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
              Haptics.notify('NOTIFICATION_SUCCESS');
              Alert.alert('Éxito', 'Todos los datos han sido reiniciados.');
            } catch (e) {
              Haptics.notify('NOTIFICATION_ERROR');
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
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 80 }]}>
        <Text allowFontScaling style={[styles.header, { color: palette.text }]}>
          Ajustes
        </Text>

        {/* Balance + Compartir/Importar JSON */}
        <CollapsibleSection title="Balance" icon="💰" themeMode={themeMode} defaultExpanded>
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
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#2563eb' }]}
            onPress={handleExportJSON}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Compartir datos como JSON"
          >
            <Text allowFontScaling style={styles.buttonText}>
              📤 Compartir Datos (JSON)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#7c3aed' }]}
            onPress={handleImportJSON}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Importar datos desde JSON"
          >
            <Text allowFontScaling style={styles.buttonText}>
              📥 Importar Datos (JSON)
            </Text>
          </TouchableOpacity>
        </CollapsibleSection>

        {/* Apariencia */}
        <CollapsibleSection title="Apariencia" icon="🎨" themeMode={themeMode}>
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
                  Haptics.trigger('LIGHT');
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
                  allowFontScaling
                  style={[
                    styles.themeText,
                    themeMode === mode && styles.themeTextSelected,
                    { color: themeMode === mode ? '#8b5cf6' : palette.text },
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
                Haptics.trigger('LIGHT');
                setHapticsEnabled(value);
              }}
              accessibilityLabel="Alternar vibración"
            />
          </View>
        </CollapsibleSection>

        {/* Preferencias */}
        <CollapsibleSection title="Preferencias" icon="⚙️" themeMode={themeMode}>
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
                  Haptics.trigger('LIGHT');
                  setCurrency(curr as Currency);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Establecer moneda a ${curr}`}
              >
                <Text
                  allowFontScaling
                  style={[
                    styles.currencyText,
                    currency === curr && { color: palette.white, fontWeight: 'bold' },
                  ]}
                >
                  {curr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </CollapsibleSection>

        {/* Gestión de Datos Local */}
        <CollapsibleSection title="Gestión de Datos" icon="🗄️" themeMode={themeMode}>
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
          >
            <Text allowFontScaling style={styles.buttonText}>
              Exportar Copia Local
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#059669' }]}
            onPress={handleLocalRestore}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Restaurar desde respaldo local"
          >
            <Text allowFontScaling style={styles.buttonText}>
              🔄 Restaurar Respaldo Local
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#217346' }]}
            onPress={handleXLSXExport}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Exportar a Excel (.xlsx)"
          >
            <Text allowFontScaling style={styles.buttonText}>
              📊 Exportar a Excel (.xlsx)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.textSecondary + '33' }]}
            onPress={handleOptimize}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Optimizar base de datos"
          >
            <Text allowFontScaling style={[styles.buttonText, { color: palette.text }]}>
              Optimizar Base de Datos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.textSecondary + '33' }]}
            onPress={async () => {
              Haptics.trigger('LIGHT');
              setIsLoading(true);
              try {
                const result = await PerformanceAuditor.runFullAudit();
                const aggResult = await PerformanceAuditor.validateAggregations();
                const aggText = aggResult.passed
                  ? `• Transacciones: ${aggResult.metrics.transactions}\n• Categorías: ${aggResult.metrics.categories}\n• Saldo total: $${(aggResult.metrics.totalBalance ?? 0).toLocaleString('es-CL')}`
                  : '• No se pudo validar las agregaciones';
                Alert.alert(
                  result.passed ? '✅ Auditoría OK' : '⚠️ Auditoría con observaciones',
                  `${result.details}\n\nEstado de datos:\n${aggText}`
                );
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
          >
            <Text allowFontScaling style={[styles.buttonText, { color: palette.text }]}>
              Ejecutar Auditoría de Rendimiento
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.delete }]}
            onPress={handleResetData}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reiniciar todos los datos"
          >
            <Text allowFontScaling style={styles.buttonText}>
              Reiniciar Todos los Datos ⚠️
            </Text>
          </TouchableOpacity>
        </CollapsibleSection>

        <View style={styles.footer}>
          <Text allowFontScaling style={[styles.versionText, { color: palette.textSecondary }]}>
            OwnLog Versión {APP_VERSION}
          </Text>
        </View>
      </ScrollView>

      {/* Modal Importación JSON */}
      <Modal visible={importVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
            <View style={[styles.modalContent, { backgroundColor: palette.card }]}>
              <Text allowFontScaling style={[styles.modalTitle, { color: palette.text }]}>Importar Datos</Text>
              <Text allowFontScaling style={{ color: palette.textSecondary, marginBottom: 12 }}>
                Pega el JSON que recibiste por WhatsApp.
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
                placeholder='{"version":1,"categories":[...]}'
                placeholderTextColor={palette.textSecondary}
                multiline
                textAlignVertical="top"
                value={importText}
                onChangeText={setImportText}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <TouchableOpacity onPress={() => { setImportVisible(false); setImportText(''); }}>
                  <Text allowFontScaling style={{ color: palette.textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, backgroundColor: palette.primary }}
                  onPress={async () => {
                    if (!importText.trim()) { Alert.alert('Error', 'Pega el JSON primero.'); return; }
                    setIsLoading(true);
                    try {
                      const result = await importFromJSON(importText);
                      Alert.alert('Importado', `Categorías: ${result.categories}, Transacciones: ${result.transactions}. Reinicia la app.`);
                      setImportVisible(false);
                      setImportText('');
                    } catch (e) {
                      Alert.alert('Error', 'Formato inválido.');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  <Text allowFontScaling style={{ color: palette.white, fontWeight: '600' }}>Importar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
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
  },
  currencyOption: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    marginBottom: 8,
  },
});
