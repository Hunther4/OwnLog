import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useBoundStore } from '../../store/useBoundStore';
import { useShallow } from 'zustand/react/shallow';
import TransactionItem from './TransactionItem';
import EmptyState from '../EmptyState';

/**
 * TransactionList
 * High-performance list using FlashList.
 * Implements the O(1) consumption pattern: only subscribes to filteredIds.
 */
const TransactionList = () => {
  // Subscribe ONLY to the IDs. The list will only re-render if the order or set of IDs changes.
  const filteredIds = useBoundStore(useShallow((state) => state.filteredIds));
  const { isInitializing } = useBoundStore();

  const renderItem = useCallback(({ item }: { item: number }) => {
    return <TransactionItem id={item} />;
  }, []);

  if (isInitializing) {
    return (
      <View style={styles.center}>
        <Text allowFontScaling>Cargando transacciones...</Text>
      </View>
    );
  }

  if (filteredIds.length === 0) {
    return (
      <EmptyState
        title="Sin transacciones"
        description="No hay transacciones que coincidan con los filtros."
      />
    );
  }

  // Strategic bypass for Expo/TypeScript type mismatch with @shopify/flash-list
  const FastList = FlashList as any;

  return (
    <View style={styles.container}>
      <FastList
        data={filteredIds}
        renderItem={renderItem}
        estimatedItemSize={75}
        keyExtractor={(id: number) => id.toString()}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingBottom: 100, // Space for the FloatingDock
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TransactionList;
