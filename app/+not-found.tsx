import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '¡Oops! Página no encontrada' }} />
      <View style={styles.container}>
        <Text style={styles.title}>¡Parece que te perdiste!</Text>
        <Text style={styles.subtitle}>Esta ruta no existe en OwnLog.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Volver al Dashboard</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  link: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2e78b7',
    borderRadius: 8,
  },
  linkText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
