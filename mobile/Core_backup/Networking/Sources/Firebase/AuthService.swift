import Foundation
import FirebaseAuth
import FirebaseFirestore
import Domain
import Common

// MARK: - Auth Service
public final class AuthService: ObservableObject {
    public static let shared = AuthService()

    @Published public private(set) var currentUser: FirebaseAuth.User?
    @Published public private(set) var userProfile: User?
    @Published public private(set) var isLoading = false
    @Published public private(set) var error: AppError?

    private let auth = FirebaseManager.shared.auth
    private let firestore = FirebaseManager.shared.firestore
    private var authStateListener: AuthStateDidChangeListenerHandle?

    private init() {
        setupAuthStateListener()
    }

    deinit {
        if let listener = authStateListener {
            auth.removeStateDidChangeListener(listener)
        }
    }

    // MARK: - Auth State Listener
    private func setupAuthStateListener() {
        authStateListener = auth.addStateDidChangeListener { [weak self] _, user in
            self?.currentUser = user
            if let user = user {
                Task {
                    await self?.fetchUserProfile(userId: user.uid)
                }
            } else {
                self?.userProfile = nil
            }
        }
    }

    // MARK: - Public Properties
    public var isAuthenticated: Bool {
        currentUser != nil
    }

    public var userId: String? {
        currentUser?.uid
    }

    public var userEmail: String? {
        currentUser?.email
    }

    public var userRole: String {
        userProfile?.role ?? "user"
    }

    public var isDriver: Bool {
        userProfile?.isDriver ?? false
    }

    public var isClient: Bool {
        userProfile?.isClient ?? false
    }

    // MARK: - Sign In
    @MainActor
    public func signIn(email: String, password: String) async throws {
        isLoading = true
        error = nil

        do {
            let result = try await auth.signIn(withEmail: email, password: password)
            currentUser = result.user
            await fetchUserProfile(userId: result.user.uid)
            isLoading = false
        } catch let authError as NSError {
            isLoading = false
            let appError = mapAuthError(authError)
            error = appError
            throw appError
        }
    }

    // MARK: - Sign Up
    @MainActor
    public func signUp(email: String, password: String, name: String, role: String = "user") async throws {
        isLoading = true
        error = nil

        do {
            let result = try await auth.createUser(withEmail: email, password: password)
            currentUser = result.user

            // Create user profile in Firestore
            let newUser = User(
                id: result.user.uid,
                email: email,
                name: name,
                role: role,
                status: "pending"
            )

            try await createUserProfile(newUser)
            userProfile = newUser
            isLoading = false
        } catch let authError as NSError {
            isLoading = false
            let appError = mapAuthError(authError)
            error = appError
            throw appError
        }
    }

    // MARK: - Sign Out
    @MainActor
    public func signOut() throws {
        do {
            try auth.signOut()
            currentUser = nil
            userProfile = nil
        } catch {
            throw AppError.auth("Erreur lors de la déconnexion")
        }
    }

    // MARK: - Reset Password
    public func resetPassword(email: String) async throws {
        do {
            try await auth.sendPasswordReset(withEmail: email)
        } catch let authError as NSError {
            throw mapAuthError(authError)
        }
    }

    // MARK: - Get ID Token
    public func getIdToken() async throws -> String {
        guard let user = currentUser else {
            throw AppError.auth("Utilisateur non connecté")
        }
        return try await user.getIDToken()
    }

    // MARK: - Fetch User Profile
    @MainActor
    private func fetchUserProfile(userId: String) async {
        do {
            let document = try await firestore.collection("users").document(userId).getDocument()
            if let data = document.data() {
                userProfile = User(id: userId, data: data)
            }
        } catch {
            print("Error fetching user profile: \(error)")
        }
    }

    // MARK: - Create User Profile
    private func createUserProfile(_ user: User) async throws {
        try await firestore.collection("users").document(user.id).setData(user.toFirestoreData)
    }

    // MARK: - Update User Profile
    @MainActor
    public func updateProfile(name: String? = nil, phone: String? = nil) async throws {
        guard let userId = userId else {
            throw AppError.auth("Utilisateur non connecté")
        }

        var updates: [String: Any] = [:]
        if let name = name { updates["name"] = name }
        if let phone = phone { updates["phone"] = phone }

        if !updates.isEmpty {
            try await firestore.collection("users").document(userId).updateData(updates)
            await fetchUserProfile(userId: userId)
        }
    }

    // MARK: - Error Mapping
    private func mapAuthError(_ error: NSError) -> AppError {
        switch error.code {
        case AuthErrorCode.invalidEmail.rawValue:
            return .auth("Adresse email invalide")
        case AuthErrorCode.wrongPassword.rawValue:
            return .auth("Mot de passe incorrect")
        case AuthErrorCode.userNotFound.rawValue:
            return .auth("Aucun compte trouvé avec cette adresse email")
        case AuthErrorCode.emailAlreadyInUse.rawValue:
            return .auth("Cette adresse email est déjà utilisée")
        case AuthErrorCode.weakPassword.rawValue:
            return .auth("Le mot de passe doit contenir au moins 6 caractères")
        case AuthErrorCode.networkError.rawValue:
            return .network("Vérifiez votre connexion internet")
        case AuthErrorCode.tooManyRequests.rawValue:
            return .auth("Trop de tentatives. Réessayez plus tard.")
        case AuthErrorCode.invalidCredential.rawValue:
            return .auth("Email ou mot de passe incorrect")
        default:
            return .auth("Erreur d'authentification: \(error.localizedDescription)")
        }
    }
}
