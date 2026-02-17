import Foundation

/// Configuration constants for mobile logging and monitoring.
struct MobileConfig {
    /// Cloud Function endpoint for mobile event logging.
    static let logEndpoint = "https://us-central1-pec5a-116e0.cloudfunctions.net/logMobileEvents"

    /// API key for authenticating with the log endpoint.
    static let logAPIKey = "mlk_greendrop_2026_xK9mP4nQ7rW2sT5v"

    /// Sentry DSN for mobile error tracking.
    static let sentryDSN = "https://PLACEHOLDER@o4510879650349056.ingest.de.sentry.io/MOBILE_PROJECT_ID"
}
