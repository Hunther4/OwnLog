import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  ctaButton?: { label: string; onPress: () => void };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, ctaButton }) => {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer} testID="test-icon">{icon}</View>}
      <Text 
        allowFontScaling 
        style={styles.title}
      >
        {title}
      </Text>
      <Text 
        allowFontScaling 
        style={styles.description}
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
          style={styles.button}
        >
          <Text 
            allowFontScaling 
            style={styles.buttonText}
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
    flex: 1,
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
    color: '#111827',
    marginVertical: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#2563eb',
    fontWeight: '500',
  },
});

export default EmptyState;