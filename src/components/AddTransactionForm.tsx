import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useBoundStore } from '../store/useBoundStore';
import { getPalette } from '../theme/theme';
import CategoryPicker from './CategoryPicker';
import SQLiteEngine from '../database/SQLiteEngine';
import * as Haptics from 'expo-haptics';

export default function AddTransactionForm({ onSave }: { onSave: () => void }) {
  // ATOMIC CONSUMPTION: Use selectors to prevent global re-renders
  const addTransaction = useBoundStore((state) => state.addTransaction);
  const categories = useBoundStore((state) => state.categories);
  const themeMode = useBoundStore((state) => state.themeMode);

  const palette = getPalette(themeMode);

  // LOCAL STATE: Isolated from Zustand to ensure fluid typing
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!amount || selectedCategoryId === null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Campos faltantes', 'Por favor, completa el monto y elige una categoría.');
      return;
    }

    const sanitizedAmount = amount.replace(/[.,\s]/g, '');
    const numAmount = parseInt(sanitizedAmount, 10);

    if (isNaN(numAmount) || numAmount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Monto inválido', 'El monto debe ser un número positivo.');
      return;
    }

    try {
      await addTransaction({
        monto: numAmount,
        fecha_utc: date.toISOString(),
        fecha_local: date.toISOString().split('T')[0],
        categoria_id: selectedCategoryId,
        descripcion: description,
      });

      // Budget warning (Non-blocking)
      const category = categories.find((c) => c.id === selectedCategoryId);
      if (category?.tipo === 'egreso') {
        const budgetLimit = await useBoundStore.getState().getBudgetForCategory(selectedCategoryId);
        if (budgetLimit !== null) {
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split('T')[0];
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            .toISOString()
            .split('T')[0];

          const transactions = await SQLiteEngine.getAll<any>(
            `SELECT SUM(monto) as total FROM transacciones t 
             JOIN categorias c ON t.categoria_id = c.id 
             WHERE c.id = ? AND t.fecha_local >= ? AND t.fecha_local <= ?`,
            [selectedCategoryId, firstDay, lastDay]
          );

          const currentSpending = transactions[0]?.total ?? 0;
          if (currentSpending > budgetLimit) {
            Alert.alert(
              'Guardado con Advertencia ⚠️',
              `Has excedido tu presupuesto para ${category.nombre}. Gasto actual: $${currentSpending.toLocaleString()} / Límite: $${budgetLimit.toLocaleString()}.`
            );
          }
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'No se pudo guardar la transacción.');
    }
  };

  const handleCategorySelect = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategoryId(id);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, { backgroundColor: palette.card }]}>
          <Text allowFontScaling style={[styles.title, { color: palette.text }]}>
            Nueva Transacción
          </Text>

          <View style={styles.form}>
            <Text allowFontScaling style={[styles.label, { color: palette.text }]}>
              Descripción
            </Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: palette.textSecondary + '66', color: palette.text },
              ]}
              placeholder="Ej: Almuerzo, Sueldo, etc."
              placeholderTextColor={palette.textSecondary}
              value={description}
              onChangeText={setDescription}
            />

            <Text allowFontScaling style={[styles.label, { color: palette.text }]}>
              Monto (CLP)
            </Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: palette.textSecondary + '66', color: palette.text },
              ]}
              placeholder="0"
              placeholderTextColor={palette.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <Text allowFontScaling style={[styles.label, { color: palette.text }]}>
              Fecha
            </Text>
            <TouchableOpacity
              style={[
                styles.dateTrigger,
                { borderColor: palette.textSecondary + '66', backgroundColor: palette.background },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text allowFontScaling style={[styles.dateTriggerText, { color: palette.text }]}>
                {date.toLocaleDateString()}
              </Text>
              <Text allowFontScaling style={{ color: palette.textSecondary }}>
                📅
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
            )}

            <Text allowFontScaling style={[styles.label, { color: palette.text }]}>
              Categoría
            </Text>
            <TouchableOpacity
              style={[
                styles.categoryTrigger,
                { borderColor: palette.textSecondary + '66', backgroundColor: palette.background },
              ]}
              onPress={() => setIsPickerVisible(true)}
            >
              <Text allowFontScaling style={[styles.categoryTriggerText, { color: palette.text }]}>
                {selectedCategory
                  ? `${selectedCategory.emoji} ${selectedCategory.nombre}`
                  : 'Seleccionar categoría...'}
              </Text>
              <Text allowFontScaling style={{ color: palette.textSecondary }}>
                ⌄
              </Text>
            </TouchableOpacity>

            <CategoryPicker
              categories={categories}
              selectedId={selectedCategoryId}
              onSelect={handleCategorySelect}
              visible={isPickerVisible}
              onClose={() => setIsPickerVisible(false)}
              themeMode={themeMode as any}
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: palette.primary }]}
              onPress={handleSubmit}
            >
              <Text allowFontScaling style={styles.saveButtonText}>
                Guardar Transacción
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  dateTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  dateTriggerText: {
    fontSize: 16,
  },
  categoryTriggerText: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
