import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AttendanceService from '../services/AttendanceService';
import AuthService from '../services/AuthService';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [employeeId, setEmployeeId] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const pollingRef = useRef(null);

  useEffect(() => {
    (async () => {
      const creds = await AuthService.getStoredCredentials();
      if (!creds.employeeId || !creds.password) {
        router.replace('/login');
        return;
      }
      setEmployeeId(creds.employeeId);
      await refresh();
      setLoading(false);
    })();

    return () => stopLive();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await AttendanceService.getAttendanceData(employeeId, { length: 50 });
      if (data && data.records) {
        setRecords(data.records);
      }
    } catch (e) {
      console.warn('Refresh error', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    await refresh();
  };

  const startLive = () => {
    if (isLive) return;
    setIsLive(true);
    pollingRef.current = setInterval(async () => {
      await refresh();
    }, 30000);
  };

  const stopLive = () => {
    setIsLive(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    router.replace('/login');
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.name}>{item.employee_name}</Text>
        <View style={[styles.badge, item.status === 'ACCESS_GRANTED' ? styles.badgeSuccess : styles.badgeError]}>
          <Text style={styles.badgeText}>{item.status === 'ACCESS_GRANTED' ? 'GRANTED' : 'DENIED'}</Text>
        </View>
      </View>
      <Text style={styles.meta}>{item.date_time_string} · {item.machine_name}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NIA Attendance</Text>
        <View style={styles.controlsRow}>
          <Text style={styles.subtitle}>Employee: {employeeId}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.smallBtn} onPress={refresh}>
              <Text style={styles.smallBtnText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn, isLive && styles.smallBtnActive]} onPress={isLive ? stopLive : startLive}>
              <Text style={styles.smallBtnText}>{isLive ? 'Stop Live' : 'Start Live'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statNumber}>{records.length}</Text><Text style={styles.statLabel}>Records</Text></View>
          <View style={styles.stat}><Text style={styles.statNumber}>—</Text><Text style={styles.statLabel}>Today</Text></View>
          <View style={styles.stat}><Text style={styles.statNumber}>—</Text><Text style={styles.statLabel}>Denied</Text></View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00ff88" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(r, i) => r.employee_id + '_' + i}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListEmptyComponent={<Text style={{ color: '#888' }}>No records found</Text>}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} colors={['#00ff88']} />}
        />
      )}

      <TouchableOpacity style={[styles.fab, isLive && styles.fabActive]} onPress={isLive ? stopLive : startLive}>
        <Text style={styles.fabText}>{isLive ? 'LIVE' : 'GO'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#111' },
  title: { color: '#00ff88', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtitle: { color: '#aaa' },
  item: { padding: 12, backgroundColor: '#121212', marginBottom: 8, borderRadius: 8 },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  meta: { color: '#aaa', marginTop: 4 },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  badgeText: { color: '#000', fontWeight: '700', fontSize: 12 },
  badgeSuccess: { backgroundColor: '#00ff88' },
  badgeError: { backgroundColor: '#ff6666' },
  smallBtn: { backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  smallBtnActive: { backgroundColor: '#003d1a' },
  smallBtnText: { color: '#00ff88' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8, backgroundColor: '#2a1a1a' },
  logoutText: { color: '#ff8888' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  stat: { alignItems: 'center', flex: 1 },
  statNumber: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statLabel: { color: '#888' },
  fab: { position: 'absolute', right: 18, bottom: 28, backgroundColor: '#00ff88', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  fabActive: { backgroundColor: '#ff4444' },
  fabText: { color: '#000', fontWeight: '700' }
});
