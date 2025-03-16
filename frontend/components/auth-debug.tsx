"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AuthDebug() {
  const { user, isAuthenticated, loading } = useAuth();
  const [showDebug, setShowDebug] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{
    token: string | null;
    refreshToken: string | null;
  }>({
    token: null,
    refreshToken: null,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      const refreshToken = localStorage.getItem("refresh_token");

      setTokenInfo({
        token: token ? `${token.substring(0, 10)}...` : null,
        refreshToken: refreshToken
          ? `${refreshToken.substring(0, 10)}...`
          : null,
      });
    }
  }, [isAuthenticated]);

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button variant="outline" size="sm" onClick={() => setShowDebug(true)}>
          Debug Auth
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card>
        <CardHeader className="py-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm">Auth Debug</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebug(false)}
            >
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-2 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Loading:</span>
              <span>{loading ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Authenticated:</span>
              <span>{isAuthenticated ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Has Token:</span>
              <span>{tokenInfo.token ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Has RefreshToken:</span>
              <span>{tokenInfo.refreshToken ? "Yes" : "No"}</span>
            </div>
            {user && (
              <>
                <div className="flex justify-between">
                  <span className="font-medium">Username:</span>
                  <span>{user.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Email:</span>
                  <span>{user.email}</span>
                </div>
              </>
            )}
            <Button
              variant="destructive"
              size="sm"
              className="w-full mt-2"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("refresh_token");
                window.location.reload();
              }}
            >
              Clear Tokens & Reload
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
