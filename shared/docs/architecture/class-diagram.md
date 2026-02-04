# Diagramme de Classes - GreenDrop

Ce diagramme représente les entités principales du système GreenDrop et leurs relations.

```mermaid
classDiagram
    %% Entités principales
    class User {
        +String id
        +String email
        +String displayName
        +String firstName
        +String lastName
        +String phone
        +String address
        +UserRole role
        +UserStatus status
        +Float rating
        +Int reviewCount
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Order {
        +String id
        +String reference
        +String userId
        +String shopId
        +String driverId
        +OrderItem[] items
        +Float total
        +Float deliveryFee
        +OrderStatus status
        +PaymentMethod paymentMethod
        +PaymentStatus paymentStatus
        +String deliveryAddress
        +GeoPoint deliveryLocation
        +String notes
        +String deliveryPhoto
        +DateTime estimatedDeliveryTime
        +Timeline[] timeline
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Shop {
        +String id
        +String name
        +String description
        +String ownerId
        +String address
        +GeoPoint location
        +String category
        +String[] openingHours
        +Float rating
        +Int reviewCount
        +Boolean isActive
        +String stripeAccountId
        +DateTime createdAt
    }

    class Product {
        +String id
        +String shopId
        +String name
        +String description
        +Float price
        +String unit
        +String category
        +String imageUrl
        +Boolean isAvailable
        +Int stock
        +DateTime createdAt
    }

    class Driver {
        +String id
        +String userId
        +String vehicleType
        +String vehiclePlate
        +Boolean isAvailable
        +GeoPoint currentLocation
        +Float rating
        +Int reviewCount
        +Int completedDeliveries
        +Float totalEarnings
        +String stripeAccountId
        +DateTime createdAt
    }

    class Review {
        +String id
        +String orderId
        +String userId
        +String targetType
        +String targetId
        +Int rating
        +String comment
        +DateTime createdAt
    }

    class Chat {
        +String id
        +String orderId
        +String[] participants
        +DateTime createdAt
    }

    class Message {
        +String id
        +String chatId
        +String senderId
        +String content
        +MessageType type
        +DateTime createdAt
    }

    class Dispute {
        +String id
        +String orderId
        +String userId
        +String driverId
        +DisputeType type
        +String description
        +DisputeStatus status
        +String resolution
        +DateTime createdAt
        +DateTime resolvedAt
    }

    class Notification {
        +String id
        +String userId
        +NotificationType type
        +String title
        +String body
        +Boolean isRead
        +DateTime createdAt
        +DateTime readAt
    }

    %% Enums
    class UserRole {
        <<enumeration>>
        admin
        user
        driver
        merchant
    }

    class UserStatus {
        <<enumeration>>
        pending
        verified
        suspended
    }

    class OrderStatus {
        <<enumeration>>
        pending
        confirmed
        preparing
        ready
        assigned
        delivering
        delivered
        cancelled
    }

    class PaymentStatus {
        <<enumeration>>
        pending
        paid
        failed
        refunded
    }

    class PaymentMethod {
        <<enumeration>>
        card
        cash
    }

    %% Relations
    User "1" --> "*" Order : passe
    User "1" --> "0..1" Driver : est
    User "1" --> "0..*" Shop : possède
    User "1" --> "*" Review : écrit
    User "1" --> "*" Notification : reçoit

    Shop "1" --> "*" Product : contient
    Shop "1" --> "*" Order : reçoit

    Order "1" --> "*" OrderItem : contient
    Order "1" --> "0..1" Driver : assigné à
    Order "1" --> "0..1" Chat : a
    Order "1" --> "0..*" Review : reçoit
    Order "1" --> "0..*" Dispute : peut avoir

    Chat "1" --> "*" Message : contient

    Driver "1" --> "*" Order : livre
    Driver "1" --> "*" Review : reçoit

    class OrderItem {
        +String productId
        +String name
        +Float price
        +Int quantity
    }

    class Timeline {
        +OrderStatus status
        +DateTime timestamp
        +String note
    }

    class GeoPoint {
        +Float latitude
        +Float longitude
    }
```

## Description des Entités

### User (Utilisateur)
Représente tous les utilisateurs du système avec leurs informations de profil et leur rôle (admin, user, driver, merchant).

### Order (Commande)
Entité centrale représentant une commande avec son cycle de vie complet, du panier à la livraison.

### Shop (Boutique)
Boutique/commerce partenaire qui propose des produits. Appartient à un merchant.

### Product (Produit)
Article disponible à la vente dans une boutique.

### Driver (Livreur)
Profil spécifique aux utilisateurs ayant le rôle de livreur, avec leurs informations de véhicule et statistiques.

### Review (Avis)
Système d'évaluation permettant aux clients de noter les livreurs/boutiques et aux livreurs de noter les clients.

### Chat / Message
Système de messagerie en temps réel lié à une commande.

### Dispute (Litige)
Gestion des réclamations et problèmes sur les commandes.

### Notification
Système de notifications push pour informer les utilisateurs.
