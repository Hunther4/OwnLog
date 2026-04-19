import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBoundStore } from '../../src/store/useBoundStore';
import { getPalette } from '../../src/theme/theme';
import * as Haptics from 'expo-haptics';
import { Category } from '../../src/types/master';

export default function CategoriesScreen() {
  const themeMode = useBoundStore((state) => state.themeMode);
  const categories = useBoundStore((state) => state.categories);
  const addCategory = useBoundStore((state) => state.addCategory);
  const updateCategory = useBoundStore((state) => state.updateCategory);
  const deleteCategory = useBoundStore((state) => state.deleteCategory);
  const palette = getPalette(themeMode);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newCat, setNewCat] = useState({
    nombre: '',
    tipo: 'egreso' as 'ingreso' | 'egreso',
    emoji: '💰',
    color_hex: '#6366f1',
    activa: true,
  });
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const handleAdd = async () => {
    if (!newCat.nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    try {
      await addCategory(newCat);
      setNewCat({
        nombre: '',
        tipo: 'egreso',
        emoji: '💰',
        color_hex: '#6366f1',
        activa: true,
      });
      setIsModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Error', 'No se pudo agregar');
    }
  };

  const renderItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
      onPress={() => setEditingCat(item)}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Eliminar', `¿Eliminar ${item.nombre}?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: async () => {
            await deleteCategory(item.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }},
        ]);
      }}
    >
      <Text style={styles.emoji}>{item.emoji}</Text>
      <View style={styles.cardContent}>
        <Text style={[styles.nombre, { color: palette.text }]}>{item.nombre}</Text>
        <Text style={[styles.tipo, { color: item.tipo === 'ingreso' ? '#4caf50' : '#f44336' }]}>
          {item.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.container}>
        <FlatList
          data={categories as Category[]}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: palette.primary }]}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.card }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Nueva Categoría</Text>
            <TextInput
              style={[styles.input, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
              placeholder="Nombre"
              placeholderTextColor={palette.textSecondary}
              value={newCat.nombre}
              onChangeText={(t) => setNewCat({ ...newCat, nombre: t })}
            />
            <View style={styles.tipoButtons}>
              {(['egreso', 'ingreso'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tipoBtn, newCat.tipo === t && { backgroundColor: t === 'ingreso' ? '#4caf50' : '#f44336' }]}
                  onPress={() => setNewCat({ ...newCat, tipo: t })}
                >
                  <Text style={styles.tipoBtnText}>{t === 'ingreso' ? 'Ingreso' : 'Egreso'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={{ color: palette.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: palette.primary }]} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  fabText: { fontSize: 28, color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  tipoButtons: { flexDirection: 'row', marginBottom: 16 },
  tipoBtn: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 4, alignItems: 'center' },
  tipoBtnText: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  saveBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});