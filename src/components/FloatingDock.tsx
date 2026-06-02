import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { getPalette, ThemePalette } from '../theme/theme';
import { useBoundStore } from '../store/useBoundStore';

// Types
interface DockItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  palette: ThemePalette;
  active?: boolean;
}

// Memoized DockItem
const DockItem = memo(({ icon, label, onPress, palette, active }: DockItemProps) => {
  const handlePress = useCallback(() => {
    Haptics.trigger('LIGHT');
    onPress();
  }, [onPress]);

  const iconColor = active ? palette.primary : palette.textSecondary;
  const textColor = active ? palette.primary : palette.textSecondary;

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.item,
        active && { backgroundColor: palette.primary + '20', borderColor: palette.primary, borderWidth: 1 },
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
        style={[styles.itemLabel, { color: textColor }]}
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

// Approximate dock height (collapsed) for slide-out animation
const DOCK_HIDDEN_OFFSET = 220; // px below screen

/**
 * Liquid Gold - Premium Navigation Bar.
 * HIDDEN BY DEFAULT — shown via swipe-up gesture from bottom edge.
 */
function FloatingDock({ onNavigate, currentRoute = '/' }: FloatingDockProps) {
  const themeMode = useBoundStore((state) => state.themeMode);
  const palette = getPalette(themeMode || 'dark');
  const insets = useSafeAreaInsets();

  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // TranslateY: 0 (visible) or DOCK_HIDDEN_OFFSET (hidden)
  const translateY = useRef(new Animated.Value(DOCK_HIDDEN_OFFSET)).current;
  // Peek indicator opacity (the small bar at bottom)
  const peekOpacity = useRef(new Animated.Value(1)).current;

  // Animate visibility changes
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: isVisible ? 0 : DOCK_HIDDEN_OFFSET,
        useNativeDriver: true,
        friction: 9,
        tension: 50,
      }),
      Animated.timing(peekOpacity, {
        toValue: isVisible ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isVisible, translateY, peekOpacity]);

  const show = useCallback(() => {
    if (!isVisible) {
      Haptics.trigger('LIGHT');
      setIsVisible(true);
    }
  }, [isVisible]);

  const hide = useCallback(() => {
    if (isVisible) {
      Haptics.trigger('LIGHT');
      setIsVisible(false);
      setIsExpanded(false);
    }
  }, [isVisible]);

  const toggleExpand = useCallback(() => {
    Haptics.trigger('LIGHT');
    setIsExpanded((prev) => !prev);
  }, []);

  const handleNavPress = useCallback(
    (route: string) => {
      if (onNavigate) {
        onNavigate(route);
      }
      // Auto-hide after navigating
      setIsVisible(false);
      setIsExpanded(false);
    },
    [onNavigate]
  );

  const isRouteActive = useCallback(
    (route: string) => currentRoute === route,
    [currentRoute]
  );

  // Swipe-up gesture: detect upward swipe on the peek bar
  const swipeGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onEnd((event) => {
      if (event.translationY < -30) {
        // Swiped up — show dock
        show();
      } else if (event.translationY > 30) {
        // Swiped down on visible dock — hide
        hide();
      }
    })
    .runOnJS(true);

  const goldColor = palette.goldBorder;
  const safeBottom = insets?.bottom || 12;

  return (
    <>
      {/* Peek indicator (always visible at bottom when dock is hidden) */}
      <Animated.View
        pointerEvents={isVisible ? 'none' : 'box-none'}
        style={[
          styles.peekWrapper,
          { bottom: safeBottom + 4, opacity: peekOpacity },
        ]}
      >
        <GestureDetector gesture={swipeGesture}>
          <TouchableOpacity
            onPress={show}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Mostrar menú de navegación"
            style={[styles.peekBar, { backgroundColor: goldColor + 'AA' }]}
          >
            <Ionicons name="chevron-up" size={14} color="#fff" />
            <Text style={styles.peekLabel}>Menú</Text>
          </TouchableOpacity>
        </GestureDetector>
      </Animated.View>

      {/* Main floating dock (hidden by default) */}
      <Animated.View
        pointerEvents={isVisible ? 'box-none' : 'none'}
        style={[
          styles.wrapper,
          { bottom: safeBottom + 12, transform: [{ translateY }] },
        ]}
      >
        <Animated.View
          style={[
            styles.dock,
            {
              backgroundColor: palette.card + 'F2',
              borderColor: goldColor,
              shadowColor: goldColor,
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
                onPress={() => handleNavPress(item.route)}
                palette={palette}
                active={isRouteActive(item.route)}
              />
            ))}
            <TouchableOpacity
              onPress={toggleExpand}
              style={styles.expandButton}
              accessibilityRole="button"
              accessibilityLabel={isExpanded ? 'Colapsar menú' : 'Expandir menú'}
            >
              <Ionicons
                name={isExpanded ? 'chevron-down' : 'chevron-up'}
                size={20}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {isExpanded && (
            <View style={[styles.divider, { backgroundColor: goldColor + '40' }]} />
          )}

          {isExpanded && (
            <View style={styles.row}>
              {row2Items.map((item) => (
                <DockItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  onPress={() => handleNavPress(item.route)}
                  palette={palette}
                  active={isRouteActive(item.route)}
                />
              ))}
            </View>
          )}
        </Animated.View>

        {/* Tap-outside region: tap on edges of dock wrapper to hide */}
        <TouchableOpacity
          style={styles.hideArea}
          onPress={hide}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel="Ocultar menú"
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 56,
    minHeight: 44,
    borderRadius: 8,
  },
  expandButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 44,
    minHeight: 44,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  // Peek indicator shown at bottom when dock is hidden
  peekWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  peekBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  peekLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  // Tap-outside zone (above the dock, to dismiss)
  hideArea: {
    position: 'absolute',
    top: -200,
    left: -50,
    right: -50,
    height: 200,
  },
});

export default memo(FloatingDock);
