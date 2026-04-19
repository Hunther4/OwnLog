import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { theme, getPalette } from '../theme/theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    title: 'Bienvenido a OwnLog',
    description:
      'Toma el control total de tus finanzas con una herramienta offline, privada y ultra rápida.',
    emoji: '💰',
  },
  {
    title: 'Control Total',
    description:
      'Gestiona tus presupuestos mensuales y recibe alertas cuando te estés acercando al límite.',
    emoji: '📈',
  },
  {
    title: 'Dock Dinámico',
    description:
      'Desliza hacia arriba la barra inferior para acceder a herramientas avanzadas y mantenimiento.',
    emoji: '🚀',
  },
];

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const palette = getPalette('dark'); // Onboarding always looks better in dark mode

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.content}>
        <Text allowFontScaling style={[styles.emoji, { color: palette.text }]}>
          {step.emoji}
        </Text>
        <Text allowFontScaling style={[styles.title, { color: palette.text }]}>
          {step.title}
        </Text>
        <Text allowFontScaling style={[styles.description, { color: palette.textSecondary }]}>
          {step.description}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {ONBOARDING_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                {
                  backgroundColor:
                    index === currentStep ? palette.primary : palette.textSecondary + '44',
                  width: index === currentStep ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: palette.primary }]}
          onPress={handleNext}
        >
          <Text allowFontScaling style={styles.nextButtonText}>
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Comenzar ahora' : 'Siguiente'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.l,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
    gap: 24,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    minWidth: 200,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
