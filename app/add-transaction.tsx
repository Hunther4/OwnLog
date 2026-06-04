import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AddTransactionForm from '../src/components/AddTransactionForm';
import { theme, getPalette } from '../src/theme/theme';
import { useBoundStore } from '../src/store/useBoundStore';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { themeMode } = useBoundStore();
  const palette = getPalette(themeMode);

  const handleSave = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.container}>
        <AddTransactionForm onSave={handleSave} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
});
