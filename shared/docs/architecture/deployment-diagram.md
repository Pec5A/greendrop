# Diagramme de Déploiement - GreenDrop

## Architecture Cloud

```mermaid
C4Deployment
    title Diagramme de Déploiement GreenDrop

    Deployment_Node(mobile, "Appareils Mobiles", "iOS 15+") {
        Container(ios_app, "GreenDrop iOS", "Swift/SwiftUI", "Application mobile native")
    }

    Deployment_Node(browser, "Navigateur Web", "Chrome/Safari/Firefox") {
        Container(web_app, "Dashboard Admin", "React/Next.js", "Interface d'administration")
    }

    Deployment_Node(vercel, "Vercel", "Edge Network") {
        Deployment_Node(serverless, "Serverless Functions") {
            Container(api, "API Routes", "Next.js API Routes", "Backend serverless")
        }
        Deployment_Node(cdn, "CDN Global") {
            Container(static, "Assets Statiques", "Next.js Static", "HTML/CSS/JS optimisés")
        }
    }

    Deployment_Node(firebase, "Google Cloud / Firebase", "GCP") {
        Deployment_Node(auth_node, "Firebase Auth") {
            Container(auth, "Authentication", "Firebase Auth", "JWT, Email/Password")
        }
        Deployment_Node(db_node, "Cloud Firestore") {
            ContainerDb(firestore, "Base de données", "Firestore", "NoSQL temps réel")
        }
        Deployment_Node(storage_node, "Cloud Storage") {
            Container(storage, "Fichiers", "Firebase Storage", "Images, photos livraison")
        }
        Deployment_Node(fcm_node, "Cloud Messaging") {
            Container(fcm, "Push Notifications", "FCM", "Notifications temps réel")
        }
    }

    Deployment_Node(stripe_cloud, "Stripe", "PCI DSS Compliant") {
        Container(stripe, "Payments", "Stripe API", "Paiements & Connect")
    }

    Rel(ios_app, api, "HTTPS/REST", "Bearer JWT")
    Rel(ios_app, firestore, "WebSocket", "Real-time sync")
    Rel(ios_app, auth, "Firebase SDK", "Auth")
    Rel(ios_app, fcm, "APNs", "Push")

    Rel(web_app, api, "HTTPS/REST", "Bearer JWT")
    Rel(web_app, firestore, "WebSocket", "Real-time")

    Rel(api, firestore, "Admin SDK", "Server-side")
    Rel(api, auth, "Admin SDK", "Verify tokens")
    Rel(api, storage, "Admin SDK", "Upload files")
    Rel(api, fcm, "Admin SDK", "Send notifications")
    Rel(api, stripe, "HTTPS", "API Key")

    Rel(stripe, api, "Webhook", "Events")
```

## Architecture Détaillée

```mermaid
flowchart TB
    subgraph Clients["📱 Clients"]
        iOS["iOS App\n(Swift/SwiftUI)"]
        Web["Admin Dashboard\n(Next.js)"]
    end

    subgraph Vercel["☁️ Vercel Platform"]
        subgraph Edge["Edge Network (Global)"]
            CDN["CDN\n(Static Assets)"]
            Middleware["Edge Middleware\n(Auth check)"]
        end

        subgraph Serverless["Serverless Functions"]
            API_Orders["API: /orders\n(CRUD commandes)"]
            API_Shops["API: /shops\n(Géolocalisation)"]
            API_Drivers["API: /drivers\n(Location updates)"]
            API_Payments["API: /payments\n(Stripe intents)"]
            API_Reviews["API: /reviews\n(Évaluations)"]
            API_Export["API: /users/export\n(RGPD)"]
            API_Upload["API: /upload\n(Files)"]
            API_Notif["API: /notifications\n(FCM)"]
            Webhook["Stripe Webhook\n(Events handler)"]
        end
    end

    subgraph Firebase["🔥 Firebase / GCP"]
        Auth["Firebase Auth\n(JWT tokens)"]
        Firestore["Cloud Firestore\n(Real-time DB)"]
        Storage["Cloud Storage\n(Images/Files)"]
        FCM["Cloud Messaging\n(Push notifications)"]
    end

    subgraph Stripe["💳 Stripe"]
        Payments["Payments API\n(PaymentIntents)"]
        Connect["Stripe Connect\n(Marketplace)"]
        Webhooks_Stripe["Webhooks\n(payment.succeeded)"]
    end

    %% Client connections
    iOS -->|REST API| Middleware
    iOS -->|Real-time| Firestore
    iOS -->|Auth| Auth
    iOS -->|Push| FCM

    Web -->|REST API| Middleware
    Web -->|Real-time| Firestore

    %% Middleware to API
    Middleware --> API_Orders
    Middleware --> API_Shops
    Middleware --> API_Drivers
    Middleware --> API_Payments
    Middleware --> API_Reviews
    Middleware --> API_Export
    Middleware --> API_Upload
    Middleware --> API_Notif

    %% API to Firebase
    API_Orders --> Firestore
    API_Shops --> Firestore
    API_Drivers --> Firestore
    API_Reviews --> Firestore
    API_Export --> Firestore
    API_Upload --> Storage
    API_Notif --> FCM

    %% Stripe flow
    API_Payments --> Payments
    API_Payments --> Connect
    Webhooks_Stripe --> Webhook
    Webhook --> Firestore

    %% Auth validation
    API_Orders -.->|Verify JWT| Auth
    API_Payments -.->|Verify JWT| Auth

    classDef client fill:#e1f5fe
    classDef vercel fill:#f3e5f5
    classDef firebase fill:#fff3e0
    classDef stripe fill:#e8f5e9

    class iOS,Web client
    class CDN,Middleware,API_Orders,API_Shops,API_Drivers,API_Payments,API_Reviews,API_Export,API_Upload,API_Notif,Webhook vercel
    class Auth,Firestore,Storage,FCM firebase
    class Payments,Connect,Webhooks_Stripe stripe
```

## Sécurité et Flux de Données

```mermaid
flowchart LR
    subgraph Security["🔒 Couches de Sécurité"]
        direction TB
        L1["1. HTTPS/TLS\n(Transport)"]
        L2["2. JWT Tokens\n(Authentication)"]
        L3["3. RBAC\n(Authorization)"]
        L4["4. Firestore Rules\n(Data access)"]
        L5["5. Input Validation\n(Zod schemas)"]
    end

    subgraph DataFlow["📊 Flux de Données"]
        Client["Client Request"]
        Edge["Edge Middleware"]
        Validate["Zod Validation"]
        Auth_Check["JWT Verification"]
        Role_Check["Role Authorization"]
        DB_Rules["Firestore Rules"]
        Data["Data Access"]
    end

    Client --> Edge
    Edge --> Auth_Check
    Auth_Check --> Role_Check
    Role_Check --> Validate
    Validate --> DB_Rules
    DB_Rules --> Data

    L1 -.-> Edge
    L2 -.-> Auth_Check
    L3 -.-> Role_Check
    L5 -.-> Validate
    L4 -.-> DB_Rules
```

## Collections Firestore

```mermaid
erDiagram
    users ||--o{ orders : "passe"
    users ||--o| drivers : "est"
    users ||--o{ shops : "possède"
    users ||--o{ reviews : "écrit"
    users ||--o{ notifications : "reçoit"
    users ||--o{ favorites : "a"

    shops ||--o{ products : "contient"
    shops ||--o{ orders : "reçoit"

    orders ||--o{ reviews : "reçoit"
    orders ||--o| chats : "a"
    orders ||--o{ disputes : "peut avoir"

    drivers ||--o{ orders : "livre"
    drivers ||--o{ reviews : "reçoit"

    chats ||--o{ messages : "contient"

    users {
        string id PK
        string email
        string role
        string status
        timestamp createdAt
    }

    orders {
        string id PK
        string userId FK
        string shopId FK
        string driverId FK
        string status
        float total
        timestamp createdAt
    }

    shops {
        string id PK
        string ownerId FK
        string name
        geopoint location
        float rating
    }

    products {
        string id PK
        string shopId FK
        string name
        float price
        boolean isAvailable
    }

    drivers {
        string id PK
        string vehicleType
        geopoint currentLocation
        boolean isAvailable
        float rating
    }

    reviews {
        string id PK
        string orderId FK
        string userId FK
        string targetId
        int rating
    }

    chats {
        string id PK
        string orderId FK
        array participants
    }

    messages {
        string id PK
        string chatId FK
        string senderId
        string content
    }

    disputes {
        string id PK
        string orderId FK
        string status
        string resolution
    }

    notifications {
        string id PK
        string userId FK
        string type
        boolean isRead
    }

    favorites {
        string id PK
        string userId FK
        string targetId
    }
```

## Environnements

| Environnement | URL | Firebase Project | Stripe |
|---------------|-----|------------------|--------|
| Development | localhost:3000 | greendrop-dev | Test keys |
| Staging | staging.greendrop.app | greendrop-staging | Test keys |
| Production | greendrop.app | greendrop-prod | Live keys |

## Variables d'Environnement Requises

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```
