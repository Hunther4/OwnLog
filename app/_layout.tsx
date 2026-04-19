import React, { useEffect, useState } from 'react';
console.log('[ROOT] 🛠️ Layout file loaded. JS is executing!');
import * as BackgroundFetch from 'expo-background-fetch';
import { CLOUD_BACKUP_TASK } from '../src/tasks/cloudBackupTask';
import { View, Text, StyleSheet, Alert, TouchableOpacity, AppState } from 'react-native';
import { Stack, ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SQLiteEngine from '../src/database/SQLiteEngine';
import { useFinanceStore } from '../src/store/useFinanceStore';
import { useBoundStore } from '../src/store/useBoundStore';
import { useBackupStore } from '../src/store/useBackupStore';



import OnboardingScreen from '../src/components/OnboardingScreen';
import FloatingDock from '../src/components/FloatingDock';
import { auditBalance } from '../src/utils/balanceChecksum';
import * as Sentry from '@sentry/react-native';
import { getConfig } from '../src/utils/config';
import { getPalette } from '../src/theme/theme';
import { useRouter } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const sentryDsn = getConfig('SENTRY_DSN');
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    debug: process.env.NODE_ENV === 'development',
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV || 'development',
  });
  console.log('[Layout] ✅ Sentry initialized');
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  const [showRecovery, setShowRecovery] = useState(false);
  const isDbError =
    props.error.message.toLowerCase().includes('sqlite') ||
    props.error.message.toLowerCase().includes('database');

  const handleRestore = () => {
    Alert.alert(
      'Restaurar datos',
      '¿Tienes un respaldo en la nube? Se reemplazarán los datos locales.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: () => {
            // Trigger cloud restore
            Alert.alert('Restauración', 'Funcionalidad de restauración coming soon');
          },
        },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert('Restablecer App', '⚠️ Esto borrará TODOS tus datos locales. ¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar Todo',
        style: 'destructive',
        onPress: async () => {
          try {
            await SQLiteEngine.resetDatabase();
            Alert.alert('Listo', 'Por favor reinicia la app manualmente.');
          } catch (e) {
            Alert.alert('Error', 'No se pudo resetear la base de datos.');
          }
        },
      },
    ]);
  };

  if (showRecovery) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Opciones de Recuperación</Text>
          <Text style={styles.errorSubtext}>Elige cómo quieres recuperar tu información:</Text>
          <TouchableOpacity style={styles.button} onPress={handleRestore}>
            <Text style={styles.buttonText}>☁️ Restaurar desde la Nube</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#ff5252', marginTop: 12 }]}
            onPress={handleReset}
          >
            <Text style={styles.buttonText}>🗑️ Restablecer Datos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#666', marginTop: 12 }]}
            onPress={() => setShowRecovery(false)}
          >
            <Text style={styles.buttonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>¡Algo salió mal!</Text>
        <Text style={styles.errorSubtext}>
          {isDbError
            ? 'Tuvimos un problema al acceder a tus datos.'
            : 'Ocurrió un error inesperado en la aplicación.'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={props.retry}>
          <Text style={styles.buttonText}>Intentar de nuevo</Text>
        </TouchableOpacity>
        {isDbError && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#4caf50', marginTop: 12 }]}
            onPress={() => setShowRecovery(true)}
          >
            <Text style={styles.buttonText}>🔧 Opciones de Recuperación</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function Layout() {
  console.log('[Layout] 🎨 Rendering Layout component...');
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const financeStore = useFinanceStore();
  const router = useRouter();
  const palette = getPalette(financeStore.themeMode);

  useEffect(() => {
    async function initialize() {
      console.log('[Layout] 🚀 Starting initialization...');
      try {
        console.log('[Layout] 📦 Loading fonts...');
        await Font.loadAsync({
          Ionicons: require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
        }).catch((e) => console.warn('[Layout] Font loading failed', e));
        setFontsLoaded(true);
        console.log('[Layout] ✅ Fonts loaded');

        console.log('[Layout] 🗄️ Initializing SQLiteEngine...');
        await SQLiteEngine.initialize();

        if (SQLiteEngine.getState() === 'FAILED') {
          throw new Error('Database initialization failed: Critical storage or corruption error.');
        }
        console.log('[Layout] ✅ SQLiteEngine initialized');

        financeStore.setDbInitialized(true);

        console.log('[Layout] 💧 Hydrating useBoundStore...');
        await useBoundStore.getState().hydrate();
        console.log('[Layout] ✅ useBoundStore hydrated');

        console.log('[Layout] 💧 Hydrating finance store...');
        await financeStore.hydrate();
        console.log('[Layout] ✅ Store hydrated');

        console.log('[Layout] 📈 Incrementing app opens...');
        const openCount = await financeStore.incrementAppOpens();
        console.log(`[Layout] ✅ App opens: ${openCount}`);
        if (openCount <= 3) {
          setShowOnboarding(true);
        }

        console.log('[Layout] ⚖️ Auditing balance...');
        auditBalance().then((auditPassed) => {
          console.log(`[Layout] ✅ Balance audit passed: ${auditPassed}`);
          if (!auditPassed) {
            console.warn('[App] Balance audit detected drift');
          }
        });

        console.log('[Layout] ☁️ Registering background backup...');
        const { backgroundSyncEnabled } = useBackupStore.getState();
        if (backgroundSyncEnabled) {
          await BackgroundFetch.registerTaskAsync(CLOUD_BACKUP_TASK, {
            minimumInterval: 172800, // 48 hours
            stopOnTerminate: false,
            startOnBoot: true,
          });
          console.log('[Layout] ✅ Background backup registered');
        } else {
          console.log('[Layout] ℹ️ Background backup disabled');
        }
      } catch (error) {
        console.error('[Layout] ❌ Initialization error:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown error');
        Alert.alert('Initialization Error', 'Could not start the application.');
      } finally {
        console.log('[Layout] 🏁 Hiding splash screen...');
        await SplashScreen.hideAsync();
        console.log('[Layout] ✅ Splash screen hidden');
      }
    }
    // Run once on mount - empty deps prevent infinite loop
    initialize();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        console.log(
          '[Layout] 🧹 App moving to background. Triggering WAL checkpoint (TRUNCATE)...'
        );
        SQLiteEngine.checkpoint().catch((e) => console.error('[Layout] Checkpoint failed', e));
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (financeStore.lastError) {
      Alert.alert('Operation Failed', financeStore.lastError);
      financeStore.clearError();
    }
  }, [financeStore.lastError]);

  if (initError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Error de Inicialización</Text>
          <Text style={styles.errorSubtext}>No pudimos iniciar la base de datos.</Text>
          <Text style={styles.errorMessage}>{initError}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setInitError(null);
            }}
          >
            <Text style={styles.buttonText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!financeStore.isDbInitialized || financeStore.isInitializing || !fontsLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading OwnLog...</Text>
      </SafeAreaView>
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={financeStore.themeMode === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: palette.background,
            },
            headerTintColor: palette.text,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add-transaction" options={{ title: 'Agregar Transacción' }} />
          {/* settings folder screens are auto-generated from app/settings/*.tsx */}
          <Stack.Screen name="settings/backup" options={{ title: 'Respaldo' }} />
          
          <Stack.Screen name="+not-found" options={{ title: 'Página no encontrada' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  errorMessage: {
    fontSize: 14,
    color: 'red',
    marginTop: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2e78b7',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
});
