import SwiftUI
import Foundation
import FirebaseAuth
import StripePaymentSheet

// MARK: - Payment Service

/// Service responsible for Stripe payment processing, including PaymentIntent creation,
/// PaymentSheet configuration, and Stripe Connect onboarding for merchants and drivers.
///
/// This singleton communicates with the GreenDrop backend to create PaymentIntents,
/// manage Stripe customer records, and generate onboarding/dashboard URLs for
/// Stripe Connect accounts.
///
/// - Note: All methods run on the main actor. Authentication is handled automatically
///   via Firebase ID tokens.
@MainActor
final class PaymentService: ObservableObject {
    /// Shared singleton instance.
    static let shared = PaymentService()

    /// Whether a payment operation is currently in progress.
    @Published var isLoading = false
    /// User-facing error message from the last failed operation, if any.
    @Published var errorMessage: String?
    /// Whether a PaymentIntent has been successfully created and is ready for presentation.
    @Published var paymentReady = false

    /// The Stripe PaymentIntent client secret for the current payment.
    private(set) var clientSecret: String?
    /// The Stripe ephemeral key for the current customer session.
    private(set) var ephemeralKey: String?
    /// The Stripe customer ID associated with the current user.
    private(set) var customerId: String?
    /// The Stripe PaymentIntent ID for the current payment.
    private(set) var paymentIntentId: String?
    /// The Stripe publishable key returned by the backend.
    private(set) var publishableKey: String?

    private init() {}

    /// Response payload returned by the backend when creating a PaymentIntent.
    struct PaymentIntentResponse: Codable {
        /// Client secret used to confirm the payment on the client side.
        let clientSecret: String
        /// Ephemeral key granting temporary access to the Stripe customer object.
        let ephemeralKey: String
        /// Stripe customer ID.
        let customerId: String
        /// Stripe PaymentIntent ID.
        let paymentIntentId: String
        /// Stripe publishable key for client-side SDK initialization.
        let publishableKey: String
        /// Current payment status, if auto-confirmed server-side (e.g., saved card).
        let paymentStatus: String?
    }

    /// Whether the last payment was auto-confirmed server-side (saved card)
    var wasAutoConfirmed: Bool {
        return paymentStatus == "succeeded" || paymentStatus == "requires_capture"
    }

    /// The payment status string returned by the server (e.g., "succeeded", "requires_capture").
    private(set) var paymentStatus: String?

    /// Prepares a payment by calling the backend to create a Stripe PaymentIntent.
    ///
    /// On success, stores the client secret, ephemeral key, customer ID, and other
    /// payment metadata for use with the Stripe PaymentSheet.
    ///
    /// - Parameters:
    ///   - amount: The payment amount in euros.
    ///   - shopId: The ID of the shop receiving the payment.
    ///   - useSavedCard: Whether to attempt payment with the customer's saved card. Defaults to `false`.
    /// - Returns: A `PaymentIntentResponse` containing the Stripe payment details.
    /// - Throws: `PaymentError.serverError` if the backend returns a non-200 status.
    func preparePayment(amount: Double, shopId: String, useSavedCard: Bool = false) async throws -> PaymentIntentResponse {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        let url = URL(string: "\(APIConfig.baseURL)/payments/create-intent")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token
        do {
            if let token = try await getAuthToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            } else {
            }
        } catch {
        }

        let body: [String: Any] = [
            "amount": amount,
            "currency": "eur",
            "shopId": shopId,
            "useSavedCard": useSavedCard
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = APIConfig.timeout

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw PaymentError.serverError(statusCode)
        }

        let paymentResponse = try JSONDecoder().decode(PaymentIntentResponse.self, from: data)

        self.clientSecret = paymentResponse.clientSecret
        self.ephemeralKey = paymentResponse.ephemeralKey
        self.customerId = paymentResponse.customerId
        self.paymentIntentId = paymentResponse.paymentIntentId
        self.publishableKey = paymentResponse.publishableKey
        self.paymentStatus = paymentResponse.paymentStatus
        self.paymentReady = true

        return paymentResponse
    }

    /// Configures and returns a Stripe `PaymentSheet` ready for presentation.
    ///
    /// Sets the Stripe publishable key and creates a `PaymentSheet` configured with
    /// the merchant display name and customer information.
    ///
    /// - Parameter response: The `PaymentIntentResponse` from `preparePayment(amount:shopId:)`.
    /// - Returns: A configured `PaymentSheet` instance.
    func configurePaymentSheet(from response: PaymentIntentResponse) -> PaymentSheet {
        STPAPIClient.shared.publishableKey = response.publishableKey

        var configuration = PaymentSheet.Configuration()
        configuration.merchantDisplayName = "GreenDrop"
        configuration.customer = .init(id: response.customerId, ephemeralKeySecret: response.ephemeralKey)
        configuration.allowsDelayedPaymentMethods = false

        return PaymentSheet(paymentIntentClientSecret: response.clientSecret, configuration: configuration)
    }

    /// Requests a Stripe Connect onboarding URL for a merchant.
    ///
    /// The returned URL opens the Stripe Connect onboarding flow in a browser,
    /// allowing the merchant to set up their payout account.
    ///
    /// - Parameters:
    ///   - shopId: The ID of the merchant's shop.
    ///   - prefill: Optional `OnboardingPrefill` data to pre-populate the onboarding form.
    /// - Returns: A URL string for the Stripe Connect onboarding page.
    /// - Throws: `PaymentError.onboardingFailed` if the backend returns an error.
    func getOnboardingURL(shopId: String, prefill: OnboardingPrefill? = nil) async throws -> String {
        let url = URL(string: "\(APIConfig.baseURL)/payments/connect/onboard")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = try? await getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body: [String: String] = ["shopId": shopId]
        if let prefill = prefill {
            if !prefill.firstName.isEmpty { body["firstName"] = prefill.firstName }
            if !prefill.lastName.isEmpty { body["lastName"] = prefill.lastName }
            if !prefill.phone.isEmpty { body["phone"] = prefill.phone }
            if !prefill.address.isEmpty { body["address"] = prefill.address }
            if !prefill.city.isEmpty { body["city"] = prefill.city }
            if !prefill.postalCode.isEmpty { body["postalCode"] = prefill.postalCode }
            if !prefill.iban.isEmpty { body["iban"] = prefill.iban }
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = APIConfig.timeout

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw PaymentError.onboardingFailed
        }

        struct OnboardingResponse: Codable {
            let url: String
            let accountId: String
        }

        let onboardingResponse = try JSONDecoder().decode(OnboardingResponse.self, from: data)
        return onboardingResponse.url
    }

    /// Retrieves the Stripe Express dashboard URL for a merchant.
    ///
    /// - Parameter shopId: The ID of the merchant's shop.
    /// - Returns: A URL string for the Stripe Express dashboard.
    /// - Throws: `PaymentError.dashboardFailed` if the backend returns an error.
    func getDashboardURL(shopId: String) async throws -> String {
        let url = URL(string: "\(APIConfig.baseURL)/payments/connect/dashboard")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = try? await getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let body = ["shopId": shopId]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = APIConfig.timeout

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw PaymentError.dashboardFailed
        }

        struct DashboardResponse: Codable {
            let url: String
        }

        let dashboardResponse = try JSONDecoder().decode(DashboardResponse.self, from: data)
        return dashboardResponse.url
    }

    // MARK: - Driver Stripe Connect

    /// Requests a Stripe Connect onboarding URL for a driver.
    ///
    /// Similar to merchant onboarding, this allows drivers to set up their
    /// Stripe Connect account to receive delivery earnings payouts.
    ///
    /// - Parameter prefill: Optional `OnboardingPrefill` data to pre-populate the onboarding form.
    /// - Returns: A URL string for the Stripe Connect driver onboarding page.
    /// - Throws: `PaymentError.onboardingFailed` if the backend returns an error.
    func getDriverOnboardingURL(prefill: OnboardingPrefill? = nil) async throws -> String {
        let url = URL(string: "\(APIConfig.baseURL)/payments/connect/driver-onboard")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = try? await getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body: [String: String] = [:]
        if let prefill = prefill {
            if !prefill.firstName.isEmpty { body["firstName"] = prefill.firstName }
            if !prefill.lastName.isEmpty { body["lastName"] = prefill.lastName }
            if !prefill.phone.isEmpty { body["phone"] = prefill.phone }
            if !prefill.address.isEmpty { body["address"] = prefill.address }
            if !prefill.city.isEmpty { body["city"] = prefill.city }
            if !prefill.postalCode.isEmpty { body["postalCode"] = prefill.postalCode }
            if !prefill.iban.isEmpty { body["iban"] = prefill.iban }
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = APIConfig.timeout

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw PaymentError.onboardingFailed
        }

        struct OnboardingResponse: Codable {
            let url: String
            let accountId: String
        }

        let onboardingResponse = try JSONDecoder().decode(OnboardingResponse.self, from: data)
        return onboardingResponse.url
    }

    /// Retrieves the Stripe Express dashboard URL for a driver.
    ///
    /// - Returns: A URL string for the driver's Stripe Express dashboard.
    /// - Throws: `PaymentError.dashboardFailed` if the backend returns an error.
    func getDriverDashboardURL() async throws -> String {
        let url = URL(string: "\(APIConfig.baseURL)/payments/connect/driver-dashboard")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = try? await getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = try JSONSerialization.data(withJSONObject: [:] as [String: String])
        request.timeoutInterval = APIConfig.timeout

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw PaymentError.dashboardFailed
        }

        struct DashboardResponse: Codable {
            let url: String
        }

        let dashboardResponse = try JSONDecoder().decode(DashboardResponse.self, from: data)
        return dashboardResponse.url
    }

    /// Resets all payment state to initial values.
    ///
    /// Call this when starting a new payment flow or when the user cancels.
    func reset() {
        clientSecret = nil
        ephemeralKey = nil
        customerId = nil
        paymentIntentId = nil
        publishableKey = nil
        paymentStatus = nil
        paymentReady = false
        errorMessage = nil
    }

    /// Retrieves the current Firebase user's ID token for API authentication.
    ///
    /// - Returns: The Firebase ID token string, or `nil` if no user is signed in.
    /// - Throws: An error if the token retrieval fails.
    private func getAuthToken() async throws -> String? {
        return try await withCheckedThrowingContinuation { continuation in
            if let user = Auth.auth().currentUser {
                user.getIDToken { token, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume(returning: token)
                    }
                }
            } else {
                continuation.resume(returning: nil)
            }
        }
    }
}

// MARK: - Onboarding Prefill Data

/// Pre-fill data for the Stripe Connect onboarding form.
///
/// When provided, these fields are sent to the backend and used to pre-populate
/// the merchant or driver onboarding flow, reducing manual input.
struct OnboardingPrefill {
    /// Legal first name of the account holder.
    var firstName: String = ""
    /// Legal last name of the account holder.
    var lastName: String = ""
    /// Phone number for the Stripe account.
    var phone: String = ""
    /// Street address for the Stripe account.
    var address: String = ""
    /// City for the Stripe account.
    var city: String = ""
    /// Postal code for the Stripe account.
    var postalCode: String = ""
    /// IBAN for bank account payouts.
    var iban: String = ""
}

// MARK: - Payment Errors

/// Errors that can occur during payment operations.
///
/// Each case provides a localized French error description suitable for display to the user.
enum PaymentError: LocalizedError {
    /// The payment server returned a non-200 HTTP status code.
    case serverError(Int)
    /// Stripe Connect onboarding flow failed or could not be initiated.
    case onboardingFailed
    /// Stripe Express dashboard URL could not be retrieved.
    case dashboardFailed
    /// The user cancelled the payment flow.
    case paymentCancelled
    /// The payment was attempted but failed with the given reason.
    case paymentFailed(String)

    /// Localized French description of the payment error.
    var errorDescription: String? {
        switch self {
        case .serverError(let code):
            return "Erreur serveur (\(code)). Veuillez réessayer."
        case .onboardingFailed:
            return "Impossible de configurer les paiements. Veuillez réessayer."
        case .dashboardFailed:
            return "Impossible d'ouvrir le tableau de bord. Veuillez réessayer."
        case .paymentCancelled:
            return "Paiement annulé."
        case .paymentFailed(let message):
            return "Paiement échoué: \(message)"
        }
    }
}
