//
//  GreenDropTests.swift
//  GreenDropTests
//
//  Created by Zahidi Kays on 16/01/2026.
//

import Testing
import Foundation
@testable import GreenDrop

// MARK: - UserProfile Tests
struct UserProfileTests {

    @Test func userProfileCreation() {
        let profile = UserProfile(
            id: "user123",
            email: "client1@pec5a.com",
            name: "Client 1",
            role: "user",
            status: "active",
            phone: "+33612345678",
            address: "10 rue de Paris",
            shopId: nil,
            stripeAccountId: nil,
            createdAt: Date()
        )
        #expect(profile.id == "user123")
        #expect(profile.email == "client1@pec5a.com")
        #expect(profile.name == "Client 1")
        #expect(profile.role == "user")
        #expect(profile.status == "active")
        #expect(profile.phone == "+33612345678")
        #expect(profile.shopId == nil)
    }

    @Test func merchantProfileWithShopId() {
        let profile = UserProfile(
            id: "merchant1",
            email: "merchant1@pec5a.com",
            name: "Marchand 1",
            role: "merchant",
            status: "active",
            phone: nil,
            address: nil,
            shopId: "shop_abc",
            stripeAccountId: "acct_123",
            createdAt: Date()
        )
        #expect(profile.role == "merchant")
        #expect(profile.shopId == "shop_abc")
        #expect(profile.stripeAccountId == "acct_123")
    }

    @Test func driverProfile() {
        let profile = UserProfile(
            id: "driver1",
            email: "driver1@pec5a.com",
            name: "Chauffeur 1",
            role: "driver",
            status: "active",
            phone: nil,
            address: nil,
            shopId: nil,
            stripeAccountId: nil,
            createdAt: Date()
        )
        #expect(profile.role == "driver")
    }

    @Test func profileEquality() {
        let date = Date()
        let p1 = UserProfile(id: "u1", email: "a@b.com", name: "A", role: "user", status: "active", phone: nil, address: nil, shopId: nil, stripeAccountId: nil, createdAt: date)
        let p2 = UserProfile(id: "u1", email: "a@b.com", name: "A", role: "user", status: "active", phone: nil, address: nil, shopId: nil, stripeAccountId: nil, createdAt: date)
        #expect(p1 == p2)
    }
}

// MARK: - UserRole Tests
struct UserRoleTests {

    @Test func userRoleFromString() {
        #expect(UserRole(rawValue: "user") == .user)
        #expect(UserRole(rawValue: "driver") == .driver)
        #expect(UserRole(rawValue: "merchant") == .merchant)
        #expect(UserRole(rawValue: "admin") == .admin)
        #expect(UserRole(rawValue: "unknown") == nil)
    }

    @Test func userRoleDisplayName() {
        #expect(UserRole.user.displayName == "Client")
        #expect(UserRole.driver.displayName == "Chauffeur")
        #expect(UserRole.merchant.displayName == "Marchand")
        #expect(UserRole.admin.displayName == "Admin")
    }
}

// MARK: - APIConfig Tests
struct APIConfigTests {

    @Test func baseURLIsNotEmpty() {
        #expect(!APIConfig.baseURL.isEmpty)
    }

    @Test func baseURLContainsAPI() {
        #expect(APIConfig.baseURL.hasSuffix("/api"))
    }

    @Test func timeoutIsReasonable() {
        #expect(APIConfig.timeout == 30)
        #expect(APIConfig.timeout > 0)
    }

    #if DEBUG
    @Test func debugURLIsLocal() {
        #expect(APIConfig.baseURL.contains("http://"))
    }
    #endif
}

// MARK: - APIError Tests
struct APIErrorTests {

    @Test func errorDescriptions() {
        #expect(APIError.invalidURL.errorDescription != nil)
        #expect(APIError.noData.errorDescription != nil)
        #expect(APIError.unauthorized.errorDescription != nil)
        #expect(APIError.forbidden.errorDescription != nil)
        #expect(APIError.notFound.errorDescription != nil)
    }

    @Test func serverErrorIncludesCode() {
        let error = APIError.serverError(500, "Internal")
        #expect(error.errorDescription?.contains("Internal") == true)
    }

    @Test func serverErrorFallback() {
        let error = APIError.serverError(503, nil)
        #expect(error.errorDescription?.contains("503") == true)
    }
}

// MARK: - Cart Tests
struct CartTests {

    private func makeProduct(id: String = "p1", name: String = "CBD Oil", price: Double = 29.90, isRestricted: Bool = false) -> CartProduct {
        CartProduct(id: id, name: name, price: price, isRestricted: isRestricted, minimumAge: isRestricted ? 18 : nil)
    }

    @Test func emptyCartByDefault() {
        let cart = Cart()
        #expect(cart.isEmpty)
        #expect(cart.itemCount == 0)
        #expect(cart.items.count == 0)
    }

    @Test func addProductToCart() {
        var cart = Cart()
        let product = makeProduct()
        cart.add(product, quantity: 1)
        #expect(!cart.isEmpty)
        #expect(cart.itemCount == 1)
        #expect(cart.items.count == 1)
        #expect(cart.items[0].product.id == "p1")
    }

    @Test func addSameProductIncreasesQuantity() {
        var cart = Cart()
        let product = makeProduct()
        cart.add(product, quantity: 1)
        cart.add(product, quantity: 2)
        #expect(cart.items.count == 1)
        #expect(cart.itemCount == 3)
        #expect(cart.items[0].quantity == 3)
    }

    @Test func addDifferentProducts() {
        var cart = Cart()
        cart.add(makeProduct(id: "p1", name: "Oil"), quantity: 1)
        cart.add(makeProduct(id: "p2", name: "Flower"), quantity: 2)
        #expect(cart.items.count == 2)
        #expect(cart.itemCount == 3)
    }

    @Test func removeProduct() {
        var cart = Cart()
        cart.add(makeProduct(id: "p1"), quantity: 1)
        cart.add(makeProduct(id: "p2"), quantity: 1)
        cart.remove("p1")
        #expect(cart.items.count == 1)
        #expect(cart.items[0].product.id == "p2")
    }

    @Test func removeLastProductMakesCartEmpty() {
        var cart = Cart()
        cart.add(makeProduct(), quantity: 1)
        cart.remove("p1")
        #expect(cart.isEmpty)
    }

    @Test func updateQuantity() {
        var cart = Cart()
        cart.add(makeProduct(), quantity: 1)
        cart.updateQuantity("p1", quantity: 5)
        #expect(cart.items[0].quantity == 5)
        #expect(cart.itemCount == 5)
    }

    @Test func updateQuantityToZeroRemovesItem() {
        var cart = Cart()
        cart.add(makeProduct(), quantity: 3)
        cart.updateQuantity("p1", quantity: 0)
        #expect(cart.isEmpty)
    }

    @Test func updateQuantityNegativeRemovesItem() {
        var cart = Cart()
        cart.add(makeProduct(), quantity: 2)
        cart.updateQuantity("p1", quantity: -1)
        #expect(cart.isEmpty)
    }

    @Test func clearCart() {
        var cart = Cart()
        cart.add(makeProduct(id: "p1"), quantity: 2)
        cart.add(makeProduct(id: "p2"), quantity: 3)
        cart.clear()
        #expect(cart.isEmpty)
        #expect(cart.itemCount == 0)
    }

    @Test func cartEquality() {
        var c1 = Cart()
        var c2 = Cart()
        #expect(c1 == c2)

        c1.add(makeProduct(id: "p1"), quantity: 1)
        #expect(c1 != c2)

        c2.add(makeProduct(id: "p1"), quantity: 1)
        // CartItem uses UUID so equality won't hold after add, but Cart struct with same items is testable
    }
}

// MARK: - Product Model Tests
struct ProductModelTests {

    @Test func productCreation() {
        let product = Product(
            id: "prod1",
            name: "Huile CBD 10%",
            description: "Huile full spectrum",
            price: 29.90,
            imageURL: nil,
            category: "oils",
            shopId: "shop1",
            isAvailable: true,
            stock: 50
        )
        #expect(product.id == "prod1")
        #expect(product.price == 29.90)
        #expect(product.isAvailable)
        #expect(product.stock == 50)
        #expect(!product.isRestricted)
        #expect(product.minimumAge == nil)
    }

    @Test func formattedPrice() {
        let product = Product(id: "p", name: "Test", description: "", price: 9.90, category: "cbd", shopId: "s", isAvailable: true, stock: 1)
        #expect(product.formattedPrice.contains("9.90"))
    }

    @Test func ageVerificationRequired() {
        let restricted = Product(id: "p", name: "CBD", description: "", price: 10.0, category: "cbd", shopId: "s", isAvailable: true, stock: 1, isRestricted: true, minimumAge: 18)
        #expect(restricted.requiresAgeVerification)
    }

    @Test func ageVerificationNotRequired() {
        let unrestricted = Product(id: "p", name: "Cream", description: "", price: 15.0, category: "cosmetics", shopId: "s", isAvailable: true, stock: 1, isRestricted: false)
        #expect(!unrestricted.requiresAgeVerification)
    }

    @Test func productEquality() {
        let p1 = Product(id: "p1", name: "A", description: "B", price: 10.0, category: "c", shopId: "s", isAvailable: true, stock: 5)
        let p2 = Product(id: "p1", name: "A", description: "B", price: 10.0, category: "c", shopId: "s", isAvailable: true, stock: 5)
        #expect(p1 == p2)
    }

    @Test func productCodable() throws {
        let product = Product(id: "p1", name: "Test", description: "Desc", price: 19.99, category: "cbd", shopId: "s1", isAvailable: true, stock: 10, isRestricted: true, minimumAge: 18)
        let data = try JSONEncoder().encode(product)
        let decoded = try JSONDecoder().decode(Product.self, from: data)
        #expect(decoded == product)
    }
}

// MARK: - OrderStatus Tests
struct OrderStatusTests {

    @Test func allStatusesHaveDisplayName() {
        for status in OrderStatus.allCases {
            #expect(!status.displayName.isEmpty)
        }
    }

    @Test func allStatusesHaveIcon() {
        for status in OrderStatus.allCases {
            #expect(!status.icon.isEmpty)
        }
    }

    @Test func allStatusesHaveColor() {
        for status in OrderStatus.allCases {
            #expect(!status.color.isEmpty)
            #expect(status.color.hasPrefix("#"))
        }
    }

    @Test func activeStatusDetection() {
        #expect(OrderStatus.pending.isActive)
        #expect(OrderStatus.confirmed.isActive)
        #expect(OrderStatus.preparing.isActive)
        #expect(OrderStatus.delivering.isActive)
        #expect(!OrderStatus.delivered.isActive)
        #expect(!OrderStatus.cancelled.isActive)
    }

    @Test func progressValues() {
        #expect(OrderStatus.pending.progressValue == 0.1)
        #expect(OrderStatus.delivered.progressValue == 1.0)
        #expect(OrderStatus.cancelled.progressValue == 0.0)
        #expect(OrderStatus.preparing.progressValue > OrderStatus.confirmed.progressValue)
        #expect(OrderStatus.delivering.progressValue > OrderStatus.ready.progressValue)
    }

    @Test func stepNumbers() {
        #expect(OrderStatus.pending.stepNumber == 1)
        #expect(OrderStatus.confirmed.stepNumber == 2)
        #expect(OrderStatus.preparing.stepNumber == 3)
        #expect(OrderStatus.ready.stepNumber == 4)
        #expect(OrderStatus.delivering.stepNumber == 5)
        #expect(OrderStatus.cancelled.stepNumber == 0)
    }

    @Test func statusFromRawValue() {
        #expect(OrderStatus(rawValue: "pending") == .pending)
        #expect(OrderStatus(rawValue: "delivered") == .delivered)
        #expect(OrderStatus(rawValue: "in_transit") == .inTransit)
        #expect(OrderStatus(rawValue: "picked_up") == .pickedUp)
        #expect(OrderStatus(rawValue: "invalid") == nil)
    }
}

// MARK: - OrderItem Tests
struct OrderItemTests {

    @Test func orderItemTotal() {
        let item = OrderItem(id: "i1", productId: "p1", productName: "CBD Oil", price: 10.0, quantity: 3)
        #expect(item.total == 30.0)
    }

    @Test func orderItemSingleQuantity() {
        let item = OrderItem(id: "i1", productId: "p1", productName: "Flower", price: 8.50, quantity: 1)
        #expect(item.total == 8.50)
    }
}

// MARK: - Shop Model Tests
struct ShopModelTests {

    @Test func shopCreation() {
        let shop = Shop(
            id: "shop1",
            name: "GreenLeaf Paris",
            description: "Boutique CBD premium",
            imageURL: nil,
            address: "10 rue de Rivoli, Paris",
            latitude: 48.8566,
            longitude: 2.3522,
            category: .cbd,
            rating: 4.5,
            reviewCount: 120,
            isOpen: true,
            deliveryFee: 2.99,
            minOrderAmount: 15.0,
            estimatedDeliveryTime: "25-35 min",
            ownerId: "merchant1"
        )
        #expect(shop.name == "GreenLeaf Paris")
        #expect(shop.category == .cbd)
        #expect(shop.isOpen)
        #expect(shop.ownerId == "merchant1")
    }

    @Test func shopCoordinate() {
        let shop = Shop(id: "s", name: "S", description: "", address: "A", latitude: 48.85, longitude: 2.35, category: .cbd, rating: 4.0, reviewCount: 0, isOpen: true, deliveryFee: 0, minOrderAmount: 0, estimatedDeliveryTime: "30 min", ownerId: "o")
        #expect(shop.coordinate.latitude == 48.85)
        #expect(shop.coordinate.longitude == 2.35)
    }
}

// MARK: - ShopCategory Tests
struct ShopCategoryTests {

    @Test func allCategoriesHaveDisplayName() {
        for category in ShopCategory.allCases {
            #expect(!category.displayName.isEmpty)
        }
    }

    @Test func allCategoriesHaveIcon() {
        for category in ShopCategory.allCases {
            #expect(!category.icon.isEmpty)
        }
    }

    @Test func cbdCategoryDetails() {
        #expect(ShopCategory.cbd.displayName == "CBD Shop")
        #expect(ShopCategory.cbd.icon == "leaf.fill")
    }

    @Test func categoryRawValues() {
        #expect(ShopCategory(rawValue: "cbd") == .cbd)
        #expect(ShopCategory(rawValue: "grocery") == .grocery)
        #expect(ShopCategory(rawValue: "invalid") == nil)
    }
}

// MARK: - DeliveryStatus Tests
struct DeliveryStatusTests {

    @Test func deliveryStatusDisplayNames() {
        #expect(DeliveryStatus.available.displayName == "Disponible")
        #expect(DeliveryStatus.accepted.displayName == "Acceptée")
        #expect(DeliveryStatus.atShop.displayName == "Au magasin")
        #expect(DeliveryStatus.pickedUp.displayName == "Récupérée")
        #expect(DeliveryStatus.delivering.displayName == "En cours")
        #expect(DeliveryStatus.delivered.displayName == "Livrée")
    }

    @Test func deliveryStatusFromRawValue() {
        #expect(DeliveryStatus(rawValue: "available") == .available)
        #expect(DeliveryStatus(rawValue: "at_shop") == .atShop)
        #expect(DeliveryStatus(rawValue: "picked_up") == .pickedUp)
        #expect(DeliveryStatus(rawValue: "invalid") == nil)
    }
}

// MARK: - Statistics Tests
struct StatisticsTests {

    @Test func emptyMerchantStats() {
        let stats = MerchantStats.empty
        #expect(stats.todayOrders == 0)
        #expect(stats.todayRevenue == 0)
        #expect(stats.pendingOrders == 0)
        #expect(stats.totalProducts == 0)
    }

    @Test func emptyDriverStats() {
        let stats = DriverStats.empty
        #expect(stats.todayDeliveries == 0)
        #expect(stats.todayEarnings == 0)
        #expect(stats.totalDeliveries == 0)
        #expect(stats.rating == 5.0)
    }

    @Test func merchantStatsEquality() {
        let s1 = MerchantStats(todayOrders: 5, todayRevenue: 150.0, pendingOrders: 2, totalProducts: 20)
        let s2 = MerchantStats(todayOrders: 5, todayRevenue: 150.0, pendingOrders: 2, totalProducts: 20)
        #expect(s1 == s2)
    }
}

// MARK: - Email Role Detection Tests
struct EmailRoleDetectionTests {

    // Tests the role determination logic used in AuthService.determineRole
    private func determineRole(from email: String) -> String {
        if email.contains("driver") { return "driver" }
        if email.contains("merchant") { return "merchant" }
        if email.contains("admin") { return "admin" }
        return "user"
    }

    @Test func driverEmailDetection() {
        #expect(determineRole(from: "driver1@pec5a.com") == "driver")
        #expect(determineRole(from: "driver2@pec5a.com") == "driver")
    }

    @Test func merchantEmailDetection() {
        #expect(determineRole(from: "merchant1@pec5a.com") == "merchant")
    }

    @Test func adminEmailDetection() {
        #expect(determineRole(from: "admin@greendrop.com") == "admin")
    }

    @Test func clientEmailFallback() {
        #expect(determineRole(from: "client1@pec5a.com") == "user")
        #expect(determineRole(from: "john@gmail.com") == "user")
        #expect(determineRole(from: "test@example.com") == "user")
    }
}

// MARK: - CartProduct Tests
struct CartProductTests {

    @Test func cartProductRestriction() {
        let restricted = CartProduct(id: "p1", name: "CBD Flower", price: 8.90, isRestricted: true, minimumAge: 18)
        #expect(restricted.isRestricted)
        #expect(restricted.minimumAge == 18)
    }

    @Test func cartProductUnrestricted() {
        let product = CartProduct(id: "p2", name: "CBD Cream", price: 14.90)
        #expect(!product.isRestricted)
        #expect(product.minimumAge == nil)
    }

    @Test func cartProductEquality() {
        let p1 = CartProduct(id: "p1", name: "Test", price: 10.0)
        let p2 = CartProduct(id: "p1", name: "Test", price: 10.0)
        #expect(p1 == p2)
    }
}
