import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useBoundStore } from '../../store/useBoundStore';
import { Transaction } from '../../types/master';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface TransactionItemProps {
  id: number;
}

/**
 * TransactionItem
 * Individual transaction row with GPU-accelerated layout animations.
 */
const TransactionItem = memo(({ id }: TransactionItemProps) => {
  const tx = useBoundStore((state) => state.transactions.entities[id]);
  const deleteTransaction = useBoundStore((state) => state.deleteTransaction);
  const themeMode = useBoundStore((state) => state.themeMode);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log(`Transaction ${id} pressed`);
  }, [id]);

  const handleDelete = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await deleteTransaction(id);
    } catch (e) {
      console.error('Delete failed', e);
    }
  }, [id, deleteTransaction]);

  if (!tx) return null;

  const isIncome = tx.monto > 0;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      layout={LinearTransition.springify().damping(15)}
    >
      <TouchableOpacity
        style={[
          styles.container,
          themeMode === 'dark' ? styles.darkContainer : styles.lightContainer,
        ]}
        onPress={handlePress}
      >
        <View style={styles.leftSection}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: tx.categoria_id === 1 ? '#FF6384' : '#36A2EB' },
            ]}
          >
            <Text allowFontScaling style={styles.emoji}>
              {tx.descripcion || '💰'}
            </Text>
          </View>
          <View style={styles.textSection}>
            <Text
              allowFontScaling
              style={[
                styles.description,
                themeMode === 'dark' ? styles.darkText : styles.lightText,
              ]}
              numberOfLines={1}
            >
              {tx.descripcion || 'Sin descripción'}
            </Text>
            <Text allowFontScaling style={styles.date}>
              {tx.fecha_local}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <Text
            allowFontScaling
            style={[styles.amount, isIncome ? styles.incomeAmount : styles.expenseAmount]}
          >
            {isIncome ? `+$${tx.monto}` : `-$${tx.monto}`}
          </Text>
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#ff3b30" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  lightContainer: {
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#18181b',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 20,
  },
  textSection: {
    flex: 1,
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
  },
  lightText: {
    color: '#333',
  },
  darkText: {
    color: '#f4f4f5',
  },
  date: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#4caf50',
  },
  expenseAmount: {
    color: '#ff5252',
  },
});

export default TransactionItem;
