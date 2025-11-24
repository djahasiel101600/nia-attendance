// Configuration constants for the NIA Attendance application

// API Configuration
// These can be overridden via environment variables in production
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://attendance.caraga.nia.gov.ph',
  AUTH_BASE_URL: process.env.EXPO_PUBLIC_AUTH_BASE_URL || 'https://accounts.nia.gov.ph',
  SIGNALR_HUB_NAME: 'biohub',
  SIGNALR_CLIENT_PROTOCOL: '1.5',
} as const;

export const APP_CONFIG = {
  DEFAULT_RECORDS_LENGTH: 50,
  AUTO_LOGIN_DELAY: 1000, // milliseconds
  MAX_RECONNECT_ATTEMPTS: 5,
} as const;

export const STORAGE_KEYS = {
  EMPLOYEE_ID: 'employeeId',
  SESSION_COOKIES: 'sessionCookies',
} as const;
