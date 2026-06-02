import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useBoundStore } from '../store/useBoundStore';
import { useShallow } from 'zustand/react/shallow';
import { getPalette, type ThemePalette } from '../theme/theme';
import EmptyState from './EmptyState';
import { Category, Transaction } from '../types/master';
import { formatCurrency } from '../utils/currencyFormatter';

interface TransactionItemInlineProps {
  id: number;
  palette: ThemePalette;
  categoryMap: Record<number, Category>;
}

const TransactionItemInline = React.memo(({ id, palette, categoryMap }: TransactionItemInlineProps) => {
  const tx = useBoundStore((state) => state.transactions.entities[id]);
  const currency = useBoundStore((state) => state.currency);
  if (!tx) return null;

  const cat = categoryMap[tx.categoria_id];
  const sign = cat?.tipo === 'ingreso' ? '+' : '-';
  const formattedAmount = `${sign}${formatCurrency(Math.abs(tx.monto), currency)}`;
  const amountColor = cat?.tipo === 'ingreso' ? palette.income : palette.expense;
  const categoryName = cat?.nombre ?? `Desconocida (${tx.categoria_id})`;

  return (
    <View style={[styles.item, { backgroundColor: palette.card }]}>
      <View style={styles.itemLeft}>
        <Text allowFontScaling style={[styles.date, { color: palette.textSecondary }]}>
          {tx.fecha_local}
        </Text>
        <Text allowFontScaling style={[styles.description, { color: palette.text }]}>
          {tx.descripcion || 'Sin descripción'}
        </Text>
        <Text allowFontScaling style={[styles.category, { color: palette.textSecondary }]}>
          {categoryName}
        </Text>
      </View>
      <Text allowFontScaling style={[styles.amount, { color: amountColor }]}>
        {formattedAmount}
      </Text>
    </View>
  );
});
TransactionItemInline.displayName = 'TransactionItemInline';

const QuickFilters = React.memo(({ palette, categories, selectedCategoryId, handleCategoryChange }: {
  palette: ThemePalette;
  categories: Category[];
  selectedCategoryId: number | null;
  handleCategoryChange: (id: number | null) => void;
}) => (
  <FlashList
    horizontal
    data={[{ id: null, nombre: 'Todas' } as unknown as Category, ...categories]}
    keyExtractor={(item: any) => (item.id ? item.id.toString() : 'all')}
    drawDistance={200}
    renderItem={({ item }: any) => (
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
    contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 4 }}
  />
));
QuickFilters.displayName = 'QuickFilters';

export default function TransactionList() {
  const router = useRouter();
  const filteredIds = useBoundStore(useShallow((state) => state.filteredIds));
  const filters = useBoundStore((state) => state.filters);
  const setFilters = useBoundStore((state) => state.setFilters);
  const themeMode = useBoundStore((state) => state.themeMode);
  const categories = useBoundStore((state) => state.categories);
  const fetchTransactionsPaged = useBoundStore((state) => state.fetchTransactionsPaged);
  const isInitializing = useBoundStore((state) => state.isInitializing);

  const palette = getPalette(themeMode);

  const categoryMap = useMemo(() => {
    const map: Record<number, Category> = {};
    categories.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [categories]);

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
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
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
    setFilters({ startDate: startDate || undefined, endDate: endDate || undefined });
  };

  const onStartDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowStartPicker(false);
    if (date) {
      setStartDate(date.toISOString().split('T')[0]);
    }
  };

  const onEndDateChange = (_event: DateTimePickerEvent, date?: Date) => {
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
    setFilters({ categoryId: null, startDate: undefined, endDate: undefined });
  };

  const renderItem = useCallback(
    ({ item }: { item: number }) => (
      <TransactionItemInline 
        id={item} 
        palette={palette} 
        categoryMap={categoryMap} 
      />
    ),
    [palette, categoryMap]
  );

  const listHeader = (
    <View style={{ paddingHorizontal: 4 }}>
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

      <QuickFilters
        palette={palette}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        handleCategoryChange={handleCategoryChange}
      />
    </View>
  );

  if (isInitializing) {
    return (
      <View style={styles.center}>
        <Text allowFontScaling>Cargando transacciones...</Text>
      </View>
    );
  }

  if (filteredIds.length === 0 && !searchQuery && !startDate && !endDate) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: palette.background }]}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
          {listHeader}
          <EmptyState
            icon={<Text allowFontScaling={true}>📊</Text>}
            title="No hay transacciones"
            description="Agrega tu primera transacción para comenzar a organizar tus finanzas."
            ctaButton={{
              label: 'Agregar Transacción',
              onPress: () => router.push('/add-transaction'),
            }}
            palette={palette}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <FlashList
        data={filteredIds}
        renderItem={renderItem}
        drawDistance={200}
        keyExtractor={(id: number) => id.toString()}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        ListHeaderComponent={listHeader}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text allowFontScaling style={{ color: palette.textSecondary, fontSize: 12 }}>
                Cargando más...
              </Text>
            </View>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 16,
  },
  searchBar: {
    height: 44,
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
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  dateActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  applyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  resetButtonText: {
    fontWeight: '600',
  },
  filterPanel: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  filterInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  datePickerTrigger: {
    flex: 1,
    padding: 14,
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
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  toggleFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterList: {
    marginBottom: 12,
    minHeight: 44,
  },
  filterChip: {
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '400',
  },
  activeFilterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
    paddingHorizontal: 16,
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
