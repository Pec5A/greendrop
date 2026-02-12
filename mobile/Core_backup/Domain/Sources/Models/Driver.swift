import Foundation
import Common

public struct Driver: Identifiable, Codable, Equatable {
    public let id: String
    public var userId: String?
    public var name: String
    public var email: String
    public var phone: String
    public var status: String
    public var vehicleType: String
    public var vehiclePlate: String?
    public var avatar: String?
    public var rating: Double?
    public var completedDeliveries: Int?
    public var currentOrderId: String?
    public var location: DriverLocation?
    public var lastSeenAt: Date?

    public init(
        id: String,
        userId: String? = nil,
        name: String,
        email: String,
        phone: String,
        status: String = "offline",
        vehicleType: String = "car",
        vehiclePlate: String? = nil,
        avatar: String? = nil,
        rating: Double? = nil,
        completedDeliveries: Int? = nil,
        currentOrderId: String? = nil,
        location: DriverLocation? = nil,
        lastSeenAt: Date? = nil
    ) {
        self.id = id
        self.userId = userId
        self.name = name
        self.email = email
        self.phone = phone
        self.status = status
        self.vehicleType = vehicleType
        self.vehiclePlate = vehiclePlate
        self.avatar = avatar
        self.rating = rating
        self.completedDeliveries = completedDeliveries
        self.currentOrderId = currentOrderId
        self.location = location
        self.lastSeenAt = lastSeenAt
    }

    // MARK: - Computed Properties
    public var driverStatus: Constants.DriverStatus {
        Constants.DriverStatus(rawValue: status) ?? .offline
    }

    public var vehicle: Constants.VehicleType {
        Constants.VehicleType(rawValue: vehicleType) ?? .car
    }

    public var statusDisplayName: String {
        driverStatus.displayName
    }

    public var vehicleDisplayName: String {
        vehicle.displayName
    }

    public var vehicleEmoji: String {
        vehicle.emoji
    }

    public var isOnline: Bool {
        status == "online"
    }

    public var isBusy: Bool {
        status == "busy"
    }

    public var isAvailable: Bool {
        status == "online" && currentOrderId == nil
    }

    public var hasActiveOrder: Bool {
        currentOrderId != nil
    }

    public var displayRating: String {
        guard let rating = rating else { return "N/A" }
        return String(format: "%.1f ⭐", rating)
    }

    public var initials: String {
        let components = name.split(separator: " ")
        if components.count >= 2 {
            return String(components[0].prefix(1) + components[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}

// MARK: - Driver Location
public struct DriverLocation: Codable, Equatable {
    public var lat: Double
    public var lng: Double
    public var heading: Double?
    public var speed: Double?
    public var updatedAt: Date?

    public init(
        lat: Double,
        lng: Double,
        heading: Double? = nil,
        speed: Double? = nil,
        updatedAt: Date? = nil
    ) {
        self.lat = lat
        self.lng = lng
        self.heading = heading
        self.speed = speed
        self.updatedAt = updatedAt
    }

    public var geoLocation: GeoLocation {
        GeoLocation(latitude: lat, longitude: lng)
    }

    public var displaySpeed: String {
        guard let speed = speed else { return "" }
        return String(format: "%.0f km/h", speed)
    }
}

// MARK: - Firestore Mapping
extension Driver {
    public init?(id: String, data: [String: Any]) {
        guard let name = data["name"] as? String,
              let email = data["email"] as? String,
              let phone = data["phone"] as? String else {
            return nil
        }

        self.id = id
        self.userId = data["userId"] as? String
        self.name = name
        self.email = email
        self.phone = phone
        self.status = data["status"] as? String ?? "offline"
        self.vehicleType = data["vehicleType"] as? String ?? "car"
        self.vehiclePlate = data["vehiclePlate"] as? String
        self.avatar = data["avatar"] as? String
        self.rating = data["rating"] as? Double
        self.completedDeliveries = data["completedDeliveries"] as? Int
        self.currentOrderId = data["currentOrderId"] as? String

        // Parse location
        if let locData = data["location"] as? [String: Any],
           let lat = locData["lat"] as? Double,
           let lng = locData["lng"] as? Double {
            var updatedAt: Date?
            if let ts = locData["updatedAt"] as? Double {
                updatedAt = Date(timeIntervalSince1970: ts / 1000)
            } else if let tsString = locData["updatedAt"] as? String {
                updatedAt = Date.fromISO8601(tsString)
            }
            self.location = DriverLocation(
                lat: lat,
                lng: lng,
                heading: locData["heading"] as? Double,
                speed: locData["speed"] as? Double,
                updatedAt: updatedAt
            )
        } else {
            self.location = nil
        }

        // Parse lastSeenAt
        if let ts = data["lastSeenAt"] as? Double {
            self.lastSeenAt = Date(timeIntervalSince1970: ts / 1000)
        } else if let tsString = data["lastSeenAt"] as? String {
            self.lastSeenAt = Date.fromISO8601(tsString)
        } else {
            self.lastSeenAt = nil
        }
    }
}

// MARK: - API Request Models
public struct UpdateLocationRequest: Codable {
    public var latitude: Double
    public var longitude: Double
    public var heading: Double?
    public var speed: Double?

    public init(latitude: Double, longitude: Double, heading: Double? = nil, speed: Double? = nil) {
        self.latitude = latitude
        self.longitude = longitude
        self.heading = heading
        self.speed = speed
    }
}

public struct UpdateStatusRequest: Codable {
    public var status: String

    public init(status: String) {
        self.status = status
    }
}
