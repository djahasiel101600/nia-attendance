// components/RealTimeMonitor.js
import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ApiService from '../services/ApiService';
import AttendanceService from '../services/AttendanceService';
import AuthService from '../services/AuthService';
import SignalRService from '../services/SignalRService';
import { UI_THEME } from '../constants/uiTheme';

const { colors, spacing, radius, typography } = UI_THEME;

/**
 * Real-time monitoring component for attendance data
 * @param {Object} props - Component props
 * @param {string} props.employeeId - Employee ID to monitor
 * @param {Function} [props.onClose] - Callback when monitor is closed
 * @param {Function} [props.onDataUpdate] - Callback when data is updated
 * @param {Function} [props.onSessionExpired] - Callback when API returns 401/403 (session expired)
 */
const RealTimeMonitor = ({ employeeId, onClose, onDataUpdate, onSessionExpired }) => {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [signalCount, setSignalCount] = useState(0);
  
  // Polling fallback when SignalR is unavailable
  const pollingIntervalRef = useRef(null);
  const startPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) return;
    pollingIntervalRef.current = setInterval(() => {
      fetchAttendanceData();
    }, 30000); // every 30s
  }, [fetchAttendanceData]);
  const stopPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Use ref to store the latest onDataUpdate callback without triggering re-renders
  const onDataUpdateRef = useRef(onDataUpdate);
  
  useEffect(() => {
    onDataUpdateRef.current = onDataUpdate;
  }, [onDataUpdate]);

  // Fetch actual attendance data from API
  const fetchAttendanceData = useCallback(async () => {
    try {
      setLoading(true);

      const data = await AttendanceService.getAttendanceData(employeeId, { length: 50 });
      if (data?.statusCode === 401 || data?.statusCode === 403) {
        if (onSessionExpired) onSessionExpired();
        return;
      }
      if (data && data.records) {
        setAttendanceData(data.records);
        if (onDataUpdateRef.current) {
          onDataUpdateRef.current(data.records);
        }
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  }, [employeeId, onSessionExpired]);

  // Handle SignalR notifications
  const handleSignalRNotification = useCallback((signalType, data) => {
    switch (signalType) {
      case 'NEW_DATA_AVAILABLE':
        setSignalCount(prev => prev + 1);
        fetchAttendanceData();
        break;
        
      case 'CONNECTED':
        setConnectionStatus('connected');
        fetchAttendanceData();
        break;
        
      case 'DISCONNECTED':
        setConnectionStatus('disconnected');
        break;
        
      case 'RECONNECTING':
        setConnectionStatus('reconnecting');
        break;
        
      case 'CONNECTION_FAILED':
        setConnectionStatus('failed');
        Alert.alert('Connection Failed', 'Real-time updates unavailable');
        break;
    }
  }, [fetchAttendanceData]);

  // Start real-time monitoring
  const startMonitoring = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      
      // Get session cookies for SignalR
      const sessionCookies = await AuthService.getSessionCookies();
      
      // Try SignalR connection (uses session cookies for token/negotiate)
      const connectionToken = await ApiService.getSignalRToken();
      
      if (connectionToken) {
        SignalRService.addCallback(handleSignalRNotification);
        
        const connected = await SignalRService.startConnection(connectionToken, sessionCookies || '');
        
        if (connected) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('failed');
          startPollingFallback();
        }
      } else {
        setConnectionStatus('failed');
        startPollingFallback();
      }
      
    } catch (error) {
      console.error('Monitoring startup failed:', error);
      setConnectionStatus('failed');
      startPollingFallback();
    }
  }, [handleSignalRNotification, startPollingFallback]);

  // Stop monitoring
  const stopMonitoring = useCallback(async () => {
    stopPollingFallback();
    SignalRService.removeCallback(handleSignalRNotification);
    await SignalRService.stopConnection();
    setConnectionStatus('disconnected');
  }, [handleSignalRNotification, stopPollingFallback]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (mounted) {
        await startMonitoring();
        await fetchAttendanceData();
      }
    };

    init();

    return () => {
      mounted = false;
      stopPollingFallback();
      stopMonitoring();
    };
    // Intentionally run only on mount so we don't close/reopen the WebSocket when parent re-renders (which would cause "WebSocket closed 1000" and reconnect loops).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#00ff88';
      case 'connecting': return '#ffaa00';
      case 'reconnecting': return '#ffaa00';
      case 'disconnected': return '#ff4444';
      case 'failed': return '#ff4444';
      default: return '#666';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'REAL-TIME ACTIVE';
      case 'connecting': return 'CONNECTING...';
      case 'reconnecting': return 'RECONNECTING...';
      case 'disconnected': return 'DISCONNECTED';
      case 'failed': return 'CONNECTION FAILED';
      default: return 'UNKNOWN';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Live monitor</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={12}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Signals: {signalCount}</Text>
          {lastUpdate && (
            <Text style={styles.metaText}>Updated {lastUpdate.toLocaleTimeString()}</Text>
          )}
        </View>
        <Text style={styles.employeeInfo}>Employee: {employeeId}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.sectionTitle}>
          Live attendance ({attendanceData.length})
        </Text>

        {attendanceData.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No records</Text>
            <Text style={styles.emptySubtitle}>Tap refresh below or wait for new events</Text>
          </View>
        ) : (
          attendanceData.slice(0, 10).map((record, index) => {
            const today = new Date().toDateString();
            const isToday = new Date(record.date_time).toDateString() === today;
            const granted = record.status === 'ACCESS_GRANTED';
            return (
              <View key={index} style={[styles.recordItem, isToday && styles.recordItemToday]}>
                <View style={styles.recordHeader}>
                  <Text style={styles.employeeName} numberOfLines={1}>{record.employee_name}</Text>
                  <View style={[styles.statusBadge, granted ? styles.badgeSuccess : styles.badgeError]}>
                    <Text style={styles.badgeText}>{granted ? 'Granted' : 'Denied'}</Text>
                  </View>
                </View>
                <Text style={styles.recordTime}>
                  {new Date(record.date_time).toLocaleTimeString()}
                </Text>
                {record.temperature != null && (
                  <Text style={styles.recordTemp}>{record.temperature}°C</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
        onPress={fetchAttendanceData}
        disabled={loading}
      >
        <Text style={styles.refreshButtonText}>
          {loading ? 'Loading…' : 'Refresh'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleSmall,
    color: colors.primary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statusText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  employeeInfo: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  recordItem: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  recordItemToday: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: colors.successBg,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  employeeName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
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
  recordTime: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  recordTemp: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
  refreshButton: {
    backgroundColor: colors.primary,
    margin: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  refreshButtonDisabled: {
    opacity: 0.7,
  },
  refreshButtonText: {
    ...typography.label,
    color: '#000',
  },
});

RealTimeMonitor.propTypes = {
  employeeId: PropTypes.string.isRequired,
  onClose: PropTypes.func,
  onDataUpdate: PropTypes.func,
  onSessionExpired: PropTypes.func,
};

export default RealTimeMonitor;