import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { getItem, setItem, deleteItem } from "../utils/storage";
import apiClient from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored tokens on mount
  useEffect(() => {
    (async () => {
      try {
        const storedAccess = await getItem("access_token");
        const storedRefresh = await getItem("refresh_token");
        if (storedAccess && storedRefresh) {
          setAccessToken(storedAccess);
          setRefreshToken(storedRefresh);
          // Fetch profile with stored token
          try {
            const res = await apiClient.get("/auth/profile", {
              headers: { Authorization: `Bearer ${storedAccess}` },
            });
            setUser(res.data.data);
          } catch {
            // Token might be expired, try refresh
            try {
              const refreshRes = await apiClient.post("/auth/refresh", {
                refresh_token: storedRefresh,
              });
              const newAccess = refreshRes.data.data.access_token;
              await setItem("access_token", newAccess);
              setAccessToken(newAccess);
              const profileRes = await apiClient.get("/auth/profile", {
                headers: { Authorization: `Bearer ${newAccess}` },
              });
              setUser(profileRes.data.data);
            } catch {
              // Refresh also failed, clear everything
              await clearTokens();
            }
          }
        }
      } catch {
        // SecureStore not available or other error
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const storeTokens = async (access, refresh) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    await setItem("access_token", access);
    await setItem("refresh_token", refresh);
  };

  const clearTokens = async () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    await deleteItem("access_token");
    await deleteItem("refresh_token");
  };

  const login = async (username, password) => {
    const res = await apiClient.post("/auth/login", { username, password });
    const { access_token, refresh_token, user_id, username: uname } = res.data.data;
    await storeTokens(access_token, refresh_token);
    // Fetch full profile
    const profileRes = await apiClient.get("/auth/profile", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    setUser(profileRes.data.data);
    return res.data;
  };

  const register = async (username, password, phone_number) => {
    const body = { username, password };
    if (phone_number) body.phone_number = phone_number;
    const res = await apiClient.post("/auth/register", body);
    const { access_token, refresh_token } = res.data.data;
    await storeTokens(access_token, refresh_token);
    // Fetch full profile
    const profileRes = await apiClient.get("/auth/profile", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    setUser(profileRes.data.data);
    return res.data;
  };

  const logout = async () => {
    await clearTokens();
  };

  const refreshProfile = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await apiClient.get("/auth/profile");
      setUser(res.data.data);
    } catch {
      // ignore
    }
  }, [accessToken]);

  const refreshAccessToken = async () => {
    if (!refreshToken) throw new Error("No refresh token");
    const res = await apiClient.post("/auth/refresh", { refresh_token: refreshToken });
    const newAccess = res.data.data.access_token;
    await setItem("access_token", newAccess);
    setAccessToken(newAccess);
    return newAccess;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshProfile,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export default AuthContext;
