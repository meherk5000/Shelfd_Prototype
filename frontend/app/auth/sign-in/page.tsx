"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { API_ROUTES } from "@/lib/config";
import axios from "axios";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="mx-auto max-w-[400px] space-y-6">
        <SignInForm />
      </div>
    </div>
  );
}
