// app/monitor.js
import RealTimeMonitor from '@/components/RealTimeMonitor';
import AuthService from '@/services/AuthService';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function MonitorScreen() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const creds = await AuthService.getStoredCredentials();
        if (!creds.employeeId) {
          // Not logged in, redirect to login
          router.replace('/login');
          return;
        }
        setEmployeeId(creds.employeeId);
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#00ff88" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RealTimeMonitor employeeId={employeeId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#00ff88',
    marginTop: 16,
    fontSize: 16,
  },
});