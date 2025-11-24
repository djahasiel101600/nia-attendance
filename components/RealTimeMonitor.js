// components/RealTimeMonitor.js
import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ApiService from '../services/ApiService';
import AttendanceService from '../services/AttendanceService';
import AuthService from '../services/AuthService';
import SignalRService from '../services/SignalRService';

/**
 * Real-time monitoring component for attendance data
 * @param {Object} props - Component props
 * @param {string} props.employeeId - Employee ID to monitor
 * @param {Function} [props.onClose] - Callback when monitor is closed
 * @param {Function} [props.onDataUpdate] - Callback when data is updated
 */
const RealTimeMonitor = ({ employeeId, onClose, onDataUpdate }) => {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [signalCount, setSignalCount] = useState(0);

  // Fetch actual attendance data from API
  const fetchAttendanceData = useCallback(async () => {
    try {
      setLoading(true);
      
      const data = await AttendanceService.getAttendanceData(employeeId, { length: 50 });
      if (data && data.records) {
        setAttendanceData(data.records);
        if (onDataUpdate) {
          onDataUpdate(data.records);
        }
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  }, [employeeId, onDataUpdate]);

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
      
      // Try SignalR connection
      const connectionToken = await ApiService.getSignalRToken();
      
      if (connectionToken) {
        SignalRService.addCallback(handleSignalRNotification);
        
        const connected = await SignalRService.startConnection(connectionToken, sessionCookies || '');
        
        if (connected) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('connected'); // Still mark as connected for polling
        }
      } else {
        setConnectionStatus('connected');
      }
      
    } catch (error) {
      console.error('Monitoring startup failed:', error);
      setConnectionStatus('failed');
    }
  }, [handleSignalRNotification]);

  // Stop monitoring
  const stopMonitoring = useCallback(async () => {
    SignalRService.removeCallback(handleSignalRNotification);
    await SignalRService.stopConnection();
    setConnectionStatus('disconnected');
  }, [handleSignalRNotification]);

  useEffect(() => {
    startMonitoring();
    fetchAttendanceData(); // Load initial data
    
    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring, fetchAttendanceData]);

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
          <Text style={styles.title}>📡 Live Monitor</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
          <View style={styles.stats}>
            <Text style={styles.statText}>Signals: {signalCount}</Text>
            {lastUpdate && (
              <Text style={styles.statText}>Updated: {lastUpdate.toLocaleTimeString()}</Text>
            )}
          </View>
        </View>
        
        {/* Employee Info */}
        <Text style={styles.employeeInfo}>Employee: {employeeId}</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📊 Live Attendance ({attendanceData.length} records)
          </Text>
          
          {attendanceData.slice(0, 10).map((record, index) => (
            <View key={index} style={styles.recordItem}>
              <View style={styles.recordHeader}>
                <Text style={styles.employeeName}>{record.employee_name}</Text>
                <View style={[
                  styles.statusBadge,
                  record.status === 'ACCESS_GRANTED' ? styles.badgeSuccess : styles.badgeError
                ]}>
                  <Text style={styles.badgeText}>
                    {record.status === 'ACCESS_GRANTED' ? '✅' : '❌'}
                  </Text>
                </View>
              </View>
              <Text style={styles.recordTime}>
                🕒 {new Date(record.date_time).toLocaleTimeString()}
              </Text>
              {record.temperature && (
                <Text style={styles.recordTemp}>🌡️ {record.temperature}°C</Text>
              )}
            </View>
          ))}
          
          {attendanceData.length === 0 && !loading && (
            <Text style={styles.emptyText}>No records found</Text>
          )}
        </View>
      </ScrollView>

      {/* Manual Refresh */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchAttendanceData}>
        <Text style={styles.refreshButtonText}>
          {loading ? '🔄 Loading...' : '🔃 Manual Refresh'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#00ff88',
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#1a1a1a',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stats: {
    alignItems: 'flex-end',
  },
  statText: {
    color: '#666',
    fontSize: 12,
  },
  employeeInfo: {
    color: '#aaa',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  recordItem: {
    backgroundColor: '#121212',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  employeeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: '#003d1a',
  },
  badgeError: {
    backgroundColor: '#3d001a',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recordTime: {
    color: '#888',
    fontSize: 14,
  },
  recordTemp: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  refreshButton: {
    backgroundColor: '#00ff88',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

RealTimeMonitor.propTypes = {
  employeeId: PropTypes.string.isRequired,
  onClose: PropTypes.func,
  onDataUpdate: PropTypes.func,
};

export default RealTimeMonitor;