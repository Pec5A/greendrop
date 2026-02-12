import Foundation
import FirebaseFirestore
import Domain
import Common

// MARK: - Order Service
public final class OrderService: ObservableObject {
    public static let shared = OrderService()

    @Published public private(set) var orders: [Order] = []
    @Published public private(set) var currentOrder: Order?
    @Published public private(set) var isLoading = false
    @Published public private(set) var error: AppError?

    private let firestore = FirebaseManager.shared.firestore
    private var ordersListener: ListenerRegistration?
    private var orderListener: ListenerRegistration?

    private init() {}

    deinit {
        ordersListener?.remove()
        orderListener?.remove()
    }

    // MARK: - Fetch My Orders
    @MainActor
    public func fetchMyOrders(userId: String) async {
        isLoading = true
        error = nil

        do {
            let snapshot = try await firestore.collection("orders")
                .whereField("userId", isEqualTo: userId)
                .order(by: "createdAt", descending: true)
                .getDocuments()

            orders = snapshot.documents.compactMap { doc in
                Order(id: doc.documentID, data: doc.data())
            }
            isLoading = false
        } catch {
            self.error = .network(error.localizedDescription)
            isLoading = false
        }
    }

    // MARK: - Subscribe to My Orders (Real-time)
    public func subscribeToMyOrders(userId: String) {
        ordersListener?.remove()

        ordersListener = firestore.collection("orders")
            .whereField("userId", isEqualTo: userId)
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { [weak self] snapshot, error in
                if let error = error {
                    DispatchQueue.main.async {
                        self?.error = .network(error.localizedDescription)
                    }
                    return
                }

                guard let documents = snapshot?.documents else { return }

                DispatchQueue.main.async {
                    self?.orders = documents.compactMap { doc in
                        Order(id: doc.documentID, data: doc.data())
                    }
                }
            }
    }

    // MARK: - Subscribe to Single Order (Real-time tracking)
    public func subscribeToOrder(orderId: String) {
        orderListener?.remove()

        orderListener = firestore.collection("orders").document(orderId)
            .addSnapshotListener { [weak self] snapshot, error in
                if let error = error {
                    DispatchQueue.main.async {
                        self?.error = .network(error.localizedDescription)
                    }
                    return
                }

                guard let data = snapshot?.data() else { return }

                DispatchQueue.main.async {
                    self?.currentOrder = Order(id: orderId, data: data)
                }
            }
    }

    // MARK: - Get Order by ID
    public func getOrder(id: String) async throws -> Order? {
        let document = try await firestore.collection("orders").document(id).getDocument()
        guard let data = document.data() else { return nil }
        return Order(id: id, data: data)
    }

    // MARK: - Create Order
    @MainActor
    public func createOrder(
        userId: String,
        shopId: String,
        items: [OrderItem],
        deliveryAddress: String,
        deliveryLocation: GeoLocation,
        paymentMethod: String = "cash",
        notes: String? = nil
    ) async throws -> Order {
        isLoading = true
        error = nil

        let orderRef = firestore.collection("orders").document()
        let deliveryFee = 5.0
        let subtotal = items.reduce(0) { $0 + ($1.price * Double($1.quantity)) }
        let total = subtotal + deliveryFee

        let orderData: [String: Any] = [
            "id": orderRef.documentID,
            "reference": "ORD-\(Int(Date().timeIntervalSince1970))",
            "userId": userId,
            "shopId": shopId,
            "items": items.map { [
                "id": $0.id,
                "productId": $0.productId,
                "productName": $0.productName,
                "quantity": $0.quantity,
                "price": $0.price,
                "imageUrl": $0.imageUrl as Any
            ]},
            "total": total,
            "deliveryFee": deliveryFee,
            "currency": "EUR",
            "status": "pending",
            "paymentMethod": paymentMethod,
            "paymentStatus": "pending",
            "deliveryAddress": deliveryAddress,
            "deliveryLocation": [
                "latitude": deliveryLocation.latitude,
                "longitude": deliveryLocation.longitude
            ],
            "notes": notes ?? "",
            "estimatedDeliveryTime": Date().addingTimeInterval(30 * 60), // +30 min
            "createdAt": FieldValue.serverTimestamp(),
            "updatedAt": FieldValue.serverTimestamp()
        ]

        do {
            try await orderRef.setData(orderData)

            let order = Order(
                id: orderRef.documentID,
                userId: userId,
                shopId: shopId,
                reference: orderData["reference"] as? String,
                status: "pending",
                total: total,
                deliveryFee: deliveryFee,
                currency: "EUR",
                items: items,
                paymentMethod: paymentMethod,
                paymentStatus: "pending",
                deliveryAddress: deliveryAddress,
                deliveryLocation: deliveryLocation,
                notes: notes,
                createdAt: Date()
            )

            isLoading = false
            return order
        } catch {
            isLoading = false
            throw AppError.network(error.localizedDescription)
        }
    }

    // MARK: - Cancel Order
    @MainActor
    public func cancelOrder(orderId: String) async throws {
        do {
            try await firestore.collection("orders").document(orderId).updateData([
                "status": "cancelled",
                "updatedAt": FieldValue.serverTimestamp()
            ])
        } catch {
            throw AppError.network(error.localizedDescription)
        }
    }

    // MARK: - Stop Listening
    public func stopListening() {
        ordersListener?.remove()
        ordersListener = nil
    }

    public func stopOrderListener() {
        orderListener?.remove()
        orderListener = nil
        currentOrder = nil
    }

    // MARK: - Get Active Orders
    public var activeOrders: [Order] {
        orders.filter { $0.isActive }
    }

    // MARK: - Get Past Orders
    public var pastOrders: [Order] {
        orders.filter { !$0.isActive }
    }
}
