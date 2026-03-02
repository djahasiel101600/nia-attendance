// app/login.js
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AuthService from '../services/AuthService';
import { UI_THEME } from '../constants/uiTheme';

const { colors, spacing, radius, typography } = UI_THEME;
const isWeb = Platform.OS === 'web';

export default function Login() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkStoredCredentials = async () => {
      try {
        const creds = await AuthService.getStoredCredentials();
        if (creds.employeeId) {
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
    if (!employeeId.trim() || !password) {
      alert('Please enter both Employee ID and Password');
      return;
    }
    setLoading(true);
    try {
      const success = await AuthService.login(employeeId.trim(), password);
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
          'Please use the mobile app: Expo Go on your phone, or run on an Android/iOS device or emulator.'
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={styles.inner}>
        {isWeb && (
          <View style={styles.webNotice}>
            <Text style={styles.webNoticeTitle}>Browser not supported for login</Text>
            <Text style={styles.webNoticeText}>
              Use the mobile app (Expo Go or device/emulator) to sign in.
            </Text>
          </View>
        )}

        <Text style={styles.title}>NIA Attendance</Text>
        <Text style={styles.subtitle}>Sign in with your NIA account</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Employee ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your employee ID"
            placeholderTextColor={colors.textMuted}
            value={employeeId}
            onChangeText={setEmployeeId}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.inputPassword]}
              placeholder="Enter your password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowPassword((p) => !p)}
              hitSlop={12}
            >
              <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              loading && styles.loginButtonDisabled,
              pressed && !loading && styles.loginButtonPressed,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign in</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: 48,
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    fontSize: 28,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl + spacing.lg,
  },
  form: {
    width: '100%',
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    color: colors.text,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  passwordRow: {
    position: 'relative',
  },
  inputPassword: {
    paddingRight: 72,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 13,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg + 2,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  loginButtonDisabled: {
    opacity: 0.8,
  },
  loginButtonPressed: {
    opacity: 0.9,
  },
  loginButtonText: {
    ...typography.label,
    color: '#000',
    fontSize: 17,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: spacing.lg,
  },
  webNotice: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  webNoticeTitle: {
    ...typography.label,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  webNoticeText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
