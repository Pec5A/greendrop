import Foundation
import FirebaseFirestore
import Domain
import Common

// MARK: - Shop Service
public final class ShopService: ObservableObject {
    public static let shared = ShopService()

    @Published public private(set) var shops: [Shop] = []
    @Published public private(set) var isLoading = false
    @Published public private(set) var error: AppError?

    private let firestore = FirebaseManager.shared.firestore
    private var listener: ListenerRegistration?

    private init() {}

    deinit {
        listener?.remove()
    }

    // MARK: - Fetch All Shops
    @MainActor
    public func fetchShops() async {
        isLoading = true
        error = nil

        do {
            let snapshot = try await firestore.collection("shops")
                .whereField("status", isEqualTo: "active")
                .getDocuments()

            shops = snapshot.documents.compactMap { doc in
                Shop(id: doc.documentID, data: doc.data())
            }
            isLoading = false
        } catch {
            self.error = .network(error.localizedDescription)
            isLoading = false
        }
    }

    // MARK: - Fetch Shops with Location Filter
    @MainActor
    public func fetchShops(near location: GeoLocation, radiusKm: Double = 10.0) async {
        isLoading = true
        error = nil

        do {
            let snapshot = try await firestore.collection("shops")
                .whereField("status", isEqualTo: "active")
                .getDocuments()

            var fetchedShops = snapshot.documents.compactMap { doc in
                Shop(id: doc.documentID, data: doc.data())
            }

            // Calculate distance and filter
            fetchedShops = fetchedShops.compactMap { shop in
                guard let shopLocation = shop.location else { return nil }
                let distance = location.distance(to: shopLocation)
                guard distance <= radiusKm else { return nil }
                var shopWithDistance = shop
                shopWithDistance.distance = distance
                return shopWithDistance
            }.sorted { ($0.distance ?? 0) < ($1.distance ?? 0) }

            shops = fetchedShops
            isLoading = false
        } catch {
            self.error = .network(error.localizedDescription)
            isLoading = false
        }
    }

    // MARK: - Subscribe to Shops (Real-time)
    public func subscribeToShops() {
        listener?.remove()

        listener = firestore.collection("shops")
            .whereField("status", isEqualTo: "active")
            .addSnapshotListener { [weak self] snapshot, error in
                if let error = error {
                    self?.error = .network(error.localizedDescription)
                    return
                }

                guard let documents = snapshot?.documents else { return }

                DispatchQueue.main.async {
                    self?.shops = documents.compactMap { doc in
                        Shop(id: doc.documentID, data: doc.data())
                    }
                }
            }
    }

    // MARK: - Get Shop by ID
    public func getShop(id: String) async throws -> Shop? {
        let document = try await firestore.collection("shops").document(id).getDocument()
        guard let data = document.data() else { return nil }
        return Shop(id: id, data: data)
    }

    // MARK: - Search Shops
    @MainActor
    public func searchShops(query: String) async {
        isLoading = true
        error = nil

        do {
            let snapshot = try await firestore.collection("shops")
                .whereField("status", isEqualTo: "active")
                .getDocuments()

            let queryLower = query.lowercased()
            shops = snapshot.documents.compactMap { doc in
                Shop(id: doc.documentID, data: doc.data())
            }.filter { shop in
                shop.name.lowercased().contains(queryLower) ||
                shop.address.lowercased().contains(queryLower) ||
                shop.categories.contains { $0.lowercased().contains(queryLower) }
            }

            isLoading = false
        } catch {
            self.error = .network(error.localizedDescription)
            isLoading = false
        }
    }

    // MARK: - Stop Listening
    public func stopListening() {
        listener?.remove()
        listener = nil
    }
}
