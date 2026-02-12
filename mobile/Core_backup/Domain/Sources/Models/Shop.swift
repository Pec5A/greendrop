import Foundation
import CoreLocation
import Common

public struct Shop: Identifiable, Codable, Equatable, Hashable {
    public let id: String
    public var name: String
    public var ownerId: String
    public var ownerName: String?
    public var status: String
    public var approvalStatus: String?
    public var address: String
    public var contactEmail: String?
    public var contactPhone: String?
    public var logoUrl: String?
    public var categories: [String]
    public var rating: Double?
    public var totalOrders: Int?
    public var totalProducts: Int?
    public var location: GeoLocation?
    public var createdAt: Date?

    // Computed property for distance (set externally when filtering by location)
    public var distance: Double?

    public init(
        id: String,
        name: String,
        ownerId: String,
        ownerName: String? = nil,
        status: String = "active",
        approvalStatus: String? = nil,
        address: String,
        contactEmail: String? = nil,
        contactPhone: String? = nil,
        logoUrl: String? = nil,
        categories: [String] = [],
        rating: Double? = nil,
        totalOrders: Int? = nil,
        totalProducts: Int? = nil,
        location: GeoLocation? = nil,
        distance: Double? = nil,
        createdAt: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.ownerId = ownerId
        self.ownerName = ownerName
        self.status = status
        self.approvalStatus = approvalStatus
        self.address = address
        self.contactEmail = contactEmail
        self.contactPhone = contactPhone
        self.logoUrl = logoUrl
        self.categories = categories
        self.rating = rating
        self.totalOrders = totalOrders
        self.totalProducts = totalProducts
        self.location = location
        self.distance = distance
        self.createdAt = createdAt
    }

    public var isActive: Bool { status == "active" }
    public var isApproved: Bool { approvalStatus == "approved" }
    public var displayRating: String {
        guard let rating = rating else { return "Nouveau" }
        return String(format: "%.1f", rating)
    }
    public var displayDistance: String? {
        guard let distance = distance else { return nil }
        return distance.asDistance
    }
    public var categoriesText: String {
        categories.joined(separator: " • ")
    }
}

// MARK: - GeoLocation
public struct GeoLocation: Codable, Equatable, Hashable {
    public var latitude: Double
    public var longitude: Double

    public init(latitude: Double, longitude: Double) {
        self.latitude = latitude
        self.longitude = longitude
    }

    public var clLocation: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    public func distance(to other: GeoLocation) -> Double {
        let loc1 = CLLocation(latitude: latitude, longitude: longitude)
        let loc2 = CLLocation(latitude: other.latitude, longitude: other.longitude)
        return loc1.distance(from: loc2) / 1000.0 // Convert to km
    }
}

// MARK: - Firestore Mapping
extension Shop {
    public init?(id: String, data: [String: Any]) {
        guard let name = data["name"] as? String,
              let ownerId = data["ownerId"] as? String,
              let address = data["address"] as? String else {
            return nil
        }

        self.id = id
        self.name = name
        self.ownerId = ownerId
        self.ownerName = data["ownerName"] as? String
        self.status = data["status"] as? String ?? "active"
        self.approvalStatus = data["approvalStatus"] as? String
        self.address = address
        self.contactEmail = data["contactEmail"] as? String
        self.contactPhone = data["contactPhone"] as? String
        self.logoUrl = data["logoUrl"] as? String
        self.categories = data["categories"] as? [String] ?? []
        self.rating = data["rating"] as? Double
        self.totalOrders = data["totalOrders"] as? Int
        self.totalProducts = data["totalProducts"] as? Int
        self.distance = data["distance"] as? Double

        if let locationData = data["location"] as? [String: Any],
           let lat = locationData["latitude"] as? Double,
           let lng = locationData["longitude"] as? Double {
            self.location = GeoLocation(latitude: lat, longitude: lng)
        } else {
            self.location = nil
        }

        self.createdAt = nil
    }
}
