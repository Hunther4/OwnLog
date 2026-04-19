import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme, getPalette } from '../../theme/theme';
import { useFinanceStore } from '../../store/useFinanceStore';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, children }) => {
  const themeMode = useFinanceStore((state) => state.themeMode);
  const palette = getPalette(themeMode);

  return (
    <View style={[styles.container, { backgroundColor: palette.card }]}>
      <Text allowFontScaling style={[styles.title, { color: palette.text }]}>
        {title}
      </Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.l,
    ...theme.shadows.card,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: theme.spacing.m,
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
