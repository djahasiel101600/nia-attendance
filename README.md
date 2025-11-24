# NIA Attendance App 👋

A React Native mobile application built with Expo for managing NIA (National Irrigation Administration) attendance tracking with real-time monitoring capabilities.

## Features

- 🔐 Secure authentication with NIA accounts
- 📊 Real-time attendance monitoring via SignalR
- 📱 Cross-platform support (iOS, Android, Web)
- 🔄 Auto-refresh attendance records
- 🌡️ Temperature tracking
- 📈 Attendance statistics and filtering

## Tech Stack

- **Framework**: Expo (~54.0.25)
- **Language**: JavaScript/TypeScript
- **UI**: React Native (0.81.5)
- **Navigation**: Expo Router
- **Real-time**: SignalR WebSocket
- **Storage**: Expo SecureStore

## Get Started

### Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- Expo CLI (will be installed with dependencies)

### Installation

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the development server

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in:

- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

### Development Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web
- `npm run lint` - Run ESLint

## Project Structure

```
nia-attendance/
├── app/                    # App screens and navigation
│   ├── (tabs)/            # Tab navigation screens
│   ├── _layout.tsx        # Root layout
│   ├── index.js           # Splash/auth check screen
│   ├── login.js           # Login screen
│   ├── dashboard.js       # Main dashboard
│   └── monitor.js         # Real-time monitor screen
├── components/            # Reusable components
│   ├── RealTimeMonitor.js # Real-time attendance monitor
│   └── ui/               # UI components
├── constants/            # App constants
│   ├── config.ts         # Configuration constants
│   └── theme.ts          # Theme configuration
├── services/             # Business logic services
│   ├── AuthService.js    # Authentication service
│   ├── AttendanceService.js # Attendance data service
│   ├── SignalRService.js # Real-time WebSocket service
│   └── ApiService.js     # API utilities
├── types/                # TypeScript type definitions
└── assets/              # Images, fonts, etc.
```

## Configuration

App configuration is centralized in `constants/config.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'https://attendance.caraga.nia.gov.ph',
  AUTH_BASE_URL: 'https://accounts.nia.gov.ph',
  SIGNALR_HUB_NAME: 'biohub',
  SIGNALR_CLIENT_PROTOCOL: '1.5',
};
```

## Security Features

- ✅ Secure credential storage using Expo SecureStore
- ✅ No plain-text password storage (session-based auth)
- ✅ CSRF token validation for API requests
- ✅ Secure WebSocket connections (WSS)

## Learn More

To learn more about developing with Expo:

- [Expo documentation](https://docs.expo.dev/)
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/)
- [Expo Router documentation](https://docs.expo.dev/router/introduction)

## Community

Join the Expo community:

- [Expo on GitHub](https://github.com/expo/expo)
- [Discord community](https://chat.expo.dev)

