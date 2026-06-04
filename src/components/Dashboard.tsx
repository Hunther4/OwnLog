import React, { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useBoundStore } from '../store/useBoundStore';
import { getPalette, type ThemePalette, type ThemeMode } from '../theme/theme';
import { formatCurrency } from '../utils/currencyFormatter';
import type { Currency, QuickAction } from '../types/master';
import Haptics from '../utils/haptics';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { SettingsRepository } from '../repositories/SettingsRepository';

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
        {formatCurrency(currentBalance, currency)}
      </Text>
    </View>
  );
});
BalanceWidget.displayName = 'BalanceWidget';

export const DashboardHeader = memo(
  ({ themeMode, currency, router }: { themeMode: ThemeMode; currency: Currency; router: any }) => {
    const palette = getPalette(themeMode);
    const quickActions = useBoundStore((state) => state.quickActions);
    const updateQuickAction = useBoundStore((state) => state.updateQuickAction);
    const addTransaction = useBoundStore((state) => state.addTransaction);
    const categories = useBoundStore((state) => state.categories);
    const addCategory = useBoundStore((state) => state.addCategory);

    const [editingAction, setEditingAction] = useState<QuickAction | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [monthlyExpense, setMonthlyExpense] = useState(0);
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [resetPeriodDays, setResetPeriodDays] = useState(0);
    const transactionCount = useBoundStore((s) => s.transactions.ids.length);

    // Anti double-tap guard for instant expenses
    const lastQuickAddAtRef = useRef<number | null>(null);

    // Fetch monthly totals + check auto-reset period
    useEffect(() => {
      const fetchMonthlyTotals = async () => {
        // BUGFIX (UTC drift, same as AddTransactionForm): use local-time
        // components so users west of UTC don't see totals bleed into the
        // previous or next month at month boundaries.
        const now = new Date();
        const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const { income, expense } = await TransactionRepository.getMonthlyTotals(monthYear);

        // Check auto-reset period
        const savedPeriod = await SettingsRepository.getSetting('reset_period_days');
        const savedUntil = await SettingsRepository.getSetting('reset_until_date');
        const periodDays = savedPeriod ? parseInt(savedPeriod, 10) : 0;
        setResetPeriodDays(periodDays);

        if (periodDays > 0 && savedUntil) {
          const untilMs = parseInt(savedUntil, 10);
          if (Date.now() >= untilMs) {
            // BUGFIX (R7): previously the period expired and then sat at
            // 0/0 forever. Renew the period for another N days so the user
            // keeps getting rolling totals without re-entering the modal.
            const newUntil = Date.now() + periodDays * 24 * 60 * 60 * 1000;
            await SettingsRepository.setSetting('reset_until_date', newUntil.toString());
            // Show 0 for the new (fresh) period and keep the balance intact.
            setMonthlyIncome(0);
            setMonthlyExpense(0);
            return;
          }
        }

        setMonthlyIncome(income);
        setMonthlyExpense(expense);
      };
      fetchMonthlyTotals();
    }, [transactionCount]);

    const handleQuickAdd = useCallback(
      async (action: QuickAction) => {
        // Debounce: prevent accidental double-taps within 800ms
        const now = Date.now();
        if (lastQuickAddAtRef.current && now - lastQuickAddAtRef.current < 800) {
          return;
        }
        lastQuickAddAtRef.current = now;

        Haptics.trigger('MEDIUM');
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

          Haptics.notify('NOTIFICATION_SUCCESS');
        } catch (error) {
          Haptics.notify('NOTIFICATION_ERROR');
        }
      },
      [categories, addCategory, addTransaction]
    );

    const handleLongPress = (action: QuickAction) => {
      Haptics.trigger('HEAVY');
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
        Haptics.notify('NOTIFICATION_SUCCESS');
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
          <TouchableOpacity
            style={styles.summaryItem}
            onLongPress={() => setShowPeriodModal(true)}
            activeOpacity={0.7}
          >
            <Text allowFontScaling style={[styles.summaryLabel, { color: palette.textSecondary }]}>
              Ingresos
            </Text>
            <Text allowFontScaling style={[styles.summaryValueIncome, { color: palette.income }]}>
              {formatCurrency(monthlyIncome, currency)}
            </Text>
          </TouchableOpacity>
          <View style={styles.summaryDivider} />
          <TouchableOpacity
            style={styles.summaryItem}
            onLongPress={() => setShowPeriodModal(true)}
            activeOpacity={0.7}
          >
            <Text allowFontScaling style={[styles.summaryLabel, { color: palette.textSecondary }]}>
              Egresos
            </Text>
            <Text allowFontScaling style={[styles.summaryValueExpense, { color: palette.expense }]}>
              {formatCurrency(monthlyExpense, currency)}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: palette.primary }]}
          onPress={() => {
            Haptics.trigger('LIGHT');
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
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action?.id?.toString() || `qa-${action?.label}`}
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
                  <Text allowFontScaling={true} style={styles.cardEmoji}>
                    {action.label.split(' ')[0] || '🏷️'}
                  </Text>
                  <Text allowFontScaling={true} style={[styles.cardLabel, { color: palette.text }]}>
                    {action.label}
                  </Text>
                </View>
                <Text
                  allowFontScaling={true}
                  style={[styles.cardAmount, { color: palette.textSecondary }]}
                >
                  {formatCurrency(Math.abs(action.amount), currency)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Modal visible={!!editingAction} transparent animationType="fade">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
          >
            <ScrollView 
              contentContainerStyle={[styles.modalOverlay, { flexGrow: 1 }]} 
              bounces={false}
            >
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
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={showPeriodModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: palette.card }]}>
              <Text allowFontScaling style={[styles.modalTitle, { color: palette.text }]}>
                Reinicio de Ingresos/Egresos
              </Text>
              <Text allowFontScaling style={{ color: palette.textSecondary, marginBottom: 16 }}>
                Los contadores de ingresos y egresos volverán a 0 al cumplirse el período. El saldo total no se modifica.
              </Text>
              {([
                { label: '1 día', days: 1 },
                { label: '7 días', days: 7 },
                { label: '15 días', days: 15 },
                { label: '1 mes (30 días)', days: 30 },
              ]).map((opt) => (
                <TouchableOpacity
                  key={opt.days}
                  style={[
                    styles.periodOption,
                    { borderColor: palette.border || palette.textSecondary + '33' },
                    resetPeriodDays === opt.days && { backgroundColor: palette.primary + '20', borderColor: palette.primary },
                  ]}
                  onPress={async () => {
                    const untilDate = Date.now() + opt.days * 24 * 60 * 60 * 1000;
                    await SettingsRepository.setSetting('reset_period_days', opt.days.toString());
                    await SettingsRepository.setSetting('reset_until_date', untilDate.toString());
                    setResetPeriodDays(opt.days);
                    Haptics.notify('NOTIFICATION_SUCCESS');
                  }}
                >
                  <Text allowFontScaling style={{ color: palette.text, fontWeight: '600' }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
              {resetPeriodDays > 0 && (
                <TouchableOpacity
                  style={[styles.periodOption, { borderColor: palette.delete, marginTop: 8 }]}
                  onPress={async () => {
                    await SettingsRepository.setSetting('reset_period_days', '0');
                    await SettingsRepository.setSetting('reset_until_date', '0');
                    setResetPeriodDays(0);
                    Haptics.notify('NOTIFICATION_WARNING');
                  }}
                >
                  <Text allowFontScaling style={{ color: palette.delete, fontWeight: '600' }}>
                    Desactivar reinicio automático
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: palette.primary, marginTop: 16 }]}
                onPress={() => setShowPeriodModal(false)}
              >
                <Text allowFontScaling style={styles.modalButtonText}>Cerrar</Text>
              </TouchableOpacity>
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
  const txList = useMemo(() => {
    if (!transactions?.ids) return [];
    const result = [];
    const slicedIds = transactions.ids.slice(0, 20);
    for (const id of slicedIds) {
      const tx = transactions.entities[id];
      if (tx) {
        result.push(tx);
      }
    }
    return result;
  }, [transactions.ids, transactions.entities]);

  const categories = useBoundStore((state) => state.categories);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
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
              initialNumToRender={10}
              maxToRenderPerBatch={5}
              windowSize={5}
              renderItem={({ item: tx }) => {
                if (!tx) return null;
                const cat = categories.find((c) => c.id === tx.categoria_id);
                return (
                  <View
                    style={[
                      styles.transactionCard,
                      { backgroundColor: palette.card, borderColor: palette.border },
                    ]}
                  >
                    <Text allowFontScaling style={[styles.txEmoji, { color: palette.text }]}>
                      {cat?.emoji || '💰'}
                    </Text>
                    <Text
                      allowFontScaling
                      style={[styles.txCategory, { color: palette.textSecondary }]}
                      numberOfLines={1}
                    >
                      {cat?.nombre || 'Sin categoría'}
                    </Text>
                    <Text
                      allowFontScaling
                      style={[
                        styles.txAmount,
                        { color: cat?.tipo === 'ingreso' ? palette.income : palette.expense },
                      ]}
                    >
                      {formatCurrency(tx.monto, currency)}
                    </Text>
                  </View>
                );
              }}
            />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
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
    gap: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
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
    fontSize: 16,
    minHeight: 44,
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
  periodOption: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
});
