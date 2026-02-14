import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    throw new Error("Sentry test error from GreenDrop API")
  } catch (error) {
    Sentry.captureException(error)
    await Sentry.flush(2000)
    return NextResponse.json({ ok: true, message: "Test error sent to Sentry" })
  }
}
