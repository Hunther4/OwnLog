import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBoundStore } from '../../src/store/useBoundStore';
import { getPalette } from '../../src/theme/theme';
import Haptics from '../../src/utils/haptics';
import { Category } from '../../src/types/master';

type FormState = {
  nombre: string;
  tipo: 'ingreso' | 'egreso';
  emoji: string;
  color_hex: string;
  activa: boolean;
};

const EMPTY_FORM: FormState = {
  nombre: '',
  tipo: 'egreso',
  emoji: '💰',
  color_hex: '#6366f1',
  activa: true,
};

const EMOJI_CHOICES = ['💰', '🛒', '🍔', '🚗', '🏠', '💊', '🎬', '✈️', '📚', '💼', '🎁', '☕'];
const COLOR_CHOICES = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];

export default function CategoriesScreen() {
  const themeMode = useBoundStore((state) => state.themeMode);
  const categories = useBoundStore((state) => state.categories);
  const addCategory = useBoundStore((state) => state.addCategory);
  const updateCategory = useBoundStore((state) => state.updateCategory);
  const deleteCategory = useBoundStore((state) => state.deleteCategory);
  const palette = getPalette(themeMode);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const isEditing = editingCat !== null;

  // Keep the form synced with the category being edited (or reset when adding)
  useEffect(() => {
    if (editingCat) {
      setForm({
        nombre: editingCat.nombre,
        tipo: editingCat.tipo,
        emoji: editingCat.emoji,
        color_hex: editingCat.color_hex,
        activa: editingCat.activa,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingCat]);

  const openNewModal = () => {
    setEditingCat(null);
    setIsModalVisible(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCat(cat);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingCat(null);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    try {
      if (isEditing && editingCat) {
        await updateCategory(editingCat.id, form);
      } else {
        await addCategory(form);
      }
      Haptics.notify('NOTIFICATION_SUCCESS');
      closeModal();
    } catch (e) {
      Alert.alert('Error', isEditing ? 'No se pudo actualizar' : 'No se pudo agregar');
    }
  };

  const handleDelete = (cat: Category) => {
    Haptics.trigger('MEDIUM');
    Alert.alert('Eliminar', `¿Eliminar ${cat.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(cat.id);
          Haptics.notify('NOTIFICATION_SUCCESS');
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
      onPress={() => openEditModal(item)}
      onLongPress={() => handleDelete(item)}
    >
      <Text allowFontScaling style={styles.emoji}>{item.emoji}</Text>
      <View style={styles.cardContent}>
        <Text allowFontScaling style={[styles.nombre, { color: palette.text }]}>{item.nombre}</Text>
        <Text allowFontScaling style={[styles.tipo, { color: item.tipo === 'ingreso' ? palette.income : palette.expense }]}>
          {item.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.container}>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
        />
      </View>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: palette.primary }]}
        onPress={openNewModal}
      >
        <Text allowFontScaling style={[styles.fabText, { color: palette.white }]}>+</Text>
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: palette.card }]}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text allowFontScaling style={[styles.modalTitle, { color: palette.text }]}>
                  {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
                </Text>

                <Text allowFontScaling style={[styles.label, { color: palette.textSecondary }]}>Nombre</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
                  placeholder="Nombre"
                  placeholderTextColor={palette.textSecondary}
                  value={form.nombre}
                  onChangeText={(t) => setForm({ ...form, nombre: t })}
                />

                <Text allowFontScaling style={[styles.label, { color: palette.textSecondary }]}>Tipo</Text>
                <View style={styles.tipoButtons}>
                  {(['egreso', 'ingreso'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.tipoBtn,
                        form.tipo === t && { backgroundColor: t === 'ingreso' ? palette.income : palette.expense },
                      ]}
                      onPress={() => setForm({ ...form, tipo: t })}
                    >
                      <Text style={[styles.tipoBtnText, form.tipo === t && { color: '#fff' }]}>
                        {t === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text allowFontScaling style={[styles.label, { color: palette.textSecondary }]}>Emoji</Text>
                <View style={styles.choicesRow}>
                  {EMOJI_CHOICES.map((e) => (
                    <TouchableOpacity
                      key={e}
                      style={[
                        styles.choiceChip,
                        { backgroundColor: palette.background, borderColor: palette.border },
                        form.emoji === e && { backgroundColor: palette.primary + '33', borderColor: palette.primary },
                      ]}
                      onPress={() => setForm({ ...form, emoji: e })}
                    >
                      <Text allowFontScaling style={styles.choiceEmoji}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text allowFontScaling style={[styles.label, { color: palette.textSecondary }]}>Color</Text>
                <View style={styles.choicesRow}>
                  {COLOR_CHOICES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c },
                        form.color_hex === c && { borderColor: palette.text, borderWidth: 3 },
                      ]}
                      onPress={() => setForm({ ...form, color_hex: c })}
                    />
                  ))}
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={closeModal}>
                  <Text style={{ color: palette.textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: palette.primary }]}
                  onPress={handleSave}
                >
                  <Text style={styles.saveBtnText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8 },
  emoji: { fontSize: 28, marginRight: 12 },
  cardContent: { flex: 1 },
  nombre: { fontSize: 16, fontWeight: '600' },
  tipo: { fontSize: 12, marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 135, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  fabText: { fontSize: 28 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { padding: 24, paddingBottom: 32, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 4 },
  tipoButtons: { flexDirection: 'row', marginBottom: 4 },
  tipoBtn: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 4, alignItems: 'center' },
  tipoBtnText: { fontWeight: '600' },
  choicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  choiceChip: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  choiceEmoji: { fontSize: 22 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  saveBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
