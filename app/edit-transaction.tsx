import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBoundStore } from '../src/store/useBoundStore';
import { getPalette } from '../src/theme/theme';
import CategoryPicker from '../src/components/CategoryPicker';
import Haptics from '../src/utils/haptics';

export default function EditTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = parseInt(id || '0', 10);
  const tx = useBoundStore((s) => s.transactions.entities[transactionId]);
  const categories = useBoundStore((s) => s.categories);
  const updateTransaction = useBoundStore((s) => s.updateTransaction);
  const themeMode = useBoundStore((s) => s.themeMode);
  const palette = getPalette(themeMode);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (tx) {
      setDescription(tx.descripcion || '');
      setAmount(tx.monto.toString());
      setSelectedCategoryId(tx.categoria_id);
      setDate(new Date(tx.fecha_local + 'T12:00:00'));
    }
  }, [tx]);

  if (!tx) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
        <View style={styles.container}>
          <Text allowFontScaling style={{ color: palette.text }}>Transacción no encontrada.</Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.saveButton, { backgroundColor: palette.primary }]}>
            <Text allowFontScaling style={styles.saveButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    const numAmount = parseInt(amount.replace(/[.,\s]/g, ''), 10);
    if (isNaN(numAmount) || numAmount <= 0 || !selectedCategoryId) {
      Alert.alert('Error', 'Completa monto y categoría.');
      return;
    }
    try {
      // BUGFIX (UTC drift, same as AddTransactionForm): use local-time
      // components for fecha_local so users west of UTC don't see the
      // date shift by one day after editing.
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const fechaLocal = `${year}-${month}-${day}`;

      await updateTransaction(transactionId, {
        monto: numAmount,
        descripcion: description.trim() || undefined,
        categoria_id: selectedCategoryId,
        fecha_local: fechaLocal,
        fecha_utc: date.toISOString(),
      });
      Haptics.notify('NOTIFICATION_SUCCESS');
      router.back();
    } catch (e) {
      Haptics.notify('NOTIFICATION_ERROR');
      Alert.alert('Error', 'No se pudo actualizar la transacción.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text allowFontScaling style={[styles.title, { color: palette.text }]}>Editar Transacción</Text>

          <Text allowFontScaling style={[styles.label, { color: palette.text }]}>Descripción</Text>
          <TextInput style={[styles.input, { borderColor: palette.textSecondary + '66', color: palette.text }]} value={description} onChangeText={setDescription} placeholderTextColor={palette.textSecondary} />

          <Text allowFontScaling style={[styles.label, { color: palette.text }]}>Monto (CLP)</Text>
          <TextInput style={[styles.input, { borderColor: palette.textSecondary + '66', color: palette.text }]} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholderTextColor={palette.textSecondary} />

          <Text allowFontScaling style={[styles.label, { color: palette.text }]}>Fecha</Text>
          <TouchableOpacity style={[styles.dateTrigger, { borderColor: palette.textSecondary + '66', backgroundColor: palette.background }]} onPress={() => setShowDatePicker(true)}>
            <Text allowFontScaling style={{ color: palette.text }}>{date.toLocaleDateString()}</Text>
            <Text allowFontScaling style={{ color: palette.textSecondary }}>📅</Text>
          </TouchableOpacity>
          {showDatePicker && <DateTimePicker value={date} mode="date" display="default" onChange={(_: DateTimePickerEvent, d?: Date) => { setShowDatePicker(false); if (d) setDate(d); }} />}

          <Text allowFontScaling style={[styles.label, { color: palette.text }]}>Categoría</Text>
          <TouchableOpacity style={[styles.dateTrigger, { borderColor: palette.textSecondary + '66', backgroundColor: palette.background }]} onPress={() => setIsPickerVisible(true)}>
            <Text allowFontScaling style={{ color: palette.text }}>
              {categories.find((c) => c.id === selectedCategoryId)?.nombre || 'Seleccionar...'}
            </Text>
          </TouchableOpacity>
          <CategoryPicker categories={categories} selectedId={selectedCategoryId} onSelect={(cid) => { Haptics.trigger('LIGHT'); setSelectedCategoryId(cid); }} visible={isPickerVisible} onClose={() => setIsPickerVisible(false)} themeMode={themeMode} />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <TouchableOpacity style={[styles.saveButton, { flex: 1, backgroundColor: palette.textSecondary + '33' }]} onPress={() => router.back()}>
              <Text allowFontScaling style={[styles.saveButtonText, { color: palette.text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, { flex: 1, backgroundColor: palette.primary }]} onPress={handleSave}>
              <Text allowFontScaling style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 20, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8 },
  dateTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
