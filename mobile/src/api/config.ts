/**
 * Set EXPO_PUBLIC_API_URL in mobile/.env to your server's LAN address when
 * testing on a physical device, e.g. EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
 * (localhost only works for the iOS Simulator / Android emulator / web).
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
