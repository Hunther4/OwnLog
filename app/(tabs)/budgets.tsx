import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBoundStore } from '../../src/store/useBoundStore';
import { getPalette } from '../../src/theme/theme';
import * as Haptics from 'expo-haptics';
import { Category } from '../../src/types/master';

export default function BudgetsScreen() {
  const themeMode = useBoundStore((state) => state.themeMode);
  const categories = useBoundStore((state) => state.categories);
  const setBudget = useBoundStore((state) => state.setBudget);
  const getBudgetForCategory = useBoundStore((state) => state.getBudgetForCategory);
  const getSpendingForCategoryInMonth = useBoundStore((state) => state.getSpendingForCategoryInMonth);
  const palette = getPalette(themeMode);

  const [budgets, setBudgets] = useState<Record<number, number>>({});
  const [spending, setSpending] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [budgetInput, setBudgetInput] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // PARALLEL LOADING: Fetch all budgets and spending simultaneously
      const results = await Promise.all(
        categories.map(async (cat) => {
          const [budget, spending] = await Promise.all([
            getBudgetForCategory(cat.id),
            getSpendingForCategoryInMonth(cat.id),
          ]);
          return { id: cat.id, budget: budget ?? 0, spending };
        })
      );

      const budgetMap: Record<number, number> = {};
      const spendingMap: Record<number, number> = {};
      results.forEach(({ id, budget, spending }) => {
        budgetMap[id] = budget;
        spendingMap[id] = spending;
      });

      setBudgets(budgetMap);
      setSpending(spendingMap);
      setIsLoading(false);
    };
    loadData();
  }, [categories]);

  const handleSaveBudget = async () => {
    if (editingId === null) return;
    const amount = parseInt(budgetInput, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido positivo');
      return;
    }
    try {
      await setBudget(editingId, amount);
      setBudgets(prev => ({ ...prev, [editingId]: amount }));
      setEditingId(null);
      setBudgetInput('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el presupuesto');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
        <View style={styles.centered}>
          <Text style={{ color: palette.text }}>Cargando presupuestos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.container}>
        <Text allowFontScaling style={[styles.header, { color: palette.text }]}>
          Presupuestos
        </Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          Controla cuánto gastas por categoría este mes.
        </Text>

        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const budget = budgets[item.id] || 0;
            const spent = spending[item.id] || 0;
            const percent = budget > 0 ? (spent / budget) * 100 : 0;
            const isOver = spent > budget && budget > 0;

            return (
              <View style={[styles.budgetItem, { backgroundColor: palette.card }]}>
                <View style={styles.itemLeft}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                  <View>
                    <Text style={[styles.catName, { color: palette.text }]}>{item.nombre}</Text>
                    <Text style={[styles.spentText, { color: isOver ? '#ff5252' : palette.textSecondary }]}>
                      Gastado: {spent.toLocaleString()} / {budget.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {editingId === item.id ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={[styles.input, { borderColor: palette.textSecondary + '33', color: palette.text }]}
                      keyboardType="numeric"
                      value={budgetInput}
                      onChangeText={setBudgetInput}
                      autoFocus
                    />
                    <TouchableOpacity 
                      style={[styles.saveButton, { backgroundColor: palette.primary }]} 
                      onPress={handleSaveBudget}
                    >
                      <Text style={styles.saveButtonText}>✓</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    onPress={() => {
                      setEditingId(item.id);
                      setBudgetInput(budget.toString());
                    }}
                    style={styles.editButton}
                  >
                    <Text style={[styles.editButtonText, { color: palette.primary }]}>Editar</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
        />
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
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 80,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  emoji: {
    fontSize: 24,
  },
  catName: {
    fontSize: 16,
    fontWeight: '600',
  },
  spentText: {
    fontSize: 13,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    width: 80,
    fontSize: 14,
    textAlign: 'center',
  },
  saveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
