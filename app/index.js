import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import AuthService from '../services/AuthService';
import { UI_THEME } from '../constants/uiTheme';

const { colors, typography } = UI_THEME;

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const { employeeId } = await AuthService.getStoredCredentials();

        if (employeeId) {
          const sessionValid = await AuthService.validateSession();
          if (!sessionValid) {
            await AuthService.logout();
            router.replace('/login');
            return;
          }
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      } catch (_error) {
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, [router]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.appName}>NIA Attendance</Text>
          <Text style={styles.subtitle}>Loading…</Text>
          <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  appName: {
    ...typography.title,
    fontSize: 28,
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  spinner: {
    marginTop: 8,
  },
});