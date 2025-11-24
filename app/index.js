import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import AuthService from '../services/AuthService';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const { employeeId } = await AuthService.getStoredCredentials();
        
        // Small delay for better UX
        setTimeout(() => {
          if (employeeId) {
            router.replace('/dashboard');
          } else {
            router.replace('/login');
          }
          setIsLoading(false);
        }, 1000);
      } catch (_error) {
        // Ignore error and redirect to login
        router.replace('/login');
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, [router]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContent}>
          <Text style={styles.appName}>NIA Attendance</Text>
          <Text style={styles.subtitle}>Loading...</Text>
          <ActivityIndicator size="large" color="#00ff88" style={styles.spinner} />
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
  },
  spinner: {
    marginTop: 20,
  },
});