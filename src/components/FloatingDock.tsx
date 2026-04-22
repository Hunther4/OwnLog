import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getPalette, ThemePalette } from '../theme/theme';
import { useBoundStore } from '../store/useBoundStore';

// Types
interface DockItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  palette: ThemePalette;
  active?: boolean;
  isActive?: boolean; // For showing active state (like move mode)
}

// Memoized DockItem
const DockItem = memo(({ icon, label, onPress, palette, active, isActive }: DockItemProps) => {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  // Different color when isActive (move mode is on)
  const activeColor = isActive ? '#00FF00' : (palette.goldBorder || '#FFD700');
  const iconColor = active || isActive ? activeColor : palette.textSecondary;
  const textColor = active || isActive ? activeColor : palette.textSecondary;

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.item,
        isActive && styles.itemActive, // Highlight when active
      ]}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={22}
        color={iconColor}
      />
      <Text
        allowFontScaling
        style={[
          styles.itemLabel,
          { color: textColor },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

DockItem.displayName = 'DockItem';

// Row 1 - Main Navigation (5 icons)
const row1Items = [
  { id: 'home', icon: 'home-outline', label: 'Inicio', route: '/' },
  { id: 'transactions', icon: 'wallet-outline', label: 'Movimientos', route: '/transactions' },
  { id: 'budgets', icon: 'trending-up-outline', label: 'Presupuestos', route: '/budgets' },
  { id: 'categories', icon: 'pricetags-outline', label: 'Categorías', route: '/categories' },
  { id: 'settings', icon: 'settings-outline', label: 'Ajustes', route: '/(tabs)/settings' },
];

// Row 2 - Secondary Actions (2 icons)
const row2Items = [
  { id: 'reports', icon: 'bar-chart-outline', label: 'Reportes', route: '/reports' },
  { id: 'calc', icon: 'calculator-outline', label: 'Calculadora', route: '/calc' },
];

interface FloatingDockProps {
  onNavigate?: (route: string) => void;
  currentRoute?: string;
}

// Liquid Gold - Premium Navigation Bar with 2-row structure
// Uses useBoundStore for theme to ensure persistence (vs useFinanceStore which has no persistence)
function FloatingDock({ onNavigate, currentRoute = '/' }: FloatingDockProps) {
  // Subscribe to theme changes from useBoundStore (which has persistence)
  const themeMode = useBoundStore((state) => state.themeMode);
  const palette = getPalette(themeMode || 'dark');
  const insets = useSafeAreaInsets();
  
  const [isExpanded, setIsExpanded] = useState(false); // Segunda fila expandida/retraída
  
  // Animated value for expand push
  const expandAnim = useRef(new Animated.Value(0)).current;
  
  // Animate expand - push DOWN when expanded so top edge doesn't cover content
  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 30 : 0, // Push DOWN by 30px to compensate for taller dock
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [isExpanded, expandAnim]);
  
  // Get gold color based on theme for best contrast
  const goldColor = palette.goldBorder || '#FFD700';
  
  // Liquid gold colors per theme for that premium feel
  const liquidGoldStyle = {
    backgroundColor: palette.card + 'F2', // Semi-transparent card (95% opacity)
    borderColor: goldColor,
    shadowColor: goldColor, // Gold glow shadow
  };

  const handleNavPress = useCallback((route: string) => {
    if (onNavigate) {
      onNavigate(route);
    }
  }, [onNavigate]);

  const handleItemPress = useCallback((item: typeof row1Items[0] | typeof row2Items[0]) => {
    handleNavPress(item.route);
  }, [handleNavPress]);

  // Find active route (check both rows)
  const isRouteActive = useCallback((route: string) => {
    return currentRoute === route;
  }, [currentRoute]);

  return (
    <Animated.View 
      style={[
        styles.wrapper, 
        { bottom: (insets?.bottom || 12) + 12 },
        { transform: [{ translateY: expandAnim }] }
      ]} 
    >
      {/* Animated Container for Dragging */}
      <Animated.View 
        style={[
          styles.dock, 
          { 
            backgroundColor: palette.card,
            borderColor: palette.goldBorder || '#FFD700',
            shadowColor: palette.goldBorder || '#FFD700',
          }, 
        ]}
      >
        {/* Row 1 - Main Navigation with Expand Button */}
        <View style={styles.row}>
          {row1Items.map((item) => (
            <DockItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              onPress={() => handleItemPress(item)}
              palette={palette}
              active={isRouteActive(item.route)}
            />
          ))}
          {/* Botón expandir/colapsar */}
          <TouchableOpacity 
            onPress={() => setIsExpanded(!isExpanded)}
            style={styles.expandButton}
          >
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={palette.textSecondary} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Divider - solo visible cuando expandido */}
        {isExpanded && (
          <View style={[styles.divider, { backgroundColor: goldColor + '40' }]} />
        )}
        
        {/* Row 2 - Secondary Actions - solo visible cuando expandido */}
        {isExpanded && (
          <View style={styles.row}>
            {row2Items.map((item) => (
              <DockItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                onPress={() => handleItemPress(item)}
                palette={palette}
                active={isRouteActive(item.route)}
              />
            ))}
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  wrapperExpanded: {
    marginBottom: 20,
  },
  dock: {
    borderRadius: 24,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 8,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  divider: {
    height: 1,
    marginVertical: 6,
    marginHorizontal: 16,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 52,
    borderRadius: 8,
  },
  itemActive: {
    backgroundColor: '#00FF0020', // Verde translúcido cuando activo
    borderWidth: 1,
    borderColor: '#00FF00',
  },
  expandButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  itemLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  });

export default memo(FloatingDock);