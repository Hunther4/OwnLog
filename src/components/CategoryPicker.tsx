import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Pressable } from 'react-native';
import { Category } from '../types/master';
import { getPalette } from '../theme/theme';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  visible: boolean;
  onClose: () => void;
  themeMode: 'light' | 'dark' | 'purple';
}

// Memoized row component so the FlatList doesn't re-render all items
// when only one selection changes.
const CategoryRow = memo(
  ({
    item,
    isSelected,
    onPress,
    palette,
  }: {
    item: Category;
    isSelected: boolean;
    onPress: () => void;
    palette: ReturnType<typeof getPalette>;
  }) => {
    return (
      <TouchableOpacity
        style={[
          styles.item,
          {
            backgroundColor: isSelected ? palette.primary : palette.card,
            borderColor: isSelected ? palette.primary : palette.border,
          },
        ]}
        onPress={onPress}
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
  }
);
CategoryRow.displayName = 'CategoryRow';

function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  visible,
  onClose,
  themeMode,
}: CategoryPickerProps) {
  const palette = getPalette(themeMode);

  const handleItemPress = useCallback(
    (id: number) => {
      onSelect(id);
      onClose();
    },
    [onSelect, onClose]
  );

  const renderItem = useCallback(
    ({ item }: { item: Category }) => (
      <CategoryRow
        item={item}
        isSelected={item.id === selectedId}
        onPress={() => handleItemPress(item.id)}
        palette={palette}
      />
    ),
    [selectedId, handleItemPress, palette]
  );

  const keyExtractor = useCallback((item: Category) => item.id.toString(), []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.header, { borderBottomColor: palette.border }]}>
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
            keyExtractor={keyExtractor}
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

export default memo(CategoryPicker);

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
