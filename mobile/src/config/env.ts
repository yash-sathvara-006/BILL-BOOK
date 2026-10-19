import { Platform } from 'react-native';

// When running on Android emulator: 10.0.2.2 points to host localhost
// For physical devices, set EXPO_PUBLIC_API_BASE_URL to your machine's LAN IP or Vercel URL
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.244:5000/api/v1';
