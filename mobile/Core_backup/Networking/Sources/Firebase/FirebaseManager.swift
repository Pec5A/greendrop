import Foundation
import FirebaseCore
import FirebaseAuth
import FirebaseFirestore

// MARK: - Firebase Manager
public final class FirebaseManager {
    public static let shared = FirebaseManager()

    public let auth: Auth
    public let firestore: Firestore

    private init() {
        // Note: FirebaseApp.configure() must be called in the App's init
        self.auth = Auth.auth()
        self.firestore = Firestore.firestore()
    }

    public static func configure() {
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
    }
}

// MARK: - Collection References
public extension FirebaseManager {
    var usersCollection: CollectionReference {
        firestore.collection("users")
    }

    var ordersCollection: CollectionReference {
        firestore.collection("orders")
    }

    var shopsCollection: CollectionReference {
        firestore.collection("shops")
    }

    var productsCollection: CollectionReference {
        firestore.collection("products")
    }

    var driversCollection: CollectionReference {
        firestore.collection("drivers")
    }

    var notificationsCollection: CollectionReference {
        firestore.collection("notifications")
    }
}
