
import { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { activateCoupon, checkActiveCoupon, checkAndActivateEmailAccess } from '../services/couponService';

const ACCESS_KEY = 'precificaAccess';
const EXPIRATION_KEY = 'precificaExpiration';


type AccessLevel = 'restricted' | 'full';

// Reusable access codes and their duration in hours
const CODES: Record<string, number> = {
  'TESTE-24H': 24,
  'PRO-ANUAL': 365 * 24,
  'TESTE5MINUTOS': 5 / 60, // 5 minutes
  'TESTE12345#': 3 / 60, // 3 minutes
  'MASTER202252': 365 * 24, // 1 year
  'PREMIUM-60D': 60 * 24, // 2 months (60 days)
  'PRO-2MESES': 60 * 24, // 2 months (60 days)
  'FLASH-5MIN': 5 / 60, // 5 minutes
  'ACESSO-24H': 24, // 1 day
  'TESTE-20MIN': 20 / 60, // 20 minutes
};

// One-time use codes are now managed by removing them from the list after use.
const ONE_TIME_CODES: Record<string, number> = {
  // 'TESTE1234': 1, // This code has been used and is now invalid.
};


export function useAccess() {
  const [user, setUser] = useState<User | null>(null);
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        setIsLoading(true);
        // Primeiro tenta validar pelo e-mail (novo sistema automático)
        const emailExpiration = await checkAndActivateEmailAccess();
        
        if (emailExpiration) {
          const expirationTimestamp = emailExpiration.getTime();
          window.localStorage.setItem(ACCESS_KEY, 'full');
          window.localStorage.setItem(EXPIRATION_KEY, expirationTimestamp.toString());
          setAccessLevel('full');
          setExpiration(expirationTimestamp);
          setMessage('');
        } else {
          // Se não encontrar pelo e-mail, tenta pelo sistema antigo (UID vinculado)
          const dbExpiration = await checkActiveCoupon();
          if (dbExpiration) {
            const expirationTimestamp = dbExpiration.getTime();
            window.localStorage.setItem(ACCESS_KEY, 'full');
            window.localStorage.setItem(EXPIRATION_KEY, expirationTimestamp.toString());
            setAccessLevel('full');
            setExpiration(expirationTimestamp);
            setMessage('');
          } else {
            revalidateAccess();
          }
        }
        setIsLoading(false);
      } else {
        revalidateAccess();
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [revalidateAccess]);

  useEffect(() => {
    revalidateAccess();
    setIsLoading(false);
  }, [revalidateAccess]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    // Forçar a escolha de conta para evitar que o Google tente logar automaticamente e falhe no iframe
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Error signing in", error);
      let errorMsg = 'Erro ao fazer login com Google.';
      
      if (error.code === 'auth/unauthorized-domain') {
        errorMsg = 'Este domínio não está autorizado no Firebase. Por favor, adicione as URLs do app nos "Domínios Autorizados" do Console do Firebase.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMsg = 'O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        return; // Usuário fechou a janela, não precisa de erro
      }
      
      alert(errorMsg);
    }
  };

  const activate = useCallback(async (code: string): Promise<{ success: boolean; message?: string }> => {
    const trimmedCode = code.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedCode);
    const formattedCode = isEmail ? trimmedCode.toLowerCase() : trimmedCode.toUpperCase();
    
    // Check regular codes
    const regularHours = CODES[formattedCode];
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

    // If no valid code was found in local list, try Firebase
    if (user) {
      try {
        const result = await activateCoupon(formattedCode);
        if (result.success && result.expirationDate) {
          const expirationTimestamp = result.expirationDate.getTime();
          window.localStorage.setItem(ACCESS_KEY, 'full');
          window.localStorage.setItem(EXPIRATION_KEY, expirationTimestamp.toString());
          setAccessLevel('full');
          setExpiration(expirationTimestamp);
          setMessage('');
          return { success: true };
        }
      } catch (error: any) {
        let errorMsg = 'E-mail ou código de acesso inválido.';
        try {
          const parsed = JSON.parse(error.message);
          errorMsg = parsed.error || errorMsg;
        } catch {
          errorMsg = error.message || errorMsg;
        }
        return { success: false, message: errorMsg };
      }
    } else {
      return { success: false, message: 'E-mail ou código de acesso inválido ou você precisa estar logado para ativar.' };
    }

    return { success: false, message: 'E-mail ou código de acesso inválido.' };
  }, [user]);

  return { user, accessLevel, expiration, isLoading, activate, message, revalidateAccess, login };
}