import Foundation

// MARK: - App Result Type
public enum AppResult<T> {
    case success(T)
    case failure(AppError)

    public var value: T? {
        if case .success(let value) = self {
            return value
        }
        return nil
    }

    public var error: AppError? {
        if case .failure(let error) = self {
            return error
        }
        return nil
    }

    public var isSuccess: Bool {
        if case .success = self {
            return true
        }
        return false
    }

    public func map<U>(_ transform: (T) -> U) -> AppResult<U> {
        switch self {
        case .success(let value):
            return .success(transform(value))
        case .failure(let error):
            return .failure(error)
        }
    }
}

// MARK: - App Error
public enum AppError: Error, LocalizedError {
    case network(String)
    case auth(String)
    case validation(String)
    case notFound(String)
    case forbidden(String)
    case server(String)
    case unknown(String)

    public var errorDescription: String? {
        switch self {
        case .network(let message):
            return "Erreur réseau: \(message)"
        case .auth(let message):
            return "Erreur d'authentification: \(message)"
        case .validation(let message):
            return "Erreur de validation: \(message)"
        case .notFound(let message):
            return "Non trouvé: \(message)"
        case .forbidden(let message):
            return "Accès refusé: \(message)"
        case .server(let message):
            return "Erreur serveur: \(message)"
        case .unknown(let message):
            return "Erreur: \(message)"
        }
    }

    public var localizedMessage: String {
        switch self {
        case .network:
            return "Vérifiez votre connexion internet"
        case .auth(let message):
            return message
        case .validation(let message):
            return message
        case .notFound:
            return "La ressource demandée n'existe pas"
        case .forbidden:
            return "Vous n'avez pas les droits nécessaires"
        case .server:
            return "Une erreur serveur est survenue"
        case .unknown:
            return "Une erreur inattendue est survenue"
        }
    }

    public static func from(_ error: Error) -> AppError {
        if let appError = error as? AppError {
            return appError
        }
        return .unknown(error.localizedDescription)
    }
}

// MARK: - Loading State
public enum LoadingState<T> {
    case idle
    case loading
    case success(T)
    case error(AppError)

    public var isLoading: Bool {
        if case .loading = self { return true }
        return false
    }

    public var value: T? {
        if case .success(let value) = self { return value }
        return nil
    }

    public var error: AppError? {
        if case .error(let error) = self { return error }
        return nil
    }
}
