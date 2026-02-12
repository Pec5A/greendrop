import Foundation
import Common

/// Represents an item in the shopping cart (local only)
public struct CartItem: Identifiable, Codable, Equatable, Hashable {
    public let id: String
    public var product: Product
    public var quantity: Int
    public var addedAt: Date

    public init(
        id: String = UUID().uuidString,
        product: Product,
        quantity: Int = 1,
        addedAt: Date = Date()
    ) {
        self.id = id
        self.product = product
        self.quantity = quantity
        self.addedAt = addedAt
    }

    public var totalPrice: Double {
        product.price * Double(quantity)
    }

    public var displayTotalPrice: String {
        totalPrice.asCurrency
    }

    public var displayUnitPrice: String {
        product.price.asCurrency
    }

    public var isAvailable: Bool {
        product.isAvailable && quantity <= product.stock
    }

    public var maxQuantity: Int {
        min(product.stock, 99)
    }

    public func toOrderItem() -> OrderItem {
        OrderItem(
            id: UUID().uuidString,
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            price: product.price,
            imageUrl: product.imageUrl
        )
    }
}

// MARK: - Cart
public struct Cart: Codable, Equatable {
    public var items: [CartItem]
    public var shopId: String?
    public var shopName: String?

    public init(items: [CartItem] = [], shopId: String? = nil, shopName: String? = nil) {
        self.items = items
        self.shopId = shopId
        self.shopName = shopName
    }

    // MARK: - Computed Properties
    public var isEmpty: Bool {
        items.isEmpty
    }

    public var itemCount: Int {
        items.reduce(0) { $0 + $1.quantity }
    }

    public var subtotal: Double {
        items.reduce(0) { $0 + $1.totalPrice }
    }

    public var displaySubtotal: String {
        subtotal.asCurrency
    }

    public var deliveryFee: Double {
        5.0 // Fixed delivery fee
    }

    public var displayDeliveryFee: String {
        deliveryFee.asCurrency
    }

    public var total: Double {
        subtotal + deliveryFee
    }

    public var displayTotal: String {
        total.asCurrency
    }

    // MARK: - Mutations
    public mutating func add(_ product: Product, quantity: Int = 1) {
        // Check if product is from same shop
        if let currentShopId = shopId, currentShopId != product.shopId {
            // Clear cart if different shop
            items.removeAll()
        }

        // Update shop info
        shopId = product.shopId
        shopName = product.shopName

        // Check if product already in cart
        if let index = items.firstIndex(where: { $0.product.id == product.id }) {
            items[index].quantity += quantity
        } else {
            items.append(CartItem(product: product, quantity: quantity))
        }
    }

    public mutating func remove(_ productId: String) {
        items.removeAll { $0.product.id == productId }
        if items.isEmpty {
            shopId = nil
            shopName = nil
        }
    }

    public mutating func updateQuantity(_ productId: String, quantity: Int) {
        if let index = items.firstIndex(where: { $0.product.id == productId }) {
            if quantity <= 0 {
                items.remove(at: index)
            } else {
                items[index].quantity = min(quantity, items[index].maxQuantity)
            }
        }
        if items.isEmpty {
            shopId = nil
            shopName = nil
        }
    }

    public mutating func clear() {
        items.removeAll()
        shopId = nil
        shopName = nil
    }

    public func toOrderItems() -> [OrderItem] {
        items.map { $0.toOrderItem() }
    }
}
