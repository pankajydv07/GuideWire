/**
 * Auth context — manages JWT token + rider profile globally.
 * 
 * Usage in any screen:
 *   const { rider, token, login, logout } = useAuth();
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/services/api';

interface Rider {
  rider_id: string;
  name: string;
  phone: string;
  platform: string;
  city: string;
  zone: string;
  trust_score: number;
}

interface AuthContextType {
  rider: Rider | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [rider, setRider] = useState<Rider | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = useCallback(async (jwt: string) => {
    setToken(jwt);
    api.setToken(jwt);
    await AsyncStorage.setItem('jwt_token', jwt);
    
    try {
      const profile = await api.riders.getMe();
      setRider(profile);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setRider(null);
    api.clearToken();
    await AsyncStorage.removeItem('jwt_token');
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const profile = await api.riders.getMe();
      setRider(profile);
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ rider, token, isAuthenticated: !!token, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
