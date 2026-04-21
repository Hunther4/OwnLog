import React, { memo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useBoundStore } from '../store/useBoundStore';
import { getPalette, type ThemePalette, type ThemeMode } from '../theme/theme';
import { formatCurrency } from '../utils/currencyFormatter';
import type { Currency } from '../types/master';
import * as Haptics from 'expo-haptics';
import TransactionList from './TransactionList';
import { TransactionRepository } from '../repositories/TransactionRepository';

/**
 * DashboardSkeleton - Loading placeholder
 */
function DashboardSkeleton({ palette }: { palette: ThemePalette }) {
  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.skeletonBalance, { backgroundColor: palette.card }]}>
        <Text allowFontScaling style={[styles.skeletonLabel, { color: palette.label }]}>
          Saldo Total
        </Text>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    </View>
  );
}

/**
 * BalanceWidget
 * Atomic component that ONLY re-renders when the balance changes.
 */
const BalanceWidget = memo(({ themeMode, currency }: { themeMode: ThemeMode; currency: Currency }) => {
  const currentBalance = useBoundStore((state) => state.currentBalance);
  const palette = getPalette(themeMode);

  return (
    <View style={[styles.balanceContainer, { backgroundColor: palette.card }]}>
      <Text allowFontScaling style={[styles.balanceLabel, { color: palette.label }]}>
        Saldo Total
      </Text>
      <Text
        allowFontScaling
        style={[styles.balanceValue, { color: palette.accent || palette.balanceValue }]}
      >
        {formatCurrency(currentBalance, currency as any)}
      </Text>
    </View>
  );
});
BalanceWidget.displayName = 'BalanceWidget';

export const DashboardHeader = memo(
  ({ themeMode, currency, router }: { themeMode: string; currency: string; router: any }) => {
    const palette = getPalette(themeMode as any);
    const quickActions = useBoundStore((state) => state.quickActions);
    const updateQuickAction = useBoundStore((state) => state.updateQuickAction);
    const addTransaction = useBoundStore((state) => state.addTransaction);
    const categories = useBoundStore((state) => state.categories);
    const addCategory = useBoundStore((state) => state.addCategory);

    const [editingAction, setEditingAction] = useState<any | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [monthlyExpense, setMonthlyExpense] = useState(0);

    useEffect(() => {
      const fetchMonthlyTotals = async () => {
        const monthYear = new Date().toISOString().slice(0, 7);
        const { income, expense } = await TransactionRepository.getMonthlyTotals(monthYear);
        setMonthlyIncome(income);
        setMonthlyExpense(expense);
      };
      fetchMonthlyTotals();
    }, []);

    const handleQuickAdd = useCallback(
      async (action: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
          let category = categories.find(
            (c) => c.nombre.toLowerCase() === action.category_name.toLowerCase()
          );
          let categoryId = category?.id;

          if (!categoryId) {
            const createdId = await addCategory({
              nombre: action.category_name,
              tipo: 'egreso',
              emoji: action.label.split(' ')[0] || '🏷️',
              color_hex: '#9966FF',
              activa: true,
            });
            categoryId = createdId;
          }

          await addTransaction({
            monto: action.amount,
            categoria_id: categoryId,
            descripcion: `Gasto rápido: ${action.label}`,
            fecha_local: new Date().toISOString().split('T')[0],
            fecha_utc: new Date().toISOString(),
          });

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      },
      [categories, addCategory, addTransaction]
    );

    const handleLongPress = (action: any) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setEditingAction(action);
      setEditLabel(action.label);
      setEditAmount(action.amount.toString());
    };

    const saveQuickAction = async () => {
      if (!editingAction) return;
      try {
        await updateQuickAction(editingAction.id, {
          label: editLabel,
          amount: parseInt(editAmount, 10) || 0,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEditingAction(null);
      } catch (e) {
        Alert.alert('Error', 'No se pudo actualizar la acción rápida');
      }
    };

    return (
      <View style={{ padding: 20 }}>
        <View>
          <BalanceWidget themeMode={themeMode} currency={currency} />
        </View>

        <View style={[styles.summaryContainer, { backgroundColor: palette.card }]}>
          <View style={styles.summaryItem}>
            <Text allowFontScaling style={[styles.summaryLabel, { color: palette.textSecondary }]}>
              Ingresos
            </Text>
            <Text allowFontScaling style={[styles.summaryValueIncome, { color: '#4caf50' }]}>
              {formatCurrency(monthlyIncome, currency as any)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text allowFontScaling style={[styles.summaryLabel, { color: palette.textSecondary }]}>
              Egresos
            </Text>
            <Text allowFontScaling style={[styles.summaryValueExpense, { color: '#ff5252' }]}>
              {formatCurrency(monthlyExpense, currency as any)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: palette.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/add-transaction');
          }}
        >
          <Text allowFontScaling style={styles.addButtonText}>
            + Agregar Transacción
          </Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text allowFontScaling style={[styles.sectionTitle, { color: palette.text }]}>
            Gastos Instantáneos
          </Text>
          <Text allowFontScaling style={[styles.hintText, { color: palette.textSecondary }]}>
            Mantén presionado para editar
          </Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.quickActionCard,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border || palette.textSecondary + '33',
                  },
                ]}
                onPress={() => handleQuickAdd(action)}
                onLongPress={() => handleLongPress(action)}
              >
                <View style={styles.cardHeader}>
                  <Text allowFontScaling style={styles.cardEmoji}>
                    {action.label.split(' ')[0] || '🏷️'}
                  </Text>
                  <Text allowFontScaling style={[styles.cardLabel, { color: palette.text }]}>
                    {action.label}
                  </Text>
                </View>
                <Text
                  allowFontScaling
                  style={[styles.cardAmount, { color: palette.textSecondary }]}
                >
                  {formatCurrency(action.amount, currency as any)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Modal visible={!!editingAction} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: palette.card }]}>
              <Text allowFontScaling style={[styles.modalTitle, { color: palette.text }]}>
                Editar Acción Rápida
              </Text>

              <TextInput
                style={[
                  styles.input,
                  { borderColor: palette.textSecondary + '33', color: palette.text },
                ]}
                value={editLabel}
                onChangeText={setEditLabel}
                placeholder="Nombre"
                placeholderTextColor={palette.textSecondary}
              />
              <TextInput
                style={[
                  styles.input,
                  { borderColor: palette.textSecondary + '33', color: palette.text },
                ]}
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="numeric"
                placeholder="Monto"
                placeholderTextColor={palette.textSecondary}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: palette.textSecondary + '33' }]}
                  onPress={() => setEditingAction(null)}
                >
                  <Text allowFontScaling style={[styles.modalButtonText, { color: palette.text }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: palette.primary }]}
                  onPress={saveQuickAction}
                >
                  <Text allowFontScaling style={styles.modalButtonText}>
                    Guardar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }
);
DashboardHeader.displayName = 'DashboardHeader';

export default function Dashboard() {
  const themeMode = useBoundStore((state) => state.themeMode);
  const currency = useBoundStore((state) => state.currency);
  const isInitializing = useBoundStore((state) => state.isInitializing);
  const transactions = useBoundStore((state) => state.transactions);
  const palette = getPalette(themeMode);
  const router = useRouter();

  if (isInitializing) {
    return <DashboardSkeleton palette={palette} />;
  }

  // Recent transactions - horizontal scroll
  const txList = transactions?.ids
    ? transactions.ids
        .slice(0, 20)
        .map((id) => transactions.entities[id])
        .filter(Boolean)
    : [];

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <DashboardHeader themeMode={themeMode} currency={currency} router={router} />
      {txList.length > 0 && (
        <View style={[styles.recentSection, { backgroundColor: palette.background }]}>
          <Text allowFontScaling style={[styles.recentTitle, { color: palette.text }]}>
            📋 Últimas Transacciones
          </Text>
          <FlatList
            horizontal
            data={txList}
            keyExtractor={(item) => item?.id?.toString() || '0'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
            renderItem={({ item: tx }) =>
              tx && (
                <View
                  style={[
                    styles.transactionCard,
                    { backgroundColor: palette.card, borderColor: palette.border },
                  ]}
                >
                  <Text allowFontScaling style={[styles.txEmoji, { color: palette.text }]}>
                    {(tx as any).emoji || '💰'}
                  </Text>
                  <Text
                    allowFontScaling
                    style={[styles.txCategory, { color: palette.textSecondary }]}
                    numberOfLines={1}
                  >
                    {(tx as any).category_name || 'Sin categoría'}
                  </Text>
                  <Text
                    allowFontScaling
                    style={[
                      styles.txAmount,
                      { color: (tx as any).tipo === 'ingreso' ? '#4caf50' : '#f44336' },
                    ]}
                  >
                    {(tx as any).tipo === 'ingreso' ? '+' : '-'}
                    {formatCurrency(tx.monto, currency)}
                  </Text>
                </View>
              )
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  recentSection: {
    paddingVertical: 12,
    paddingLeft: 16,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  recentList: {
    paddingRight: 16,
  },
  transactionCard: {
    width: 100,
    padding: 12,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  txEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  txCategory: {
    fontSize: 11,
    marginBottom: 4,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  skeletonBalance: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 16,
    margin: 16,
    elevation: 4,
  },
  skeletonLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    minHeight: 200, // Space for 2 rows minimum
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    minHeight: 90, // Make cards taller
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardAmount: {
    fontSize: 14,
    textAlign: 'right',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 10,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValueIncome: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryValueExpense: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  balanceContainer: {
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    // Usar accent color para el balance en tema premium
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    elevation: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
