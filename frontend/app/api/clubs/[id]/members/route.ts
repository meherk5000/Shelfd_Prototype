import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clubId = params.id;
    const token = request.headers.get("Authorization");

    const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/members`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: token || "",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch members");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
} 