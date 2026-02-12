import Foundation

public struct User: Identifiable, Codable, Equatable, Hashable {
    public let id: String
    public var email: String
    public var name: String
    public var role: String
    public var status: String
    public var phone: String?
    public var avatar: String?
    public var shopId: String?
    public var createdAt: Date?

    public init(
        id: String,
        email: String,
        name: String,
        role: String = "user",
        status: String = "pending",
        phone: String? = nil,
        avatar: String? = nil,
        shopId: String? = nil,
        createdAt: Date? = nil
    ) {
        self.id = id
        self.email = email
        self.name = name
        self.role = role
        self.status = status
        self.phone = phone
        self.avatar = avatar
        self.shopId = shopId
        self.createdAt = createdAt
    }

    public var isAdmin: Bool { role == "admin" }
    public var isMerchant: Bool { role == "merchant" }
    public var isDriver: Bool { role == "driver" }
    public var isClient: Bool { role == "user" }
    public var isVerified: Bool { status == "verified" }

    public var initials: String {
        let components = name.split(separator: " ")
        if components.count >= 2 {
            return String(components[0].prefix(1) + components[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}

// MARK: - Firestore Mapping
extension User {
    public init?(id: String, data: [String: Any]) {
        guard let email = data["email"] as? String,
              let name = data["name"] as? String else {
            return nil
        }

        self.id = id
        self.email = email
        self.name = name
        self.role = data["role"] as? String ?? "user"
        self.status = data["status"] as? String ?? "pending"
        self.phone = data["phone"] as? String
        self.avatar = data["avatar"] as? String
        self.shopId = data["shopId"] as? String

        if let timestamp = data["createdAt"] as? Double {
            self.createdAt = Date(timeIntervalSince1970: timestamp / 1000)
        } else {
            self.createdAt = nil
        }
    }

    public var toFirestoreData: [String: Any] {
        var data: [String: Any] = [
            "email": email,
            "name": name,
            "role": role,
            "status": status,
        ]
        if let phone = phone { data["phone"] = phone }
        if let avatar = avatar { data["avatar"] = avatar }
        if let shopId = shopId { data["shopId"] = shopId }
        return data
    }
}
