/**
 * Auth context — manages JWT token + rider profile globally.
 * 
 * Usage in any screen:
 *   const { rider, token, login, logout } = useAuth();
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, type RiderProfile } from '@/services/api';

interface AuthContextType {
  rider: RiderProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

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
    await AsyncStorage.multiRemove(['jwt_token', 'rider_slots', 'rider_upi_id']);
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

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const jwt = await AsyncStorage.getItem('jwt_token');
        if (!jwt) return;

        setToken(jwt);
        api.setToken(jwt);

        try {
          const profile = await api.riders.getMe();
          setRider(profile);
        } catch (err) {
          console.error('Failed to restore profile:', err);
          setToken(null);
          setRider(null);
          api.clearToken();
          await AsyncStorage.removeItem('jwt_token');
        }
      } finally {
        setIsReady(true);
      }
    };

    restoreSession().catch(console.error);
  }, []);

  return (
    <AuthContext.Provider value={{ rider, token, isAuthenticated: !!token, isReady, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
