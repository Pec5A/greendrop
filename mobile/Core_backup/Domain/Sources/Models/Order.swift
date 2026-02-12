import Foundation
import Common

public struct Order: Identifiable, Codable, Equatable {
    public let id: String
    public var userId: String
    public var shopId: String
    public var reference: String?
    public var status: String
    public var priority: String?
    public var total: Double
    public var deliveryFee: Double?
    public var currency: String
    public var items: [OrderItem]
    public var paymentMethod: String?
    public var paymentStatus: String?
    public var deliveryAddress: String?
    public var deliveryLocation: GeoLocation?
    public var notes: String?
    public var driverId: String?
    public var driverName: String?
    public var driverPhone: String?
    public var driverLocation: GeoLocation?
    public var pickupAddress: String?
    public var dropoffAddress: String?
    public var estimatedDeliveryTime: Date?
    public var deliveredAt: Date?
    public var deliveryPhoto: String?
    public var timeline: [OrderTimelineEvent]
    public var createdAt: Date?
    public var updatedAt: Date?

    public init(
        id: String,
        userId: String,
        shopId: String,
        reference: String? = nil,
        status: String = "pending",
        priority: String? = "normal",
        total: Double,
        deliveryFee: Double? = 5.0,
        currency: String = "EUR",
        items: [OrderItem] = [],
        paymentMethod: String? = "cash",
        paymentStatus: String? = "pending",
        deliveryAddress: String? = nil,
        deliveryLocation: GeoLocation? = nil,
        notes: String? = nil,
        driverId: String? = nil,
        driverName: String? = nil,
        driverPhone: String? = nil,
        driverLocation: GeoLocation? = nil,
        pickupAddress: String? = nil,
        dropoffAddress: String? = nil,
        estimatedDeliveryTime: Date? = nil,
        deliveredAt: Date? = nil,
        deliveryPhoto: String? = nil,
        timeline: [OrderTimelineEvent] = [],
        createdAt: Date? = nil,
        updatedAt: Date? = nil
    ) {
        self.id = id
        self.userId = userId
        self.shopId = shopId
        self.reference = reference
        self.status = status
        self.priority = priority
        self.total = total
        self.deliveryFee = deliveryFee
        self.currency = currency
        self.items = items
        self.paymentMethod = paymentMethod
        self.paymentStatus = paymentStatus
        self.deliveryAddress = deliveryAddress
        self.deliveryLocation = deliveryLocation
        self.notes = notes
        self.driverId = driverId
        self.driverName = driverName
        self.driverPhone = driverPhone
        self.driverLocation = driverLocation
        self.pickupAddress = pickupAddress
        self.dropoffAddress = dropoffAddress
        self.estimatedDeliveryTime = estimatedDeliveryTime
        self.deliveredAt = deliveredAt
        self.deliveryPhoto = deliveryPhoto
        self.timeline = timeline
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    // MARK: - Computed Properties
    public var displayTotal: String { total.asCurrency }
    public var displayDeliveryFee: String { (deliveryFee ?? 0).asCurrency }
    public var subtotal: Double { total - (deliveryFee ?? 0) }
    public var displaySubtotal: String { subtotal.asCurrency }

    public var orderStatus: Constants.OrderStatus {
        Constants.OrderStatus(rawValue: status) ?? .pending
    }

    public var statusDisplayName: String {
        orderStatus.displayName
    }

    public var statusEmoji: String {
        orderStatus.emoji
    }

    public var isActive: Bool {
        !["delivered", "cancelled"].contains(status)
    }

    public var isDelivered: Bool {
        status == "delivered"
    }

    public var isCancelled: Bool {
        status == "cancelled"
    }

    public var canBeCancelled: Bool {
        ["pending", "confirmed"].contains(status)
    }

    public var hasDriver: Bool {
        driverId != nil
    }

    public var itemsCount: Int {
        items.reduce(0) { $0 + $1.quantity }
    }

    public var displayReference: String {
        reference ?? "ORD-\(id.prefix(8).uppercased())"
    }

    public var formattedCreatedAt: String {
        createdAt?.formattedDateTime ?? ""
    }

    public var formattedEstimatedDelivery: String {
        estimatedDeliveryTime?.formattedTime ?? "Non estimé"
    }
}

// MARK: - Order Item
public struct OrderItem: Identifiable, Codable, Equatable, Hashable {
    public let id: String
    public var productId: String
    public var productName: String
    public var quantity: Int
    public var price: Double
    public var imageUrl: String?

    public init(
        id: String = UUID().uuidString,
        productId: String,
        productName: String,
        quantity: Int,
        price: Double,
        imageUrl: String? = nil
    ) {
        self.id = id
        self.productId = productId
        self.productName = productName
        self.quantity = quantity
        self.price = price
        self.imageUrl = imageUrl
    }

    public var totalPrice: Double {
        price * Double(quantity)
    }

    public var displayPrice: String {
        price.asCurrency
    }

    public var displayTotalPrice: String {
        totalPrice.asCurrency
    }
}

// MARK: - Order Timeline Event
public struct OrderTimelineEvent: Identifiable, Codable, Equatable {
    public let id: String
    public var type: String
    public var title: String
    public var description: String?
    public var actor: String?
    public var timestamp: Date
    public var status: String?

    public init(
        id: String = UUID().uuidString,
        type: String,
        title: String,
        description: String? = nil,
        actor: String? = nil,
        timestamp: Date = Date(),
        status: String? = nil
    ) {
        self.id = id
        self.type = type
        self.title = title
        self.description = description
        self.actor = actor
        self.timestamp = timestamp
        self.status = status
    }

    public var formattedTime: String {
        timestamp.formattedTime
    }

    public var formattedDateTime: String {
        timestamp.formattedDateTime
    }

    public var isCompleted: Bool {
        status == "completed"
    }

    public var isCurrent: Bool {
        status == "current"
    }
}

// MARK: - Firestore Mapping
extension Order {
    public init?(id: String, data: [String: Any]) {
        guard let userId = data["userId"] as? String,
              let shopId = data["shopId"] as? String else {
            return nil
        }

        self.id = id
        self.userId = userId
        self.shopId = shopId
        self.reference = data["reference"] as? String
        self.status = data["status"] as? String ?? "pending"
        self.priority = data["priority"] as? String
        self.total = data["total"] as? Double ?? 0
        self.deliveryFee = data["deliveryFee"] as? Double
        self.currency = data["currency"] as? String ?? "EUR"
        self.paymentMethod = data["paymentMethod"] as? String
        self.paymentStatus = data["paymentStatus"] as? String
        self.deliveryAddress = data["deliveryAddress"] as? String
        self.notes = data["notes"] as? String
        self.driverId = data["driverId"] as? String
        self.driverName = data["driverName"] as? String
        self.driverPhone = data["driverPhone"] as? String
        self.pickupAddress = data["pickupAddress"] as? String
        self.dropoffAddress = data["dropoffAddress"] as? String
        self.deliveryPhoto = data["deliveryPhoto"] as? String

        // Parse delivery location
        if let locData = data["deliveryLocation"] as? [String: Any],
           let lat = locData["latitude"] as? Double,
           let lng = locData["longitude"] as? Double {
            self.deliveryLocation = GeoLocation(latitude: lat, longitude: lng)
        } else {
            self.deliveryLocation = nil
        }

        // Parse driver location
        if let locData = data["driverLocation"] as? [String: Any],
           let lat = locData["latitude"] as? Double,
           let lng = locData["longitude"] as? Double {
            self.driverLocation = GeoLocation(latitude: lat, longitude: lng)
        } else {
            self.driverLocation = nil
        }

        // Parse items
        if let itemsData = data["items"] as? [[String: Any]] {
            self.items = itemsData.compactMap { itemData in
                guard let productId = itemData["productId"] as? String else { return nil }
                return OrderItem(
                    id: itemData["id"] as? String ?? UUID().uuidString,
                    productId: productId,
                    productName: itemData["productName"] as? String ?? "Produit",
                    quantity: itemData["quantity"] as? Int ?? 1,
                    price: itemData["price"] as? Double ?? 0,
                    imageUrl: itemData["imageUrl"] as? String
                )
            }
        } else {
            self.items = []
        }

        // Parse timeline
        if let timelineData = data["timeline"] as? [[String: Any]] {
            self.timeline = timelineData.compactMap { eventData in
                guard let type = eventData["type"] as? String,
                      let title = eventData["title"] as? String else { return nil }
                let timestamp: Date
                if let ts = eventData["timestamp"] as? Double {
                    timestamp = Date(timeIntervalSince1970: ts / 1000)
                } else if let tsString = eventData["timestamp"] as? String {
                    timestamp = Date.fromISO8601(tsString) ?? Date()
                } else {
                    timestamp = Date()
                }
                return OrderTimelineEvent(
                    id: eventData["id"] as? String ?? UUID().uuidString,
                    type: type,
                    title: title,
                    description: eventData["description"] as? String,
                    actor: eventData["actor"] as? String,
                    timestamp: timestamp,
                    status: eventData["status"] as? String
                )
            }
        } else {
            self.timeline = []
        }

        // Parse dates
        if let ts = data["estimatedDeliveryTime"] as? Double {
            self.estimatedDeliveryTime = Date(timeIntervalSince1970: ts / 1000)
        } else if let tsString = data["estimatedDeliveryTime"] as? String {
            self.estimatedDeliveryTime = Date.fromISO8601(tsString)
        } else {
            self.estimatedDeliveryTime = nil
        }

        if let ts = data["deliveredAt"] as? Double {
            self.deliveredAt = Date(timeIntervalSince1970: ts / 1000)
        } else if let tsString = data["deliveredAt"] as? String {
            self.deliveredAt = Date.fromISO8601(tsString)
        } else {
            self.deliveredAt = nil
        }

        if let ts = data["createdAt"] as? Double {
            self.createdAt = Date(timeIntervalSince1970: ts / 1000)
        } else if let tsString = data["createdAt"] as? String {
            self.createdAt = Date.fromISO8601(tsString)
        } else {
            self.createdAt = nil
        }

        if let ts = data["updatedAt"] as? Double {
            self.updatedAt = Date(timeIntervalSince1970: ts / 1000)
        } else if let tsString = data["updatedAt"] as? String {
            self.updatedAt = Date.fromISO8601(tsString)
        } else {
            self.updatedAt = nil
        }
    }

    public var toAPICreateData: [String: Any] {
        var data: [String: Any] = [
            "shopId": shopId,
            "items": items.map { [
                "productId": $0.productId,
                "quantity": $0.quantity
            ]},
        ]
        if let deliveryAddress = deliveryAddress {
            data["deliveryAddress"] = deliveryAddress
        }
        if let deliveryLocation = deliveryLocation {
            data["deliveryLocation"] = [
                "latitude": deliveryLocation.latitude,
                "longitude": deliveryLocation.longitude
            ]
        }
        if let paymentMethod = paymentMethod {
            data["paymentMethod"] = paymentMethod
        }
        if let notes = notes {
            data["notes"] = notes
        }
        return data
    }
}
