"use client"

import { useEffect } from "react"
import Script from "next/script"

export default function ApiDocsPage() {
  useEffect(() => {
    // Ajouter le CSS Swagger UI
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css"
    document.head.appendChild(link)

    // Ajouter le style personnalisé
    const style = document.createElement("style")
    style.textContent = `
      .swagger-ui .topbar {
        background-color: #18181b;
      }
      .swagger-ui .topbar .download-url-wrapper {
        display: none;
      }
    `
    document.head.appendChild(style)

    return () => {
      // Cleanup
      document.head.removeChild(link)
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "auto" }}>
      <div id="swagger-ui"></div>

      <Script
        src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={() => {
          // @ts-expect-error - Swagger UI global
          if (window.SwaggerUIBundle) {
            // @ts-expect-error - Swagger UI global
            window.ui = window.SwaggerUIBundle({
              url: "/api/openapi",
              dom_id: "#swagger-ui",
              deepLinking: true,
              presets: [
                // @ts-expect-error - Swagger UI global
                window.SwaggerUIBundle.presets.apis,
                // @ts-expect-error - Swagger UI global
                window.SwaggerUIStandalonePreset,
              ],
              plugins: [
                // @ts-expect-error - Swagger UI global
                window.SwaggerUIBundle.plugins.DownloadUrl,
              ],
              layout: "StandaloneLayout",
              tryItOutEnabled: true,
              persistAuthorization: true,
            })
          }
        }}
      />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js"
        strategy="afterInteractive"
      />
    </div>
  )
}
