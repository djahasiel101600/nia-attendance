// Type definitions for the NIA Attendance application

export interface AttendanceRecord {
  date_time: Date;
  date_time_string: string;
  temperature: number | null;
  employee_id: string;
  employee_name: string;
  machine_name: string;
  status: 'ACCESS_GRANTED' | 'ACCESS_DENIED';
}

export interface AttendanceData {
  records: AttendanceRecord[];
  total_records: number;
}

export interface AttendanceOptions {
  length?: number;
  year?: number;
  month?: string;
}

export interface StoredCredentials {
  employeeId: string | null;
}

export interface SignalRStatus {
  isConnected: boolean;
  reconnectAttempts: number;
}

export type SignalType = 
  | 'NEW_DATA_AVAILABLE'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'RECONNECTING'
  | 'CONNECTION_FAILED';

export type ConnectionStatus = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'failed';

export interface RealTimeMonitorProps {
  employeeId: string;
  onClose?: () => void;
  onDataUpdate?: (records: AttendanceRecord[]) => void;
}
