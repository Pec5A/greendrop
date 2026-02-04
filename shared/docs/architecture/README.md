# Documentation Architecture - GreenDrop

Cette documentation présente l'architecture technique du projet GreenDrop, une plateforme de livraison écologique de type Uber.

## Sommaire

1. [Diagramme de Classes](./class-diagram.md) - Modèle de données et entités
2. [Diagrammes de Séquence](./sequence-diagram.md) - Flux métier principaux
3. [Diagramme de Déploiement](./deployment-diagram.md) - Infrastructure cloud

## Vue d'ensemble

### Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Frontend Web** | Next.js 16, React 19, TypeScript |
| **Frontend Mobile** | Swift, SwiftUI (iOS) |
| **Backend** | Next.js API Routes (Serverless) |
| **Base de données** | Firebase Firestore (NoSQL) |
| **Authentification** | Firebase Auth (JWT) |
| **Stockage** | Firebase Cloud Storage |
| **Notifications** | Firebase Cloud Messaging (FCM) |
| **Paiements** | Stripe + Stripe Connect |
| **Hébergement** | Vercel (Web), Firebase (Services) |
| **CI/CD** | GitHub Actions |

### Architecture Globale

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                   │
├────────────────────┬────────────────────┬───────────────────────┤
│    iOS App         │   Admin Dashboard   │   Merchant Portal    │
│   (Swift/SwiftUI)  │    (Next.js)        │     (Next.js)        │
└────────────────────┴────────────────────┴───────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                          │
├─────────────────────────────────────────────────────────────────┤
│  CDN (Static Assets)  │  Edge Middleware  │  API Routes         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE / GOOGLE CLOUD                       │
├────────────────┬────────────────┬───────────────┬───────────────┤
│  Firebase Auth │   Firestore    │ Cloud Storage │      FCM      │
│   (JWT Auth)   │  (Real-time)   │   (Files)     │    (Push)     │
└────────────────┴────────────────┴───────────────┴───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         STRIPE                                   │
├─────────────────────────────┬───────────────────────────────────┤
│       Payments API          │         Stripe Connect            │
│   (PaymentIntents)          │     (Marketplace payouts)         │
└─────────────────────────────┴───────────────────────────────────┘
```

### Rôles Utilisateurs

| Rôle | Description | Accès |
|------|-------------|-------|
| **Client (user)** | Consommateur final | Passer commandes, suivre livraisons, évaluer |
| **Livreur (driver)** | Coursier écologique | Accepter missions, mettre à jour position, livrer |
| **Commerçant (merchant)** | Propriétaire boutique | Gérer produits, traiter commandes |
| **Admin** | Administrateur plateforme | Accès complet, gestion litiges, dashboard |

### Sécurité

1. **Transport** : HTTPS/TLS sur toutes les connexions
2. **Authentification** : JWT Firebase avec vérification côté serveur
3. **Autorisation** : RBAC (Role-Based Access Control) via Firestore Rules
4. **Validation** : Schémas Zod pour validation des entrées
5. **Paiements** : Conformité PCI DSS via Stripe

### API Endpoints Principaux

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/orders` | GET, POST | Liste/création commandes |
| `/api/orders/{id}` | GET, PATCH, DELETE | Gestion commande |
| `/api/orders/my` | GET | Commandes utilisateur (paginé) |
| `/api/shops` | GET | Liste boutiques (géoloc) |
| `/api/shops/{id}/products` | GET | Produits d'une boutique |
| `/api/drivers/location` | POST | Mise à jour position |
| `/api/payments/create-intent` | POST | Intention de paiement |
| `/api/reviews` | GET, POST | Système d'évaluation |
| `/api/users/export` | GET | Export RGPD |
| `/api/notifications` | POST | Envoi notifications |

### Conformité

- **RGPD** : Export données personnelles (Art. 20)
- **OWASP** : Protection contre les vulnérabilités web courantes
- **PCI DSS** : Délégation complète à Stripe pour les paiements

## Visualisation des Diagrammes

Les diagrammes utilisent la syntaxe [Mermaid](https://mermaid.js.org/) et peuvent être visualisés :
- Sur GitHub (rendu natif)
- Dans VS Code avec l'extension "Markdown Preview Mermaid Support"
- Sur [mermaid.live](https://mermaid.live/) pour édition en ligne
