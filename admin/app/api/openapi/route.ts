import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import yaml from "yaml"

/**
 * GET /api/openapi - Retourne la spécification OpenAPI
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "openapi.yaml")
    const fileContent = fs.readFileSync(filePath, "utf8")
    const openApiSpec = yaml.parse(fileContent)

    return NextResponse.json(openApiSpec, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to load OpenAPI spec" }, { status: 500 })
  }
}
