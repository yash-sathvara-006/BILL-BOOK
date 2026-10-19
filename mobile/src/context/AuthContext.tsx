import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../services/storage';
import { api } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadCachedAuth();
  }, []);

  const loadCachedAuth = async () => {
    try {
      const cachedToken = await storage.getToken();
      const cachedUser = await storage.getUser();
      if (cachedToken && cachedUser) {
        setToken(cachedToken);
        setUser(cachedUser);
      }
    } catch (e) {
      console.warn('Error reading cached auth', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    if (res.success && res.token) {
      await storage.setToken(res.token);
      await storage.setUser(res.user);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    const res = await api.register(name, email, pass);
    if (res.success && res.token) {
      await storage.setToken(res.token);
      await storage.setUser(res.user);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const logout = async () => {
    await storage.clear();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
