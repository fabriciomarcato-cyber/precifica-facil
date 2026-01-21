
import { useState, useEffect, useCallback } from 'react';

const ACCESS_KEY = 'precificaAccess';
const EXPIRATION_KEY = 'precificaExpiration';


type AccessLevel = 'restricted' | 'full';

// Reusable access codes and their duration in hours
const CODES: Record<string, number> = {
  'TESTE-24H': 24,
  'PRO-ANUAL': 365 * 24,
  'TESTE5MINUTOS': 5 / 60, // 5 minutes
  'TESTE12345#': 3 / 60, // 3 minutes
};

// One-time use codes are now managed by removing them from the list after use.
const ONE_TIME_CODES: Record<string, number> = {
  // 'TESTE1234': 1, // This code has been used and is now invalid.
};


export function useAccess() {
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('restricted');
  const [expiration, setExpiration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');

  const revalidateAccess = useCallback(() => {
    try {
      const storedAccess = window.localStorage.getItem(ACCESS_KEY);
      const storedExpiration = window.localStorage.getItem(EXPIRATION_KEY);

      if (storedAccess === 'full' && storedExpiration) {
        const expirationTimestamp = parseInt(storedExpiration, 10);
        if (Date.now() < expirationTimestamp) {
          // Access is still valid
          setAccessLevel('full');
          setExpiration(expirationTimestamp);
          return true;
        } else {
          // Access has expired
          window.localStorage.removeItem(ACCESS_KEY);
          window.localStorage.removeItem(EXPIRATION_KEY);
          setAccessLevel('restricted');
          setExpiration(null);
          setMessage('Seu período de acesso expirou. Ative novamente para continuar usando todos os recursos.');
          return false;
        }
      }
      // No access info found, ensure state is restricted
      setAccessLevel('restricted');
      setExpiration(null);
      return false;
    } catch (error) {
      console.error("Error revalidating access state from localStorage", error);
      setAccessLevel('restricted');
      setExpiration(null);
      return false;
    }
  }, []);

  useEffect(() => {
    revalidateAccess();
    setIsLoading(false);
  }, [revalidateAccess]);

  const activate = useCallback(async (code: string): Promise<{ success: boolean; message?: string }> => {
    const upperCaseCode = code.toUpperCase();
    
    // Check regular codes
    const regularHours = CODES[upperCaseCode];
    if (regularHours) {
      try {
        const expirationTimestamp = Date.now() + regularHours * 60 * 60 * 1000;
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

    // If no valid code was found
    return { success: false, message: 'Código de acesso inválido.' };
  }, []);

  return { accessLevel, expiration, isLoading, activate, message, revalidateAccess };
}