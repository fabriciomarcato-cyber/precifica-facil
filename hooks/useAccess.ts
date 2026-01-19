
import { useState, useEffect, useCallback } from 'react';

const ACCESS_KEY = 'precificaAccess';
const EXPIRATION_KEY = 'precificaExpiration';

type AccessLevel = 'restricted' | 'full';

// Access codes and their duration in hours
const CODES: Record<string, number> = {
  'TESTE-24H': 24,
  'PRO-ANUAL': 365 * 24,
};

export function useAccess() {
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('restricted');
  const [expiration, setExpiration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    try {
      const storedAccess = window.localStorage.getItem(ACCESS_KEY);
      const storedExpiration = window.localStorage.getItem(EXPIRATION_KEY);

      if (storedAccess === 'full' && storedExpiration) {
        const expirationTimestamp = parseInt(storedExpiration, 10);
        if (Date.now() < expirationTimestamp) {
          setAccessLevel('full');
          setExpiration(expirationTimestamp);
        } else {
          // Access has expired
          window.localStorage.removeItem(ACCESS_KEY);
          window.localStorage.removeItem(EXPIRATION_KEY);
          setAccessLevel('restricted');
          setExpiration(null);
          setMessage('Seu período de acesso expirou. Ative novamente para continuar usando todos os recursos.');
        }
      }
    } catch (error) {
      console.error("Error reading access state from localStorage", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activate = useCallback(async (code: string): Promise<{ success: boolean; message?: string }> => {
    const hours = CODES[code.toUpperCase()];
    if (hours) {
      try {
        const expirationTimestamp = Date.now() + hours * 60 * 60 * 1000;
        window.localStorage.setItem(ACCESS_KEY, 'full');
        window.localStorage.setItem(EXPIRATION_KEY, expirationTimestamp.toString());
        setAccessLevel('full');
        setExpiration(expirationTimestamp);
        setMessage('');
        return { success: true };
      } catch (error) {
        console.error("Error saving access state to localStorage", error);
        return { success: false, message: 'Ocorreu um erro ao salvar o acesso.' };
      }
    }
    return { success: false, message: 'Código de acesso inválido.' };
  }, []);

  return { accessLevel, expiration, isLoading, activate, message };
}