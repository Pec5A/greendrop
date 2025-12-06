"use client"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Erreur critique</h1>
          <p style={{ color: "#666", maxWidth: "400px", textAlign: "center" }}>
            Une erreur inattendue s&apos;est produite. Veuillez recharger la page.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#999", fontFamily: "monospace" }}>{error.digest}</p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1.5rem",
              backgroundColor: "#22C55E",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  )
}
