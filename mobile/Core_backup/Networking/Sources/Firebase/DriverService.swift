import Foundation
import FirebaseFirestore
import Domain
import Common

// MARK: - Driver Service
public final class DriverService: ObservableObject {
    public static let shared = DriverService()

    @Published public private(set) var driverProfile: Driver?
    @Published public private(set) var assignedOrders: [Order] = []
    @Published public private(set) var currentDelivery: Order?
    @Published public private(set) var isLoading = false
    @Published public private(set) var error: AppError?

    private let firestore = FirebaseManager.shared.firestore
    private var profileListener: ListenerRegistration?
    private var ordersListener: ListenerRegistration?
    private var deliveryListener: ListenerRegistration?

    private init() {}

    deinit {
        profileListener?.remove()
        ordersListener?.remove()
        deliveryListener?.remove()
    }

    // MARK: - Fetch Driver Profile
    @MainActor
    public func fetchDriverProfile(userId: String) async {
        isLoading = true
        error = nil

        do {
            // Driver document ID might be same as user ID or different
            // First try to find by userId field
            let snapshot = try await firestore.collection("drivers")
                .whereField("userId", isEqualTo: userId)
                .limit(to: 1)
                .getDocuments()

            if let doc = snapshot.documents.first {
                driverProfile = Driver(id: doc.documentID, data: doc.data())
            } else {
                // Try direct document lookup
                let document = try await firestore.collection("drivers").document(userId).getDocument()
                if let data = document.data() {
                    driverProfile = Driver(id: userId, data: data)
                }
            }
            isLoading = false
        } catch {
            self.error = .network(error.localizedDescription)
            isLoading = false
        }
    }

    // MARK: - Subscribe to Driver Profile (Real-time)
    public func subscribeToProfile(driverId: String) {
        profileListener?.remove()

        profileListener = firestore.collection("drivers").document(driverId)
            .addSnapshotListener { [weak self] snapshot, error in
                if let error = error {
                    DispatchQueue.main.async {
                        self?.error = .network(error.localizedDescription)
                    }
                    return
                }

                guard let data = snapshot?.data() else { return }

                DispatchQueue.main.async {
                    self?.driverProfile = Driver(id: driverId, data: data)
                }
            }
    }

    // MARK: - Update Location
    @MainActor
    public func updateLocation(driverId: String, latitude: Double, longitude: Double, heading: Double? = nil, speed: Double? = nil) async throws {
        var locationData: [String: Any] = [
            "lat": latitude,
            "lng": longitude,
            "updatedAt": FieldValue.serverTimestamp()
        ]
        if let heading = heading { locationData["heading"] = heading }
        if let speed = speed { locationData["speed"] = speed }

        try await firestore.collection("drivers").document(driverId).updateData([
            "location": locationData,
            "lastSeenAt": FieldValue.serverTimestamp()
        ])
    }

    // MARK: - Update Status
    @MainActor
    public func updateStatus(driverId: String, status: Constants.DriverStatus) async throws {
        try await firestore.collection("drivers").document(driverId).updateData([
            "status": status.rawValue,
            "lastSeenAt": FieldValue.serverTimestamp()
        ])

        // Update local profile
        if var profile = driverProfile {
            profile = Driver(
                id: profile.id,
                userId: profile.userId,
                name: profile.name,
                email: profile.email,
                phone: profile.phone,
                status: status.rawValue,
                vehicleType: profile.vehicleType,
                vehiclePlate: profile.vehiclePlate,
                avatar: profile.avatar,
                rating: profile.rating,
                completedDeliveries: profile.completedDeliveries,
                currentOrderId: profile.currentOrderId,
                location: profile.location,
                lastSeenAt: Date()
            )
            driverProfile = profile
        }
    }

    // MARK: - Subscribe to Assigned Orders (Real-time)
    public func subscribeToAssignedOrders(driverId: String) {
        ordersListener?.remove()

        ordersListener = firestore.collection("orders")
            .whereField("driverId", isEqualTo: driverId)
            .whereField("status", in: ["confirmed", "preparing", "ready", "delivering"])
            .addSnapshotListener { [weak self] snapshot, error in
                if let error = error {
                    DispatchQueue.main.async {
                        self?.error = .network(error.localizedDescription)
                    }
                    return
                }

                guard let documents = snapshot?.documents else { return }

                DispatchQueue.main.async {
                    self?.assignedOrders = documents.compactMap { doc in
                        Order(id: doc.documentID, data: doc.data())
                    }.sorted { ($0.createdAt ?? Date()) > ($1.createdAt ?? Date()) }
                }
            }
    }

    // MARK: - Subscribe to Available Orders (for accepting)
    public func subscribeToAvailableOrders(completion: @escaping ([Order]) -> Void) -> ListenerRegistration {
        return firestore.collection("orders")
            .whereField("status", in: ["paid", "confirmed"])
            .whereField("driverId", isEqualTo: NSNull())
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents else {
                    completion([])
                    return
                }

                let orders = documents.compactMap { doc in
                    Order(id: doc.documentID, data: doc.data())
                }
                completion(orders)
            }
    }

    // MARK: - Accept Order
    @MainActor
    public func acceptOrder(orderId: String, driverId: String, driverName: String, driverPhone: String) async throws {
        let batch = firestore.batch()

        let orderRef = firestore.collection("orders").document(orderId)
        batch.updateData([
            "driverId": driverId,
            "driverName": driverName,
            "driverPhone": driverPhone,
            "status": "delivering",
            "updatedAt": FieldValue.serverTimestamp()
        ], forDocument: orderRef)

        let driverRef = firestore.collection("drivers").document(driverId)
        batch.updateData([
            "currentOrderId": orderId,
            "status": "busy",
            "lastSeenAt": FieldValue.serverTimestamp()
        ], forDocument: driverRef)

        try await batch.commit()
    }

    // MARK: - Complete Delivery
    @MainActor
    public func completeDelivery(orderId: String, driverId: String, deliveryPhoto: String? = nil) async throws {
        let batch = firestore.batch()

        var orderUpdates: [String: Any] = [
            "status": "delivered",
            "deliveredAt": FieldValue.serverTimestamp(),
            "updatedAt": FieldValue.serverTimestamp()
        ]
        if let photo = deliveryPhoto {
            orderUpdates["deliveryPhoto"] = photo
        }

        let orderRef = firestore.collection("orders").document(orderId)
        batch.updateData(orderUpdates, forDocument: orderRef)

        let driverRef = firestore.collection("drivers").document(driverId)
        batch.updateData([
            "currentOrderId": NSNull(),
            "status": "online",
            "completedDeliveries": FieldValue.increment(Int64(1)),
            "lastSeenAt": FieldValue.serverTimestamp()
        ], forDocument: driverRef)

        try await batch.commit()
    }

    // MARK: - Subscribe to Current Delivery
    public func subscribeToCurrentDelivery(orderId: String) {
        deliveryListener?.remove()

        deliveryListener = firestore.collection("orders").document(orderId)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let data = snapshot?.data() else { return }

                DispatchQueue.main.async {
                    self?.currentDelivery = Order(id: orderId, data: data)
                }
            }
    }

    // MARK: - Stop Listening
    public func stopListening() {
        profileListener?.remove()
        profileListener = nil
        ordersListener?.remove()
        ordersListener = nil
        deliveryListener?.remove()
        deliveryListener = nil
    }
}
