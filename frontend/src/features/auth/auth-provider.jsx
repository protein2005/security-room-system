import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { fetchCurrentUser, login as loginRequest } from "@/shared/api/auth";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/shared/auth/token-storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      setIsReady(true);
      return;
    }

    fetchCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
      })
      .catch(() => {
        clearAccessToken();
        setUser(null);
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  const value = useMemo(
    () => ({
      user,
      isReady,
      isAuthenticating,
      isAuthenticated: Boolean(user),
      async login(credentials) {
        setIsAuthenticating(true);

        try {
          const result = await loginRequest(credentials);
          setAccessToken(result.accessToken);
          setUser(result.user);
          return result.user;
        } finally {
          setIsAuthenticating(false);
        }
      },
      logout() {
        clearAccessToken();
        setUser(null);
      },
      setUser,
    }),
    [isAuthenticating, isReady, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
