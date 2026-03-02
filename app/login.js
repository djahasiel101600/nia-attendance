// app/login.js
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AuthService from '../services/AuthService';

const isWeb = Platform.OS === 'web';

export default function Login() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkStoredCredentials = async () => {
      try {
        const creds = await AuthService.getStoredCredentials();
        if (creds.employeeId) {
          // User is already logged in, redirect to dashboard
          router.replace('/dashboard');
        } else {
          setCheckingAuth(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setCheckingAuth(false);
      }
    };

    checkStoredCredentials();
  }, [router]);

  const handleLogin = async () => {
    if (!employeeId || !password) {
      alert('Please enter both Employee ID and Password');
      return;
    }

    setLoading(true);
    try {
      const success = await AuthService.login(employeeId, password);
      if (success) {
        router.replace('/dashboard');
      } else {
        alert('Login failed. Please check your credentials.');
      }
    } catch (error) {
      const msg = error?.message || String(error);
      const isCorsOrNetwork = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS');
      if (isWeb && isCorsOrNetwork) {
        alert(
          'Login is not supported in the browser due to security restrictions (CORS).\n\n' +
          'Please use the mobile app instead:\n' +
          '• Install Expo Go on your phone and open this project, or\n' +
          '• Run the app on an Android/iOS device or emulator.'
        );
      } else {
        alert('Login error: ' + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#00ff88" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isWeb && (
        <View style={styles.webNotice}>
          <Text style={styles.webNoticeTitle}>⚠️ Browser not supported for login</Text>
          <Text style={styles.webNoticeText}>
            NIA login and attendance APIs do not allow requests from the browser (CORS). Use the mobile app: Expo Go on your phone, or an Android/iOS device/emulator.
          </Text>
        </View>
      )}
      <Text style={styles.title}>NIA Attendance</Text>
      <Text style={styles.subtitle}>Login to continue</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Employee ID"
        value={employeeId}
        onChangeText={setEmployeeId}
        autoCapitalize="none"
        placeholderTextColor="#666"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#666"
      />
      
      <TouchableOpacity 
        style={styles.loginButton} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.loginButtonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
  },
  center: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ff88',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  loginButton: {
    backgroundColor: '#00ff88',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#00ff88',
    marginTop: 16,
    fontSize: 16,
  },
  webNotice: {
    backgroundColor: '#2a2a0a',
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  webNoticeTitle: {
    color: '#ffaa00',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  webNoticeText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
  },
});