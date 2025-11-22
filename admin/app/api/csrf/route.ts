import { NextResponse } from "next/server";
import { verifyAuth, generateCsrfToken } from "@/lib/api-middleware";
import type { NextRequest } from "next/server";

/**
 * GET /api/csrf - Generate a CSRF token for the authenticated user
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);

  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const token = generateCsrfToken(auth.userId);

  return NextResponse.json({ csrfToken: token });
}
