import SwiftUI
import Foundation
import CoreLocation
import MapKit
import FirebaseCore
import FirebaseAuth
import FirebaseFirestore
import GoogleSignIn

// MARK: - Auth Service

/// Manages user authentication via Firebase Auth and Google Sign-In.
///
/// `AuthService` handles email/password and Google OAuth sign-in flows, manages
/// user profile loading from Firestore, and provides role-based account creation
/// for customers, merchants, and drivers. Includes a demo mode for development.
///
/// - Note: This is a singleton accessed via `AuthService.shared`. All methods
///   run on the main actor.
@MainActor
final class AuthService: ObservableObject {
    /// Shared singleton instance.
    static let shared = AuthService()

    /// The currently authenticated Firebase user, or `nil` if signed out.
    @Published private(set) var currentUser: FirebaseAuth.User?
    /// The loaded user profile from Firestore, or `nil` if not authenticated.
    @Published private(set) var userProfile: UserProfile?
    /// Whether an authentication operation is in progress.
    @Published private(set) var isLoading = true
    /// User-facing error message from the last failed auth operation.
    @Published var errorMessage: String?
    /// Whether the user needs to select a role (shown during new Google sign-up).
    @Published var needsRoleSelection = false

    /// Pending Google user ID stored while waiting for role selection.
    private var pendingGoogleUserId: String?
    /// Pending Google email stored while waiting for role selection.
    private var pendingGoogleEmail: String?
    /// Pending Google display name stored while waiting for role selection.
    private var pendingGoogleName: String?

    /// Flag to prevent the auth state listener from interfering during Google sign-in.
    private var isHandlingGoogleSignIn = false

    /// When `true`, bypasses Firebase Auth and uses mock data. For development only.
    private let demoMode = false

    /// Handle for the Firebase auth state change listener.
    private var authStateHandler: AuthStateDidChangeListenerHandle?
    /// Firestore database reference.
    private let db = Firestore.firestore()

    /// Whether the user is fully authenticated with a loaded profile.
    var isAuthenticated: Bool {
        userProfile != nil
    }

    private init() {
        if demoMode {
            isLoading = false
        } else {
            setupAuthStateListener()

            // Timeout: if Firebase doesn't respond in 5 seconds, stop loading
            Task { @MainActor in
                try? await Task.sleep(nanoseconds: 5_000_000_000)
                if self.isLoading {
                    self.isLoading = false
                }
            }
        }
    }

    private func setupAuthStateListener() {
        authStateHandler = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                self?.currentUser = user

                // Skip if Google sign-in is handling auth (avoids race condition)
                if self?.isHandlingGoogleSignIn == true {
                    return
                }

                // Skip if waiting for role selection (new Google user)
                if self?.needsRoleSelection == true {
                    self?.isLoading = false
                    return
                }

                if let user = user {
                    // Get ID token for API calls
                    if let token = try? await user.getIDToken() {
                        APIService.shared.setAuthToken(token)
                    }

                    // Skip if profile already loaded (signIn already fetched it)
                    if self?.userProfile?.id == user.uid {
                        self?.isLoading = false
                        return
                    }

                    // Fetch user profile from Firestore
                    await self?.fetchUserProfile(userId: user.uid, email: user.email ?? "")
                } else {
                    self?.userProfile = nil
                    APIService.shared.setAuthToken(nil)
                }

                self?.isLoading = false
            }
        }
    }

    /// Fetches the user profile from Firestore, falling back to a generated profile if unavailable.
    ///
    /// - Parameters:
    ///   - userId: The Firebase UID of the user.
    ///   - email: The user's email address (used for fallback profile generation).
    private func fetchUserProfile(userId: String, email: String) async {

        // Always create a fallback profile first
        let fallbackProfile = UserProfile(
            id: userId,
            email: email,
            name: email.components(separatedBy: "@").first?.capitalized ?? "User",
            role: determineRole(from: email),
            status: "active",
            phone: nil,
            address: nil,
            shopId: nil,
            stripeAccountId: nil,
            avatar: nil,
            createdAt: Date()
        )

        do {
            let document = try await db.collection("users").document(userId).getDocument()

            if document.exists, let data = document.data() {
                let loadedRole = data["role"] as? String ?? fallbackProfile.role
                userProfile = UserProfile(
                    id: userId,
                    email: data["email"] as? String ?? email,
                    name: data["name"] as? String ?? fallbackProfile.name,
                    role: loadedRole,
                    status: data["status"] as? String ?? "active",
                    phone: data["phone"] as? String,
                    address: data["address"] as? String,
                    shopId: data["shopId"] as? String,
                    stripeAccountId: data["stripeAccountId"] as? String,
                    avatar: data["avatar"] as? String,
                    createdAt: (data["createdAt"] as? Timestamp)?.dateValue() ?? Date()
                )
            } else {
                userProfile = fallbackProfile
            }
        } catch {
            userProfile = fallbackProfile
        }
    }

    /// Determines a user's role based on keywords in their email address.
    ///
    /// - Parameter email: The user's email address.
    /// - Returns: A role string ("driver", "merchant", "admin", or "user").
    private func determineRole(from email: String) -> String {
        if email.contains("driver") { return "driver" }
        if email.contains("merchant") { return "merchant" }
        if email.contains("admin") { return "admin" }
        return "user"
    }

    /// Signs in a user with email and password via Firebase Auth.
    ///
    /// On success, fetches the user's profile from Firestore and sets the API auth token.
    ///
    /// - Parameters:
    ///   - email: The user's email address.
    ///   - password: The user's password.
    /// - Throws: Firebase Auth errors if sign-in fails.
    func signIn(email: String, password: String) async throws {
        isLoading = true
        errorMessage = nil

        if demoMode {
            try await Task.sleep(nanoseconds: 500_000_000)
            userProfile = UserProfile(
                id: UUID().uuidString,
                email: email,
                name: email.components(separatedBy: "@").first?.capitalized ?? "User",
                role: determineRole(from: email),
                status: "active",
                phone: nil,
                address: nil,
                shopId: nil,
                stripeAccountId: nil,
                avatar: nil,
                createdAt: Date()
            )
            isLoading = false
            return
        }

        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            currentUser = result.user

            if let token = try? await result.user.getIDToken() {
                APIService.shared.setAuthToken(token)
            }

            // Fetch profile from Firestore
            await fetchUserProfile(userId: result.user.uid, email: email)
            isLoading = false
        } catch {
            isLoading = false
            errorMessage = mapAuthError(error)
            throw error
        }
    }

    /// Signs in a user using Google OAuth via Firebase Auth.
    ///
    /// For new users (no Firestore document), sets `needsRoleSelection` to `true` and
    /// stores pending Google user data until `completeGoogleSignUp(role:)` is called.
    /// For existing users, loads the profile from Firestore immediately.
    ///
    /// - Throws: An error if Google Sign-In or Firebase Auth fails.
    func signInWithGoogle() async throws {
        isLoading = true
        errorMessage = nil
        isHandlingGoogleSignIn = true

        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            isLoading = false
            isHandlingGoogleSignIn = false
            throw NSError(domain: "AuthService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Impossible de trouver la fenêtre principale"])
        }

        guard let clientID = FirebaseApp.app()?.options.clientID else {
            isLoading = false
            isHandlingGoogleSignIn = false
            throw NSError(domain: "AuthService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Configuration Google Sign-In manquante"])
        }

        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config

        do {
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController)
            guard let idToken = result.user.idToken?.tokenString else {
                isLoading = false
                isHandlingGoogleSignIn = false
                throw NSError(domain: "AuthService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Token Google manquant"])
            }

            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken,
                accessToken: result.user.accessToken.tokenString
            )

            let authResult = try await Auth.auth().signIn(with: credential)
            currentUser = authResult.user

            if let token = try? await authResult.user.getIDToken() {
                APIService.shared.setAuthToken(token)
            }

            // Check if user doc exists in Firestore
            let userDoc = try? await db.collection("users").document(authResult.user.uid).getDocument()
            if userDoc == nil || !(userDoc?.exists ?? false) {
                // New user — store pending data and ask for role selection
                pendingGoogleUserId = authResult.user.uid
                pendingGoogleEmail = authResult.user.email ?? ""
                pendingGoogleName = authResult.user.displayName ?? "User"
                isHandlingGoogleSignIn = false
                needsRoleSelection = true
                isLoading = false
            } else {
                // Existing user — fetch profile normally
                isHandlingGoogleSignIn = false
                await fetchUserProfile(userId: authResult.user.uid, email: authResult.user.email ?? "")
                isLoading = false
            }
        } catch {
            isLoading = false
            isHandlingGoogleSignIn = false
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Completes the Google sign-up flow by creating the user profile with the selected role.
    ///
    /// Creates the user document in Firestore and, depending on the role, creates
    /// associated shop (merchant) or driver documents. Called after the user selects
    /// their role during a new Google sign-up.
    ///
    /// - Parameter role: The selected role ("user", "merchant", or "driver").
    /// - Throws: An error if Firestore operations fail.
    func completeGoogleSignUp(role: String) async throws {
        guard let userId = pendingGoogleUserId,
              let email = pendingGoogleEmail,
              let name = pendingGoogleName else {
            throw NSError(domain: "AuthService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Données Google manquantes"])
        }

        isLoading = true
        errorMessage = nil

        do {
            var userData: [String: Any] = [
                "email": email,
                "name": name,
                "role": role,
                "status": "active",
                "createdAt": Timestamp(date: Date())
            ]

            var shopId: String? = nil

            if role == "merchant" {
                let shopData: [String: Any] = [
                    "ownerId": userId,
                    "ownerName": name,
                    "name": "\(name) - Boutique",
                    "description": "",
                    "status": "active",
                    "approvalStatus": "approved",
                    "address": "",
                    "category": "grocery",
                    "location": ["latitude": 48.8566, "longitude": 2.3522],
                    "deliveryFee": 2.99,
                    "minOrderAmount": 10.0,
                    "estimatedDeliveryTime": "20-30 min",
                    "rating": 0.0,
                    "totalOrders": 0,
                    "totalProducts": 0,
                    "createdAt": Timestamp(date: Date()),
                    "updatedAt": Timestamp(date: Date())
                ]
                let shopRef = try await db.collection("shops").addDocument(data: shopData)
                shopId = shopRef.documentID
                userData["shopId"] = shopRef.documentID
            } else if role == "driver" {
                let driverData: [String: Any] = [
                    "id": userId,
                    "driverId": userId,
                    "name": name,
                    "email": email,
                    "phone": "",
                    "status": "offline",
                    "vehicleType": "moto",
                    "vehiclePlate": "",
                    "rating": 5.0,
                    "completedDeliveries": 0,
                    "isAvailable": false,
                    "location": ["lat": 48.8566, "lng": 2.3522, "updatedAt": Date().ISO8601Format()],
                    "lastSeenAt": Date().ISO8601Format(),
                    "createdAt": Timestamp(date: Date())
                ]
                try await db.collection("drivers").document(userId).setData(driverData)
            }

            try await db.collection("users").document(userId).setData(userData)

            userProfile = UserProfile(
                id: userId,
                email: email,
                name: name,
                role: role,
                status: "active",
                phone: nil,
                address: nil,
                shopId: shopId,
                stripeAccountId: nil,
                avatar: nil,
                createdAt: Date()
            )

            // Clear pending data
            pendingGoogleUserId = nil
            pendingGoogleEmail = nil
            pendingGoogleName = nil
            needsRoleSelection = false
            isLoading = false
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Creates a new user account with email and password via Firebase Auth.
    ///
    /// Creates the Firebase Auth user, sets the display name, stores the user profile
    /// in Firestore, and creates role-specific documents (shop for merchants, driver
    /// profile for drivers).
    ///
    /// - Parameters:
    ///   - email: The user's email address.
    ///   - password: The user's password (minimum 6 characters).
    ///   - name: The user's display name.
    ///   - role: The user's role. Defaults to `"user"`. Valid values: "user", "merchant", "driver".
    /// - Throws: Firebase Auth errors if account creation fails.
    func signUp(email: String, password: String, name: String, role: String = "user") async throws {
        isLoading = true
        errorMessage = nil

        if demoMode {
            try await Task.sleep(nanoseconds: 500_000_000)
            userProfile = UserProfile(
                id: UUID().uuidString,
                email: email,
                name: name,
                role: role,
                status: "active",
                phone: nil,
                address: nil,
                shopId: nil,
                stripeAccountId: nil,
                avatar: nil,
                createdAt: Date()
            )
            isLoading = false
            return
        }

        do {
            let result = try await Auth.auth().createUser(withEmail: email, password: password)
            currentUser = result.user

            let changeRequest = result.user.createProfileChangeRequest()
            changeRequest.displayName = name
            try? await changeRequest.commitChanges()

            if let token = try? await result.user.getIDToken() {
                APIService.shared.setAuthToken(token)
            }

            var userData: [String: Any] = [
                "email": email,
                "name": name,
                "role": role,
                "status": "active",
                "createdAt": Timestamp(date: Date())
            ]

            var shopId: String? = nil

            // Create associated documents based on role
            if role == "merchant" {
                // Create a shop document for the merchant
                let shopData: [String: Any] = [
                    "ownerId": result.user.uid,
                    "ownerName": name,
                    "name": "\(name) - Boutique",
                    "description": "",
                    "status": "active",
                    "approvalStatus": "approved",
                    "address": "",
                    "category": "grocery",
                    "location": ["latitude": 48.8566, "longitude": 2.3522],
                    "deliveryFee": 2.99,
                    "minOrderAmount": 10.0,
                    "estimatedDeliveryTime": "20-30 min",
                    "rating": 0.0,
                    "totalOrders": 0,
                    "totalProducts": 0,
                    "createdAt": Timestamp(date: Date()),
                    "updatedAt": Timestamp(date: Date())
                ]
                let shopRef = try await db.collection("shops").addDocument(data: shopData)
                shopId = shopRef.documentID
                userData["shopId"] = shopRef.documentID
            } else if role == "driver" {
                // Create a driver document
                let driverData: [String: Any] = [
                    "id": result.user.uid,
                    "driverId": result.user.uid,
                    "name": name,
                    "email": email,
                    "phone": "",
                    "status": "offline",
                    "vehicleType": "moto",
                    "vehiclePlate": "",
                    "rating": 5.0,
                    "completedDeliveries": 0,
                    "isAvailable": false,
                    "location": ["lat": 48.8566, "lng": 2.3522, "updatedAt": Date().ISO8601Format()],
                    "lastSeenAt": Date().ISO8601Format(),
                    "createdAt": Timestamp(date: Date())
                ]
                try await db.collection("drivers").document(result.user.uid).setData(driverData)
            }

            try await db.collection("users").document(result.user.uid).setData(userData)

            let newProfile = UserProfile(
                id: result.user.uid,
                email: email,
                name: name,
                role: role,
                status: "active",
                phone: nil,
                address: nil,
                shopId: shopId,
                stripeAccountId: nil,
                avatar: nil,
                createdAt: Date()
            )

            userProfile = newProfile
            isLoading = false
        } catch {
            isLoading = false
            errorMessage = mapAuthError(error)
            throw error
        }
    }

    /// Signs out the current user from Firebase Auth and clears all local state.
    ///
    /// - Throws: An error if Firebase sign-out fails.
    func signOut() throws {
        if !demoMode {
            try Auth.auth().signOut()
        }
        currentUser = nil
        userProfile = nil
        needsRoleSelection = false
        isHandlingGoogleSignIn = false
        pendingGoogleUserId = nil
        pendingGoogleEmail = nil
        pendingGoogleName = nil
        APIService.shared.setAuthToken(nil)
    }

    /// Updates the user's profile locally and persists changes to Firestore.
    ///
    /// - Parameters:
    ///   - name: Updated display name.
    ///   - phone: Updated phone number.
    ///   - address: Updated address.
    func updateProfile(name: String, phone: String, address: String) {
        guard var profile = userProfile else { return }
        profile.name = name
        profile.phone = phone
        profile.address = address
        userProfile = profile

        // Update in Firestore
        Task {
            try? await db.collection("users").document(profile.id).updateData([
                "name": name,
                "phone": phone,
                "address": address
            ])
        }
    }

    /// Updates the user's avatar URL locally and persists to Firestore.
    func updateAvatar(_ avatarURL: String) {
        guard var profile = userProfile else { return }
        profile.avatar = avatarURL
        userProfile = profile

        Task {
            try? await db.collection("users").document(profile.id).updateData([
                "avatar": avatarURL
            ])
        }
    }

    /// Forces a refresh of the Firebase ID token and updates the API service.
    func refreshToken() async {
        guard let user = currentUser else { return }
        if let token = try? await user.getIDToken(forcingRefresh: true) {
            APIService.shared.setAuthToken(token)
        }
    }

    /// Maps Firebase Auth error codes to localized French error messages.
    ///
    /// - Parameter error: The Firebase Auth error.
    /// - Returns: A French error message string suitable for display.
    private func mapAuthError(_ error: Error) -> String {
        let nsError = error as NSError
        switch nsError.code {
        case AuthErrorCode.wrongPassword.rawValue:
            return "Mot de passe incorrect"
        case AuthErrorCode.invalidEmail.rawValue:
            return "Email invalide"
        case AuthErrorCode.userNotFound.rawValue:
            return "Utilisateur non trouvé"
        case AuthErrorCode.emailAlreadyInUse.rawValue:
            return "Cet email est déjà utilisé"
        case AuthErrorCode.weakPassword.rawValue:
            return "Mot de passe trop faible (min 6 caractères)"
        case AuthErrorCode.networkError.rawValue:
            return "Erreur réseau"
        case AuthErrorCode.invalidCredential.rawValue:
            return "Email ou mot de passe incorrect"
        default:
            return "Erreur: \(error.localizedDescription)"
        }
    }
}

// MARK: - User Profile Model

/// Represents a user's profile as stored in Firestore.
///
/// Contains identity, role, and optional merchant/driver-specific fields.
/// The `role` field determines which UI flow the user sees after authentication.
struct UserProfile: Equatable {
    /// Firebase UID of the user.
    let id: String
    /// The user's email address.
    var email: String
    /// Display name of the user.
    var name: String
    /// The user's role in the platform ("user", "merchant", "driver", or "admin").
    var role: String
    /// Account status (e.g., "active", "suspended").
    var status: String
    /// Optional phone number.
    var phone: String?
    /// Optional street address.
    var address: String?
    /// The Firestore document ID of the user's shop, if the user is a merchant.
    var shopId: String?
    /// The user's Stripe Connect account ID, if onboarded.
    var stripeAccountId: String?
    /// Optional URL string for the user's profile avatar.
    var avatar: String?
    /// Timestamp when the user account was created.
    var createdAt: Date?
}

// MARK: - Data Service (Firebase Firestore)

/// Central data service for reading and writing shops, products, orders, and deliveries
/// to Firebase Firestore.
///
/// `DataService` provides both one-shot fetches and real-time snapshot listeners for
/// orders and deliveries. It also manages the local in-memory cache of all domain objects
/// and notifies the UI via `@Published` properties.
///
/// - Note: This is a singleton accessed via `DataService.shared`. All methods run on the main actor.
@MainActor
final class DataService: ObservableObject {
    /// Shared singleton instance.
    static let shared = DataService()

    /// All loaded shops.
    @Published var shops: [Shop] = []
    /// All loaded products (may span multiple shops).
    @Published var products: [Product] = []
    /// All loaded orders for the current user or shop context.
    @Published var orders: [Order] = []
    /// All loaded deliveries (available and active) for the driver context.
    @Published var deliveries: [Delivery] = []
    /// Whether a data operation is currently in progress.
    @Published var isLoading = false
    /// User-facing error message from the last failed operation, if any.
    @Published var errorMessage: String?

    /// Firestore database reference.
    private let db = Firestore.firestore()
    /// Listener registration for real-time shop updates.
    private var shopsListener: ListenerRegistration?
    /// Listener registration for real-time order updates.
    private var ordersListener: ListenerRegistration?
    /// Listener registration for real-time available delivery updates.
    private var deliveriesListener: ListenerRegistration?
    /// Listener registration for real-time driver-assigned order updates.
    private var driverOrdersListener: ListenerRegistration?

    private init() {}

    // MARK: - Real-time Listeners

    /// Starts a real-time Firestore snapshot listener for orders belonging to a specific customer.
    ///
    /// Orders are sorted by creation date (newest first). Status changes trigger local notifications.
    ///
    /// - Parameter userId: The Firebase UID of the customer whose orders to monitor.
    func startOrdersListener(forUser userId: String) {
        stopOrdersListener()


        ordersListener = db.collection("orders")
            .whereField("userId", isEqualTo: userId)
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }

                if let error = error {
                    return
                }

                guard let documents = snapshot?.documents else { return }

                var loadedOrders: [Order] = []
                for document in documents {
                    if let order = self.parseOrder(from: document) {
                        loadedOrders.append(order)
                    }
                }

                // Check for status changes and notify
                self.checkOrderStatusChanges(oldOrders: self.orders, newOrders: loadedOrders)

                self.orders = loadedOrders
            }
    }

    /// Starts a real-time Firestore snapshot listener for orders placed at a specific shop.
    ///
    /// Used by merchants to monitor incoming orders. New pending orders trigger local notifications.
    ///
    /// - Parameter shopId: The Firestore document ID of the shop whose orders to monitor.
    func startOrdersListener(forShop shopId: String) {
        stopOrdersListener()


        ordersListener = db.collection("orders")
            .whereField("shopId", isEqualTo: shopId)
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }

                if let error = error {
                    return
                }

                guard let documents = snapshot?.documents else { return }

                var loadedOrders: [Order] = []
                for document in documents {
                    if let order = self.parseOrder(from: document) {
                        loadedOrders.append(order)
                    }
                }

                // Check for new orders and notify merchant
                self.checkNewOrdersForMerchant(oldOrders: self.orders, newOrders: loadedOrders)

                self.orders = loadedOrders
            }
    }

    /// Starts real-time Firestore snapshot listeners for deliveries relevant to a driver.
    ///
    /// Sets up two listeners:
    /// 1. Orders with status "ready" and no assigned driver (available for pickup).
    /// 2. Orders assigned to this specific driver (active deliveries).
    ///
    /// New available deliveries trigger local push notifications.
    ///
    /// - Parameter driverId: The Firebase UID of the driver.
    func startDeliveriesListener(forDriver driverId: String) {
        stopDeliveriesListener()


        // Listen for "ready" orders (available for pickup)
        deliveriesListener = db.collection("orders")
            .whereField("status", isEqualTo: "ready")
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }

                if let error = error {
                    return
                }

                guard let documents = snapshot?.documents else { return }

                var availableDeliveries: [Delivery] = []
                for document in documents {
                    let data = document.data()
                    let assignedDriver = data["driverId"] as? String
                    // Include if no driver assigned (available) - these are for all drivers
                    if assignedDriver == nil || assignedDriver!.isEmpty {
                        if let delivery = self.parseDeliveryFromOrder(document) {
                            availableDeliveries.append(delivery)
                        }
                    }
                }

                // Keep existing active deliveries (assigned to this driver)
                let activeDeliveries = self.deliveries.filter { $0.driverId == driverId && $0.status != .available }

                let oldAvailableCount = self.deliveries.filter { $0.status == .available }.count
                if availableDeliveries.count > oldAvailableCount {
                    let newCount = availableDeliveries.count - oldAvailableCount
                    NotificationService.shared.sendLocalNotification(
                        title: "Nouvelle livraison disponible",
                        body: "\(newCount) nouvelle(s) livraison(s) à proximité"
                    )
                }

                self.deliveries = activeDeliveries + availableDeliveries
            }

        // Also listen for orders assigned to this driver
        driverOrdersListener = db.collection("orders")
            .whereField("driverId", isEqualTo: driverId)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }
                guard let documents = snapshot?.documents else { return }

                var driverDeliveries: [Delivery] = []
                for document in documents {
                    let data = document.data()
                    let statusString = data["status"] as? String ?? ""
                    // Skip delivered/cancelled orders in active list
                    if statusString == "delivered" || statusString == "cancelled" {
                        // Still track them for earnings
                        if statusString == "delivered" {
                            if let delivery = self.parseDeliveryFromOrder(document) {
                                var completedDelivery = delivery
                                completedDelivery.status = .delivered
                                completedDelivery.driverId = driverId
                                completedDelivery.deliveredAt = (data["deliveredAt"] as? Timestamp)?.dateValue() ?? (data["updatedAt"] as? Timestamp)?.dateValue()
                                driverDeliveries.append(completedDelivery)
                            }
                        }
                        continue
                    }

                    if let delivery = self.parseDeliveryFromOrder(document) {
                        var activeDelivery = delivery
                        activeDelivery.driverId = driverId
                        // Map order status to delivery status
                        switch statusString {
                        case "atShop":
                            activeDelivery.status = .atShop
                        case "pickedUp":
                            activeDelivery.status = .pickedUp
                        case "delivering":
                            activeDelivery.status = .delivering
                        default:
                            activeDelivery.status = .accepted
                        }
                        driverDeliveries.append(activeDelivery)
                    }
                }

                // Merge: keep available deliveries, replace driver-specific ones
                let availableOnly = self.deliveries.filter { $0.status == .available }
                self.deliveries = availableOnly + driverDeliveries
            }
    }

    /// Compares old and new order lists to detect status changes and send notifications.
    ///
    /// - Parameters:
    ///   - oldOrders: The previous snapshot of orders.
    ///   - newOrders: The newly received snapshot of orders.
    private func checkOrderStatusChanges(oldOrders: [Order], newOrders: [Order]) {
        for newOrder in newOrders {
            if let oldOrder = oldOrders.first(where: { $0.id == newOrder.id }) {
                if oldOrder.status != newOrder.status {
                    NotificationService.shared.sendLocalNotification(
                        title: "Commande mise à jour",
                        body: "Votre commande est maintenant: \(newOrder.status.displayName)"
                    )
                }
            }
        }
    }

    /// Detects newly received pending orders for a merchant and sends a notification.
    ///
    /// - Parameters:
    ///   - oldOrders: The previous snapshot of orders.
    ///   - newOrders: The newly received snapshot of orders.
    private func checkNewOrdersForMerchant(oldOrders: [Order], newOrders: [Order]) {
        let oldIds = Set(oldOrders.map { $0.id })
        let newOrdersReceived = newOrders.filter { !oldIds.contains($0.id) && $0.status == .pending }

        if !newOrdersReceived.isEmpty {
            NotificationService.shared.sendLocalNotification(
                title: "Nouvelle commande !",
                body: "Vous avez reçu \(newOrdersReceived.count) nouvelle(s) commande(s)"
            )
        }
    }

    /// Parses a Firestore order document into a `Delivery` model for the driver view.
    ///
    /// - Parameter document: The Firestore `DocumentSnapshot` containing order data.
    /// - Returns: A `Delivery` instance, or `nil` if parsing fails.
    private func parseDeliveryFromOrder(_ document: DocumentSnapshot) -> Delivery? {
        let data = document.data() ?? [:]
        let orderId = document.documentID

        // Parse delivery location
        var deliveryLat = 48.8566
        var deliveryLng = 2.3522
        if let location = data["deliveryLocation"] as? [String: Any] {
            deliveryLat = location["latitude"] as? Double ?? 48.8566
            deliveryLng = location["longitude"] as? Double ?? 2.3522
        }

        // Parse shop location
        var shopLat = 48.8566
        var shopLng = 2.3522
        if let shopLocation = data["shopLocation"] as? [String: Any] {
            shopLat = shopLocation["latitude"] as? Double ?? 48.8566
            shopLng = shopLocation["longitude"] as? Double ?? 2.3522
        } else if let shopId = data["shopId"] as? String, let shop = getShop(id: shopId) {
            shopLat = shop.latitude
            shopLng = shop.longitude
        }

        // Calculate real distance between shop and customer
        let shopLocation = CLLocation(latitude: shopLat, longitude: shopLng)
        let customerLocation = CLLocation(latitude: deliveryLat, longitude: deliveryLng)
        let distanceKm = shopLocation.distance(from: customerLocation) / 1000.0

        return Delivery(
            id: orderId,
            orderId: orderId,
            driverId: data["driverId"] as? String,
            shopName: data["shopName"] as? String ?? "Shop",
            shopAddress: data["shopAddress"] as? String ?? "",
            shopLatitude: shopLat,
            shopLongitude: shopLng,
            customerName: "Client",
            customerAddress: data["deliveryAddress"] as? String ?? "",
            customerLatitude: deliveryLat,
            customerLongitude: deliveryLng,
            status: .available,
            earnings: (data["deliveryFee"] as? Double ?? 5.0) * 0.8,
            distance: round(distanceKm * 10) / 10,
            createdAt: (data["createdAt"] as? Timestamp)?.dateValue() ?? Date(),
            pickedUpAt: nil,
            deliveredAt: nil
        )
    }

    /// Removes the active orders snapshot listener.
    func stopOrdersListener() {
        ordersListener?.remove()
        ordersListener = nil
    }

    /// Removes the active deliveries and driver-orders snapshot listeners.
    func stopDeliveriesListener() {
        deliveriesListener?.remove()
        deliveriesListener = nil
        driverOrdersListener?.remove()
        driverOrdersListener = nil
    }

    /// Removes all active Firestore snapshot listeners (orders, deliveries, and shops).
    func stopAllListeners() {
        stopOrdersListener()
        stopDeliveriesListener()
        shopsListener?.remove()
        shopsListener = nil
    }

    // MARK: - Shops (Firestore)

    /// Loads shops from Firestore, optionally filtered by category and/or search query.
    ///
    /// Category filtering is performed server-side via Firestore queries. Search filtering
    /// is applied client-side using case-insensitive matching on name and address.
    ///
    /// - Parameters:
    ///   - category: Optional category string to filter by (e.g., "grocery").
    ///   - search: Optional search string for client-side name/address filtering.
    func loadShops(category: String? = nil, search: String? = nil) async {
        isLoading = true
        errorMessage = nil

        do {
            var query: Query = db.collection("shops").whereField("status", isEqualTo: "active")

            if let category = category {
                query = query.whereField("category", isEqualTo: category)
            }

            let snapshot = try await query.getDocuments()
            var loadedShops: [Shop] = []

            for document in snapshot.documents {
                if let shop = parseShop(from: document) {
                    // Apply search filter client-side if needed
                    if let search = search, !search.isEmpty {
                        if shop.name.localizedCaseInsensitiveContains(search) ||
                           shop.address.localizedCaseInsensitiveContains(search) {
                            loadedShops.append(shop)
                        }
                    } else {
                        loadedShops.append(shop)
                    }
                }
            }

            shops = loadedShops

            // Auto-geocode shops with default/missing coordinates
            Task {
                await geocodeMissingShopCoordinates()
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    /// Geocodes all shop addresses and updates coordinates in local cache + Firestore.
    private func geocodeMissingShopCoordinates() async {
        let geocoder = CLGeocoder()

        for (index, shop) in shops.enumerated() {
            guard !shop.address.isEmpty else { continue }

            do {
                let placemarks = try await geocoder.geocodeAddressString(shop.address)
                guard let location = placemarks.first?.location else { continue }

                let newLat = location.coordinate.latitude
                let newLng = location.coordinate.longitude

                // Skip if coordinates already match (within 50m)
                let current = CLLocation(latitude: shop.latitude, longitude: shop.longitude)
                let resolved = CLLocation(latitude: newLat, longitude: newLng)
                if current.distance(from: resolved) < 50 { continue }

                // Update local cache
                shops[index] = Shop(
                    id: shop.id,
                    name: shop.name,
                    description: shop.description,
                    imageURL: shop.imageURL,
                    address: shop.address,
                    latitude: newLat,
                    longitude: newLng,
                    category: shop.category,
                    rating: shop.rating,
                    reviewCount: shop.reviewCount,
                    isOpen: shop.isOpen,
                    deliveryFee: shop.deliveryFee,
                    minOrderAmount: shop.minOrderAmount,
                    estimatedDeliveryTime: shop.estimatedDeliveryTime,
                    ownerId: shop.ownerId
                )

                // Update Firestore
                try? await db.collection("shops").document(shop.id).updateData([
                    "location": [
                        "latitude": newLat,
                        "longitude": newLng
                    ],
                    "latitude": newLat,
                    "longitude": newLng
                ])

                // Delay to avoid geocoder rate limits
                try? await Task.sleep(nanoseconds: 500_000_000)
            } catch {
                // Skip this shop
            }
        }
    }

    /// Parses a Firestore document into a `Shop` model.
    ///
    /// Handles multiple data formats for location (latitude/longitude vs lat/lng) and
    /// category (single string vs French-language array).
    ///
    /// - Parameter document: The Firestore `DocumentSnapshot` containing shop data.
    /// - Returns: A `Shop` instance, or `nil` if parsing fails.
    private func parseShop(from document: DocumentSnapshot) -> Shop? {
        let data = document.data() ?? [:]
        let id = document.documentID

        // Parse location (support nested "location" object, or top-level latitude/longitude)
        var latitude = 48.8566
        var longitude = 2.3522
        if let location = data["location"] as? [String: Any] {
            latitude = location["latitude"] as? Double ?? location["lat"] as? Double ?? 48.8566
            longitude = location["longitude"] as? Double ?? location["lng"] as? Double ?? 2.3522
        } else if let lat = data["latitude"] as? Double, let lng = data["longitude"] as? Double {
            latitude = lat
            longitude = lng
        }

        // Parse category
        let categoryString = data["category"] as? String ?? "cbd"
        let category = ShopCategory(rawValue: categoryString) ?? .cbd

        return Shop(
            id: id,
            name: data["name"] as? String ?? "Shop",
            description: data["description"] as? String ?? "",
            imageURL: data["imageURL"] as? String ?? data["logoUrl"] as? String,
            address: data["address"] as? String ?? "",
            latitude: latitude,
            longitude: longitude,
            category: category,
            rating: data["rating"] as? Double ?? 4.5,
            reviewCount: data["totalOrders"] as? Int ?? 0,
            isOpen: (data["status"] as? String ?? "active") == "active",
            deliveryFee: data["deliveryFee"] as? Double ?? 2.99,
            minOrderAmount: data["minOrderAmount"] as? Double ?? 10.0,
            estimatedDeliveryTime: data["estimatedDeliveryTime"] as? String ?? "20-30 min",
            ownerId: data["ownerId"] as? String ?? ""
        )
    }

    /// Returns all currently open shops from the local cache.
    ///
    /// - Returns: An array of open `Shop` objects.
    func getShops() -> [Shop] {
        shops.filter { $0.isOpen }
    }

    /// Returns a single shop by its ID from the local cache.
    ///
    /// - Parameter id: The Firestore document ID of the shop.
    /// - Returns: The matching `Shop`, or `nil` if not found.
    func getShop(id: String) -> Shop? {
        shops.first { $0.id == id }
    }

    /// Returns all open shops matching the given category from the local cache.
    ///
    /// - Parameter category: The `ShopCategory` to filter by.
    /// - Returns: An array of open `Shop` objects in the specified category.
    func getShopsByCategory(_ category: ShopCategory) -> [Shop] {
        shops.filter { $0.category == category && $0.isOpen }
    }

    // MARK: - Products (Firestore)

    /// Loads active products for a given shop from Firestore.
    ///
    /// Products are merged into the local cache: existing entries are updated and
    /// new entries are appended.
    ///
    /// - Parameter shopId: The Firestore document ID of the shop whose products to load.
    func loadProducts(forShop shopId: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let snapshot = try await db.collection("products")
                .whereField("shopId", isEqualTo: shopId)
                .whereField("status", isEqualTo: "active")
                .getDocuments()

            var loadedProducts: [Product] = []

            for document in snapshot.documents {
                if let product = parseProduct(from: document) {
                    loadedProducts.append(product)
                }
            }

            // Merge with existing products
            for product in loadedProducts {
                if let index = products.firstIndex(where: { $0.id == product.id }) {
                    products[index] = product
                } else {
                    products.append(product)
                }
            }

        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    /// Parses a Firestore document into a `Product` model.
    ///
    /// - Parameter document: The Firestore `DocumentSnapshot` containing product data.
    /// - Returns: A `Product` instance, or `nil` if parsing fails.
    private func parseProduct(from document: DocumentSnapshot) -> Product? {
        let data = document.data() ?? [:]
        let id = document.documentID

        return Product(
            id: id,
            name: data["name"] as? String ?? "Product",
            description: data["description"] as? String ?? "",
            price: data["price"] as? Double ?? 0.0,
            imageURL: data["imageUrl"] as? String,
            category: data["category"] as? String ?? "Other",
            shopId: data["shopId"] as? String ?? "",
            isAvailable: (data["status"] as? String ?? "active") == "active",
            stock: data["stock"] as? Int ?? 0
        )
    }

    /// Returns available products for a given shop from the local cache.
    ///
    /// - Parameter shopId: The shop ID to filter by.
    /// - Returns: An array of available `Product` objects belonging to the shop.
    func getProducts(forShop shopId: String) -> [Product] {
        products.filter { $0.shopId == shopId && $0.isAvailable }
    }

    /// Returns a single product by its ID from the local cache.
    ///
    /// - Parameter id: The Firestore document ID of the product.
    /// - Returns: The matching `Product`, or `nil` if not found.
    func getProduct(id: String) -> Product? {
        products.first { $0.id == id }
    }

    // MARK: - Orders (Firestore)

    /// Loads all orders for the currently authenticated user from Firestore.
    ///
    /// Orders are sorted by creation date (newest first). Requires an authenticated user.
    func loadOrders() async {
        guard let userId = AuthService.shared.userProfile?.id else { return }

        isLoading = true
        errorMessage = nil

        do {
            let snapshot = try await db.collection("orders")
                .whereField("userId", isEqualTo: userId)
                .order(by: "createdAt", descending: true)
                .getDocuments()

            var loadedOrders: [Order] = []

            for document in snapshot.documents {
                if let order = parseOrder(from: document) {
                    loadedOrders.append(order)
                }
            }

            orders = loadedOrders
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    /// Loads all orders for a specific shop from Firestore.
    ///
    /// Used by merchants to view their shop's order history, sorted by creation date (newest first).
    ///
    /// - Parameter shopId: The Firestore document ID of the shop.
    func loadOrdersForShop(shopId: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let snapshot = try await db.collection("orders")
                .whereField("shopId", isEqualTo: shopId)
                .order(by: "createdAt", descending: true)
                .getDocuments()

            var loadedOrders: [Order] = []

            for document in snapshot.documents {
                if let order = parseOrder(from: document) {
                    loadedOrders.append(order)
                }
            }

            orders = loadedOrders
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    /// Parses a Firestore document into an `Order` model.
    ///
    /// Handles parsing of nested items, delivery location, dates, and status mapping.
    ///
    /// - Parameter document: The Firestore `DocumentSnapshot` containing order data.
    /// - Returns: An `Order` instance, or `nil` if parsing fails.
    private func parseOrder(from document: DocumentSnapshot) -> Order? {
        let data = document.data() ?? [:]
        let id = document.documentID

        // Parse items
        var orderItems: [OrderItem] = []
        if let itemsData = data["items"] as? [[String: Any]] {
            for itemData in itemsData {
                let item = OrderItem(
                    id: itemData["productId"] as? String ?? UUID().uuidString,
                    productId: itemData["productId"] as? String ?? "",
                    productName: itemData["productName"] as? String ?? itemData["name"] as? String ?? "Product",
                    price: itemData["price"] as? Double ?? 0.0,
                    quantity: itemData["quantity"] as? Int ?? 1
                )
                orderItems.append(item)
            }
        }

        // Parse dates
        let createdAt = (data["createdAt"] as? Timestamp)?.dateValue() ?? Date()
        let updatedAt = (data["updatedAt"] as? Timestamp)?.dateValue() ?? createdAt
        let estimatedDelivery = (data["estimatedDeliveryTime"] as? Timestamp)?.dateValue()

        // Parse delivery location
        var deliveryLat = 48.8566
        var deliveryLng = 2.3522
        if let location = data["deliveryLocation"] as? [String: Any] {
            deliveryLat = location["latitude"] as? Double ?? 48.8566
            deliveryLng = location["longitude"] as? Double ?? 2.3522
        }

        // Parse status
        let statusString = data["status"] as? String ?? "pending"
        let status = OrderStatus(rawValue: statusString) ?? .pending

        return Order(
            id: id,
            userId: data["userId"] as? String ?? "",
            shopId: data["shopId"] as? String ?? "",
            shopName: data["shopName"] as? String ?? "Shop",
            driverId: data["driverId"] as? String,
            items: orderItems,
            status: status,
            subtotal: data["subtotal"] as? Double ?? 0.0,
            deliveryFee: data["deliveryFee"] as? Double ?? 5.0,
            total: data["total"] as? Double ?? 0.0,
            deliveryAddress: data["deliveryAddress"] as? String ?? "",
            deliveryLatitude: deliveryLat,
            deliveryLongitude: deliveryLng,
            createdAt: createdAt,
            updatedAt: updatedAt,
            estimatedDelivery: estimatedDelivery,
            notes: data["notes"] as? String,
            paymentStatus: data["paymentStatus"] as? String,
            paymentIntentId: data["paymentIntentId"] as? String,
            deliveryCode: data["deliveryCode"] as? String
        )
    }

    /// Creates a new order in Firestore and adds it to the local cache.
    ///
    /// Calculates subtotal, delivery fee, and total. Generates an order reference and
    /// stores the order with payment information if a PaymentIntent was created.
    ///
    /// - Parameters:
    ///   - orderRequest: The `CreateOrderRequest` containing items and delivery details.
    ///   - paymentIntentId: Optional Stripe PaymentIntent ID if payment was processed.
    /// - Returns: The newly created `Order`.
    /// - Throws: An error if the user is not authenticated or Firestore write fails.
    func createOrder(_ orderRequest: CreateOrderRequest, paymentIntentId: String? = nil) async throws -> Order {
        isLoading = true
        defer { isLoading = false }

        guard let userId = AuthService.shared.userProfile?.id else {
            throw NSError(domain: "DataService", code: 401, userInfo: [NSLocalizedDescriptionKey: "Utilisateur non connecté"])
        }

        let shop = getShop(id: orderRequest.shopId)
        let subtotal = orderRequest.items.reduce(0) { $0 + ($1.price * Double($1.quantity)) }
        let deliveryFee = shop?.deliveryFee ?? 2.99
        let total = subtotal + deliveryFee
        let reference = "ORD-\(Int(Date().timeIntervalSince1970))"
        let deliveryCode = String(format: "%04d", Int.random(in: 0...9999))

        let orderData: [String: Any] = [
            "userId": userId,
            "shopId": orderRequest.shopId,
            "shopName": shop?.name ?? "Shop",
            "shopAddress": shop?.address ?? "",
            "shopLocation": [
                "latitude": shop?.latitude ?? 48.8566,
                "longitude": shop?.longitude ?? 2.3522
            ],
            "driverId": NSNull(),
            "reference": reference,
            "status": "pending",
            "items": orderRequest.items.map { [
                "productId": $0.productId,
                "productName": $0.productName,
                "price": $0.price,
                "quantity": $0.quantity
            ]},
            "subtotal": subtotal,
            "deliveryFee": deliveryFee,
            "total": total,
            "deliveryAddress": orderRequest.deliveryAddress,
            "deliveryLocation": [
                "latitude": orderRequest.deliveryLatitude,
                "longitude": orderRequest.deliveryLongitude
            ],
            "notes": orderRequest.notes ?? "",
            "paymentMethod": paymentIntentId != nil ? "card" : "cash",
            "paymentStatus": paymentIntentId != nil ? "paid" : "pending",
            "paymentIntentId": paymentIntentId ?? NSNull(),
            "deliveryCode": deliveryCode,
            "createdAt": Timestamp(date: Date()),
            "updatedAt": Timestamp(date: Date()),
            "estimatedDeliveryTime": Timestamp(date: Date().addingTimeInterval(30 * 60))
        ]

        let docRef = try await db.collection("orders").addDocument(data: orderData)

        let order = Order(
            id: docRef.documentID,
            userId: userId,
            shopId: orderRequest.shopId,
            shopName: shop?.name ?? "Shop",
            driverId: nil,
            items: orderRequest.items.map { OrderItem(id: $0.productId, productId: $0.productId, productName: $0.productName, price: $0.price, quantity: $0.quantity) },
            status: .pending,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            total: total,
            deliveryAddress: orderRequest.deliveryAddress,
            deliveryLatitude: orderRequest.deliveryLatitude,
            deliveryLongitude: orderRequest.deliveryLongitude,
            createdAt: Date(),
            updatedAt: Date(),
            estimatedDelivery: Date().addingTimeInterval(30 * 60),
            notes: orderRequest.notes,
            paymentStatus: paymentIntentId != nil ? "paid" : "pending",
            paymentIntentId: paymentIntentId,
            deliveryCode: deliveryCode
        )

        orders.insert(order, at: 0)
        return order
    }

    /// Updates the status of an order in Firestore and the local cache.
    ///
    /// - Parameters:
    ///   - orderId: The Firestore document ID of the order.
    ///   - status: The new `OrderStatus` to set.
    func updateOrderStatus(_ orderId: String, status: OrderStatus) async {
        do {
            try await db.collection("orders").document(orderId).updateData([
                "status": status.rawValue,
                "updatedAt": Timestamp(date: Date())
            ])

            if let index = orders.firstIndex(where: { $0.id == orderId }) {
                orders[index] = Order(
                    id: orders[index].id,
                    userId: orders[index].userId,
                    shopId: orders[index].shopId,
                    shopName: orders[index].shopName,
                    driverId: orders[index].driverId,
                    items: orders[index].items,
                    status: status,
                    subtotal: orders[index].subtotal,
                    deliveryFee: orders[index].deliveryFee,
                    total: orders[index].total,
                    deliveryAddress: orders[index].deliveryAddress,
                    deliveryLatitude: orders[index].deliveryLatitude,
                    deliveryLongitude: orders[index].deliveryLongitude,
                    createdAt: orders[index].createdAt,
                    updatedAt: Date(),
                    estimatedDelivery: orders[index].estimatedDelivery,
                    notes: orders[index].notes,
                    paymentStatus: orders[index].paymentStatus,
                    paymentIntentId: orders[index].paymentIntentId,
                    deliveryCode: orders[index].deliveryCode
                )
            }
        } catch {
        }
    }

    /// Returns orders for a specific user from the local cache, sorted by newest first.
    ///
    /// - Parameter userId: The Firebase UID of the user.
    /// - Returns: An array of `Order` objects sorted by creation date (descending).
    func getOrders(forUser userId: String) -> [Order] {
        orders.filter { $0.userId == userId }.sorted { $0.createdAt > $1.createdAt }
    }

    /// Returns orders for a specific shop from the local cache, sorted by newest first.
    ///
    /// - Parameter shopId: The Firestore document ID of the shop.
    /// - Returns: An array of `Order` objects sorted by creation date (descending).
    func getOrders(forShop shopId: String) -> [Order] {
        orders.filter { $0.shopId == shopId }.sorted { $0.createdAt > $1.createdAt }
    }

    // MARK: - Shop Resolution

    /// Resolves the Firestore document ID of a shop owned by the given user.
    ///
    /// Queries the `shops` collection for the first shop with a matching `ownerId`.
    ///
    /// - Parameter ownerId: The Firebase UID of the shop owner.
    /// - Returns: The shop's document ID, or `nil` if no shop is found.
    func resolveShopId(forOwner ownerId: String) async -> String? {
        do {
            let snapshot = try await db.collection("shops")
                .whereField("ownerId", isEqualTo: ownerId)
                .limit(to: 1)
                .getDocuments()
            return snapshot.documents.first?.documentID
        } catch {
            return nil
        }
    }

    /// Updates a shop's data in Firestore and refreshes the local cache.
    ///
    /// Automatically adds an `updatedAt` timestamp to the update payload.
    ///
    /// - Parameters:
    ///   - shopId: The Firestore document ID of the shop to update.
    ///   - data: A dictionary of fields to update.
    /// - Throws: A Firestore error if the update fails.
    func updateShop(shopId: String, data: [String: Any]) async throws {
        var updateData = data
        updateData["updatedAt"] = Timestamp(date: Date())
        try await db.collection("shops").document(shopId).updateData(updateData)

        // Refresh local cache
        if let index = shops.firstIndex(where: { $0.id == shopId }) {
            if let name = data["name"] as? String { shops[index].name = name }
            if let description = data["description"] as? String { shops[index].description = description }
            if let imageURL = data["imageURL"] as? String ?? data["logoUrl"] as? String { shops[index].imageURL = imageURL }
            if let address = data["address"] as? String { shops[index].address = address }
        }
    }

    // MARK: - Driver (Firestore)

    /// Reports the driver's current GPS location to Firestore.
    ///
    /// Updates both the driver's document and any active order assigned to the driver,
    /// enabling real-time tracking on the customer side.
    ///
    /// - Parameters:
    ///   - latitude: Current latitude.
    ///   - longitude: Current longitude.
    ///   - heading: Optional compass heading in degrees.
    ///   - speed: Optional speed in meters per second.
    func updateDriverLocation(latitude: Double, longitude: Double, heading: Double? = nil, speed: Double? = nil) async {
        guard let userId = AuthService.shared.userProfile?.id else { return }

        do {
            var locationData: [String: Any] = [
                "latitude": latitude,
                "longitude": longitude,
                "updatedAt": Timestamp(date: Date())
            ]
            if let heading = heading { locationData["heading"] = heading }
            if let speed = speed { locationData["speed"] = speed }

            // Update driver document
            try await db.collection("drivers").document(userId).updateData([
                "location": locationData,
                "lastSeenAt": Timestamp(date: Date())
            ])

            // Also update location in active orders assigned to this driver
            let activeDelivery = deliveries.first { $0.driverId == userId && $0.status != .delivered && $0.status != .available }
            if let delivery = activeDelivery {
                try await db.collection("orders").document(delivery.orderId).updateData([
                    "driverLocation": locationData
                ])
            }
        } catch {
        }
    }

    /// Updates the driver's availability status in Firestore.
    ///
    /// - Parameter status: The new status string (e.g., "online", "offline", "busy").
    func updateDriverStatus(_ status: String) async {
        guard let userId = AuthService.shared.userProfile?.id else { return }

        do {
            try await db.collection("drivers").document(userId).updateData([
                "status": status,
                "lastSeenAt": Timestamp(date: Date())
            ])
        } catch {
        }
    }

    // MARK: - Deliveries

    /// Loads all available deliveries (orders with status "ready" and no assigned driver) from Firestore.
    func loadAvailableDeliveries() async {
        isLoading = true

        do {
            // Query orders with status "ready" - filter for no driver client-side
            let snapshot = try await db.collection("orders")
                .whereField("status", isEqualTo: "ready")
                .getDocuments()

            var loadedDeliveries: [Delivery] = []

            for document in snapshot.documents {
                let data = document.data()
                // Only include orders without a driver assigned
                let driverId = data["driverId"] as? String
                if driverId != nil && !driverId!.isEmpty { continue }

                if let order = parseOrder(from: document) {
                    let shop = getShop(id: order.shopId)
                    let shopLat = shop?.latitude ?? 48.8566
                    let shopLng = shop?.longitude ?? 2.3522

                    // Calculate real distance
                    let shopLoc = CLLocation(latitude: shopLat, longitude: shopLng)
                    let custLoc = CLLocation(latitude: order.deliveryLatitude, longitude: order.deliveryLongitude)
                    let distanceKm = shopLoc.distance(from: custLoc) / 1000.0

                    let delivery = Delivery(
                        id: document.documentID,
                        orderId: document.documentID,
                        driverId: nil,
                        shopName: order.shopName,
                        shopAddress: data["shopAddress"] as? String ?? shop?.address ?? "",
                        shopLatitude: shopLat,
                        shopLongitude: shopLng,
                        customerName: "Client",
                        customerAddress: order.deliveryAddress,
                        customerLatitude: order.deliveryLatitude,
                        customerLongitude: order.deliveryLongitude,
                        status: .available,
                        earnings: order.deliveryFee * 0.8,
                        distance: round(distanceKm * 10) / 10,
                        createdAt: order.createdAt,
                        pickedUpAt: nil,
                        deliveredAt: nil
                    )
                    loadedDeliveries.append(delivery)
                }
            }

            deliveries = loadedDeliveries
        } catch {
        }

        isLoading = false
    }

    /// Returns all deliveries with status `.available` from the local cache.
    ///
    /// - Returns: An array of available `Delivery` objects.
    func getAvailableDeliveries() -> [Delivery] {
        deliveries.filter { $0.status == .available }
    }

    /// Returns the currently active delivery for a specific driver, if any.
    ///
    /// An active delivery is one that is assigned to the driver and is neither delivered nor available.
    ///
    /// - Parameter driverId: The Firebase UID of the driver.
    /// - Returns: The active `Delivery`, or `nil` if the driver has no active delivery.
    func getActiveDelivery(forDriver driverId: String) -> Delivery? {
        deliveries.first { $0.driverId == driverId && $0.status != .delivered && $0.status != .available }
    }

    /// Returns all completed deliveries for a specific driver from the local cache.
    ///
    /// - Parameter driverId: The Firebase UID of the driver.
    /// - Returns: An array of delivered `Delivery` objects.
    func getCompletedDeliveries(forDriver driverId: String) -> [Delivery] {
        deliveries.filter { $0.driverId == driverId && $0.status == .delivered }
    }

    /// Accepts a delivery assignment for a driver using a Firestore batch write.
    ///
    /// Updates the order document to assign the driver and the driver document to set status to "busy".
    ///
    /// - Parameters:
    ///   - deliveryId: The Firestore document ID of the order/delivery to accept.
    ///   - driverId: The Firebase UID of the driver accepting the delivery.
    func acceptDelivery(_ deliveryId: String, driverId: String) async {
        do {
            let batch = db.batch()

            let orderRef = db.collection("orders").document(deliveryId)
            batch.updateData([
                "driverId": driverId,
                "updatedAt": Timestamp(date: Date())
            ], forDocument: orderRef)

            let driverRef = db.collection("drivers").document(driverId)
            batch.updateData([
                "status": "busy",
                "currentOrderId": deliveryId
            ], forDocument: driverRef)

            try await batch.commit()

            if let index = deliveries.firstIndex(where: { $0.id == deliveryId }) {
                deliveries[index].driverId = driverId
                deliveries[index].status = .accepted
            }

        } catch {
        }
    }

    /// Updates a delivery's status in the local cache and syncs the corresponding order status to Firestore.
    ///
    /// Maps `DeliveryStatus` to `OrderStatus` for the underlying order:
    /// - `.pickedUp` maps to `OrderStatus.pickedUp`
    /// - `.delivering` maps to `OrderStatus.delivering`
    /// - `.delivered` maps to `OrderStatus.delivered`
    ///
    /// - Parameters:
    ///   - deliveryId: The Firestore document ID of the delivery/order.
    ///   - status: The new `DeliveryStatus` to set.
    func updateDeliveryStatus(_ deliveryId: String, status: DeliveryStatus) async {
        if let index = deliveries.firstIndex(where: { $0.id == deliveryId }) {
            deliveries[index].status = status

            if status == .pickedUp {
                deliveries[index].pickedUpAt = Date()
            } else if status == .delivered {
                deliveries[index].deliveredAt = Date()
            }

            // Sync status to Firestore order
            let orderStatusMap: [DeliveryStatus: String] = [
                .atShop: "atShop",
                .pickedUp: "pickedUp",
                .delivering: "delivering",
                .delivered: "delivered"
            ]
            if let orderStatus = orderStatusMap[status] {
                do {
                    try await db.collection("orders").document(deliveries[index].orderId).updateData([
                        "status": orderStatus,
                        "updatedAt": Timestamp(date: Date())
                    ])
                } catch {}
            }

            // Also update local orders cache
            switch status {
            case .pickedUp:
                await updateOrderStatus(deliveries[index].orderId, status: .pickedUp)
            case .delivering:
                await updateOrderStatus(deliveries[index].orderId, status: .delivering)
            case .delivered:
                await updateOrderStatus(deliveries[index].orderId, status: .delivered)
            default:
                break
            }
        }
    }

    // MARK: - Product Management

    /// Adds a new product to Firestore and appends it to the local cache.
    ///
    /// The product is stored with the Firestore-generated document ID.
    ///
    /// - Parameter product: The `Product` to add. The `id` field is replaced with the generated Firestore ID.
    /// - Throws: A Firestore error if the write fails.
    func addProduct(_ product: Product) async throws {
        var productData: [String: Any] = [
            "name": product.name,
            "description": product.description,
            "price": product.price,
            "category": product.category,
            "shopId": product.shopId,
            "status": product.isAvailable ? "active" : "inactive",
            "stock": product.stock,
            "createdAt": Timestamp(date: Date())
        ]
        if let imageURL = product.imageURL {
            productData["imageUrl"] = imageURL
        }

        let docRef = try await db.collection("products").addDocument(data: productData)
        var newProduct = product
        newProduct = Product(
            id: docRef.documentID,
            name: product.name,
            description: product.description,
            price: product.price,
            imageURL: product.imageURL,
            category: product.category,
            shopId: product.shopId,
            isAvailable: product.isAvailable,
            stock: product.stock
        )
        products.append(newProduct)
    }

    /// Updates an existing product in Firestore and refreshes the local cache.
    ///
    /// - Parameter product: The `Product` with updated fields. Matched by `id`.
    /// - Throws: A Firestore error if the update fails.
    func updateProduct(_ product: Product) async throws {
        var updateData: [String: Any] = [
            "name": product.name,
            "description": product.description,
            "price": product.price,
            "category": product.category,
            "status": product.isAvailable ? "active" : "inactive",
            "stock": product.stock
        ]
        if let imageURL = product.imageURL {
            updateData["imageUrl"] = imageURL
        }
        try await db.collection("products").document(product.id).updateData(updateData)

        if let index = products.firstIndex(where: { $0.id == product.id }) {
            products[index] = product
        }
    }

    /// Deletes a product from Firestore and removes it from the local cache.
    ///
    /// - Parameter id: The Firestore document ID of the product to delete.
    /// - Throws: A Firestore error if the deletion fails.
    func deleteProduct(id: String) async throws {
        try await db.collection("products").document(id).delete()
        products.removeAll { $0.id == id }
    }

    // MARK: - Statistics

    /// Computes aggregated statistics for a merchant's shop over the specified time period.
    ///
    /// Statistics are derived from the local orders and products cache.
    ///
    /// - Parameters:
    ///   - shopId: The Firestore document ID of the shop.
    ///   - period: The time period to aggregate over. Defaults to `.today`.
    /// - Returns: A `MerchantStats` instance with order counts, revenue, and product totals.
    func getMerchantStats(shopId: String, period: StatsPeriod = .today) -> MerchantStats {
        let shopOrders = orders.filter { $0.shopId == shopId }
        let calendar = Calendar.current
        let now = Date()

        let periodStart: Date
        switch period {
        case .today:
            periodStart = calendar.startOfDay(for: now)
        case .week:
            periodStart = calendar.date(byAdding: .day, value: -7, to: calendar.startOfDay(for: now)) ?? now
        case .month:
            periodStart = calendar.date(byAdding: .month, value: -1, to: calendar.startOfDay(for: now)) ?? now
        }

        let periodOrders = shopOrders.filter { $0.createdAt >= periodStart }

        return MerchantStats(
            todayOrders: periodOrders.count,
            todayRevenue: periodOrders.reduce(0) { $0 + $1.total },
            pendingOrders: shopOrders.filter { $0.status == .pending || $0.status == .confirmed || $0.status == .preparing }.count,
            totalProducts: products.filter { $0.shopId == shopId }.count
        )
    }

    /// Computes aggregated statistics for a driver based on the local deliveries cache.
    ///
    /// - Parameter driverId: The Firebase UID of the driver.
    /// - Returns: A `DriverStats` instance with delivery counts and earnings.
    func getDriverStats(driverId: String) -> DriverStats {
        let driverDeliveries = deliveries.filter { $0.driverId == driverId }
        let today = Calendar.current.startOfDay(for: Date())
        let todayDeliveries = driverDeliveries.filter { $0.status == .delivered && ($0.deliveredAt ?? Date.distantPast) >= today }

        return DriverStats(
            todayDeliveries: todayDeliveries.count,
            todayEarnings: todayDeliveries.reduce(0) { $0 + $1.earnings },
            totalDeliveries: driverDeliveries.filter { $0.status == .delivered }.count,
            rating: 4.8
        )
    }
}

// MARK: - Cart Manager

/// Manages the user's shopping cart, enforcing single-shop ordering.
///
/// `CartManager` wraps a `Cart` value type and provides convenience methods
/// for adding, removing, and updating items. If a product from a different shop
/// is added, the cart is automatically cleared first.
///
/// Also provides computed properties for subtotal, delivery fee, total, and
/// age-restriction checks for KYC-gated products.
@MainActor
final class CartManager: ObservableObject {
    /// The underlying cart data structure.
    @Published var cart = Cart()
    /// The ID of the shop whose products are currently in the cart.
    @Published var currentShopId: String?
    /// The display name of the shop whose products are currently in the cart.
    @Published var currentShopName: String?

    /// Adds a product to the cart, clearing the cart first if switching shops.
    ///
    /// - Parameters:
    ///   - product: The `Product` to add.
    ///   - quantity: Number of units to add. Defaults to 1.
    func addToCart(_ product: Product, quantity: Int = 1) {
        if let currentShop = currentShopId, currentShop != product.shopId {
            cart.clear()
        }

        currentShopId = product.shopId
        currentShopName = DataService.shared.getShop(id: product.shopId)?.name

        let cartProduct = CartProduct(
            id: product.id,
            name: product.name,
            price: product.price,
            isRestricted: product.isRestricted,
            minimumAge: product.minimumAge
        )
        cart.add(cartProduct, quantity: quantity)
    }

    /// Removes a product from the cart by its ID. Clears shop context if the cart becomes empty.
    ///
    /// - Parameter productId: The ID of the product to remove.
    func removeFromCart(_ productId: String) {
        cart.remove(productId)
        if cart.isEmpty {
            currentShopId = nil
            currentShopName = nil
        }
    }

    /// Updates the quantity of a product in the cart. Removes the product if quantity is zero or less.
    ///
    /// - Parameters:
    ///   - productId: The ID of the product to update.
    ///   - quantity: The new quantity.
    func updateQuantity(_ productId: String, quantity: Int) {
        cart.updateQuantity(productId, quantity: quantity)
        if cart.isEmpty {
            currentShopId = nil
            currentShopName = nil
        }
    }

    func clearCart() {
        cart.clear()
        currentShopId = nil
        currentShopName = nil
    }

    var subtotal: Double {
        cart.items.reduce(0) { $0 + ($1.product.price * Double($1.quantity)) }
    }

    var deliveryFee: Double {
        guard let shopId = currentShopId,
              let shop = DataService.shared.getShop(id: shopId) else { return 0 }
        return shop.deliveryFee
    }

    var total: Double {
        subtotal + deliveryFee
    }

    /// Returns true if cart contains any age-restricted products
    var hasRestrictedProducts: Bool {
        cart.items.contains { $0.product.isRestricted }
    }

    /// Returns the list of restricted product names in the cart
    var restrictedProductNames: [String] {
        cart.items.filter { $0.product.isRestricted }.map { $0.product.name }
    }

    /// Checks if user can checkout with restricted products (must be verified adult)
    func canCheckoutWithRestrictedProducts() -> Bool {
        guard hasRestrictedProducts else { return true }
        return KYCService.shared.verificationStatus == .approved
    }
}

struct Cart: Equatable {
    var items: [CartItem] = []
    var isEmpty: Bool { items.isEmpty }
    var itemCount: Int { items.reduce(0) { $0 + $1.quantity } }

    mutating func add(_ product: CartProduct, quantity: Int = 1) {
        if let index = items.firstIndex(where: { $0.product.id == product.id }) {
            items[index].quantity += quantity
        } else {
            items.append(CartItem(product: product, quantity: quantity))
        }
    }

    mutating func remove(_ productId: String) {
        items.removeAll { $0.product.id == productId }
    }

    mutating func updateQuantity(_ productId: String, quantity: Int) {
        if quantity <= 0 {
            remove(productId)
        } else if let index = items.firstIndex(where: { $0.product.id == productId }) {
            items[index].quantity = quantity
        }
    }

    mutating func clear() {
        items.removeAll()
    }
}

struct CartItem: Identifiable, Equatable {
    let id = UUID().uuidString
    var product: CartProduct
    var quantity: Int
}

struct CartProduct: Identifiable, Equatable {
    let id: String
    var name: String
    var price: Double
    var isRestricted: Bool = false
    var minimumAge: Int? = nil
}

// MARK: - Location Manager
final class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    @Published var location: CLLocationCoordinate2D?
    @Published var heading: Double?
    @Published var speed: Double?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 10 // Update every 10 meters
    }

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    func startUpdating() {
        manager.startUpdatingLocation()
        if CLLocationManager.headingAvailable() {
            manager.startUpdatingHeading()
        }
    }

    func stopUpdating() {
        manager.stopUpdatingLocation()
        manager.stopUpdatingHeading()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let lastLocation = locations.last else { return }
        location = lastLocation.coordinate
        speed = lastLocation.speed >= 0 ? lastLocation.speed : nil
        // Use course for heading when moving
        if lastLocation.course >= 0 {
            heading = lastLocation.course
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        // Use true heading if available, otherwise magnetic
        if newHeading.trueHeading >= 0 {
            heading = newHeading.trueHeading
        } else if newHeading.magneticHeading >= 0 {
            heading = newHeading.magneticHeading
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        if authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways {
            startUpdating()
        }
    }

    func distanceFrom(_ coordinate: CLLocationCoordinate2D) -> Double? {
        guard let userLocation = location else { return nil }
        let from = CLLocation(latitude: userLocation.latitude, longitude: userLocation.longitude)
        let to = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        return from.distance(from: to) / 1000
    }
}

// MARK: - Demo Data (Fallback when API is unavailable)
struct DemoData {
    static let shops: [Shop] = [
        Shop(
            id: "shop1",
            name: "GreenLeaf Paris",
            description: "CBD premium au coeur du 11eme",
            imageURL: "https://images.unsplash.com/photo-1616690710400-a16d146927c5?w=400",
            address: "11 Rue Pierre Levée, 75011 Paris",
            latitude: 48.8658,
            longitude: 2.3649,
            category: .cbd,
            rating: 4.8,
            reviewCount: 312,
            isOpen: true,
            deliveryFee: 2.99,
            minOrderAmount: 15.0,
            estimatedDeliveryTime: "20-30 min",
            ownerId: "merchant1"
        ),
        Shop(
            id: "shop2",
            name: "Le Chanvre Dore",
            description: "Boutique artisanale CBD pres de Republique",
            imageURL: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400",
            address: "25 Rue du Faubourg du Temple, 75010 Paris",
            latitude: 48.8683,
            longitude: 2.3648,
            category: .cbd,
            rating: 4.6,
            reviewCount: 245,
            isOpen: true,
            deliveryFee: 1.99,
            minOrderAmount: 10.0,
            estimatedDeliveryTime: "15-25 min",
            ownerId: "merchant2"
        ),
        Shop(
            id: "shop3",
            name: "CBD Factory Oberkampf",
            description: "Le plus grand choix de CBD a Oberkampf",
            imageURL: "https://images.unsplash.com/photo-1556928045-16f7f50be0f3?w=400",
            address: "78 Rue Oberkampf, 75011 Paris",
            latitude: 48.8651,
            longitude: 2.3781,
            category: .cbd,
            rating: 4.5,
            reviewCount: 189,
            isOpen: true,
            deliveryFee: 2.49,
            minOrderAmount: 12.0,
            estimatedDeliveryTime: "20-35 min",
            ownerId: "merchant3"
        ),
        Shop(
            id: "shop4",
            name: "Herbal House Belleville",
            description: "CBD bio et bien-etre a Belleville",
            imageURL: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400",
            address: "3 Rue Denoyez, 75020 Paris",
            latitude: 48.8716,
            longitude: 2.3802,
            category: .cbd,
            rating: 4.7,
            reviewCount: 156,
            isOpen: true,
            deliveryFee: 2.99,
            minOrderAmount: 15.0,
            estimatedDeliveryTime: "25-35 min",
            ownerId: "merchant4"
        )
    ]

    static let products: [Product] = [
        // Bio Market Paris products
        Product(id: "prod1", name: "Panier de légumes bio", description: "Assortiment de légumes de saison", price: 12.99, imageURL: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200", category: "Légumes", shopId: "shop1", isAvailable: true, stock: 25),
        Product(id: "prod2", name: "Lait d'amande bio", description: "1L - Sans sucres ajoutés", price: 3.49, imageURL: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200", category: "Boissons", shopId: "shop1", isAvailable: true, stock: 50),
        Product(id: "prod3", name: "Œufs fermiers x6", description: "Poules élevées en plein air", price: 4.99, imageURL: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200", category: "Frais", shopId: "shop1", isAvailable: true, stock: 30),
        Product(id: "prod4", name: "Pain complet bio", description: "500g - Farine de blé ancien", price: 3.99, imageURL: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200", category: "Boulangerie", shopId: "shop1", isAvailable: true, stock: 15),

        // Le Petit Boulanger products
        Product(id: "prod5", name: "Croissant au beurre", description: "Pur beurre AOP", price: 1.50, imageURL: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200", category: "Viennoiseries", shopId: "shop2", isAvailable: true, stock: 40),
        Product(id: "prod6", name: "Pain au chocolat", description: "Chocolat noir 70%", price: 1.70, imageURL: "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=200", category: "Viennoiseries", shopId: "shop2", isAvailable: true, stock: 35),
        Product(id: "prod7", name: "Baguette tradition", description: "Fabrication artisanale", price: 1.30, imageURL: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=200", category: "Pains", shopId: "shop2", isAvailable: true, stock: 50),
        Product(id: "prod8", name: "Tarte aux pommes", description: "Part individuelle", price: 4.50, imageURL: "https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=200", category: "Pâtisseries", shopId: "shop2", isAvailable: true, stock: 12),

        // Pharmacie products
        Product(id: "prod9", name: "Doliprane 1000mg", description: "Boîte de 8 comprimés", price: 2.99, imageURL: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200", category: "Médicaments", shopId: "shop3", isAvailable: true, stock: 100),
        Product(id: "prod10", name: "Vitamine C 500mg", description: "30 comprimés effervescents", price: 8.99, imageURL: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200", category: "Vitamines", shopId: "shop3", isAvailable: true, stock: 45),

        // Fleuriste products
        Product(id: "prod11", name: "Bouquet Romantique", description: "Roses rouges et gypsophile", price: 35.00, imageURL: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=200", category: "Bouquets", shopId: "shop4", isAvailable: true, stock: 10),
        Product(id: "prod12", name: "Orchidée Phalaenopsis", description: "En pot céramique", price: 29.99, imageURL: "https://images.unsplash.com/photo-1567748157439-651aca2ff064?w=200", category: "Plantes", shopId: "shop4", isAvailable: true, stock: 8)
    ]
}

// MARK: - Notification Service
import UserNotifications

@MainActor
final class NotificationService: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationService()

    @Published var isAuthorized = false
    @Published var pendingNotifications: [UNNotificationRequest] = []

    private override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
        checkAuthorizationStatus()
    }

    // MARK: - Authorization

    func requestAuthorization() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
            await MainActor.run {
                self.isAuthorized = granted
            }
            return granted
        } catch {
            return false
        }
    }

    func checkAuthorizationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            Task { @MainActor in
                self.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }

    // MARK: - Send Notifications

    func sendLocalNotification(title: String, body: String, delay: TimeInterval = 1) {
        guard isAuthorized else {
            return
        }

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.badge = 1

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
            } else {
            }
        }
    }

    func sendOrderStatusNotification(order: Order) {
        let title: String
        let body: String

        switch order.status {
        case .confirmed:
            title = "Commande confirmée"
            body = "Votre commande #\(order.id.prefix(8)) a été confirmée par le marchand"
        case .preparing:
            title = "Préparation en cours"
            body = "Votre commande est en cours de préparation"
        case .ready:
            title = "Commande prête"
            body = "Votre commande est prête et attend un livreur"
        case .pickedUp:
            title = "Livreur en route"
            body = "Votre commande a été récupérée et arrive bientôt !"
        case .delivering:
            title = "Livraison en cours"
            body = "Le livreur est en chemin vers vous"
        case .delivered:
            title = "Commande livrée"
            body = "Votre commande a été livrée. Bon appétit !"
        case .cancelled:
            title = "Commande annulée"
            body = "Votre commande a été annulée"
        default:
            return
        }

        sendLocalNotification(title: title, body: body)
    }

    func sendNewOrderNotification(forMerchant shopName: String, orderTotal: Double) {
        sendLocalNotification(
            title: "Nouvelle commande !",
            body: "Vous avez reçu une commande de \(String(format: "%.2f", orderTotal))€"
        )
    }

    func sendDeliveryAvailableNotification(count: Int) {
        sendLocalNotification(
            title: "Livraisons disponibles",
            body: "\(count) nouvelle(s) livraison(s) à proximité"
        )
    }

    // MARK: - Clear Notifications

    func clearBadge() {
        UNUserNotificationCenter.current().setBadgeCount(0) { error in
            if let error = error {
            }
        }
    }

    func clearAllNotifications() {
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        clearBadge()
    }

    // MARK: - UNUserNotificationCenterDelegate

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        // Handle notification tap
        completionHandler()
    }
}

// MARK: - Favorites Manager
@MainActor
final class FavoritesManager: ObservableObject {
    static let shared = FavoritesManager()

    @Published var favoriteShopIds: Set<String> = []
    @Published var favoriteProductIds: Set<String> = []

    private let shopsFavoritesKey = "favoriteShops"
    private let productsFavoritesKey = "favoriteProducts"

    private init() {
        loadFavorites()
    }

    // MARK: - Shops

    func isFavorite(shopId: String) -> Bool {
        favoriteShopIds.contains(shopId)
    }

    func toggleFavorite(shopId: String) {
        if favoriteShopIds.contains(shopId) {
            favoriteShopIds.remove(shopId)
        } else {
            favoriteShopIds.insert(shopId)
        }
        saveFavorites()
    }

    func addFavoriteShop(_ shopId: String) {
        favoriteShopIds.insert(shopId)
        saveFavorites()
    }

    func removeFavoriteShop(_ shopId: String) {
        favoriteShopIds.remove(shopId)
        saveFavorites()
    }

    // MARK: - Products

    func isFavorite(productId: String) -> Bool {
        favoriteProductIds.contains(productId)
    }

    func toggleFavorite(productId: String) {
        if favoriteProductIds.contains(productId) {
            favoriteProductIds.remove(productId)
        } else {
            favoriteProductIds.insert(productId)
        }
        saveFavorites()
    }

    // MARK: - Persistence

    private func loadFavorites() {
        if let shopIds = UserDefaults.standard.array(forKey: shopsFavoritesKey) as? [String] {
            favoriteShopIds = Set(shopIds)
        }
        if let productIds = UserDefaults.standard.array(forKey: productsFavoritesKey) as? [String] {
            favoriteProductIds = Set(productIds)
        }
    }

    private func saveFavorites() {
        UserDefaults.standard.set(Array(favoriteShopIds), forKey: shopsFavoritesKey)
        UserDefaults.standard.set(Array(favoriteProductIds), forKey: productsFavoritesKey)
    }

    // MARK: - Get Favorite Shops

    func getFavoriteShops() -> [Shop] {
        DataService.shared.shops.filter { favoriteShopIds.contains($0.id) }
    }

    func getFavoriteProducts() -> [Product] {
        DataService.shared.products.filter { favoriteProductIds.contains($0.id) }
    }
}

// MARK: - Review Manager
@MainActor
final class ReviewManager: ObservableObject {
    static let shared = ReviewManager()

    @Published var reviews: [Review] = []
    @Published var isLoading = false

    private let db = Firestore.firestore()

    private init() {}

    struct Review: Identifiable, Codable {
        let id: String
        let orderId: String
        let shopId: String
        let userId: String
        let userName: String
        let rating: Int // 1-5
        let comment: String
        let createdAt: Date

        var ratingStars: String {
            String(repeating: "★", count: rating) + String(repeating: "☆", count: 5 - rating)
        }
    }

    func submitReview(orderId: String, shopId: String, rating: Int, comment: String) async throws {
        guard let user = AuthService.shared.userProfile else {
            throw NSError(domain: "ReviewManager", code: 401, userInfo: [NSLocalizedDescriptionKey: "User not authenticated"])
        }

        isLoading = true

        let reviewData: [String: Any] = [
            "orderId": orderId,
            "shopId": shopId,
            "userId": user.id,
            "userName": user.name,
            "rating": rating,
            "comment": comment,
            "createdAt": Timestamp(date: Date())
        ]

        do {
            let docRef = try await db.collection("reviews").addDocument(data: reviewData)

            let newReview = Review(
                id: docRef.documentID,
                orderId: orderId,
                shopId: shopId,
                userId: user.id,
                userName: user.name,
                rating: rating,
                comment: comment,
                createdAt: Date()
            )

            reviews.append(newReview)

            // Update shop rating (simplified - in production would use Cloud Functions)
            await updateShopRating(shopId: shopId)

            NotificationService.shared.sendLocalNotification(
                title: "Merci pour votre avis !",
                body: "Votre évaluation a été enregistrée."
            )
        } catch {
            throw error
        }

        isLoading = false
    }

    func loadReviews(forShop shopId: String) async {
        isLoading = true

        do {
            let snapshot = try await db.collection("reviews")
                .whereField("shopId", isEqualTo: shopId)
                .order(by: "createdAt", descending: true)
                .limit(to: 20)
                .getDocuments()

            var loadedReviews: [Review] = []

            for document in snapshot.documents {
                let data = document.data()
                let review = Review(
                    id: document.documentID,
                    orderId: data["orderId"] as? String ?? "",
                    shopId: data["shopId"] as? String ?? "",
                    userId: data["userId"] as? String ?? "",
                    userName: data["userName"] as? String ?? "Anonyme",
                    rating: data["rating"] as? Int ?? 5,
                    comment: data["comment"] as? String ?? "",
                    createdAt: (data["createdAt"] as? Timestamp)?.dateValue() ?? Date()
                )
                loadedReviews.append(review)
            }

            reviews = loadedReviews
        } catch {
        }

        isLoading = false
    }

    func hasReviewed(orderId: String) -> Bool {
        reviews.contains { $0.orderId == orderId }
    }

    private func updateShopRating(shopId: String) async {
        // Calculate average rating for the shop
        let shopReviews = reviews.filter { $0.shopId == shopId }
        guard !shopReviews.isEmpty else { return }

        let averageRating = Double(shopReviews.reduce(0) { $0 + $1.rating }) / Double(shopReviews.count)

        try? await db.collection("shops").document(shopId).updateData([
            "rating": averageRating,
            "totalOrders": shopReviews.count
        ])
    }

    // Demo reviews for testing
    static let demoReviews: [Review] = [
        Review(id: "r1", orderId: "o1", shopId: "shop1", userId: "u1", userName: "Marie L.", rating: 5, comment: "Excellent ! Produits frais et livraison rapide.", createdAt: Date().addingTimeInterval(-86400)),
        Review(id: "r2", orderId: "o2", shopId: "shop1", userId: "u2", userName: "Pierre D.", rating: 4, comment: "Très bon service, je recommande.", createdAt: Date().addingTimeInterval(-172800)),
        Review(id: "r3", orderId: "o3", shopId: "shop2", userId: "u3", userName: "Sophie M.", rating: 5, comment: "Les meilleurs croissants de Paris !", createdAt: Date().addingTimeInterval(-259200))
    ]
}

// MARK: - Address Manager
@MainActor
final class AddressManager: ObservableObject {
    static let shared = AddressManager()

    @Published var addresses: [SavedAddress] = []
    @Published var selectedAddressId: String?

    private let userDefaultsKey = "savedAddresses"
    private let selectedAddressKey = "selectedAddressId"
    private let db = Firestore.firestore()

    struct SavedAddress: Identifiable, Codable, Equatable {
        let id: String
        var label: String // "Maison", "Travail", etc.
        var fullAddress: String
        var street: String
        var city: String
        var postalCode: String
        var country: String
        var latitude: Double
        var longitude: Double
        var isDefault: Bool
        var instructions: String?

        var coordinate: CLLocationCoordinate2D {
            CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        }

        static func == (lhs: SavedAddress, rhs: SavedAddress) -> Bool {
            lhs.id == rhs.id
        }

        var firestoreData: [String: Any] {
            var data: [String: Any] = [
                "label": label,
                "fullAddress": fullAddress,
                "street": street,
                "city": city,
                "postalCode": postalCode,
                "country": country,
                "latitude": latitude,
                "longitude": longitude,
                "isDefault": isDefault
            ]
            if let instructions = instructions {
                data["instructions"] = instructions
            }
            return data
        }
    }

    private init() {
        loadAddresses()
    }

    var defaultAddress: SavedAddress? {
        addresses.first { $0.isDefault } ?? addresses.first
    }

    var selectedAddress: SavedAddress? {
        if let id = selectedAddressId {
            return addresses.first { $0.id == id }
        }
        return defaultAddress
    }

    /// Loads addresses from Firestore and merges with local cache.
    func syncFromFirestore() async {
        guard let userId = AuthService.shared.userProfile?.id else { return }

        do {
            let snapshot = try await db.collection("users").document(userId)
                .collection("addresses").getDocuments()

            var remoteAddresses: [SavedAddress] = []
            for doc in snapshot.documents {
                let data = doc.data()
                let address = SavedAddress(
                    id: doc.documentID,
                    label: data["label"] as? String ?? "",
                    fullAddress: data["fullAddress"] as? String ?? "",
                    street: data["street"] as? String ?? "",
                    city: data["city"] as? String ?? "",
                    postalCode: data["postalCode"] as? String ?? "",
                    country: data["country"] as? String ?? "France",
                    latitude: data["latitude"] as? Double ?? 48.8566,
                    longitude: data["longitude"] as? Double ?? 2.3522,
                    isDefault: data["isDefault"] as? Bool ?? false,
                    instructions: data["instructions"] as? String
                )
                remoteAddresses.append(address)
            }

            // Merge: remote takes priority, add local-only addresses
            let remoteIds = Set(remoteAddresses.map { $0.id })
            let localOnly = addresses.filter { !remoteIds.contains($0.id) }
            addresses = remoteAddresses + localOnly

            // Upload local-only addresses to Firestore
            for addr in localOnly {
                try? await db.collection("users").document(userId)
                    .collection("addresses").document(addr.id).setData(addr.firestoreData)
            }

            saveToUserDefaults()
        } catch {
            // Keep local data on error
        }
    }

    func addAddress(_ address: SavedAddress) {
        var newAddress = address
        // If first address, make it default
        if addresses.isEmpty {
            newAddress = SavedAddress(
                id: address.id,
                label: address.label,
                fullAddress: address.fullAddress,
                street: address.street,
                city: address.city,
                postalCode: address.postalCode,
                country: address.country,
                latitude: address.latitude,
                longitude: address.longitude,
                isDefault: true,
                instructions: address.instructions
            )
        }
        addresses.append(newAddress)
        saveAddresses()
        syncAddressToFirestore(newAddress)
    }

    func updateAddress(_ address: SavedAddress) {
        if let index = addresses.firstIndex(where: { $0.id == address.id }) {
            addresses[index] = address
            saveAddresses()
            syncAddressToFirestore(address)
        }
    }

    func deleteAddress(id: String) {
        addresses.removeAll { $0.id == id }
        if selectedAddressId == id {
            selectedAddressId = defaultAddress?.id
        }
        saveAddresses()
        deleteAddressFromFirestore(id)
    }

    func setDefault(id: String) {
        for i in addresses.indices {
            addresses[i] = SavedAddress(
                id: addresses[i].id,
                label: addresses[i].label,
                fullAddress: addresses[i].fullAddress,
                street: addresses[i].street,
                city: addresses[i].city,
                postalCode: addresses[i].postalCode,
                country: addresses[i].country,
                latitude: addresses[i].latitude,
                longitude: addresses[i].longitude,
                isDefault: addresses[i].id == id,
                instructions: addresses[i].instructions
            )
        }
        saveAddresses()
        syncAllAddressesToFirestore()
    }

    func selectAddress(id: String) {
        selectedAddressId = id
        UserDefaults.standard.set(id, forKey: selectedAddressKey)
    }

    // MARK: - Local persistence (UserDefaults cache)

    private func saveAddresses() {
        saveToUserDefaults()
    }

    private func saveToUserDefaults() {
        if let encoded = try? JSONEncoder().encode(addresses) {
            UserDefaults.standard.set(encoded, forKey: userDefaultsKey)
        }
    }

    private func loadAddresses() {
        if let data = UserDefaults.standard.data(forKey: userDefaultsKey),
           let decoded = try? JSONDecoder().decode([SavedAddress].self, from: data) {
            addresses = decoded
        }
        selectedAddressId = UserDefaults.standard.string(forKey: selectedAddressKey)

        // Sync from Firestore in background
        Task {
            await syncFromFirestore()
        }
    }

    // MARK: - Firestore sync

    private func syncAddressToFirestore(_ address: SavedAddress) {
        guard let userId = AuthService.shared.userProfile?.id else { return }
        Task {
            try? await db.collection("users").document(userId)
                .collection("addresses").document(address.id).setData(address.firestoreData)
        }
    }

    private func deleteAddressFromFirestore(_ addressId: String) {
        guard let userId = AuthService.shared.userProfile?.id else { return }
        Task {
            try? await db.collection("users").document(userId)
                .collection("addresses").document(addressId).delete()
        }
    }

    private func syncAllAddressesToFirestore() {
        guard let userId = AuthService.shared.userProfile?.id else { return }
        Task {
            for address in addresses {
                try? await db.collection("users").document(userId)
                    .collection("addresses").document(address.id).setData(address.firestoreData)
            }
        }
    }

    // Create address from components
    func createAddress(label: String, street: String, city: String, postalCode: String, country: String = "France", instructions: String? = nil, coordinate: CLLocationCoordinate2D? = nil) -> SavedAddress {
        let fullAddress = "\(street), \(postalCode) \(city), \(country)"
        return SavedAddress(
            id: UUID().uuidString,
            label: label,
            fullAddress: fullAddress,
            street: street,
            city: city,
            postalCode: postalCode,
            country: country,
            latitude: coordinate?.latitude ?? 48.8566,
            longitude: coordinate?.longitude ?? 2.3522,
            isDefault: false,
            instructions: instructions
        )
    }

    /// Creates and saves an address from GPS coordinates using reverse geocoding.
    func addAddressFromLocation(_ coordinate: CLLocationCoordinate2D, label: String = "Ma position") async throws -> SavedAddress {
        let geocoder = CLGeocoder()
        let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        let placemarks = try await geocoder.reverseGeocodeLocation(location)

        guard let placemark = placemarks.first else {
            throw GeocodingService.GeocodingError.noResults
        }

        let street: String = {
            var s = ""
            if let num = placemark.subThoroughfare { s += num + " " }
            if let road = placemark.thoroughfare { s += road }
            return s.isEmpty ? "Position GPS" : s
        }()
        let city = placemark.locality ?? ""
        let postalCode = placemark.postalCode ?? ""
        let country = placemark.country ?? "France"
        let fullAddress = [street, "\(postalCode) \(city)", country]
            .filter { !$0.isEmpty }
            .joined(separator: ", ")

        let address = SavedAddress(
            id: UUID().uuidString,
            label: label,
            fullAddress: fullAddress,
            street: street,
            city: city,
            postalCode: postalCode,
            country: country,
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            isDefault: addresses.isEmpty,
            instructions: nil
        )
        addAddress(address)
        return address
    }
}

// MARK: - Promo Code Manager
@MainActor
final class PromoCodeManager: ObservableObject {
    static let shared = PromoCodeManager()

    @Published var appliedPromoCode: PromoCode?
    @Published var isValidating = false
    @Published var errorMessage: String?

    struct PromoCode: Identifiable, Codable {
        let id: String
        let code: String
        let discountType: DiscountType
        let discountValue: Double
        let minOrderAmount: Double?
        let maxDiscount: Double?
        let expiresAt: Date?
        let usageLimit: Int?
        let usedCount: Int

        enum DiscountType: String, Codable {
            case percentage
            case fixed
        }

        var isValid: Bool {
            if let expiresAt = expiresAt, expiresAt < Date() {
                return false
            }
            if let limit = usageLimit, usedCount >= limit {
                return false
            }
            return true
        }

        func calculateDiscount(forAmount amount: Double) -> Double {
            if let minAmount = minOrderAmount, amount < minAmount {
                return 0
            }

            var discount: Double
            switch discountType {
            case .percentage:
                discount = amount * (discountValue / 100)
            case .fixed:
                discount = discountValue
            }

            if let maxDiscount = maxDiscount {
                discount = min(discount, maxDiscount)
            }

            return min(discount, amount)
        }
    }

    private init() {}

    func validatePromoCode(_ code: String, orderAmount: Double) async -> Bool {
        isValidating = true
        errorMessage = nil

        // Simulate API call delay
        try? await Task.sleep(nanoseconds: 500_000_000)

        // Demo promo codes
        let validCodes: [String: PromoCode] = [
            "BIENVENUE": PromoCode(id: "p1", code: "BIENVENUE", discountType: .percentage, discountValue: 10, minOrderAmount: 15, maxDiscount: 5, expiresAt: nil, usageLimit: 1, usedCount: 0),
            "PROMO20": PromoCode(id: "p2", code: "PROMO20", discountType: .percentage, discountValue: 20, minOrderAmount: 30, maxDiscount: 15, expiresAt: Date().addingTimeInterval(86400 * 30), usageLimit: 100, usedCount: 45),
            "LIVRAISON": PromoCode(id: "p3", code: "LIVRAISON", discountType: .fixed, discountValue: 3.99, minOrderAmount: 20, maxDiscount: nil, expiresAt: nil, usageLimit: nil, usedCount: 0),
            "GREENDROP": PromoCode(id: "p4", code: "GREENDROP", discountType: .percentage, discountValue: 15, minOrderAmount: nil, maxDiscount: 10, expiresAt: nil, usageLimit: nil, usedCount: 0)
        ]

        let upperCode = code.uppercased()

        guard let promo = validCodes[upperCode] else {
            errorMessage = "Code promo invalide"
            isValidating = false
            return false
        }

        guard promo.isValid else {
            errorMessage = "Ce code promo a expiré ou n'est plus disponible"
            isValidating = false
            return false
        }

        if let minAmount = promo.minOrderAmount, orderAmount < minAmount {
            errorMessage = "Commande minimum de \(String(format: "%.2f", minAmount)) € requise"
            isValidating = false
            return false
        }

        appliedPromoCode = promo
        isValidating = false
        return true
    }

    func removePromoCode() {
        appliedPromoCode = nil
        errorMessage = nil
    }

    func getDiscount(forAmount amount: Double) -> Double {
        appliedPromoCode?.calculateDiscount(forAmount: amount) ?? 0
    }
}

// MARK: - Tip Manager
@MainActor
final class TipManager: ObservableObject {
    static let shared = TipManager()

    @Published var selectedTipOption: TipOption = .none
    @Published var customTipAmount: Double = 0

    enum TipOption: Equatable {
        case none
        case percentage(Int) // 5, 10, 15, 20
        case custom

        var displayName: String {
            switch self {
            case .none: return "Pas de pourboire"
            case .percentage(let value): return "\(value)%"
            case .custom: return "Personnalisé"
            }
        }
    }

    let tipOptions: [TipOption] = [.none, .percentage(5), .percentage(10), .percentage(15), .percentage(20), .custom]

    private init() {}

    func calculateTip(forAmount amount: Double) -> Double {
        switch selectedTipOption {
        case .none:
            return 0
        case .percentage(let percent):
            return amount * Double(percent) / 100
        case .custom:
            return customTipAmount
        }
    }

    func reset() {
        selectedTipOption = .none
        customTipAmount = 0
    }
}

// MARK: - Scheduled Delivery Manager
@MainActor
final class ScheduledDeliveryManager: ObservableObject {
    static let shared = ScheduledDeliveryManager()

    @Published var isScheduled = false
    @Published var scheduledDate: Date = Date()
    @Published var selectedTimeSlot: TimeSlot?

    struct TimeSlot: Identifiable, Equatable {
        let id: String
        let startTime: Date
        let endTime: Date
        let isAvailable: Bool

        var displayString: String {
            let formatter = DateFormatter()
            formatter.timeStyle = .short
            return "\(formatter.string(from: startTime)) - \(formatter.string(from: endTime))"
        }
    }

    private init() {}

    func getAvailableTimeSlots(for date: Date) -> [TimeSlot] {
        var slots: [TimeSlot] = []
        let calendar = Calendar.current

        // Generate time slots from 9:00 to 21:00
        for hour in stride(from: 9, to: 21, by: 1) {
            guard let startTime = calendar.date(bySettingHour: hour, minute: 0, second: 0, of: date),
                  let endTime = calendar.date(bySettingHour: hour + 1, minute: 0, second: 0, of: date) else {
                continue
            }

            // Check if slot is in the future (at least 1 hour from now)
            let isAvailable = startTime > Date().addingTimeInterval(3600)

            slots.append(TimeSlot(
                id: "\(date.formatted(date: .numeric, time: .omitted))-\(hour)",
                startTime: startTime,
                endTime: endTime,
                isAvailable: isAvailable
            ))
        }

        return slots
    }

    func reset() {
        isScheduled = false
        scheduledDate = Date()
        selectedTimeSlot = nil
    }
}

// MARK: - App Settings Manager
@MainActor
final class AppSettingsManager: ObservableObject {
    static let shared = AppSettingsManager()

    @Published var isDarkMode: Bool {
        didSet { UserDefaults.standard.set(isDarkMode, forKey: "isDarkMode") }
    }
    @Published var notificationsEnabled: Bool {
        didSet { UserDefaults.standard.set(notificationsEnabled, forKey: "notificationsEnabled") }
    }
    @Published var soundEnabled: Bool {
        didSet { UserDefaults.standard.set(soundEnabled, forKey: "soundEnabled") }
    }
    @Published var language: String {
        didSet { UserDefaults.standard.set(language, forKey: "appLanguage") }
    }

    let availableLanguages = [
        ("fr", "Français"),
        ("en", "English"),
        ("es", "Español"),
        ("de", "Deutsch")
    ]

    private init() {
        self.isDarkMode = UserDefaults.standard.bool(forKey: "isDarkMode")
        self.notificationsEnabled = UserDefaults.standard.object(forKey: "notificationsEnabled") as? Bool ?? true
        self.soundEnabled = UserDefaults.standard.object(forKey: "soundEnabled") as? Bool ?? true
        self.language = UserDefaults.standard.string(forKey: "appLanguage") ?? "fr"
    }

    func resetToDefaults() {
        isDarkMode = false
        notificationsEnabled = true
        soundEnabled = true
        language = "fr"
    }
}

// MARK: - Geocoding Service

final class GeocodingService {
    static let shared = GeocodingService()
    private let geocoder = CLGeocoder()

    func reverseGeocode(_ coordinate: CLLocationCoordinate2D) async throws -> String {
        let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        let placemarks = try await geocoder.reverseGeocodeLocation(location)
        guard let placemark = placemarks.first else {
            throw GeocodingError.noResults
        }
        return formatPlacemark(placemark)
    }

    func geocode(_ address: String) async throws -> (coordinate: CLLocationCoordinate2D, formattedAddress: String) {
        let placemarks = try await geocoder.geocodeAddressString(address)
        guard let placemark = placemarks.first,
              let location = placemark.location else {
            throw GeocodingError.noResults
        }
        return (location.coordinate, formatPlacemark(placemark))
    }

    private func formatPlacemark(_ placemark: CLPlacemark) -> String {
        var parts: [String] = []
        if let street = placemark.thoroughfare {
            if let number = placemark.subThoroughfare {
                parts.append("\(number) \(street)")
            } else {
                parts.append(street)
            }
        }
        if let postalCode = placemark.postalCode, let city = placemark.locality {
            parts.append("\(postalCode) \(city)")
        } else if let city = placemark.locality {
            parts.append(city)
        }
        if let country = placemark.country {
            parts.append(country)
        }
        return parts.joined(separator: ", ")
    }

    enum GeocodingError: LocalizedError {
        case noResults

        var errorDescription: String? {
            switch self {
            case .noResults:
                return "Adresse introuvable. Veuillez vérifier et réessayer."
            }
        }
    }
}

// MARK: - Address Search Completer

@MainActor
final class AddressSearchCompleter: NSObject, ObservableObject {
    @Published var query = "" {
        didSet {
            completer.queryFragment = query
        }
    }
    @Published var results: [MKLocalSearchCompletion] = []
    @Published var isSearching = false

    private let completer = MKLocalSearchCompleter()

    override init() {
        super.init()
        completer.delegate = self
        completer.resultTypes = .address
        // Focus on France region
        completer.region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 46.603354, longitude: 1.888334),
            span: MKCoordinateSpan(latitudeDelta: 10, longitudeDelta: 10)
        )
    }

    func selectResult(_ result: MKLocalSearchCompletion) async throws -> (address: String, coordinate: CLLocationCoordinate2D) {
        let request = MKLocalSearch.Request(completion: result)
        let search = MKLocalSearch(request: request)
        let response = try await search.start()
        guard let item = response.mapItems.first else {
            throw GeocodingService.GeocodingError.noResults
        }
        let address = [result.title, result.subtitle].filter { !$0.isEmpty }.joined(separator: ", ")
        return (address, item.placemark.coordinate)
    }

    func clear() {
        query = ""
        results = []
    }
}

extension AddressSearchCompleter: MKLocalSearchCompleterDelegate {
    nonisolated func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        Task { @MainActor in
            self.results = completer.results
            self.isSearching = false
        }
    }

    nonisolated func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        Task { @MainActor in
            self.isSearching = false
        }
    }
}
