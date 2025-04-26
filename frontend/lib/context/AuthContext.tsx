"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axios from "axios";
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

  // Initial auth check when the component mounts
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === "undefined") return;

    // Check if token exists in localStorage
    const token = localStorage.getItem("token");

    // If token exists, set default auth header and mark as authenticated immediately
    if (token) {
      console.log("Token found on mount, setting authenticated immediately");
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setIsAuthenticated(true);

      // Then verify the token with the backend (but we're already showing UI)
      verifyToken();
    } else {
      setLoading(false); // No token, so we're done loading
    }
  }, []);

  // Separate function to verify token with backend
  const verifyToken = async () => {
    try {
      console.log("Verifying token with backend...");
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`
      );

      if (response.status === 200) {
        console.log("Token verification successful. User:", response.data);
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        // If verification fails, clear auth state
        handleAuthFailure();
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      handleAuthFailure();
    } finally {
      setLoading(false);
    }
  };

  // Handle auth failure (invalid token, etc.)
  const handleAuthFailure = () => {
    console.log("Auth failure, clearing state");
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    delete axios.defaults.headers.common["Authorization"];
    setIsAuthenticated(false);
    setUser(null);
  };

  const checkAuth = async () => {
    // Only use this to refresh user data, not for auth checks
    // Initial auth is handled in the useEffect above
    try {
      console.log("Checking authentication status...");
      const token = localStorage.getItem("token");

      // Skip unnecessary checks if we recently checked
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

      // Set default authorization header
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // If we have a user already, just update the timestamp
      if (isAuthenticated && user) {
        console.log("Already authenticated with user data");
        return true;
      }

      // Fetch user data if needed
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`
      );

      if (response.status === 200) {
        console.log("Authentication successful. User:", response.data);
        setUser(response.data);
        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Auth check failed:", error);
      // Don't clear tokens on every error - only if we know it's invalid
      if (
        axios.isAxiosError(error) &&
        error.response &&
        error.response.status === 401
      ) {
        handleAuthFailure();
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Add a token refresh interceptor
  useEffect(() => {
    // Add a response interceptor to handle token expiration
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If the error is 401 (Unauthorized) and we haven't tried to refresh the token yet
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          isAuthenticated
        ) {
          originalRequest._retry = true;

          try {
            // Try to refresh the token
            const refreshToken = localStorage.getItem("refresh_token");
            if (!refreshToken) {
              throw new Error("No refresh token available");
            }

            const response = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${refreshToken}`,
                },
              }
            );

            const { access_token } = response.data;

            // Update the token in localStorage
            localStorage.setItem("token", access_token);

            // Update the Authorization header
            axios.defaults.headers.common[
              "Authorization"
            ] = `Bearer ${access_token}`;

            // Retry the original request with the new token
            originalRequest.headers["Authorization"] = `Bearer ${access_token}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // If token refresh fails, log out the user
            console.error("Token refresh failed:", refreshError);
            await logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    // Clean up the interceptor when the component unmounts
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [isAuthenticated]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    console.log("Starting login process...");

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
        {
          email,
          password,
        }
      );

      console.log("Login response:", response.data);

      if (response.data.access_token) {
        const { access_token, refresh_token, user } = response.data;
        localStorage.setItem("token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${access_token}`;
        setUser(user);
        setIsAuthenticated(true);
        console.log("Login successful");
        toast.success("Login Successful!");
        return true;
      } else {
        setError("Login failed: Unexpected response from server.");
        toast.error("Login Failed", {
          description: "An unexpected error occurred.",
        });
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Login failed. Please try again.";

      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 400 || error.response.status === 401) {
          errorMessage = "Please check your username and password.";
        } else {
          errorMessage = error.response.data?.detail || errorMessage;
        }
      }

      setError(errorMessage);
      toast.error("Login Failed", { description: errorMessage });
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
    console.log("Starting registration process...");

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`,
        {
          email,
          password,
          username,
        }
      );

      console.log("Register response:", response.data);

      if (response.status === 201 || response.status === 200) {
        toast.success("Sign Up Successful", {
          description: "You can now log in.",
        });
        return { success: true };
      } else {
        throw new Error("Unexpected response during registration.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      let title = "Sign Up Failed";
      let description = "An unknown error occurred. Please try again.";

      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const detail = error.response.data?.detail;

        if (status === 409) {
          description = detail || "Username or email already exists.";
        } else if (status === 400) {
          description =
            detail || "Invalid details provided. Please check your input.";
        } else {
          description = detail || description;
        }
      } else if (error instanceof Error) {
        description = error.message;
      }

      setError(description);
      toast.error(title, { description: description });
      return { success: false, message: description };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Clear user state
    setUser(null);
    setIsAuthenticated(false);

    // Clear tokens from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");

    // Remove authorization header
    delete axios.defaults.headers.common["Authorization"];

    // Show toast notification
    toast.success("Logged out", {
      description: "You have been successfully logged out.",
    });

    // Redirect to login page
    await router.push("/auth/sign-in");
  };

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
