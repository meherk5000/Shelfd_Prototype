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
import { API_BASE_URL } from "../lib/config";

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
      console.log("CheckAuth - Token exists:", !!token);

      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      console.log("CheckAuth - Making /me request");
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("CheckAuth - /me response:", response.data);

      if (response.data && response.data.id) {
        console.log("CheckAuth - Setting user data:", response.data);
        setUser(response.data);
        setIsAuthenticated(true);
        setError(null);

        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } else {
        console.log("CheckAuth - Invalid user data received");
        localStorage.removeItem("token");
        document.cookie =
          "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (err) {
      console.error("CheckAuth - Error:", err);
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

      console.log("Login - Starting login attempt for:", email);
      console.log("Login - API URL:", `${API_BASE_URL}/api/auth/login`);

      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      console.log("Login - Raw response:", response);
      console.log("Login - Response data:", response.data);

      if (response.data.access_token) {
        console.log("Login - Got access token, setting up auth state");
        localStorage.setItem("token", response.data.access_token);
        document.cookie = `token=${
          response.data.access_token
        }; path=/; max-age=${7 * 24 * 60 * 60}`;

        const userData = response.data.user;
        console.log("Login - Setting user data:", userData);

        setUser(userData);
        setIsAuthenticated(true);

        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${response.data.access_token}`;

        router.push("/");
        return response.data;
      } else {
        console.log("Login - No access token in response");
        throw new Error("No access token received");
      }
    } catch (error: any) {
      console.error("Login - Error details:", {
        error: error,
        response: error.response?.data,
        status: error.response?.status,
      });
      const message = error.response?.data?.detail || "Failed to login";
      setError({ message });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
        email,
        username,
        password,
      });

      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);
        document.cookie = `token=${
          response.data.access_token
        }; path=/; max-age=${7 * 24 * 60 * 60}`;

        const userData = response.data.user;
        setUser(userData);
        setIsAuthenticated(true);

        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${response.data.access_token}`;

        router.push("/");
        return response.data;
      } else {
        throw new Error("No access token received");
      }
    } catch (error: any) {
      console.error("Signup error:", error.response?.data || error);
      const message =
        error.response?.data?.detail || "Failed to create account";
      setError({ message });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    // Clear axios header first
    delete axios.defaults.headers.common["Authorization"];

    // Clear auth state
    localStorage.removeItem("token");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    // Update state
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);

    // Navigate after state is cleared
    router.replace("/auth/sign-in");
  }, [router]);

  const clearError = () => {
    setError(null);
  };

  // Remove the useMemo for individual functions
  const value = {
    isAuthenticated,
    isLoading,
    user,
    error,
    login,
    signup,
    logout,
    clearError,
  };

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
