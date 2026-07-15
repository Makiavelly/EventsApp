import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, onAuthenticationExpired } from "../api/client";
import type { User } from "../api/types";
import { AuthContext } from "./useAuth";
import type { AuthContextValue } from "./useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthenticationExpired(() => {
      if (active) setUser(null);
    });

    api
      .refresh()
      .then((authentication) => {
        if (active) setUser(authentication.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      async login(payload) {
        const response = await api.login(payload);
        setUser(response.user);
      },
      async register(payload) {
        const response = await api.register(payload);
        setUser(response.user);
      },
      async logout() {
        await api.logout();
        setUser(null);
      },
      async updateProfile(payload) {
        if (!user) throw new Error("Authentication is required");
        const updatedUser = await api.patchUser(user.id, payload);
        setUser(updatedUser);
      },
      async deleteAccount() {
        if (!user) throw new Error("Authentication is required");
        await api.deleteUser(user.id);
        setUser(null);
      },
    }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
