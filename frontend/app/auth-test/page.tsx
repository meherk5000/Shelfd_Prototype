"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

export default function AuthTestPage() {
  const { user, isAuthenticated } = useAuth();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runAuthTest = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/auth/test-auth`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTestResults((prev) => [...prev, response.data]);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Authentication test failed");
    }
  };

  // Test on load and every 30 seconds
  useEffect(() => {
    runAuthTest();
    const interval = setInterval(runAuthTest, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>

      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h2 className="text-lg font-semibold mb-2">Current User:</h2>
        <pre className="bg-white p-2 rounded">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Authentication Tests:</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {testResults.map((result, index) => (
          <div key={index} className="bg-white p-2 rounded mb-2">
            <p>Message: {result.message}</p>
            <p>User ID: {result.userId}</p>
            <p>Time: {new Date(result.timestamp).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
