"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  username: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    username: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastAuthCheck, setLastAuthCheck] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (token) {
      console.log("Token found on mount, verifying...");
      verifyToken();
    } else {
      console.log("No token found on mount");
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      console.log("Verifying token with backend...");
      const response = await api.get("/api/auth/me");
      if (response.status === 200) {
        console.log("Token verification successful. User:", response.data);
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        handleAuthFailure();
      }
    } catch (error: any) {
      console.error("Token verification failed:", error);
      if (error.response && error.response.status !== 401) {
        // Don't clear auth for non-401 errors during initial verify
      } else {
        handleAuthFailure();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthFailure = () => {
    console.log("Auth failure, clearing state");
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    setIsAuthenticated(false);
    setUser(null);
  };

  const checkAuth = async () => {
    try {
      console.log("Checking authentication status...");
      const token = localStorage.getItem("token");
      const now = Date.now();
      if (now - lastAuthCheck < 5000 && isAuthenticated) {
        console.log("Skipping auth check - checked recently");
        return true;
      }
      setLastAuthCheck(now);
      if (!token) {
        console.log("No token found in localStorage");
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }
      if (isAuthenticated && user) {
        console.log("Already authenticated with user data");
        return true;
      }
      const response = await api.get("/api/auth/me");
      if (response.status === 200) {
        console.log("Authentication successful. User:", response.data);
        setUser(response.data);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Auth check failed:", error);
      if (error.response && error.response.status === 401) {
        handleAuthFailure();
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    console.log("Starting login process...");
    try {
      const response = await api.post("/api/auth/login", { email, password });
      if (response.data.access_token && response.data.refresh_token) {
        console.log("Login successful");
        localStorage.setItem("token", response.data.access_token);
        localStorage.setItem("refresh_token", response.data.refresh_token);
        setUser(response.data.user);
        setIsAuthenticated(true);
        setError(null);
        return true;
      } else {
        throw new Error("Login failed: No tokens received");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const errorMessage =
        err.response?.data?.detail || err.message || "Login failed";
      setError(errorMessage);
      handleAuthFailure();
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    username: string
  ): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/api/auth/register", {
        email,
        password,
        username,
      });
      if (response.status === 201) {
        toast.success("Registration successful! Please log in.");
        return { success: true };
      } else {
        throw new Error(response.data.detail || "Registration failed");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || err.message || "Registration failed";
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    console.log("AuthContext: Attempting logout");
    try {
      // Remove the backend API call as there is no logout endpoint
      // await api.post("/api/auth/logout", {});

      // Clear local storage using the CORRECT keys
      localStorage.removeItem("token"); // Correct key
      localStorage.removeItem("refresh_token"); // Correct key
      localStorage.removeItem("user");
      console.log("AuthContext: Tokens and user removed from local storage");

      // Update state
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      console.log("AuthContext: State updated - User logged out");

      // Add the toast notification back
      toast.info("You have been logged out.");

      // Optional: Explicitly clear API client headers
      delete api.defaults.headers.common["Authorization"];
      console.log("AuthContext: API authorization header cleared");
    } catch (error) {
      console.error(
        "Logout error (unexpected, as no API call is made):",
        error
      );
      // Even if there's an error clearing storage (unlikely), force state update
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
