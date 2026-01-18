
import { useState, useEffect, useCallback } from 'react';

const AUTH_KEY = 'precificaAuth';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedAuth = window.localStorage.getItem(AUTH_KEY);
      if (storedAuth === 'true') {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Error reading auth state from localStorage", error);
    } finally {
        setIsAuthLoading(false);
    }
  }, []);

  const login = useCallback(async (user: string, pass: string): Promise<boolean> => {
    // Credenciais fixas no código
    if (user === 'Calcprecifica' && pass === 'C1234#') {
      try {
        window.localStorage.setItem(AUTH_KEY, 'true');
        setIsAuthenticated(true);
        return true;
      } catch (error) {
        console.error("Error saving auth state to localStorage", error);
        return false;
      }
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    try {
      window.localStorage.removeItem(AUTH_KEY);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error removing auth state from localStorage", error);
    }
  }, []);

  return { isAuthenticated, isAuthLoading, login, logout };
}