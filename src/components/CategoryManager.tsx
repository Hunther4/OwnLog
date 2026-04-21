import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useFinanceStore } from '../store/useFinanceStore';
import { Category } from '../types/finance';
import { exportTransactionsToCSV } from '../utils/exportService';
import { theme, getPalette, type ThemePalette } from '../theme/theme';
import EmptyState from './EmptyState';

interface CategoryFormProps {
  category: Partial<Category>;
  onSave: (cat: Omit<Category, 'id'>) => void;
  onCancel: () => void;
  palette: ThemePalette;
}

const CategoryForm = ({ category, onSave, onCancel, palette }: CategoryFormProps) => {
  const [nombre, setNombre] = useState(category.nombre || '');
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>(category.tipo || 'egreso');
  const [emoji, setEmoji] = useState(category.emoji || '');
  const [colorHex, setColorHex] = useState(category.color_hex || '#000000');
  const [budget, setBudget] = useState<string>(category.budget?.toString() || '');
  const [cycle, setCycle] = useState<string>(category.cycle || 'monthly');

  return (
    <View
      style={[
        styles.form,
        { backgroundColor: palette.card, borderColor: palette.textSecondary + '33' },
      ]}
    >
      <Text allowFontScaling style={[styles.formTitle, { color: palette.text }]}>
        {category.id ? 'Editar Categoría' : 'Nueva Categoría'}
      </Text>

      <TextInput
        placeholder="Nombre de la categoría"
        placeholderTextColor={palette.textSecondary}
        value={nombre}
        onChangeText={setNombre}
        style={[styles.input, { borderColor: palette.textSecondary + '33', color: palette.text }]}
      />
      <TextInput
        placeholder="Emoji (ej: 🍔)"
        placeholderTextColor={palette.textSecondary}
        value={emoji}
        onChangeText={setEmoji}
        style={[styles.input, { borderColor: palette.textSecondary + '33', color: palette.text }]}
      />

      {tipo === 'egreso' && (
        <View style={styles.budgetSection}>
          <Text allowFontScaling style={[styles.budgetLabel, { color: palette.text }]}>
            Presupuesto (Opcional)
          </Text>
          <View style={styles.budgetRow}>
            <TextInput
              placeholder="Monto"
              placeholderTextColor={palette.textSecondary}
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
              style={[
                styles.budgetInput,
                { borderColor: palette.textSecondary + '33', color: palette.text },
              ]}
            />
            <TouchableOpacity
              style={[
                styles.cycleButton,
                { backgroundColor: palette.background, borderColor: palette.textSecondary + '33' },
              ]}
              onPress={() => {
                const cycles = { daily: 'Día', weekly: 'Semana', monthly: 'Mes' };
                const nextCycle =
                  cycle === 'daily' ? 'weekly' : cycle === 'weekly' ? 'monthly' : 'daily';
                setCycle(nextCycle);
              }}
            >
              <Text allowFontScaling style={[styles.cycleButtonText, { color: palette.text }]}>
                {cycle === 'daily' ? 'Diario' : cycle === 'weekly' ? 'Semanal' : 'Mensual'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.typeRow}>
        <TouchableOpacity
          onPress={() => setTipo('ingreso')}
          style={[
            styles.typeButton,
            tipo === 'ingreso' && { backgroundColor: palette.primary },
            { borderColor: palette.textSecondary + '33' },
          ]}
        >
          <Text allowFontScaling style={{ color: tipo === 'ingreso' ? '#fff' : palette.text }}>
            Ingreso
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTipo('egreso')}
          style={[
            styles.typeButton,
            tipo === 'egreso' && { backgroundColor: palette.primary },
            { borderColor: palette.textSecondary + '33' },
          ]}
        >
          <Text allowFontScaling style={{ color: tipo === 'egreso' ? '#fff' : palette.text }}>
            Egreso
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text allowFontScaling style={{ color: palette.textSecondary }}>
            Cancelar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            onSave({
              nombre,
              tipo,
              emoji,
              color_hex: colorHex,
              budget: parseInt(budget, 10) || null,
              cycle,
            })
          }
          style={[styles.saveButton, { backgroundColor: palette.primary }]}
        >
          <Text allowFontScaling style={styles.saveButtonText}>
            Guardar
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const CategoryManager: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory, themeMode } = useFinanceStore();
  const palette = getPalette(themeMode);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const handleExport = async () => {
    try {
      const path = await exportTransactionsToCSV();
      Alert.alert('Éxito', `Archivo exportado correctamente en:\n${path}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar la información a CSV.');
      console.error('[CategoryManager] Export error:', error);
    }
  };

  const handleSave = async (cat: Omit<Category, 'id'>) => {
    if (editingCategory?.id) {
      await updateCategory(editingCategory.id, cat);
      if (cat.budget !== undefined) {
        await useFinanceStore.getState().setBudget(editingCategory.id, cat.budget || 0);
      }
    } else {
      const id = await addCategory({ ...cat, activa: true });
      if (cat.budget !== undefined) {
        await useFinanceStore.getState().setBudget(id, cat.budget || 0);
      }
    }
    setIsFormVisible(false);
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormVisible(true);
  };

  const handleToggleActive = (category: Category) => {
    updateCategory(category.id, { activa: !category.activa });
  };

  const handleDelete = (category: Category) => {
    Alert.alert(
      'Eliminar Categoría',
      `¿Estás seguro de que quieres eliminar "${category.nombre}"? Las transacciones asociadas quedarán sin categoría.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(category.id);
            } catch (e) {
              Alert.alert('Error', 'No se pudo eliminar la categoría.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Text allowFontScaling style={[styles.title, { color: palette.text }]}>
          Categorías
        </Text>
        <TouchableOpacity
          onPress={handleExport}
          style={[styles.exportButton, { backgroundColor: palette.primary }]}
        >
          <Text allowFontScaling style={styles.exportButtonText}>
            Exportar CSV
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => {
          setEditingCategory(null);
          setIsFormVisible(true);
        }}
        style={[styles.addTrigger, { backgroundColor: palette.card }]}
      >
        <Text allowFontScaling style={[styles.addTriggerText, { color: palette.primary }]}>
          + Agregar Nueva Categoría
        </Text>
      </TouchableOpacity>

      {isFormVisible && (
        <CategoryForm
          category={editingCategory || {}}
          onSave={handleSave}
          onCancel={() => {
            setIsFormVisible(false);
            setEditingCategory(null);
          }}
          palette={palette}
        />
      )}

      {categories.length === 0 ? (
        <EmptyState
          icon={<Text>🏷️</Text>}
          title="No hay categorías"
          description="Crea tu primera categoría para organizar tus finanzas."
        />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View
              style={[
                styles.item,
                { backgroundColor: palette.card, borderColor: palette.textSecondary + '33' },
              ]}
            >
              <View style={styles.itemLeft}>
                <Text allowFontScaling style={[styles.itemText, { color: palette.text }]}>
                  {item.emoji} {item.nombre}
                </Text>
                <Text
                  allowFontScaling
                  style={[styles.itemSubtext, { color: palette.textSecondary }]}
                >
                  {item.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                </Text>
              </View>

              <View style={styles.itemRight}>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton}>
                  <Text allowFontScaling style={styles.deleteButtonText}>
                    🗑️
                  </Text>
                </TouchableOpacity>
                <Switch
                  value={item.activa}
                  onValueChange={() => handleToggleActive(item)}
                  trackColor={{ false: '#767577', true: palette.primary }}
                />
                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editButton}>
                  <Text
                    allowFontScaling
                    style={[styles.editButtonText, { color: palette.primary }]}
                  >
                    Editar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.l },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  exportButton: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderRadius: 12,
  },
  exportButtonText: { color: 'white', fontSize: 12, fontWeight: '600' },
  addTrigger: {
    padding: theme.spacing.m,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: theme.spacing.l,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#aaa',
  },
  addTriggerText: { fontWeight: '600', fontSize: 16 },
  form: {
    padding: theme.spacing.m,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: theme.spacing.l,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.m,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
    borderRadius: 12,
    fontSize: 16,
  },
  budgetSection: {
    marginBottom: theme.spacing.m,
    gap: 8,
  },
  budgetLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  budgetInput: {
    flex: 1,
    borderWidth: 1,
    padding: theme.spacing.m,
    borderRadius: 12,
    fontSize: 16,
  },
  cycleButton: {
    paddingHorizontal: 12,
    paddingVertical: theme.spacing.m,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cycleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: theme.spacing.m },
  typeButton: {
    flex: 1,
    padding: theme.spacing.m,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelButton: { padding: theme.spacing.m },
  saveButton: {
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  listContent: { paddingBottom: 40 },
  budgetToggle: {
    padding: theme.spacing.m,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: theme.spacing.m,
    borderWidth: 1,
  },
  budgetToggleText: { fontWeight: '600', fontSize: 16 },
  budgetList: {
    padding: theme.spacing.m,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: theme.spacing.l,
    gap: 12,
  },
  budgetListTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  budgetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  budgetItemText: { fontSize: 14, flex: 1 },
  budgetItemInput: {
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
    width: 100,
    textAlign: 'right',
    fontSize: 14,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.m,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  itemLeft: { flex: 1 },
  itemText: { fontSize: 16, fontWeight: '600' },
  itemSubtext: { fontSize: 12, marginTop: 2 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  editButton: { padding: 8 },
  editButtonText: { fontWeight: '600', fontSize: 14 },
  deleteButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButtonText: {
    fontSize: 18,
  },
});
