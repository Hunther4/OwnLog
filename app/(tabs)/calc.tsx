import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useBoundStore } from '../../src/store/useBoundStore';
import { getPalette } from '../../src/theme/theme';
import Haptics from '../../src/utils/haptics';
import { useRouter } from 'expo-router';

export default function CalcScreen() {
  const themeMode = useBoundStore((state) => state.themeMode);
  const palette = getPalette(themeMode);
  const addTransaction = useBoundStore((state) => state.addTransaction);
  const router = useRouter();

  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleNumber = (num: string) => {
    Haptics.trigger('LIGHT');
    setDisplay((prev) => (prev === '0' ? num : prev + num));
  };

  const handleOperator = (op: string) => {
    Haptics.trigger('LIGHT');
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    Haptics.notify('NOTIFICATION_SUCCESS');
    try {
      const fullEquation = equation + display;
      // Use Function instead of eval for slightly better safety in this context
      const result = new Function(`return ${fullEquation}`)();
      setDisplay(result.toString());
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const clear = () => {
    Haptics.trigger('LIGHT');
    setDisplay('0');
    setEquation('');
  };

  const backspace = () => {
    Haptics.trigger('LIGHT');
    setDisplay((prev) => {
      if (prev.length <= 1 || (prev.length === 2 && prev.startsWith('-'))) {
        return '0';
      }
      return prev.slice(0, -1);
    });
  };

  const sendToTransaction = async () => {
    const amount = parseInt(display, 10);
    if (isNaN(amount) || amount === 0) return;

    Haptics.notify('NOTIFICATION_SUCCESS');

    // We send the user to the add transaction screen with the amount pre-filled
    // Or we could add it directly. Let's send them to the form to pick a category.
    router.push({
      pathname: '/add-transaction',
      params: { amount: amount },
    });
  };

  const Button = ({ label, onPress, style = {}, textStyle = {} }: any) => (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: palette.card }, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.buttonText, { color: palette.text }, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );

  const goBack = () => router.push('/');
  const goToAddTransaction = () => {
    // @ts-ignore - expo-router types
    router.push({ pathname: '/add-transaction', params: { amount: display } });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.7}>
          <Text style={[styles.backButtonText, { color: palette.text }]}>← Volver</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.addTransactionButton, { backgroundColor: palette.primary }]}
          onPress={goToAddTransaction}
          activeOpacity={0.8}
        >
          <Text style={[styles.addTransactionButtonText, { color: palette.white }]}>Agregar Transacción ➕</Text>
        </TouchableOpacity>

        <View style={[styles.displayContainer, { backgroundColor: palette.card }]}>
          <Text style={[styles.equationText, { color: palette.textSecondary }]}>{equation}</Text>
          <Text style={[styles.displayText, { color: palette.text }]}>{display}</Text>
        </View>

        <View style={styles.keypad}>
          <View style={styles.row}>
            <Button
              label="C"
              onPress={clear}
              style={{ backgroundColor: palette.delete }}
              textStyle={{ color: '#fff' }}
            />
            <Button
              label="⌫"
              onPress={backspace}
              style={{ backgroundColor: palette.textSecondary }}
              textStyle={{ color: '#fff' }}
            />
            <Button label="%" onPress={() => setDisplay((parseFloat(display) / 100).toString())} />
            <Button
              label="÷"
              onPress={() => handleOperator('/')}
              style={{ backgroundColor: palette.primary }}
              textStyle={{ color: '#fff' }}
            />
          </View>
          <View style={styles.row}>
            <Button label="7" onPress={() => handleNumber('7')} />
            <Button label="8" onPress={() => handleNumber('8')} />
            <Button label="9" onPress={() => handleNumber('9')} />
            <Button
              label="×"
              onPress={() => handleOperator('*')}
              style={{ backgroundColor: palette.primary }}
              textStyle={{ color: '#fff' }}
            />
          </View>
          <View style={styles.row}>
            <Button label="4" onPress={() => handleNumber('4')} />
            <Button label="5" onPress={() => handleNumber('5')} />
            <Button label="6" onPress={() => handleNumber('6')} />
            <Button
              label="-"
              onPress={() => handleOperator('-')}
              style={{ backgroundColor: palette.primary }}
              textStyle={{ color: '#fff' }}
            />
          </View>
          <View style={styles.row}>
            <Button label="1" onPress={() => handleNumber('1')} />
            <Button label="2" onPress={() => handleNumber('2')} />
            <Button label="3" onPress={() => handleNumber('3')} />
            <Button
              label="+"
              onPress={() => handleOperator('+')}
              style={{ backgroundColor: palette.primary }}
              textStyle={{ color: '#fff' }}
            />
          </View>
          <View style={styles.row}>
            <Button label="0" onPress={() => handleNumber('0')} style={{ flex: 2 }} />
            <Button label="." onPress={() => handleNumber('.')} />
            <Button
              label="="
              onPress={calculate}
              style={{ backgroundColor: palette.primary }}
              textStyle={{ color: '#fff' }}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: palette.primary }]}
          onPress={sendToTransaction}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>Usar en Transacción 🚀</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addTransactionButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addTransactionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  displayContainer: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'flex-end',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  equationText: {
    fontSize: 20,
    marginBottom: 8,
    opacity: 0.7,
  },
  displayText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  keypad: {
    gap: 12,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  actionButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
