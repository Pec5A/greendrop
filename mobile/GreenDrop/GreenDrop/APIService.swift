import Foundation

// MARK: - API Configuration

/// Configuration constants for the GreenDrop REST API.
///
/// Uses a local development server in `DEBUG` builds and the production Vercel
/// deployment otherwise.
struct APIConfig {
    /// Base URL for all API requests.
    ///
    /// - Note: In `DEBUG` mode, points to the local development server.
    ///   In release builds, points to the Vercel production deployment.
    static let baseURL = "https://pec5a-kaysv2-hm7i.vercel.app/api"

    /// Default timeout interval for API requests, in seconds.
    static let timeout: TimeInterval = 30
}

// MARK: - API Errors

/// Errors that can occur during API communication.
///
/// Each case provides a localized French error description suitable for display to the user.
enum APIError: LocalizedError {
    /// The constructed URL was invalid.
    case invalidURL
    /// The server returned no data in the response body.
    case noData
    /// The response data could not be decoded into the expected type.
    case decodingError(Error)
    /// The server returned a non-success HTTP status code.
    case serverError(Int, String?)
    /// A network-level error occurred (e.g., no connectivity).
    case networkError(Error)
    /// The request was rejected due to missing or invalid authentication (HTTP 401).
    case unauthorized
    /// The authenticated user does not have permission for this resource (HTTP 403).
    case forbidden
    /// The requested resource was not found (HTTP 404).
    case notFound

    /// Localized French description of the error.
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "URL invalide"
        case .noData:
            return "Aucune donnée reçue"
        case .decodingError(let error):
            return "Erreur de décodage: \(error.localizedDescription)"
        case .serverError(let code, let message):
            return message ?? "Erreur serveur (\(code))"
        case .networkError(let error):
            return "Erreur réseau: \(error.localizedDescription)"
        case .unauthorized:
            return "Non autorisé - veuillez vous reconnecter"
        case .forbidden:
            return "Accès refusé"
        case .notFound:
            return "Ressource non trouvée"
        }
    }
}

// MARK: - API Response

/// Generic wrapper for API JSON responses.
///
/// The backend may return data, an error message, or both depending on the outcome.
struct APIResponse<T: Decodable>: Decodable {
    /// The decoded response payload, if the request was successful.
    let data: T?
    /// An error message returned by the server, if any.
    let error: String?
    /// An informational message from the server, if any.
    let message: String?
}

// MARK: - API Service

/// Centralized service for communicating with the GreenDrop REST API.
///
/// `APIService` is a singleton that handles all HTTP requests to the backend,
/// including authentication header injection, JSON encoding/decoding, and
/// error mapping. All methods run on the main actor.
///
/// - Note: Use `setAuthToken(_:)` to provide a Firebase ID token before making
///   authenticated requests.
@MainActor
class APIService {
    /// Shared singleton instance.
    static let shared = APIService()

    /// Configured `URLSession` with timeout settings from `APIConfig`.
    private let session: URLSession
    /// Firebase ID token used for authenticated API requests.
    private var authToken: String?

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = APIConfig.timeout
        config.timeoutIntervalForResource = APIConfig.timeout
        self.session = URLSession(configuration: config)
    }

    // MARK: - Auth Token

    /// Sets the Firebase ID token to be included as a Bearer token in subsequent API requests.
    ///
    /// - Parameter token: The Firebase ID token string, or `nil` to clear authentication.
    func setAuthToken(_ token: String?) {
        self.authToken = token
    }

    // MARK: - Generic Request

    /// Performs a generic HTTP request to the API and decodes the response.
    ///
    /// Handles URL construction, query parameter encoding, JSON body serialization,
    /// authentication headers, and ISO 8601 date decoding with multiple format fallbacks.
    ///
    /// - Parameters:
    ///   - endpoint: The API endpoint path (e.g., "/shops").
    ///   - method: HTTP method (e.g., "GET", "POST", "PATCH"). Defaults to "GET".
    ///   - body: Optional dictionary to serialize as the JSON request body.
    ///   - queryParams: Optional query parameters to append to the URL.
    /// - Returns: The decoded response of type `T`.
    /// - Throws: `APIError` if the request fails due to network, server, or decoding issues.
    private func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: [String: Any]? = nil,
        queryParams: [String: String]? = nil
    ) async throws -> T {
        // Build URL with query params
        var urlString = "\(APIConfig.baseURL)\(endpoint)"

        if let queryParams = queryParams, !queryParams.isEmpty {
            let queryString = queryParams.map { "\($0.key)=\($0.value)" }.joined(separator: "&")
            urlString += "?\(queryString)"
        }

        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token if available
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Add body for POST/PATCH/PUT
        if let body = body {
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.noData
            }

            // Handle HTTP errors
            switch httpResponse.statusCode {
            case 200...299:
                break
            case 401:
                throw APIError.unauthorized
            case 403:
                throw APIError.forbidden
            case 404:
                throw APIError.notFound
            default:
                let errorMessage = try? JSONDecoder().decode([String: String].self, from: data)["message"]
                throw APIError.serverError(httpResponse.statusCode, errorMessage)
            }

            // Decode response
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .custom { decoder in
                let container = try decoder.singleValueContainer()
                let dateString = try container.decode(String.self)

                // Try ISO8601 first
                let iso8601Formatter = ISO8601DateFormatter()
                iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                if let date = iso8601Formatter.date(from: dateString) {
                    return date
                }

                // Try without fractional seconds
                iso8601Formatter.formatOptions = [.withInternetDateTime]
                if let date = iso8601Formatter.date(from: dateString) {
                    return date
                }

                // Try timestamp
                if let timestamp = Double(dateString) {
                    return Date(timeIntervalSince1970: timestamp / 1000)
                }

                return Date()
            }

            return try decoder.decode(T.self, from: data)

        } catch let error as APIError {
            throw error
        } catch let error as DecodingError {
            throw APIError.decodingError(error)
        } catch {
            throw APIError.networkError(error)
        }
    }

    // MARK: - Shops

    /// Fetches a list of shops from the API, optionally filtered by category, search query, or location.
    ///
    /// - Parameters:
    ///   - category: Optional category filter (e.g., "grocery", "bakery").
    ///   - search: Optional search string to filter by shop name.
    ///   - lat: Optional latitude for location-based sorting.
    ///   - lng: Optional longitude for location-based sorting.
    /// - Returns: An array of `Shop` objects matching the filters.
    /// - Throws: `APIError` if the request fails.
    func getShops(category: String? = nil, search: String? = nil, lat: Double? = nil, lng: Double? = nil) async throws -> [Shop] {
        var params: [String: String] = [:]
        if let category = category { params["category"] = category }
        if let search = search { params["search"] = search }
        if let lat = lat { params["lat"] = String(lat) }
        if let lng = lng { params["lng"] = String(lng) }

        return try await request(endpoint: "/shops", queryParams: params.isEmpty ? nil : params)
    }

    /// Fetches the product catalog for a specific shop.
    ///
    /// - Parameter shopId: The ID of the shop whose products to retrieve.
    /// - Returns: An array of `Product` objects belonging to the shop.
    /// - Throws: `APIError` if the request fails.
    func getProducts(shopId: String) async throws -> [Product] {
        return try await request(endpoint: "/shops/\(shopId)/products")
    }

    // MARK: - Orders

    /// Creates a new order via the API.
    ///
    /// - Parameter order: A `CreateOrderRequest` containing the order details.
    /// - Returns: The newly created `Order` as returned by the server.
    /// - Throws: `APIError` if the request fails.
    func createOrder(_ order: CreateOrderRequest) async throws -> Order {
        let body: [String: Any] = [
            "shopId": order.shopId,
            "items": order.items.map { [
                "productId": $0.productId,
                "productName": $0.productName,
                "price": $0.price,
                "quantity": $0.quantity
            ]},
            "deliveryAddress": order.deliveryAddress,
            "deliveryLatitude": order.deliveryLatitude,
            "deliveryLongitude": order.deliveryLongitude,
            "notes": order.notes ?? ""
        ]

        return try await request(endpoint: "/orders", method: "POST", body: body)
    }

    /// Fetches the authenticated user's orders, optionally filtered by status.
    ///
    /// - Parameter status: Optional status filter (e.g., "pending", "delivered").
    /// - Returns: An array of the user's `Order` objects.
    /// - Throws: `APIError` if the request fails.
    func getMyOrders(status: String? = nil) async throws -> [Order] {
        var params: [String: String]? = nil
        if let status = status {
            params = ["status": status]
        }
        return try await request(endpoint: "/orders/my", queryParams: params)
    }

    /// Fetches a single order by its ID.
    ///
    /// - Parameter id: The order ID to retrieve.
    /// - Returns: The matching `Order`.
    /// - Throws: `APIError` if the request fails or the order is not found.
    func getOrder(id: String) async throws -> Order {
        return try await request(endpoint: "/orders/\(id)")
    }

    /// Updates the status of an existing order, optionally assigning a driver.
    ///
    /// - Parameters:
    ///   - orderId: The ID of the order to update.
    ///   - status: The new status string (e.g., "confirmed", "delivering").
    ///   - driverId: Optional driver ID to assign to the order.
    /// - Returns: The updated `Order`.
    /// - Throws: `APIError` if the request fails.
    func updateOrderStatus(orderId: String, status: String, driverId: String? = nil) async throws -> Order {
        var body: [String: Any] = ["status": status]
        if let driverId = driverId {
            body["driverId"] = driverId
        }
        return try await request(endpoint: "/orders/\(orderId)", method: "PATCH", body: body)
    }

    // MARK: - Driver

    /// Reports the driver's current GPS location to the server.
    ///
    /// - Parameters:
    ///   - latitude: Current latitude.
    ///   - longitude: Current longitude.
    ///   - heading: Optional compass heading in degrees.
    ///   - speed: Optional speed in meters per second.
    /// - Returns: A `DriverLocationResponse` confirming the update.
    /// - Throws: `APIError` if the request fails.
    func updateDriverLocation(latitude: Double, longitude: Double, heading: Double? = nil, speed: Double? = nil) async throws -> DriverLocationResponse {
        var body: [String: Any] = [
            "latitude": latitude,
            "longitude": longitude
        ]
        if let heading = heading { body["heading"] = heading }
        if let speed = speed { body["speed"] = speed }

        return try await request(endpoint: "/drivers/location", method: "POST", body: body)
    }

    /// Updates the driver's availability status on the server.
    ///
    /// - Parameter status: The new status string (e.g., "online", "offline", "busy").
    /// - Returns: A `DriverStatusResponse` confirming the update.
    /// - Throws: `APIError` if the request fails.
    func updateDriverStatus(status: String) async throws -> DriverStatusResponse {
        let body: [String: Any] = ["status": status]
        return try await request(endpoint: "/drivers/status", method: "POST", body: body)
    }

    // MARK: - Notifications

    /// Registers or updates the device's FCM push notification token on the server.
    ///
    /// - Parameters:
    ///   - token: The Firebase Cloud Messaging token.
    ///   - deviceId: Optional unique device identifier.
    /// - Returns: An `EmptyResponse` confirming the registration.
    /// - Throws: `APIError` if the request fails.
    func registerFCMToken(token: String, deviceId: String? = nil) async throws -> EmptyResponse {
        var body: [String: Any] = ["token": token]
        if let deviceId = deviceId { body["deviceId"] = deviceId }
        return try await request(endpoint: "/notifications", method: "PUT", body: body)
    }

    // MARK: - Upload

    /// Uploads a file (e.g., delivery proof photo) to the server as base64-encoded data.
    ///
    /// - Parameters:
    ///   - base64Data: The file content encoded as a base64 string.
    ///   - mimeType: The MIME type of the file (e.g., "image/jpeg").
    ///   - orderId: Optional order ID to associate the upload with.
    ///   - fileType: The type of file being uploaded. Defaults to `"delivery_photo"`.
    /// - Returns: An `UploadResponse` containing the uploaded file URL.
    /// - Throws: `APIError` if the request fails.
    func uploadFile(base64Data: String, mimeType: String, orderId: String? = nil, fileType: String = "delivery_photo") async throws -> UploadResponse {
        var body: [String: Any] = [
            "base64Data": base64Data,
            "mimeType": mimeType,
            "fileType": fileType
        ]
        if let orderId = orderId { body["orderId"] = orderId }

        return try await request(endpoint: "/upload", method: "POST", body: body)
    }
}

// MARK: - Request/Response Models

/// Request payload for creating a new order via the API.
struct CreateOrderRequest {
    /// ID of the shop fulfilling the order.
    let shopId: String
    /// List of items to include in the order.
    let items: [CreateOrderItem]
    /// Street address for delivery.
    let deliveryAddress: String
    /// Latitude of the delivery location.
    let deliveryLatitude: Double
    /// Longitude of the delivery location.
    let deliveryLongitude: Double
    /// Optional customer notes (e.g., delivery instructions).
    let notes: String?
}

/// A single item within a `CreateOrderRequest`.
struct CreateOrderItem {
    /// ID of the product to order.
    let productId: String
    /// Display name of the product.
    let productName: String
    /// Unit price in euros.
    let price: Double
    /// Number of units to order.
    let quantity: Int
}

/// Server response after updating driver location.
struct DriverLocationResponse: Decodable {
    /// Whether the update was successful.
    let success: Bool
    /// Optional informational message from the server.
    let message: String?
}

/// Server response after updating driver availability status.
struct DriverStatusResponse: Decodable {
    /// Whether the update was successful.
    let success: Bool
    /// The driver's new status, if returned.
    let status: String?
    /// Optional informational message from the server.
    let message: String?
}

/// Server response after uploading a file.
struct UploadResponse: Decodable {
    /// Whether the upload was successful.
    let success: Bool
    /// Public URL of the uploaded file, if successful.
    let url: String?
    /// Optional informational message from the server.
    let message: String?
}

/// Generic server response with no specific data payload.
struct EmptyResponse: Decodable {
    /// Whether the operation was successful.
    let success: Bool?
    /// Optional informational message from the server.
    let message: String?
}
