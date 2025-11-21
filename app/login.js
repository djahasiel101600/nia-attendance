// app/login.js - Add auto-login check
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AuthService from '../services/AuthService';

export default function Login() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoLoginLoading, setAutoLoginLoading] = useState(true);

  // Check for stored credentials on component mount
  useEffect(() => {
    checkStoredCredentials();
  }, []);

  const checkStoredCredentials = async () => {
    try {
      const creds = await AuthService.getStoredCredentials();
      if (creds.employeeId && creds.password) {
        console.log('🔑 Found stored credentials, attempting auto-login...');
        
        // Try to auto-login
        setAutoLoginLoading(true);
        const success = await AuthService.login(creds.employeeId, creds.password);
        
        if (success) {
          console.log('✅ Auto-login successful!');
          router.replace('/dashboard');
        } else {
          console.log('❌ Auto-login failed, showing login form');
          // Pre-fill the form with stored credentials
          setEmployeeId(creds.employeeId);
          setPassword(creds.password);
        }
      }
    } catch (error) {
      console.error('Auto-login check error:', error);
    } finally {
      setAutoLoginLoading(false);
    }
  };

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
      alert('Login error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (autoLoginLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#00ff88" />
        <Text style={styles.loadingText}>Auto-logging in...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NIA Attendance</Text>
      <Text style={styles.subtitle}>Login to continue</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Employee ID"
        value={employeeId}
        onChangeText={setEmployeeId}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
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

      {/* Optional: Add a "Clear Credentials" button for testing */}
      <TouchableOpacity 
        style={styles.clearButton}
        onPress={async () => {
          await AuthService.logout();
          setEmployeeId('');
          setPassword('');
          alert('Credentials cleared!');
        }}
      >
        <Text style={styles.clearButtonText}>Clear Saved Credentials</Text>
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
    backgroundColor: '#ffffffff',
    color: '#000000ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
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
  clearButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  clearButtonText: {
    color: '#ff6666',
    fontSize: 14,
  },
});