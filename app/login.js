import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import AuthService from '../services/AuthService';

export default function LoginScreen() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!employeeId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both Employee ID and Password');
      return;
    }

    setIsLoading(true);
    try {
      const success = await AuthService.login(employeeId, password);
      if (success) {
        router.replace('/dashboard');
      } else {
        Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NIA Attendance</Text>
        <Text style={styles.subtitle}>Biometric Monitor</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Employee ID"
          placeholderTextColor="#666"
          value={employeeId}
          onChangeText={setEmployeeId}
          autoCapitalize="none"
          editable={!isLoading}
        />
        
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!isLoading}
          />
          <TouchableWithoutFeedback onPress={() => setShowPassword((s) => !s)}>
            <View style={styles.showBtn}>
              <Text style={{ color: '#00ff88' }}>{showPassword ? 'Hide' : 'Show'}</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>

        <View style={styles.rememberRow}>
          <TouchableOpacity onPress={() => setRemember((r) => !r)} style={styles.checkbox}>
            <Text style={{ color: remember ? '#00ff88' : '#666' }}>{remember ? '☑' : '☐'}</Text>
          </TouchableOpacity>
          <Text style={styles.rememberText}>Remember credentials</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: 8,
  },
  subtitle: { fontSize: 14, color: '#888' },
  form: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  showBtn: { padding: 10, marginLeft: 8 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  checkbox: { marginRight: 8 },
  rememberText: { color: '#aaa' },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#00ff88',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});