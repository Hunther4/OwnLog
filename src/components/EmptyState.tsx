import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { palettes, type ThemePalette } from '../theme/theme';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  ctaButton?: { label: string; onPress: () => void };
  palette?: ThemePalette;
}

const defaultPalette = palettes.light;

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, ctaButton, palette }) => {
  const p = palette || defaultPalette;

  return (
    <View style={[styles.container, { backgroundColor: p.background }]}>
      {icon && <View style={styles.iconContainer} testID="test-icon">{icon}</View>}
<Text 
         allowFontScaling={true} 
         style={[styles.title, { color: p.text }]}
       >

        {title}
      </Text>
<Text 
         allowFontScaling={true} 
         style={[styles.description, { color: p.textSecondary }]}
       >

        {description}
      </Text>
      {ctaButton && (
        <TouchableOpacity 
          onPress={ctaButton.onPress} 
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={ctaButton.label}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          style={[styles.button, { backgroundColor: p.primary }]}
        >
<Text 
             allowFontScaling={true} 
             style={[styles.buttonText, { color: p.white }]}
           >

            {ctaButton.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    marginVertical: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmptyState;