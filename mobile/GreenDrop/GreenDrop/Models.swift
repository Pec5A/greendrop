import Foundation
import CoreLocation

// MARK: - Shop

/// Represents a shop/store available on the GreenDrop delivery platform.
///
/// Each shop has a physical location, belongs to a category, and defines its own delivery
/// parameters such as fees and minimum order amounts. Shops are owned by merchants.
struct Shop: Identifiable, Codable, Equatable, Hashable {
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    /// Unique identifier for the shop (Firestore document ID).
    let id: String
    /// Display name of the shop.
    var name: String
    /// Short description or tagline for the shop.
    var description: String
    /// Optional URL string pointing to the shop's image or logo.
    var imageURL: String?
    /// Street address of the shop.
    var address: String
    /// Geographic latitude of the shop location.
    var latitude: Double
    /// Geographic longitude of the shop location.
    var longitude: Double
    /// The business category this shop belongs to (e.g., grocery, bakery).
    var category: ShopCategory
    /// Average customer rating, from 0.0 to 5.0.
    var rating: Double
    /// Total number of reviews or completed orders used for rating.
    var reviewCount: Int
    /// Whether the shop is currently open and accepting orders.
    var isOpen: Bool
    /// Delivery fee charged to the customer in euros.
    var deliveryFee: Double
    /// Minimum order subtotal required before delivery, in euros.
    var minOrderAmount: Double
    /// Human-readable estimated delivery time (e.g., "20-30 min").
    var estimatedDeliveryTime: String
    /// Firebase UID of the merchant who owns this shop.
    var ownerId: String

    /// The shop's geographic location as a `CLLocationCoordinate2D`.
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    enum CodingKeys: String, CodingKey {
        case id, name, description, imageURL, address, latitude, longitude
        case category, rating, reviewCount, isOpen, deliveryFee, minOrderAmount
        case estimatedDeliveryTime, ownerId
    }
}

/// Categories that a shop can belong to.
///
/// Each category provides a localized French display name and an SF Symbol icon
/// for use in the user interface.
enum ShopCategory: String, Codable, CaseIterable {
    case cbd = "cbd"

    /// Localized display name in French for the category.
    var displayName: String { "CBD Shop" }

    /// SF Symbol name representing this category in the UI.
    var icon: String { "leaf.fill" }
}

/// CBD product subcategories used for filtering on the home screen.
enum CBDSubCategory: String, CaseIterable {
    case all = "Tous"
    case fleurs = "Fleurs CBD"
    case huiles = "Huiles CBD"
    case resines = "Résines CBD"
    case infusions = "Infusions"
    case cosmetiques = "Cosmétiques CBD"
    case accessoires = "Accessoires"

    var icon: String {
        switch self {
        case .all: return "square.grid.2x2.fill"
        case .fleurs: return "leaf.fill"
        case .huiles: return "drop.fill"
        case .resines: return "circle.hexagongrid.fill"
        case .infusions: return "cup.and.saucer.fill"
        case .cosmetiques: return "sparkles"
        case .accessoires: return "wrench.and.screwdriver.fill"
        }
    }
}

// MARK: - Product

/// Represents a product available for purchase within a shop.
///
/// Products can optionally be age-restricted (e.g., alcohol, tobacco), in which case
/// KYC verification is required before checkout. Supports backwards-compatible decoding
/// for older API responses that lack restriction fields.
struct Product: Identifiable, Codable, Equatable {
    /// Unique identifier for the product (Firestore document ID).
    let id: String
    /// Display name of the product.
    var name: String
    /// Detailed description of the product.
    var description: String
    /// Unit price in euros.
    var price: Double
    /// Optional URL string pointing to the product image.
    var imageURL: String?
    /// Category label within the shop (e.g., "Legumes", "Boissons").
    var category: String
    /// The ID of the shop that sells this product.
    var shopId: String
    /// Whether the product is currently available for purchase.
    var isAvailable: Bool
    /// Current stock quantity.
    var stock: Int
    /// Whether this product is age-restricted (e.g., alcohol, tobacco).
    var isRestricted: Bool
    /// Minimum age required to purchase this product (defaults to 18 for alcohol).
    var minimumAge: Int?

    /// Price formatted as a string with euro symbol (e.g., "12.99 EUR").
    var formattedPrice: String {
        String(format: "%.2f €", price)
    }

    /// Whether the product requires age verification before purchase.
    ///
    /// Returns `true` if the product is restricted and the minimum age is 18 or above.
    var requiresAgeVerification: Bool {
        isRestricted && (minimumAge ?? 18) >= 18
    }

    enum CodingKeys: String, CodingKey {
        case id, name, description, price, imageURL, category
        case shopId, isAvailable, stock, isRestricted, minimumAge
    }

    /// Creates a `Product` by decoding from a decoder.
    ///
    /// Provides backwards compatibility by defaulting `isRestricted` to `false` and
    /// `minimumAge` to `nil` when these fields are absent from the payload.
    ///
    /// - Parameter decoder: The decoder to read data from.
    /// - Throws: `DecodingError` if required fields are missing or malformed.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decode(String.self, forKey: .description)
        price = try container.decode(Double.self, forKey: .price)
        imageURL = try container.decodeIfPresent(String.self, forKey: .imageURL)
        category = try container.decode(String.self, forKey: .category)
        shopId = try container.decode(String.self, forKey: .shopId)
        isAvailable = try container.decode(Bool.self, forKey: .isAvailable)
        stock = try container.decode(Int.self, forKey: .stock)
        isRestricted = try container.decodeIfPresent(Bool.self, forKey: .isRestricted) ?? false
        minimumAge = try container.decodeIfPresent(Int.self, forKey: .minimumAge)
    }

    /// Creates a `Product` with the given properties.
    ///
    /// - Parameters:
    ///   - id: Unique product identifier.
    ///   - name: Display name.
    ///   - description: Product description.
    ///   - price: Unit price in euros.
    ///   - imageURL: Optional image URL string.
    ///   - category: Category label within the shop.
    ///   - shopId: ID of the owning shop.
    ///   - isAvailable: Whether the product is available for purchase.
    ///   - stock: Current stock quantity.
    ///   - isRestricted: Whether the product is age-restricted. Defaults to `false`.
    ///   - minimumAge: Minimum required age. Defaults to `nil`.
    init(id: String, name: String, description: String, price: Double, imageURL: String? = nil,
         category: String, shopId: String, isAvailable: Bool, stock: Int,
         isRestricted: Bool = false, minimumAge: Int? = nil) {
        self.id = id
        self.name = name
        self.description = description
        self.price = price
        self.imageURL = imageURL
        self.category = category
        self.shopId = shopId
        self.isAvailable = isAvailable
        self.stock = stock
        self.isRestricted = isRestricted
        self.minimumAge = minimumAge
    }
}

// MARK: - Order

/// Represents a customer order placed through the GreenDrop platform.
///
/// An order tracks the full lifecycle from placement to delivery, including items ordered,
/// payment information, delivery coordinates, and the assigned driver. Orders are stored
/// in Firestore and updated in real time via snapshot listeners.
struct Order: Identifiable, Codable, Equatable {
    /// Unique identifier for the order (Firestore document ID).
    let id: String
    /// Firebase UID of the customer who placed the order.
    var userId: String
    /// ID of the shop fulfilling the order.
    var shopId: String
    /// Display name of the shop for UI purposes.
    var shopName: String
    /// Firebase UID of the assigned delivery driver, if any.
    var driverId: String?
    /// List of items included in the order.
    var items: [OrderItem]
    /// Current status of the order in its lifecycle.
    var status: OrderStatus
    /// Sum of item prices before delivery fee, in euros.
    var subtotal: Double
    /// Delivery fee charged for this order, in euros.
    var deliveryFee: Double
    /// Total amount (subtotal + delivery fee), in euros.
    var total: Double
    /// Street address for delivery.
    var deliveryAddress: String
    /// Latitude of the delivery location.
    var deliveryLatitude: Double
    /// Longitude of the delivery location.
    var deliveryLongitude: Double
    /// Timestamp when the order was created.
    var createdAt: Date
    /// Timestamp when the order was last updated.
    var updatedAt: Date
    /// Estimated delivery date/time, if available.
    var estimatedDelivery: Date?
    /// Optional customer notes for the order (e.g., "Ring twice").
    var notes: String?
    /// Stripe payment status (e.g., "paid", "pending").
    var paymentStatus: String?
    /// Stripe PaymentIntent ID associated with this order.
    var paymentIntentId: String?
    /// 4-digit code the client gives to the driver to confirm delivery.
    var deliveryCode: String?

    /// The delivery destination as a `CLLocationCoordinate2D`.
    var deliveryCoordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: deliveryLatitude, longitude: deliveryLongitude)
    }

    enum CodingKeys: String, CodingKey {
        case id, userId, shopId, shopName, driverId, items, status
        case subtotal, deliveryFee, total, deliveryAddress
        case deliveryLatitude, deliveryLongitude
        case createdAt, updatedAt, estimatedDelivery, notes
        case paymentStatus, paymentIntentId, deliveryCode
    }
}

/// A single line item within an order.
struct OrderItem: Identifiable, Codable, Equatable {
    /// Unique identifier for this order item.
    let id: String
    /// ID of the product being ordered.
    var productId: String
    /// Display name of the product.
    var productName: String
    /// Unit price of the product in euros.
    var price: Double
    /// Number of units ordered.
    var quantity: Int

    /// Total cost for this line item (price x quantity).
    var total: Double { price * Double(quantity) }
}

/// Represents the lifecycle status of an order.
///
/// Includes both primary statuses and alternative values returned by the backend.
/// Each status provides a localized display name, an SF Symbol icon, a hex color,
/// and progress tracking metadata.
enum OrderStatus: String, Codable, CaseIterable {
    /// Order has been placed but not yet confirmed by the merchant.
    case pending = "pending"
    /// Merchant has confirmed the order.
    case confirmed = "confirmed"
    /// Merchant is preparing the order.
    case preparing = "preparing"
    /// Order is ready for pickup by a driver.
    case ready = "ready"
    /// Driver has arrived at the shop.
    case atShop = "atShop"
    /// Driver has picked up the order from the shop.
    case pickedUp = "pickedUp"
    /// Driver is en route to the delivery address.
    case delivering = "delivering"
    /// Order has been delivered to the customer.
    case delivered = "delivered"
    /// Order has been cancelled.
    case cancelled = "cancelled"

    // Alternative values from backend
    /// Alternative backend status indicating the order was created.
    case created = "created"
    /// Alternative backend status indicating payment was received.
    case paid = "paid"
    /// Alternative backend status indicating the order is in transit.
    case inTransit = "in_transit"

    /// Localized French display name for the order status.
    var displayName: String {
        switch self {
        case .pending, .created: return "En attente"
        case .paid: return "Payée"
        case .confirmed: return "Confirmée"
        case .preparing: return "En préparation"
        case .ready: return "Prête"
        case .atShop: return "Livreur au magasin"
        case .pickedUp: return "Récupérée"
        case .delivering, .inTransit: return "En livraison"
        case .delivered: return "Livrée"
        case .cancelled: return "Annulée"
        }
    }

    /// SF Symbol name representing this order status in the UI.
    var icon: String {
        switch self {
        case .pending, .created: return "clock.fill"
        case .paid: return "creditcard.fill"
        case .confirmed: return "checkmark.circle.fill"
        case .preparing: return "flame.fill"
        case .ready: return "bag.fill.badge.checkmark"
        case .atShop: return "storefront.fill"
        case .pickedUp: return "car.fill"
        case .delivering, .inTransit: return "bicycle"
        case .delivered: return "checkmark.seal.fill"
        case .cancelled: return "xmark.circle.fill"
        }
    }

    /// Hex color string associated with this status for UI styling.
    var color: String {
        switch self {
        case .pending, .created: return "#F59E0B"
        case .paid: return "#10B981"
        case .confirmed: return "#3B82F6"
        case .preparing: return "#F97316"
        case .ready: return "#8B5CF6"
        case .atShop: return "#8B5CF6"
        case .pickedUp: return "#06B6D4"
        case .delivering, .inTransit: return "#22C55E"
        case .delivered: return "#10B981"
        case .cancelled: return "#EF4444"
        }
    }

    /// Returns true if the order is still active (not delivered or cancelled)
    var isActive: Bool {
        switch self {
        case .delivered, .cancelled:
            return false
        default:
            return true
        }
    }

    /// Progress value from 0 to 1 for tracking
    var progressValue: Double {
        switch self {
        case .pending, .created: return 0.1
        case .paid: return 0.2
        case .confirmed: return 0.3
        case .preparing: return 0.5
        case .ready: return 0.6
        case .atShop: return 0.65
        case .pickedUp: return 0.7
        case .delivering, .inTransit: return 0.85
        case .delivered: return 1.0
        case .cancelled: return 0.0
        }
    }

    /// Step number for visual tracking (1-5)
    var stepNumber: Int {
        switch self {
        case .pending, .created, .paid: return 1
        case .confirmed: return 2
        case .preparing: return 3
        case .ready, .atShop, .pickedUp: return 4
        case .delivering, .inTransit, .delivered: return 5
        case .cancelled: return 0
        }
    }
}

// MARK: - Delivery (for Driver)

/// Represents a delivery assignment as seen by a driver.
///
/// Contains pickup (shop) and drop-off (customer) coordinates, earnings information,
/// and timestamps for tracking the delivery lifecycle.
struct Delivery: Identifiable, Codable, Equatable {
    /// Unique identifier for the delivery.
    let id: String
    /// The order ID this delivery is associated with.
    var orderId: String
    /// Firebase UID of the assigned driver, or `nil` if unassigned.
    var driverId: String?
    /// Name of the shop where the order is to be picked up.
    var shopName: String
    /// Street address of the pickup shop.
    var shopAddress: String
    /// Latitude of the shop location.
    var shopLatitude: Double
    /// Longitude of the shop location.
    var shopLongitude: Double
    /// Display name for the customer receiving the delivery.
    var customerName: String
    /// Street address of the delivery destination.
    var customerAddress: String
    /// Latitude of the customer's delivery location.
    var customerLatitude: Double
    /// Longitude of the customer's delivery location.
    var customerLongitude: Double
    /// Current status of the delivery.
    var status: DeliveryStatus
    /// Driver earnings for this delivery in euros (typically 80% of the delivery fee).
    var earnings: Double
    /// Estimated distance in kilometers between shop and customer.
    var distance: Double
    /// Timestamp when the delivery was created.
    var createdAt: Date
    /// Timestamp when the driver picked up the order, if applicable.
    var pickedUpAt: Date?
    /// Timestamp when the order was delivered, if applicable.
    var deliveredAt: Date?

    /// The shop's geographic location as a `CLLocationCoordinate2D`.
    var shopCoordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: shopLatitude, longitude: shopLongitude)
    }

    /// The customer's delivery location as a `CLLocationCoordinate2D`.
    var customerCoordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: customerLatitude, longitude: customerLongitude)
    }
}

/// Represents the lifecycle status of a delivery from the driver's perspective.
enum DeliveryStatus: String, Codable {
    /// Delivery is available and waiting for a driver to accept.
    case available = "available"
    /// Driver has accepted the delivery.
    case accepted = "accepted"
    /// Driver has arrived at the shop for pickup.
    case atShop = "at_shop"
    /// Driver has picked up the order from the shop.
    case pickedUp = "picked_up"
    /// Driver is en route to the customer.
    case delivering = "delivering"
    /// Order has been delivered to the customer.
    case delivered = "delivered"

    /// Localized French display name for the delivery status.
    var displayName: String {
        switch self {
        case .available: return "Disponible"
        case .accepted: return "Acceptée"
        case .atShop: return "Au magasin"
        case .pickedUp: return "Récupérée"
        case .delivering: return "En cours"
        case .delivered: return "Livrée"
        }
    }
}

// MARK: - Statistics

/// Aggregated statistics for a merchant's shop over a given period.
struct MerchantStats: Equatable {
    /// Number of orders received in the period.
    var todayOrders: Int
    /// Total revenue in euros for the period.
    var todayRevenue: Double
    /// Number of orders currently pending action.
    var pendingOrders: Int
    /// Total number of active products in the shop.
    var totalProducts: Int

    /// An empty stats instance with all values at zero.
    static let empty = MerchantStats(todayOrders: 0, todayRevenue: 0, pendingOrders: 0, totalProducts: 0)
}

/// Aggregated statistics for a delivery driver.
struct DriverStats: Equatable {
    /// Number of deliveries completed today.
    var todayDeliveries: Int
    /// Total earnings in euros for today.
    var todayEarnings: Double
    /// Lifetime total number of completed deliveries.
    var totalDeliveries: Int
    /// Average customer rating for the driver (0.0 to 5.0).
    var rating: Double

    /// An empty stats instance with default values (5.0 rating).
    static let empty = DriverStats(todayDeliveries: 0, todayEarnings: 0, totalDeliveries: 0, rating: 5.0)
}

// MARK: - Driver Location (for real-time tracking)

/// Real-time location data for a delivery driver, used for live order tracking.
struct DriverLocation: Codable {
    /// Firebase UID of the driver.
    let driverId: String
    /// Current latitude of the driver.
    var latitude: Double
    /// Current longitude of the driver.
    var longitude: Double
    /// Direction the driver is heading, in degrees from true north. `nil` if unavailable.
    var heading: Double?
    /// Current speed in meters per second. `nil` if unavailable or stationary.
    var speed: Double?
    /// Timestamp of the last location update.
    var updatedAt: Date

    /// The driver's current position as a `CLLocationCoordinate2D`.
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}
