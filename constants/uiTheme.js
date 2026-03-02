/**
 * Shared UI theme for NIA Attendance — colors, spacing, typography, radii.
 * Use for consistent, intuitive UI/UX across login, dashboard, and live monitor.
 */

export const UI_THEME = {
  colors: {
    background: '#0a0a0a',
    surface: '#121212',
    surfaceElevated: '#1a1a1a',
    border: '#222',
    borderLight: '#333',
    text: '#ffffff',
    textSecondary: '#aaa',
    textMuted: '#666',
    primary: '#00ff88',
    primaryDark: '#00cc6a',
    success: '#00ff88',
    successBg: '#0d2e1a',
    error: '#ff5555',
    errorBg: '#2e1515',
    warning: '#ffaa00',
    warningBg: '#2a2a0a',
    liveActive: '#00ff88',
    liveInactive: '#ff4444',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    full: 999,
  },
  typography: {
    title: { fontSize: 26, fontWeight: '700' },
    titleSmall: { fontSize: 20, fontWeight: '700' },
    body: { fontSize: 16, fontWeight: '500' },
    bodySmall: { fontSize: 14 },
    caption: { fontSize: 12 },
    label: { fontSize: 14, fontWeight: '600' },
  },
};

export default UI_THEME;
