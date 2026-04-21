import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useBoundStore } from '../store/useBoundStore';
import { formatCurrency, CurrencyCode } from '../utils/currencyFormatter';
import { theme, getPalette, type ThemePalette } from '../theme/theme';
import EmptyState from './EmptyState';
import { Category, Transaction } from '../types/master';

interface TransactionItemProps {
  item: Transaction;
  palette: ThemePalette;
  categories: Category[];
  currency: string;
  getCategoryName: (id: number) => string;
}

const TransactionItem = React.memo(
  ({ item, palette, categories, currency, getCategoryName }: TransactionItemProps) => {
    const cat = categories.find((c) => c.id === item.categoria_id);
    const sign = cat?.tipo === 'ingreso' ? '+' : '-';
    const formattedAmount = `${sign}${formatCurrency(Math.abs(item.monto), currency as CurrencyCode)}`;
    const amountColor = cat?.tipo === 'ingreso' ? '#4caf50' : '#ff5252';

    return (
      <View style={[styles.item, { backgroundColor: palette.card }]}>
        <View style={styles.itemLeft}>
          <Text allowFontScaling style={[styles.date, { color: palette.textSecondary }]}>
            {item.fecha_local}
          </Text>
          <Text allowFontScaling style={[styles.description, { color: palette.text }]}>
            {item.descripcion || 'Sin descripción'}
          </Text>
          <Text allowFontScaling style={[styles.category, { color: palette.textSecondary }]}>
            {getCategoryName(item.categoria_id)}
          </Text>
        </View>
        <Text allowFontScaling style={[styles.amount, { color: amountColor }]}>
          {formattedAmount}
        </Text>
      </View>
    );
  }
);
TransactionItem.displayName = 'TransactionItem';

export default function TransactionList({
  isRecent = false,
  headerComponent,
}: {
  isRecent?: boolean;
  headerComponent?: React.ReactNode;
}) {
  const router = useRouter();
  const {
    transactions,
    categories,
    filters,
    setFilters,
    themeMode,
    currency,
    fetchTransactionsPaged,
  } = useBoundStore();

  const palette = getPalette(themeMode);

  // Transform entities to array
  const allTransactions = useMemo(() => {
    return transactions.ids.map((id) => transactions.entities[id]).filter(Boolean) as Transaction[];
  }, [transactions]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(filters.categoryId);
  const [startDate, setStartDate] = useState(filters.startDate || '');
  const [endDate, setEndDate] = useState(filters.endDate || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      await fetchTransactionsPaged();
    } catch (e) {
      console.error('[TransactionList] Load more error:', e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleCategoryChange = (id: number | null) => {
    setSelectedCategoryId(id);
    setFilters({ categoryId: id });
  };

  const applyDateFilters = () => {
    setFilters({ startDate, endDate });
  };

  const onStartDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowStartPicker(false);
    if (date) {
      setStartDate(date);
    }
  };

  const onEndDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowEndPicker(false);
    if (date) {
      setTempEndDate(date);
      setEndDate(date.toISOString().split('T')[0]);
    }
  };

  const resetFilters = () => {
    setSelectedCategoryId(null);
    setStartDate('');
    setEndDate('');
    setFilters({
      categoryId: null,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const getCategoryName = useCallback(
    (id: number): string => {
      const cat = categories.find((c) => c.id === id);
      return cat ? cat.nombre : `Desconocida (${id})`;
    },
    [categories]
  );

  const finalResults = useMemo(() => {
    let results = allTransactions;

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      results = results.filter((t) => {
        const description = (t.descripcion || '').toLowerCase();
        const categoryName = getCategoryName(t.categoria_id).toLowerCase();
        return description.includes(query) || categoryName.includes(query);
      });
    }

    if (isRecent) {
      return results.slice(0, 100);
    }

    return results;
  }, [allTransactions, debouncedSearchQuery, categories, isRecent]);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionItem
        item={item}
        palette={palette}
        categories={categories}
        currency={currency}
        getCategoryName={getCategoryName}
      />
    ),
    [palette, categories, currency, getCategoryName]
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Text allowFontScaling style={[styles.title, { color: palette.text }]}>
        Transacciones
      </Text>

      <TextInput
        style={[
          styles.searchBar,
          { backgroundColor: palette.textSecondary + '33', color: palette.text },
        ]}
        placeholder="Buscar transacciones..."
        placeholderTextColor={palette.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearButtonMode="while-editing"
      />

      <View style={styles.dateFilterContainer}>
        <View style={styles.dateInputWrapper}>
          <Text allowFontScaling style={[styles.label, { color: palette.textSecondary }]}>
            Desde:
          </Text>
          <TextInput
            style={[
              styles.dateInput,
              { backgroundColor: palette.textSecondary + '33', color: palette.text },
            ]}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={palette.textSecondary}
          />
        </View>
        <View style={styles.dateInputWrapper}>
          <Text allowFontScaling style={[styles.label, { color: palette.textSecondary }]}>
            Hasta:
          </Text>
          <TextInput
            style={[
              styles.dateInput,
              { backgroundColor: palette.textSecondary + '33', color: palette.text },
            ]}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={palette.textSecondary}
          />
        </View>
      </View>

      <View style={styles.dateActions}>
        <TouchableOpacity
          style={[styles.applyButton, { backgroundColor: palette.primary }]}
          onPress={applyDateFilters}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Aplicar filtros de fecha"
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        >
          <Text allowFontScaling style={styles.applyButtonText}>
            Aplicar Fechas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: palette.textSecondary + '33' }]}
          onPress={resetFilters}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Reiniciar todos los filtros"
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        >
          <Text allowFontScaling style={[styles.resetButtonText, { color: palette.text }]}>
            Limpiar Todo
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View
          style={[
            styles.filterPanel,
            { backgroundColor: palette.card, borderColor: palette.textSecondary + '66' },
          ]}
        >
          <View style={styles.filterInputRow}>
            <TouchableOpacity
              style={styles.datePickerTrigger}
              onPress={() => setShowStartPicker(true)}
            >
              <Text allowFontScaling style={[styles.datePickerLabel, { color: palette.text }]}>
                Desde: {startDate || 'Seleccionar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.datePickerTrigger}
              onPress={() => setShowEndPicker(true)}
            >
              <Text allowFontScaling style={[styles.datePickerLabel, { color: palette.text }]}>
                Hasta: {endDate || 'Seleccionar'}
              </Text>
            </TouchableOpacity>
          </View>

          {showStartPicker && (
            <DateTimePicker value={tempStartDate} mode="date" onChange={onStartDateChange} />
          )}
          {showEndPicker && (
            <DateTimePicker value={tempEndDate} mode="date" onChange={onEndDateChange} />
          )}
        </View>
      )}

      <TouchableOpacity
        onPress={() => setShowFilters(!showFilters)}
        style={[
          styles.toggleFiltersButton,
          { backgroundColor: palette.card, borderColor: palette.textSecondary + '66' },
        ]}
      >
        <Text allowFontScaling style={[styles.toggleFiltersText, { color: palette.text }]}>
          {showFilters ? 'Ocultar Filtros ▴' : 'Filtros Avanzados ▾'}
        </Text>
      </TouchableOpacity>

      <View style={styles.quickFiltersRow}>
        <FlatList
          horizontal
          data={[{ id: null, nombre: 'Todas' }, ...categories]}
          keyExtractor={(item) => (item.id ? item.id.toString() : 'all')}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedCategoryId === item.id ? palette.primary : palette.textSecondary + '33',
                },
              ]}
              onPress={() => handleCategoryChange(item.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por ${item.nombre}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                allowFontScaling
                style={[
                  selectedCategoryId === item.id ? styles.activeFilterText : styles.filterText,
                  { color: selectedCategoryId === item.id ? '#fff' : palette.text },
                ]}
              >
                {item.nombre}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          style={styles.filterList}
          contentContainerStyle={{ alignItems: 'center' }}
        />
      </View>

      {finalResults.length === 0 ? (
        <EmptyState
          icon={<Text>📊</Text>}
          title="No hay transacciones"
          description="Agrega tu primera transacción para comenzar a organizar tus finanzas."
          ctaButton={{
            label: 'Agregar Transacción',
            onPress: () => {
              router.push('/add-transaction');
            },
          }}
        />
      ) : (
        <FlatList
          ListHeaderComponent={headerComponent as any}
          data={finalResults}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          initialNumToRender={20}
          windowSize={5}
          maxToRenderPerBatch={10}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() =>
            isLoadingMore ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text allowFontScaling style={{ color: palette.textSecondary, fontSize: 12 }}>
                  Cargando más...
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchBar: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateInputWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateInput: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  filterPanel: {
    padding: theme.spacing.m,
    borderRadius: 16,
    marginBottom: theme.spacing.m,
    borderWidth: 1,
  },
  filterInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.m,
  },
  datePickerTrigger: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleFiltersButton: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  toggleFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickFiltersRow: {
    marginBottom: 12,
  },
  dateActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  applyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  resetButtonText: {
    fontWeight: '600',
  },
  filterList: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  activeFilterChip: {},
  filterText: {
    fontSize: 14,
    fontWeight: '400',
  },
  activeFilterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemLeft: {
    flex: 1,
  },
  date: {
    fontSize: 12,
    marginBottom: 4,
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
