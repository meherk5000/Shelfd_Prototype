"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import api, { API_BASE_URL } from "@/lib/api";
import { API_ROUTES } from "@/lib/config";

interface User {
  id: string;
  email: string;
  username: string;
  image?: string;
}

interface AuthError {
  message: string;
  status?: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: AuthError | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(response.data);
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      localStorage.removeItem("token");
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.post(API_ROUTES.LOGIN, {
        email,
        password,
      });

      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);
        document.cookie = `token=${
          response.data.access_token
        }; path=/; max-age=${7 * 24 * 60 * 60}`;

        setUser(response.data.user);
        setIsAuthenticated(true);

        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${response.data.access_token}`;

        window.location.href = "/";
        return response.data;
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to login";
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.post(API_ROUTES.SIGNUP, {
        email,
        username,
        password,
      });

      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);
        document.cookie = `token=${
          response.data.access_token
        }; path=/; max-age=${7 * 24 * 60 * 60}`;

        setUser(response.data.user);
        setIsAuthenticated(true);

        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${response.data.access_token}`;

        window.location.href = "/";
      }
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.detail || "Failed to create account";
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    // Wrap navigation in setTimeout to ensure state updates complete first
    setTimeout(() => {
      router.push("/auth/sign-in");
    }, 0);
  }, [router]);

  const clearError = () => {
    setError(null);
  };

  // Use useMemo to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user,
      error,
      login,
      signup,
      logout,
      clearError,
    }),
    [isAuthenticated, isLoading, user, error, login, signup, logout, clearError]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
