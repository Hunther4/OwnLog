import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TransactionList from '../../src/components/TransactionList';
import { useBoundStore } from '../../src/store/useBoundStore';
import { getPalette } from '../../src/theme/theme';

export default function Transactions() {
  const themeMode = useBoundStore((state) => state.themeMode);
  const palette = getPalette(themeMode);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.container}>
        {/* TransactionList ya tiene su propio FlatList - no necesita ScrollView externo */}
        <TransactionList />
      </View>
    </SafeAreaView>
  );
}

const styles = {
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
};