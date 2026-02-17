import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import logger, { pushToLoki } from "@/lib/logger"

export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimit(request, { limit: 120, windowSec: 60 })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const { path, referrer, sessionId, screenWidth, screenHeight } = body

    if (!path || !sessionId) {
      return NextResponse.json({ error: "Missing path or sessionId" }, { status: 400 })
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const userAgent = request.headers.get("user-agent") || ""

    const meta = {
      type: "page_view",
      path,
      referrer: referrer || "",
      sessionId,
      screenWidth: screenWidth || 0,
      screenHeight: screenHeight || 0,
      ip,
      userAgent,
    }

    logger.http("page_view", meta)
    await pushToLoki("http", "page_view", meta)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
