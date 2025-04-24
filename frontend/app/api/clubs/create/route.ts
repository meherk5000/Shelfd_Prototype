import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config";

export async function POST(request: Request) {
  console.log("[Frontend API] Received club creation request");
  
  try {
    const token = request.headers.get("Authorization");
    console.log("[Frontend API] Authorization header present:", !!token);
    
    if (!token) {
      console.log("[Frontend API] No authorization token found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("[Frontend API] Request body:", body);

    console.log("[Frontend API] Making request to backend:", `${API_BASE_URL}/api/clubs/create`);
    const response = await fetch(`${API_BASE_URL}/api/clubs/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    });

    console.log("[Frontend API] Backend response status:", response.status);
    const data = await response.json();
    console.log("[Frontend API] Backend response data:", data);

    if (!response.ok) {
      console.error("[Frontend API] Error from backend:", data);
      return NextResponse.json(
        { error: data.detail || "Failed to create club" },
        { status: response.status }
      );
    }

    console.log("[Frontend API] Successfully created club");
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Frontend API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to create club" },
      { status: 500 }
    );
  }
} 