import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getMyProfile, refreshSession, resolveRoleAfterLogin } from '@/lib/auth-api';
import { type AppRole, normalizeAppRole } from '@/roles';

type SessionRoleContextValue = {
  role: AppRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshRole: () => Promise<void>;
};

const SessionRoleContext = createContext<SessionRoleContextValue | undefined>(undefined);

export function SessionRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRole = useCallback(async () => {
    setIsLoading(true);
    try {
      const isValid = await refreshSession();
      if (!isValid) {
        setRole(null);
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);

      try {
        const roleName = await resolveRoleAfterLogin();
        setRole(normalizeAppRole(roleName));
      } catch {
        try {
          const profile = await getMyProfile();
          const roleName =
            typeof profile.roleName === 'string'
              ? profile.roleName
              : typeof profile.roleId === 'object'
                ? profile.roleId?.roleName
                : null;
          setRole(normalizeAppRole(roleName ?? null));
        } catch {
          setRole(null);
          setIsAuthenticated(false);
        }
      }
    } catch {
      setRole(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRole();
  }, [refreshRole]);

  const value = useMemo(
    () => ({
      role,
      isAuthenticated,
      isLoading,
      refreshRole,
    }),
    [role, isAuthenticated, isLoading, refreshRole],
  );

  return <SessionRoleContext.Provider value={value}>{children}</SessionRoleContext.Provider>;
}

export function useSessionRole() {
  const context = useContext(SessionRoleContext);
  if (!context) {
    throw new Error('useSessionRole must be used within SessionRoleProvider');
  }
  return context;
}
