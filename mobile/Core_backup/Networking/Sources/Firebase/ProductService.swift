import Foundation
import FirebaseFirestore
import Domain
import Common

// MARK: - Product Service
public final class ProductService: ObservableObject {
    public static let shared = ProductService()

    @Published public private(set) var products: [Product] = []
    @Published public private(set) var isLoading = false
    @Published public private(set) var error: AppError?

    private let firestore = FirebaseManager.shared.firestore
    private var listener: ListenerRegistration?

    private init() {}

    deinit {
        listener?.remove()
    }

    // MARK: - Fetch Products for Shop
    @MainActor
    public func fetchProducts(shopId: String) async {
        isLoading = true
        error = nil

        do {
            let snapshot = try await firestore.collection("products")
                .whereField("shopId", isEqualTo: shopId)
                .whereField("status", isEqualTo: "active")
                .getDocuments()

            products = snapshot.documents.compactMap { doc in
                Product(id: doc.documentID, data: doc.data())
            }.sorted { $0.featured && !$1.featured }

            isLoading = false
        } catch {
            self.error = .network(error.localizedDescription)
            isLoading = false
        }
    }

    // MARK: - Subscribe to Products (Real-time)
    public func subscribeToProducts(shopId: String) {
        listener?.remove()

        listener = firestore.collection("products")
            .whereField("shopId", isEqualTo: shopId)
            .whereField("status", isEqualTo: "active")
            .addSnapshotListener { [weak self] snapshot, error in
                if let error = error {
                    self?.error = .network(error.localizedDescription)
                    return
                }

                guard let documents = snapshot?.documents else { return }

                DispatchQueue.main.async {
                    self?.products = documents.compactMap { doc in
                        Product(id: doc.documentID, data: doc.data())
                    }.sorted { $0.featured && !$1.featured }
                }
            }
    }

    // MARK: - Get Product by ID
    public func getProduct(id: String) async throws -> Product? {
        let document = try await firestore.collection("products").document(id).getDocument()
        guard let data = document.data() else { return nil }
        return Product(id: id, data: data)
    }

    // MARK: - Search Products
    @MainActor
    public func searchProducts(shopId: String, query: String) async {
        isLoading = true
        error = nil

        do {
            let snapshot = try await firestore.collection("products")
                .whereField("shopId", isEqualTo: shopId)
                .whereField("status", isEqualTo: "active")
                .getDocuments()

            let queryLower = query.lowercased()
            products = snapshot.documents.compactMap { doc in
                Product(id: doc.documentID, data: doc.data())
            }.filter { product in
                product.name.lowercased().contains(queryLower) ||
                product.description.lowercased().contains(queryLower) ||
                product.category.lowercased().contains(queryLower)
            }

            isLoading = false
        } catch {
            self.error = .network(error.localizedDescription)
            isLoading = false
        }
    }

    // MARK: - Filter by Category
    @MainActor
    public func filterByCategory(shopId: String, category: String) async {
        isLoading = true
        error = nil

        do {
            let snapshot = try await firestore.collection("products")
                .whereField("shopId", isEqualTo: shopId)
                .whereField("status", isEqualTo: "active")
                .whereField("category", isEqualTo: category)
                .getDocuments()

            products = snapshot.documents.compactMap { doc in
                Product(id: doc.documentID, data: doc.data())
            }

            isLoading = false
        } catch {
            self.error = .network(error.localizedDescription)
            isLoading = false
        }
    }

    // MARK: - Get Categories for Shop
    public func getCategories(shopId: String) async throws -> [String] {
        let snapshot = try await firestore.collection("products")
            .whereField("shopId", isEqualTo: shopId)
            .whereField("status", isEqualTo: "active")
            .getDocuments()

        let categories = Set(snapshot.documents.compactMap { doc in
            doc.data()["category"] as? String
        })

        return Array(categories).sorted()
    }

    // MARK: - Stop Listening
    public func stopListening() {
        listener?.remove()
        listener = nil
    }

    // MARK: - Clear Products
    @MainActor
    public func clearProducts() {
        products = []
    }
}
