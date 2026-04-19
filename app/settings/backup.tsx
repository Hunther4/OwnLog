import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  FlatList,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, getPalette } from '../../src/theme/theme';
import { useBackupStore } from '../../src/store/useBackupStore';
import { GoogleDriveService, BackupItem } from '../../src/services/GoogleDriveService';
import * as BackgroundFetch from 'expo-background-fetch';
import { CLOUD_BACKUP_TASK } from '../../src/tasks/cloudBackupTask';
import EmptyState from '../../src/components/EmptyState';
import { useFinanceStore } from '../../src/store/useFinanceStore';

export default function CloudBackupScreen() {
  const { themeMode } = useFinanceStore();
  const palette = getPalette(themeMode);
  const { backupStatus, errorMessage, cloudAuthStatus, cloudUser } = useBackupStore();
  const backgroundSyncEnabled = useBackupStore((state) => state.backgroundSyncEnabled);
  const [isLoading, setIsLoading] = useState(false);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const list = await GoogleDriveService.listBackups();
      setBackups(list);
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudieron cargar los respaldos: ' +
          (error instanceof Error ? error.message : 'Error desconocido')
      );
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (cloudAuthStatus === 'authenticated') {
      loadBackups();
    } else {
      setBackups([]);
    }
  }, [cloudAuthStatus]);

  const handleBackupNow = async () => {
    setIsLoading(true);
    const result = await GoogleDriveService.performCloudBackup();
    setIsLoading(false);
    if (result.success) {
      Alert.alert('Éxito', 'Respaldo creado y subido correctamente.');
    } else {
      Alert.alert('Error', result.error || 'El respaldo falló.');
    }
  };

  const handleRestore = async (backupId: string, backupName: string) => {
    Alert.alert(
      'Confirmar Restauración',
      `¿Estás seguro de que quieres restaurar el respaldo "${backupName}"? Esto reemplazará tu base de datos actual.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            setRestoringId(backupId);
            const result = await GoogleDriveService.restoreCloudBackup(backupId);
            setRestoringId(null);
            if (result.success) {
              Alert.alert(
                'Éxito',
                `Base de datos restaurada a la versión ${result.restoredVersion}.`
              );
            } else {
              Alert.alert('Error', result.error || 'La restauración falló.');
            }
          },
        },
      ]
    );
  };

  const handleToggleBackgroundSync = async (enabled: boolean) => {
    try {
      if (enabled) {
        await BackgroundFetch.registerTaskAsync(CLOUD_BACKUP_TASK, {
          minimumInterval: 172800, // 48 hours
          stopOnTerminate: false,
          startOnBoot: true,
        });
      } else {
        await BackgroundFetch.unregisterTaskAsync(CLOUD_BACKUP_TASK);
      }
      useBackupStore.getState().setBackgroundSyncEnabled(enabled);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la sincronización en segundo plano.');
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderAuthStatus = () => {
    if (cloudAuthStatus === 'authenticated' && cloudUser) {
      return (
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Conectado como:</Text>
          <Text style={styles.statusValue}>{cloudUser.email}</Text>
        </View>
      );
    }
    if (cloudAuthStatus === 'error') {
      return (
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, styles.error]}>Error de autenticación</Text>
          <Text style={styles.statusValue}>{errorMessage}</Text>
        </View>
      );
    }
    return (
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>No conectado</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={async () => {
            try {
              await GoogleDriveService.authenticate();
            } catch (e) {
              Alert.alert('Error', 'No se pudo conectar con Google Drive');
            }
          }}
        >
          <Text style={styles.buttonText}>Conectar Cuenta de Google</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLastBackup = () => {
    const { lastBackupDate } = useBackupStore.getState();
    if (!lastBackupDate) {
      return <Text style={styles.lastBackupText}>No hay respaldos aún.</Text>;
    }
    return (
      <View style={styles.lastBackupRow}>
        <Text style={styles.lastBackupLabel}>Último respaldo:</Text>
        <Text style={styles.lastBackupValue}>{lastBackupDate}</Text>
      </View>
    );
  };

  const renderRestore = () => {
    if (cloudAuthStatus !== 'authenticated') {
      return (
        <EmptyState
          icon={<Text className="text-4xl">☁️</Text>}
          title="No conectado"
          description="Conecta una cuenta de Google para ver tus respaldos en la nube."
        />
      );
    }
    if (loadingBackups) {
      return <ActivityIndicator size="small" color={palette.primary} />;
    }
    if (backups.length === 0) {
      return (
        <EmptyState
          icon={<Text className="text-4xl">💾</Text>}
          title="No hay respaldos"
          description="Crea tu primer respaldo para proteger tus datos."
          ctaButton={{
            label: 'Crear Respaldo',
            onPress: handleBackupNow,
          }}
        />
      );
    }
    return (
      <FlatList
        data={backups}
        keyExtractor={(item) => item.id}
        renderItem={({ item: backup }) => (
          <View style={styles.backupItem}>
            <View style={styles.backupInfo}>
              <Text style={styles.backupName}>{backup.name}</Text>
              <Text style={styles.backupDetails}>
                {formatDate(backup.modifiedTime)} • {formatSize(backup.size)}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.restoreButton,
                restoringId === backup.id && styles.restoreButtonDisabled,
              ]}
              onPress={() => handleRestore(backup.id, backup.name)}
              disabled={restoringId !== null}
            >
              {restoringId === backup.id ? (
                <ActivityIndicator size="small" color={palette.white} />
              ) : (
                <Text style={styles.restoreButtonText}>Restaurar</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.header, { color: palette.text }]}>Respaldo en la Nube</Text>

        <View style={[styles.section, { backgroundColor: palette.card }]}>
          <Text style={[styles.sectionTitle, { color: palette.primary }]}>Autenticación</Text>
          {renderAuthStatus()}
        </View>

        <View style={[styles.section, { backgroundColor: palette.card }]}>
          <Text style={[styles.sectionTitle, { color: palette.primary }]}>Respaldo</Text>
          {renderLastBackup()}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.primary }]}
            onPress={handleBackupNow}
            disabled={isLoading || cloudAuthStatus !== 'authenticated'}
          >
            {isLoading ? (
              <ActivityIndicator color={palette.white} testID="activity-indicator" />
            ) : (
              <Text style={styles.buttonText}>Respaldar Ahora</Text>
            )}
          </TouchableOpacity>
          {cloudAuthStatus !== 'authenticated' && (
            <Text style={[styles.hint, { color: palette.textSecondary }]}>
              Necesitas conectar una cuenta de Google primero.
            </Text>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: palette.card }]}>
          <Text style={[styles.sectionTitle, { color: palette.primary }]}>Automatización</Text>
          <View style={styles.row}>
            <View>
              <Text style={[styles.label, { color: palette.text }]}>Sincronización Automática</Text>
              <Text style={[styles.subLabel, { color: palette.textSecondary }]}>
                Respaldo diario vía Wi-Fi
              </Text>
            </View>
            <Switch
              value={backgroundSyncEnabled}
              onValueChange={handleToggleBackgroundSync}
              disabled={cloudAuthStatus !== 'authenticated'}
            />
          </View>
          {cloudAuthStatus !== 'authenticated' && (
            <Text style={[styles.hint, { color: palette.textSecondary }]}>
              Conecta tu cuenta de Google para habilitar la sincronización.
            </Text>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: palette.card }]}>
          <Text style={[styles.sectionTitle, { color: palette.primary }]}>Restauración</Text>
          {renderRestore()}
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
    padding: theme.spacing.l,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  section: {
    borderRadius: 12,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.l,
    ...theme.shadows.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.m,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  subLabel: {
    fontSize: 14,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
  },
  error: {
    color: theme.colors.error,
  },
  lastBackupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.m,
  },
  lastBackupLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  lastBackupValue: {
    fontSize: 14,
  },
  lastBackupText: {
    fontSize: 14,
    marginBottom: theme.spacing.m,
  },
  button: {
    padding: theme.spacing.m,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: theme.spacing.s / 2,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: theme.spacing.s,
  },
  backupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backupInfo: {
    flex: 1,
  },
  backupName: {
    fontSize: 14,
    fontWeight: '500',
  },
  backupDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  restoreButton: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  restoreButtonDisabled: {
    backgroundColor: theme.colors.textSecondary,
  },
  restoreButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
