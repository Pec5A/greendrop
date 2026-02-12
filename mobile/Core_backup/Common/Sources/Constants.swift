import Foundation

public enum Constants {

    // MARK: - API
    public enum API {
        public static let baseURL = "https://votre-projet.vercel.app/api"
        public static let devBaseURL = "http://localhost:3000/api"

        // Use dev URL for local testing, prod URL for deployed backend
        public static var currentBaseURL: String {
            #if DEBUG
            return devBaseURL
            #else
            return baseURL
            #endif
        }

        public enum Endpoints {
            public static let orders = "/orders"
            public static let myOrders = "/orders/my"
            public static let shops = "/shops"
            public static let driversLocation = "/drivers/location"
            public static let driversStatus = "/drivers/status"
            public static let upload = "/upload"
            public static let notifications = "/notifications"
            public static let notificationsToken = "/notifications/token"
        }
    }

    // MARK: - Firebase Collections
    public enum Collections {
        public static let users = "users"
        public static let orders = "orders"
        public static let shops = "shops"
        public static let products = "products"
        public static let drivers = "drivers"
        public static let verifications = "verifications"
        public static let disputes = "disputes"
        public static let notifications = "notifications"
        public static let legalZones = "legalZones"
        public static let fcmTokens = "fcmTokens"
    }

    // MARK: - User Defaults Keys
    public enum UserDefaultsKeys {
        public static let isLoggedIn = "isLoggedIn"
        public static let userId = "userId"
        public static let userRole = "userRole"
        public static let onboardingCompleted = "onboardingCompleted"
        public static let lastKnownLocation = "lastKnownLocation"
    }

    // MARK: - Location
    public enum Location {
        public static let defaultLatitude = 48.8566 // Paris
        public static let defaultLongitude = 2.3522
        public static let defaultRadius: Double = 10.0 // km
        public static let updateInterval: TimeInterval = 10.0 // seconds
    }

    // MARK: - Order Status
    public enum OrderStatus: String, CaseIterable {
        case pending = "pending"
        case confirmed = "confirmed"
        case preparing = "preparing"
        case ready = "ready"
        case delivering = "delivering"
        case delivered = "delivered"
        case cancelled = "cancelled"

        public var displayName: String {
            switch self {
            case .pending: return "En attente"
            case .confirmed: return "Confirmée"
            case .preparing: return "En préparation"
            case .ready: return "Prête"
            case .delivering: return "En livraison"
            case .delivered: return "Livrée"
            case .cancelled: return "Annulée"
            }
        }

        public var emoji: String {
            switch self {
            case .pending: return "⏳"
            case .confirmed: return "✅"
            case .preparing: return "👨‍🍳"
            case .ready: return "📦"
            case .delivering: return "🚗"
            case .delivered: return "🎉"
            case .cancelled: return "❌"
            }
        }
    }

    // MARK: - Driver Status
    public enum DriverStatus: String, CaseIterable {
        case online = "online"
        case offline = "offline"
        case busy = "busy"
        case `break` = "break"

        public var displayName: String {
            switch self {
            case .online: return "En ligne"
            case .offline: return "Hors ligne"
            case .busy: return "Occupé"
            case .break: return "En pause"
            }
        }

        public var apiValue: String {
            switch self {
            case .online: return "available"
            case .offline: return "offline"
            case .busy: return "busy"
            case .break: return "offline"
            }
        }
    }

    // MARK: - Vehicle Types
    public enum VehicleType: String, CaseIterable {
        case bike = "bike"
        case scooter = "scooter"
        case car = "car"
        case van = "van"

        public var displayName: String {
            switch self {
            case .bike: return "Vélo"
            case .scooter: return "Scooter"
            case .car: return "Voiture"
            case .van: return "Camionnette"
            }
        }

        public var emoji: String {
            switch self {
            case .bike: return "🚲"
            case .scooter: return "🛵"
            case .car: return "🚗"
            case .van: return "🚐"
            }
        }
    }

    // MARK: - Payment Methods
    public enum PaymentMethod: String, CaseIterable {
        case cash = "cash"
        case card = "card"

        public var displayName: String {
            switch self {
            case .cash: return "Espèces"
            case .card: return "Carte bancaire"
            }
        }

        public var emoji: String {
            switch self {
            case .cash: return "💵"
            case .card: return "💳"
            }
        }
    }

    // MARK: - User Roles
    public enum UserRole: String {
        case admin = "admin"
        case merchant = "merchant"
        case driver = "driver"
        case user = "user"

        public var displayName: String {
            switch self {
            case .admin: return "Administrateur"
            case .merchant: return "Marchand"
            case .driver: return "Chauffeur"
            case .user: return "Client"
            }
        }
    }
}
