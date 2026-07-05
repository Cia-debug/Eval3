import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getBackofficeSession, logoutBackoffice } from '../api/client';

const BackofficeAuthContext = createContext(null);

export function BackofficeAuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const session = await getBackofficeSession();
      setAuthenticated(Boolean(session.authenticated));
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await logoutBackoffice();
    setAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({
      authenticated,
      loading,
      refresh,
      logout,
    }),
    [authenticated, loading, refresh, logout],
  );

  return (
    <BackofficeAuthContext.Provider value={value}>
      {children}
    </BackofficeAuthContext.Provider>
  );
}

export function useBackofficeAuth() {
  const context = useContext(BackofficeAuthContext);
  if (!context) {
    throw new Error('useBackofficeAuth doit être utilisé dans BackofficeAuthProvider');
  }
  return context;
}
