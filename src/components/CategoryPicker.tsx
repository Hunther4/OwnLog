import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Pressable } from 'react-native';
import { Category } from '../types/finance';
import { theme, getPalette } from '../theme/theme';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  visible: boolean;
  onClose: () => void;
  themeMode: 'light' | 'dark' | 'purple';
}

export default function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  visible,
  onClose,
  themeMode,
}: CategoryPickerProps) {
  const palette = getPalette(themeMode);

  const renderItem = ({ item }: { item: Category }) => {
    const isSelected = item.id === selectedId;
    return (
      <TouchableOpacity
        style={[
          styles.item,
          {
            backgroundColor: isSelected ? palette.primary : palette.card,
            borderColor: isSelected ? palette.primary : palette.border,
          },
        ]}
        onPress={() => {
          onSelect(item.id);
          onClose();
        }}
      >
        <Text
          allowFontScaling
          style={[styles.itemText, { color: isSelected ? '#fff' : palette.text }]}
        >
          {item.emoji} {item.nombre}
        </Text>
        {isSelected && <View style={styles.selectedCheck} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.header}>
            <Text allowFontScaling style={[styles.headerTitle, { color: palette.text }]}>
              Seleccionar Categoría
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text
                allowFontScaling
                style={[styles.closeButtonText, { color: palette.textSecondary }]}
              >
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={categories}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedCheck: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});
