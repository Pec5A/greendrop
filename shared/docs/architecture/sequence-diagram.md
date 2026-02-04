# Diagrammes de Séquence - GreenDrop

## 1. Flux de Commande Client (Order Flow)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (iOS)
    participant API as NextJS API
    participant FB as Firebase
    participant S as Stripe
    participant D as Driver (iOS)
    participant M as Merchant

    %% Phase 1: Parcours d'achat
    rect rgb(200, 220, 240)
        Note over C,M: Phase 1 - Parcours d'achat
        C->>API: GET /api/shops?lat=X&lng=Y
        API->>FB: Query shops (Haversine filter)
        FB-->>API: Shops list
        API-->>C: Shops with distance

        C->>API: GET /api/shops/{id}/products
        API->>FB: Query products
        FB-->>API: Products list
        API-->>C: Products available
    end

    %% Phase 2: Création commande
    rect rgb(220, 240, 200)
        Note over C,M: Phase 2 - Création de commande
        C->>API: POST /api/orders
        API->>FB: Verify shop exists
        API->>FB: Verify products exist & calculate total
        API->>FB: Create order (status: pending)
        API->>FB: Create activity log
        API-->>C: Order created (orderId)
    end

    %% Phase 3: Paiement
    rect rgb(240, 220, 200)
        Note over C,S: Phase 3 - Paiement Stripe
        C->>API: POST /api/payments/create-intent
        API->>S: Create PaymentIntent (with transfer_data)
        S-->>API: clientSecret
        API-->>C: clientSecret

        C->>S: Confirm payment (PaymentSheet)
        S-->>C: Payment confirmed

        S->>API: Webhook: payment_intent.succeeded
        API->>FB: Update order (paymentStatus: paid)
        API->>FB: Send notification to merchant
    end

    %% Phase 4: Préparation
    rect rgb(240, 200, 220)
        Note over M,FB: Phase 4 - Préparation Merchant
        FB-->>M: Real-time: New order notification
        M->>API: PATCH /api/orders/{id} (status: preparing)
        API->>FB: Update order status
        API->>FB: Add timeline entry
        API-->>M: OK

        M->>API: PATCH /api/orders/{id} (status: ready)
        API->>FB: Update order status
        API->>FB: Notify available drivers (FCM)
        API-->>M: OK
    end

    %% Phase 5: Livraison
    rect rgb(200, 240, 220)
        Note over D,C: Phase 5 - Livraison
        FB-->>D: Real-time: Order available
        D->>API: PATCH /api/orders/{id} (driverId, status: assigned)
        API->>FB: Update order
        API->>FB: Notify client (FCM)
        API-->>D: OK

        loop Tracking en temps réel
            D->>API: POST /api/drivers/location
            API->>FB: Update driver location
            FB-->>C: Real-time: Driver position update
        end

        D->>API: PATCH /api/orders/{id} (status: delivering)
        API->>FB: Update order
        API-->>D: OK

        D->>API: POST /api/upload (delivery photo)
        API->>FB: Store photo in Storage
        API-->>D: Photo URL

        D->>API: PATCH /api/orders/{id} (status: delivered, deliveryPhoto)
        API->>FB: Update order
        API->>FB: Notify client
        API-->>D: OK
    end

    %% Phase 6: Evaluation
    rect rgb(220, 200, 240)
        Note over C,D: Phase 6 - Évaluation
        C->>API: POST /api/reviews (rating driver)
        API->>FB: Create review
        API->>FB: Update driver average rating
        API-->>C: Review created

        D->>API: POST /api/reviews (rating client)
        API->>FB: Create review
        API->>FB: Update client rating
        API-->>D: Review created
    end

    %% Transfert paiement
    rect rgb(240, 240, 200)
        Note over S,API: Transfert automatique
        S->>API: Webhook: transfer completed
        API->>FB: Update driver earnings
    end
```

## 2. Flux d'Inscription Livreur (Driver Onboarding)

```mermaid
sequenceDiagram
    autonumber
    participant D as Driver (iOS)
    participant API as NextJS API
    participant FB as Firebase
    participant S as Stripe Connect

    D->>API: POST /signup (role: driver)
    API->>FB: Create user with role driver
    API->>FB: Create driver profile (status: pending)
    API-->>D: Account created

    D->>API: POST /api/payments/connect/driver-onboard
    API->>S: Create Connect Express Account
    S-->>API: Account ID + Onboarding URL
    API->>FB: Store stripeAccountId
    API-->>D: Onboarding URL

    D->>S: Complete Stripe onboarding
    Note over D,S: ID verification, bank details

    S->>API: Webhook: account.updated
    API->>FB: Update driver verification status

    opt Verification complète
        API->>FB: Update driver status: verified
        API->>FB: Send notification: "Compte vérifié"
    end
```

## 3. Flux de Gestion de Litige (Dispute Flow)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant API as NextJS API
    participant FB as Firebase
    participant A as Admin
    participant S as Stripe

    C->>API: POST /api/disputes
    API->>FB: Create dispute (status: open)
    API->>FB: Notify admin
    API-->>C: Dispute created

    FB-->>A: Real-time: New dispute
    A->>API: GET /api/admin/disputes/{id}
    API->>FB: Get dispute details + order + messages
    API-->>A: Dispute full data

    A->>API: POST /api/admin/disputes/{id}/message
    API->>FB: Add message to dispute
    API->>FB: Notify client
    API-->>A: Message sent

    opt Remboursement nécessaire
        A->>API: POST /api/admin/disputes/{id}/refund
        API->>S: Create refund
        S-->>API: Refund confirmed
        API->>FB: Update order (paymentStatus: refunded)
        API->>FB: Update dispute (status: resolved)
        API-->>A: Refund processed
    end

    A->>API: PATCH /api/admin/disputes/{id}
    Note over API: status: resolved, resolution: "..."
    API->>FB: Update dispute
    API->>FB: Notify all parties
    API-->>A: Dispute closed
```

## 4. Flux de Chat en Temps Réel

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant iOS as iOS App
    participant FB as Firestore
    participant D as Driver

    Note over C,D: Commande en cours de livraison

    C->>iOS: Ouvre le chat
    iOS->>FB: onSnapshot(chats/{orderId}/messages)
    FB-->>iOS: Messages existants

    C->>iOS: Envoie message
    iOS->>FB: Add message to collection
    FB-->>iOS: Message confirmé
    FB-->>D: Real-time: New message

    D->>FB: Add response message
    FB-->>D: Message confirmé
    FB-->>iOS: Real-time: New message
    iOS-->>C: Affiche nouveau message
```

## 5. Flux d'Export RGPD

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant API as NextJS API
    participant FB as Firestore

    U->>API: GET /api/users/export
    Note over API: Authentification JWT vérifiée

    par Collecte parallèle des données
        API->>FB: Get user profile
        API->>FB: Get orders
        API->>FB: Get reviews
        API->>FB: Get favorites
        API->>FB: Get chats/messages
        API->>FB: Get notifications
        API->>FB: Get disputes
    end

    FB-->>API: All user data

    API->>API: Compile JSON export
    API-->>U: Download JSON file
    Note over U: Content-Disposition: attachment
```
