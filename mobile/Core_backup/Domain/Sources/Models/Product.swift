import Foundation
import Common

public struct Product: Identifiable, Codable, Equatable, Hashable {
    public let id: String
    public var shopId: String
    public var shopName: String?
    public var name: String
    public var description: String
    public var sku: String
    public var category: String
    public var tags: [String]
    public var price: Double
    public var stock: Int
    public var minStock: Int?
    public var status: String
    public var imageUrl: String?
    public var featured: Bool
    public var createdAt: Date?
    public var updatedAt: Date?

    public init(
        id: String,
        shopId: String,
        shopName: String? = nil,
        name: String,
        description: String,
        sku: String,
        category: String,
        tags: [String] = [],
        price: Double,
        stock: Int,
        minStock: Int? = nil,
        status: String = "active",
        imageUrl: String? = nil,
        featured: Bool = false,
        createdAt: Date? = nil,
        updatedAt: Date? = nil
    ) {
        self.id = id
        self.shopId = shopId
        self.shopName = shopName
        self.name = name
        self.description = description
        self.sku = sku
        self.category = category
        self.tags = tags
        self.price = price
        self.stock = stock
        self.minStock = minStock
        self.status = status
        self.imageUrl = imageUrl
        self.featured = featured
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    public var isAvailable: Bool {
        status == "active" && stock > 0
    }

    public var isLowStock: Bool {
        guard let minStock = minStock else { return false }
        return stock <= minStock
    }

    public var isOutOfStock: Bool {
        stock <= 0
    }

    public var displayPrice: String {
        price.asCurrency
    }

    public var stockStatus: String {
        if isOutOfStock {
            return "Rupture de stock"
        } else if isLowStock {
            return "Stock faible"
        }
        return "En stock"
    }
}

// MARK: - Firestore Mapping
extension Product {
    public init?(id: String, data: [String: Any]) {
        guard let shopId = data["shopId"] as? String,
              let name = data["name"] as? String,
              let price = data["price"] as? Double else {
            return nil
        }

        self.id = id
        self.shopId = shopId
        self.shopName = data["shopName"] as? String
        self.name = name
        self.description = data["description"] as? String ?? ""
        self.sku = data["sku"] as? String ?? ""
        self.category = data["category"] as? String ?? "Autre"
        self.tags = data["tags"] as? [String] ?? []
        self.price = price
        self.stock = data["stock"] as? Int ?? 0
        self.minStock = data["minStock"] as? Int
        self.status = data["status"] as? String ?? "active"
        self.imageUrl = data["imageUrl"] as? String
        self.featured = data["featured"] as? Bool ?? false
        self.createdAt = nil
        self.updatedAt = nil
    }
}
