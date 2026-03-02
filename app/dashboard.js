// app/dashboard.js
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RealTimeMonitor from '../components/RealTimeMonitor';
import AttendanceService from '../services/AttendanceService';
import AuthService from '../services/AuthService';
import { UI_THEME } from '../constants/uiTheme';

const { colors, spacing, radius, typography } = UI_THEME;

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [employeeId, setEmployeeId] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [showRealTimeMonitor, setShowRealTimeMonitor] = useState(false);

  const refresh = async () => {
    if (!employeeId) {
      console.warn('Cannot refresh: Employee ID not set');
      return;
    }

    setLoading(true);
    try {
      const data = await AttendanceService.getAttendanceData(employeeId, { length: 50 });
      if (data?.statusCode === 401 || data?.statusCode === 403) {
        await AuthService.logout();
        router.replace('/login');
        return;
      }
      if (data && data.records) {
        setRecords(data.records);
      }
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      const creds = await AuthService.getStoredCredentials();
      if (!creds.employeeId) {
        router.replace('/login');
        return;
      }
      setEmployeeId(creds.employeeId);

      // Initial data fetch; redirect to login if session expired
      setLoading(true);
      try {
        const data = await AttendanceService.getAttendanceData(creds.employeeId, { length: 50 });
        if (data?.statusCode === 401 || data?.statusCode === 403) {
          await AuthService.logout();
          router.replace('/login');
          return;
        }
        if (data && data.records) {
          setRecords(data.records);
        }
      } catch (e) {
        console.warn('Initial fetch error', e);
      } finally {
        setLoading(false);
      }
    };

    initDashboard();

    return () => {
      // Cleanup will be handled by RealTimeMonitor component
    };
  }, [router]);

  // Refetch when screen gains focus so list is not stale (e.g. after navigating back)
  useFocusEffect(
    useCallback(() => {
      if (employeeId && !showRealTimeMonitor) {
        refresh();
      }
    }, [employeeId, showRealTimeMonitor])
  );

  const onRefresh = async () => {
    await refresh();
  };

  const toggleRealTimeMonitor = () => {
    setShowRealTimeMonitor((v) => !v);
    setIsLive((v) => !v);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    router.replace('/login');
  };

  // Calculate stats
  const today = new Date().toDateString();
  const todayRecords = records.filter(record => {
    return new Date(record.date_time).toDateString() === today;
  });

  const deniedRecords = records.filter(record => record.status === 'ACCESS_DENIED');

  const renderItem = ({ item }) => {
    const isToday = new Date(item.date_time).toDateString() === today;
    const granted = item.status === 'ACCESS_GRANTED';
    return (
      <View style={[styles.item, isToday && styles.itemToday]}>
        <View style={styles.itemRow}>
          <Text style={styles.name} numberOfLines={1}>{item.employee_name}</Text>
          <View style={[styles.badge, granted ? styles.badgeSuccess : styles.badgeError]}>
            <Text style={styles.badgeText}>{granted ? 'Granted' : 'Denied'}</Text>
          </View>
        </View>
        <Text style={styles.meta}>{item.date_time_string}</Text>
        <Text style={styles.meta}>{item.machine_name}</Text>
        {item.temperature != null && (
          <Text style={styles.meta}>Temperature: {item.temperature}°C</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {showRealTimeMonitor ? (
        <RealTimeMonitor 
          employeeId={employeeId}
          onClose={() => {
            setShowRealTimeMonitor(false);
            setIsLive(false);
          }}
          onDataUpdate={(newRecords) => setRecords(newRecords)}
          onSessionExpired={async () => {
            await AuthService.logout();
            router.replace('/login');
          }}
        />
      ) : (
        <>
          <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <Text style={styles.title}>Attendance</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={refresh}>
                    <Text style={styles.iconBtnText}>↻</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.textBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log out</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.subtitle}>Employee ID: {employeeId}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{records.length}</Text>
                  <Text style={styles.statLabel}>Records</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>{todayRecords.length}</Text>
                  <Text style={styles.statLabel}>Today</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: colors.error }]}>{deniedRecords.length}</Text>
                  <Text style={styles.statLabel}>Denied</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingLabel}>Loading attendance…</Text>
            </View>
          ) : (
            <FlatList
              data={records}
              keyExtractor={(r, i) => r.employee_id + '_' + i}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyTitle}>No records yet</Text>
                  <Text style={styles.emptySubtitle}>Pull down to refresh or tap ↻ above</Text>
                </View>
              }
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
            />
          )}

          <TouchableOpacity 
            style={[styles.fab, isLive && styles.fabActive]} 
            onPress={toggleRealTimeMonitor}
            activeOpacity={0.85}
          >
            <Text style={styles.fabDot}>●</Text>
            <Text style={styles.fabText}>{isLive ? 'Live on' : 'Go live'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// Styles with shared theme
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.primary,
    fontSize: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '600',
  },
  textBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  logoutText: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 14,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  statNumber: {
    ...typography.titleSmall,
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  itemToday: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: colors.successBg,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  badgeSuccess: {
    backgroundColor: colors.successBg,
  },
  badgeError: {
    backgroundColor: colors.errorBg,
  },
  badgeText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  loadingLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    ...typography.titleSmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.full,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabActive: {
    backgroundColor: colors.liveInactive,
  },
  fabDot: {
    fontSize: 10,
    color: '#000',
    fontWeight: '700',
  },
  fabText: {
    ...typography.label,
    color: '#000',
    fontSize: 15,
  },
});