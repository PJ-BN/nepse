import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Checks whether the incoming request carries a valid Bearer JWT token.
 * Validates against backend FastAPI /api/v1/auth/me.
 */
export async function checkAiAuth(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function unauthorizedAiResponse() {
  return NextResponse.json(
    {
      error: "Authentication required",
      message: "Only logged-in users can access NEPSE AI features. Please sign in or create an account.",
    },
    { status: 401 }
  );
}
