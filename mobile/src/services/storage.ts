import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'mandavo_auth_token';
const USER_KEY = 'mandavo_user_data';

export const storage = {
  async setToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch (e) {
      console.warn('Error saving token', e);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(TOKEN_KEY);
      } else {
        return await SecureStore.getItemAsync(TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Error getting token', e);
      return null;
    }
  },

  async setUser(user: any): Promise<void> {
    try {
      const val = JSON.stringify(user);
      if (Platform.OS === 'web') {
        localStorage.setItem(USER_KEY, val);
      } else {
        await SecureStore.setItemAsync(USER_KEY, val);
      }
    } catch (e) {
      console.warn('Error saving user data', e);
    }
  },

  async getUser(): Promise<any | null> {
    try {
      let val: string | null = null;
      if (Platform.OS === 'web') {
        val = localStorage.getItem(USER_KEY);
      } else {
        val = await SecureStore.getItemAsync(USER_KEY);
      }
      return val ? JSON.parse(val) : null;
    } catch (e) {
      console.warn('Error getting user data', e);
      return null;
    }
  },

  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
      }
    } catch (e) {
      console.warn('Error clearing storage', e);
    }
  },
};
