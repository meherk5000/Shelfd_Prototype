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
import { useToast } from "@/components/ui/use-toast";

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
  ) => Promise<void>;
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
  const { toast } = useToast();

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
              `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh-token`,
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

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log("Starting login process...");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
        {
          email,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const { access_token, refresh_token, token_type, user } = response.data;

      console.log("Login successful, storing tokens and user data");

      // Store tokens in localStorage
      localStorage.setItem("token", access_token);
      if (refresh_token) {
        localStorage.setItem("refresh_token", refresh_token);
      }

      // Set default authorization header
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

      // Update state
      setUser(user);
      setIsAuthenticated(true);
      setLastAuthCheck(Date.now());

      // Show success toast
      toast({
        title: "Success!",
        description: "You have successfully logged in.",
      });

      // Get return URL from query parameters if it exists
      let returnUrl = "/";
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const returnParam = urlParams.get("returnUrl");
        if (returnParam) {
          returnUrl = decodeURIComponent(returnParam);
          console.log(`Redirecting to return URL: ${returnUrl}`);
        }
      }

      // Short delay to ensure state updates before redirect
      setTimeout(() => {
        // Use direct window location for more reliable redirect after login
        window.location.href = returnUrl;
      }, 100);

      return true;
    } catch (error: any) {
      console.error("Login failed:", error);

      // Handle different error types
      let errorMessage = "An error occurred during login";

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 429) {
          errorMessage = "Too many login attempts. Please try again later.";
        } else if (error.response.status === 400) {
          errorMessage = "Invalid email or password";
        } else if (error.response.status === 401) {
          errorMessage = "Unauthorized access";
        } else if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage =
          "No response from server. Please check your internet connection.";
      }

      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });

      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    username: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`,
        {
          email,
          password,
          username,
        }
      );

      const { access_token, refresh_token, token_type, user } = response.data;

      // Store tokens
      localStorage.setItem("token", access_token);
      if (refresh_token) {
        localStorage.setItem("refresh_token", refresh_token);
      }

      // Set default authorization header
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

      // Update state
      setUser(user);
      setIsAuthenticated(true);

      // Show success toast
      toast({
        title: "Success!",
        description: "You have successfully registered.",
      });

      // Redirect to home page
      router.push("/");
    } catch (error: any) {
      console.error("Registration failed:", error);
      const errorMessage =
        error.response?.data?.detail || "An error occurred during registration";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
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
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });

    // Redirect to login page
    await router.push("/auth/sign-in");
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
