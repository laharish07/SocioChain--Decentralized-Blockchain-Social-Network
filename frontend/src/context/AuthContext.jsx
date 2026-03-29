import { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios";
import { useWeb3 } from "./Web3Context";

const AuthContext = createContext(null);
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function AuthProvider({ children }) {
  const { address, signMessage, isConnected } = useWeb3();
  const [token,         setToken]         = useState(() => localStorage.getItem("ds_token"));
  const [user,          setUser]          = useState(null);
  const [authLoading,   setAuthLoading]   = useState(false);
  const [authError,     setAuthError]     = useState(null);

  const isAuthenticated = !!token && !!user;

  // Axios instance with auth header
  const api = axios.create({ baseURL: API });
  api.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  const login = useCallback(async () => {
    if (!isConnected || !address) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      // 1. Get nonce
      const { data: nonceData } = await axios.get(`${API}/api/auth/nonce/${address}`);
      // 2. Sign
      const signature = await signMessage(nonceData.message);
      // 3. Verify
      const { data } = await axios.post(`${API}/api/auth/verify`, { address, signature });
      localStorage.setItem("ds_token", data.token);
      setToken(data.token);
      // 4. Fetch user profile
      const { data: me } = await axios.get(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      setUser(me);
    } catch (err) {
      setAuthError(err.response?.data?.error || err.message);
    } finally {
      setAuthLoading(false);
    }
  }, [address, isConnected, signMessage]);

  const logout = useCallback(() => {
    localStorage.removeItem("ds_token");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data);
    } catch {
      logout();
    }
  }, [token, logout]);

  // Auto-fetch user on mount if token exists
  useEffect(() => {
    if (token && !user) refreshUser();
  }, [token]);

  // Logout when wallet disconnects
  useEffect(() => {
    if (!isConnected && token) logout();
  }, [isConnected]);

  return (
    <AuthContext.Provider value={{
      token, user, isAuthenticated, authLoading, authError,
      login, logout, refreshUser, api,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
