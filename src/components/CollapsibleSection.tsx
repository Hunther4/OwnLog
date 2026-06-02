import React, { useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPalette, ThemePalette } from '../theme/theme';
import Haptics from '../utils/haptics';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  themeMode: 'light' | 'dark' | 'purple';
  defaultExpanded?: boolean;
  badgeCount?: number;
  children: ReactNode;
}

/**
 * CollapsibleSection - Accordion-style section header with animated expand/collapse.
 * Persists in-memory only (resets on screen remount).
 */
export default function CollapsibleSection({
  title,
  icon,
  themeMode,
  defaultExpanded = false,
  badgeCount,
  children,
}: CollapsibleSectionProps) {
  const palette = getPalette(themeMode);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim]);

  const toggle = useCallback(() => {
    Haptics.trigger('LIGHT');
    // LayoutAnimation makes children expand/collapse smoothly
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[styles.section, { backgroundColor: palette.card }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${expanded ? 'Colapsar' : 'Expandir'} ${title}`}
      >
        <View style={styles.headerLeft}>
          {icon && (
            <Text allowFontScaling style={[styles.headerIcon, { color: palette.primary }]}>
              {icon}
            </Text>
          )}
          <Text allowFontScaling style={[styles.headerTitle, { color: palette.primary }]}>
            {title}
          </Text>
          {badgeCount !== undefined && badgeCount > 0 && (
            <View style={[styles.badge, { backgroundColor: palette.primary }]}>
              <Text allowFontScaling style={styles.badgeText}>
                {badgeCount}
              </Text>
            </View>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="chevron-down" size={20} color={palette.textSecondary} />
        </Animated.View>
      </TouchableOpacity>
      {expanded && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 56,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
});
