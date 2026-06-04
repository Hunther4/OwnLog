import React, { useEffect, useState } from 'react';
log('[ROOT] 🛠️ Layout file loaded. JS is executing!');
import { View, Text, StyleSheet, Alert, TouchableOpacity, AppState } from 'react-native';
import { Stack, ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ScreenCapture from 'expo-screen-capture';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SQLiteEngine from '../src/database/SQLiteEngine';
import { useBoundStore } from '../src/store/useBoundStore';
import { RecurringScheduler } from '../src/recurring/scheduler';
import OnboardingScreen from '../src/components/OnboardingScreen';
import PinLock from '../src/components/PinLock';
import SecurityService from '../src/services/SecurityService';
import { LocalBackupService } from '../src/services/LocalBackupService';
import { auditBalance, reconcileBalance } from '../src/utils/balanceChecksum';
import * as Sentry from '@sentry/react-native';
import { getConfig } from '../src/utils/config';
import { getPalette } from '../src/theme/theme';
import { log, warn } from '../src/utils/log';


const sentryDsn = getConfig('SENTRY_DSN');
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    debug: process.env.NODE_ENV === 'development',
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV || 'development',
  });
  log('[Layout] ✅ Sentry initialized');
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  const [showRecovery, setShowRecovery] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isDbError =
    props.error.message.toLowerCase().includes('sqlite') ||
    props.error.message.toLowerCase().includes('database');

  const handleRestore = async () => {
    setIsLoading(true);
    const result = await LocalBackupService.restoreFromLocalBackup();
    setIsLoading(false);
    Alert.alert(result.success ? 'Éxito' : 'Error', result.message);
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
<Text allowFontScaling={true} style={styles.title}>Opciones de Recuperación</Text>
            <Text allowFontScaling={true} style={styles.errorSubtext}>Elige cómo quieres recuperar tu información:</Text>
            <TouchableOpacity style={styles.button} onPress={handleRestore}>
              <Text allowFontScaling={true} style={styles.buttonText}>🔄 Restaurar Respaldo Local</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#ff5252', marginTop: 12 }]}
              onPress={handleReset}
            >
              <Text allowFontScaling={true} style={styles.buttonText}>🗑️ Restablecer Datos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#666', marginTop: 12 }]}
              onPress={() => setShowRecovery(false)}
            >
              <Text allowFontScaling={true} style={styles.buttonText}>Volver</Text>
            </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
<Text allowFontScaling={true} style={styles.title}>¡Algo salió mal!</Text>
            <Text allowFontScaling={true} style={styles.errorSubtext}>
              {isDbError
                ? 'Tuvimos un problema al acceder a tus datos.'
                : 'Ocurrió un error inesperado en la aplicación.'}
            </Text>
            <TouchableOpacity style={styles.button} onPress={props.retry}>
              <Text allowFontScaling={true} style={styles.buttonText}>Intentar de nuevo</Text>
            </TouchableOpacity>
            {isDbError && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#4caf50', marginTop: 12 }]}
                onPress={() => setShowRecovery(true)}
              >
                <Text allowFontScaling={true} style={styles.buttonText}>🔧 Opciones de Recuperación</Text>
              </TouchableOpacity>
            )}
      </View>
    </SafeAreaView>
  );
}

export default function Layout() {
  log('[Layout] 🎨 Rendering Layout component...');
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinConfigured, setPinConfigured] = useState(false);
  const store = useBoundStore();
  const palette = getPalette(store.themeMode);

  useEffect(() => {
    async function initialize() {
      log('[Layout] 🚀 Starting initialization...');
      try {
        await SplashScreen.preventAutoHideAsync();
        log('[Layout] 📦 Fonts ready (auto-loaded by Expo SDK 50+)');
        setFontsLoaded(true);
        log('[Layout] ✅ Fonts loaded');

        log('[Layout] 🗄️ Initializing SQLiteEngine...');
        await SQLiteEngine.initialize();

        if (SQLiteEngine.getState() === 'FAILED') {
          throw new Error('Database initialization failed: Critical storage or corruption error.');
        }
        log('[Layout] ✅ SQLiteEngine initialized');

        log('[Layout] 💧 Hydrating useBoundStore...');
        await useBoundStore.getState().hydrate();
         log('[Layout] ✅ useBoundStore hydrated');
         
         // Check if PIN is configured
         const configured = await SecurityService.isPinConfigured();
         if (configured) {
           setPinConfigured(configured);
         } else {
           setPinUnlocked(true);
         }


        store.setDbInitialized(true);

        log('[Layout] 📈 Checking onboarding gate...');
        // BUGFIX (onboarding loop): use `getState()` instead of the closure
        // returned by `useBoundStore()` because the latter was captured at
        // first render and never reflects the post-hydrate counter. Pair
        // with the fix in `incrementAppOpens` that no longer resets the
        // counter to 0, so the persisted value now climbs monotonically.
        const openCount = useBoundStore.getState().appOpenCount;
        if (openCount < 3) {
          setShowOnboarding(true);
        }

        log('[Layout] ⚖️ Auditing balance...');
        auditBalance().then(async (auditPassed) => {
          log(`[Layout] ✅ Balance audit passed: ${auditPassed}`);
          if (!auditPassed) {
            warn('[App] Balance audit detected drift — auto-correcting...');
            await reconcileBalance();
            await store.syncBalance();
            log('[App] ✅ Balance auto-corrected');
          }
        }).catch(err => {
          console.error('[Layout] ❌ Balance audit failed:', err);
        });

        log('[Layout] 🏁 Finalizing boot...');
      } catch (error) {
        console.error('[Layout] ❌ Initialization error:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown error');
        Alert.alert('Initialization Error', 'Could not start the application.');
      } finally {
        log('[Layout] 🏁 Hiding splash screen...');
        await SplashScreen.hideAsync();
        log('[Layout] ✅ Splash screen hidden');
      }
    }
    // Run once on mount - empty deps prevent infinite loop
    initialize();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (nextAppState === "active") {
        log("[Layout] App became active — triggering recurring scheduler tick");
        void RecurringScheduler.getInstance().tick();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        log(
          '[Layout] 🧹 App moving to background. Triggering WAL checkpoint (TRUNCATE)...'
        );
        SQLiteEngine.checkpoint().catch((e) => console.error('[Layout] Checkpoint failed', e));
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync().catch((e: unknown) => {
      warn('[Layout] Screen capture prevention not supported:', e);
    });
    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch((e: unknown) => {
        warn('[Layout] Screen capture allow failed:', e);
      });
    };
  }, []);

  useEffect(() => {
    if (store.lastError) {
      Alert.alert('Operation Failed', store.lastError);
      store.clearError();
    }
  }, [store.lastError]);

  if (initError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
<Text allowFontScaling={true} style={styles.title}>Error de Inicialización</Text>
            <Text allowFontScaling={true} style={styles.errorSubtext}>No pudimos iniciar la base de datos.</Text>
            <Text allowFontScaling={true} style={styles.errorMessage}>{initError}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setInitError(null);
              }}
            >
              <Text allowFontScaling={true} style={styles.buttonText}>Intentar de nuevo</Text>
            </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!store.isDbInitialized || store.isInitializing || !fontsLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <Text allowFontScaling={true}>Loading OwnLog...</Text>
      </SafeAreaView>
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  if (!pinUnlocked) {
    return <PinLock onUnlock={() => setPinUnlocked(true)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={store.themeMode === 'dark' ? 'light' : 'dark'} />
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
