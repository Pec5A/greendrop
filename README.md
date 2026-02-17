# GreenDrop

**Plateforme de livraison de produits CBD eco-responsable en France.**

GreenDrop est une marketplace collaborative connectant clients, commercants agrees et livreurs via des modes de transport verts (velos, trottinettes electriques). L'application propose un suivi en temps reel, un paiement securise via Stripe, une verification d'identite obligatoire (KYC) et un panel d'administration complet.

---

## Table des matieres

- [Structure du projet](#structure-du-projet)
- [Stack technique](#stack-technique)
- [Fonctionnalites](#fonctionnalites)
- [Architecture](#architecture)
- [Demarrage rapide](#demarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [API REST](#api-rest)
- [Firebase Cloud Functions](#firebase-cloud-functions)
- [Regles de securite](#regles-de-securite)
- [Tests](#tests)
- [CI/CD](#cicd)
- [Equipe](#equipe)

---

## Structure du projet

```
greendrop/
├── admin/                  # Application web Next.js (panel d'administration)
│   ├── app/                # Pages Next.js (App Router)
│   │   ├── api/            # Routes API REST
│   │   ├── dashboard/      # Tableau de bord
│   │   ├── orders/         # Gestion des commandes
│   │   ├── catalog/        # Catalogue produits
│   │   ├── drivers/        # Gestion des livreurs
│   │   ├── users/          # Gestion des utilisateurs
│   │   ├── chat/           # Messagerie temps reel
│   │   ├── disputes/       # Gestion des litiges
│   │   ├── verifications/  # Verification KYC
│   │   ├── legal-zones/    # Zones de livraison
│   │   ├── monitoring/     # Dashboards Grafana (5 dashboards)
│   │   └── config/         # Configuration plateforme
│   ├── components/         # Composants React
│   │   ├── ui/             # Composants shadcn/ui (~60)
│   │   ├── admin/          # Composants admin (~30)
│   │   └── auth/           # Composants d'authentification
│   ├── hooks/              # Custom React hooks (16)
│   ├── lib/                # Utilitaires et services
│   │   ├── firebase/       # SDK Firebase + services Firestore
│   │   ├── utils/          # Fonctions utilitaires
│   │   └── data/           # Donnees mock
│   ├── tests/              # Tests API (Vitest)
│   ├── scripts/            # Scripts de seed et deploiement
│   ├── public/             # Assets statiques
│   └── styles/             # Styles globaux
│
├── mobile/                 # Application iOS native (SwiftUI)
│   ├── GreenDrop/
│   │   ├── GreenDrop/      # Code source Swift
│   │   │   ├── Models.swift
│   │   │   ├── APIService.swift
│   │   │   ├── Services.swift
│   │   │   ├── PaymentService.swift
│   │   │   ├── LoggingService.swift    # Telemetrie mobile (buffer → Loki)
│   │   │   ├── MobileConfig.swift      # Constantes (endpoints, API keys)
│   │   │   ├── LoginView.swift
│   │   │   ├── ClientViews.swift
│   │   │   ├── DriverViews.swift
│   │   │   ├── MerchantViews.swift
│   │   │   ├── MapViews.swift
│   │   │   ├── ChatViews.swift
│   │   │   ├── RatingViews.swift
│   │   │   ├── DeliveryProofViews.swift
│   │   │   ├── TippingViews.swift
│   │   │   ├── PromoCodeViews.swift
│   │   │   ├── KYCViews.swift
│   │   │   └── SettingsViews.swift
│   │   ├── GreenDropTests/
│   │   └── GreenDropUITests/
│   └── Core_backup/        # Architecture modulaire (Domain, Networking, DesignSystem)
│
├── shared/                 # Configuration partagee
│   ├── functions/          # Firebase Cloud Functions
│   │   └── src/
│   │       ├── endpoints/  # Endpoints HTTP
│   │       └── triggers/   # Triggers Firestore
│   ├── docs/               # Documentation technique
│   │   └── architecture/   # Diagrammes UML
│   ├── grafana/            # Dashboards et alertes Grafana
│   │   ├── dashboard.json          # Business KPIs
│   │   ├── operations-dashboard.json
│   │   ├── admin-dashboard.json
│   │   ├── mobile-dashboard.json
│   │   ├── funnel-dashboard.json
│   │   └── alerts.yaml             # 12 regles d'alertes
│   ├── firebase.json       # Configuration Firebase
│   ├── firestore.rules     # Regles de securite Firestore
│   ├── storage.rules       # Regles Firebase Storage
│   └── openapi.yaml        # Specification OpenAPI 3.0
│
├── .github/workflows/      # Pipelines CI/CD
└── .husky/                 # Git hooks (pre-commit)
```

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend Web** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, Radix UI |
| **Mobile iOS** | Swift, SwiftUI, MVVM, Firebase SDK, Google Sign-In, MapKit, Stripe PaymentSheet, Sentry |
| **Backend** | Next.js API Routes, Firebase Cloud Functions (Node.js 20) |
| **Base de donnees** | Cloud Firestore (NoSQL) |
| **Authentification** | Firebase Auth (Email/Password + Google OAuth) |
| **Stockage** | Firebase Storage (images, documents KYC) |
| **Paiements** | Stripe Connect (PaymentSheet + Connect Onboarding) |
| **Cartographie** | MapLibre GL JS (web), MapKit (iOS) |
| **Graphiques** | Recharts |
| **Monitoring** | Grafana Cloud (Graphite + Loki), Sentry, Firebase Crashlytics, Discord Webhooks |
| **Formulaires** | React Hook Form + Zod |
| **Tests** | Vitest, XCTest, XCUITest |
| **CI/CD** | GitHub Actions |
| **Hebergement** | Vercel (web), Firebase (functions), App Store (iOS) |

---

## Fonctionnalites

### Application mobile (iOS)

| Module | Description |
|--------|-------------|
| **Authentification** | Connexion email/password et Google OAuth, gestion de session |
| **Client** | Navigation catalogue, panier, commande, suivi GPS temps reel, historique |
| **Livreur** | Dashboard livreur, livraisons disponibles, navigation GPS, preuve de livraison (photo) |
| **Commercant** | Gestion produits (CRUD), suivi des commandes, tableau de bord des ventes |
| **Paiements** | Stripe PaymentSheet pour clients, Connect Onboarding pour livreurs/commercants |
| **Chat** | Messagerie temps reel entre client/livreur par commande |
| **KYC** | Verification d'identite avec upload de documents |
| **Pourboires** | Systeme de pourboire pour les livreurs |
| **Codes promo** | Application et validation de codes promotionnels |
| **Avis** | Systeme de notation et avis apres livraison |
| **Parametres** | Gestion du profil, adresses, preferences |

### Panel d'administration (Web)

| Module | Description |
|--------|-------------|
| **Dashboard** | KPIs en temps reel, graphiques d'activite, statistiques globales |
| **Commandes** | Suivi complet avec timeline, filtres avances, detail par commande |
| **Catalogue** | Gestion des produits et boutiques, moderation |
| **Utilisateurs** | CRUD utilisateurs, gestion des roles (admin, supervisor, user, driver, merchant) |
| **Livreurs** | Suivi GPS sur carte interactive, gestion des statuts, statistiques |
| **Verifications** | Validation KYC avec visualisation des documents |
| **Litiges** | Resolution des litiges avec systeme de priorite |
| **Zones legales** | Editeur cartographique des zones de livraison et zones restreintes |
| **Chat** | Visualisation des conversations client/livreur |
| **Monitoring** | 5 dashboards Grafana (KPIs, Operations, Admin, Mobile, Funnel), liens directs |
| **Configuration** | Parametrage global de la plateforme |
| **i18n** | Support multilingue (FR/EN) |
| **Theme** | Mode clair / sombre |
| **Export GDPR** | Export des donnees utilisateur conformement au RGPD |

---

## Architecture

### Roles utilisateur

```
Admin ──────── Acces total, gestion plateforme
Supervisor ─── Moderation, verification KYC, litiges
Merchant ───── Gestion boutique et produits
Driver ─────── Livraison, suivi GPS, preuves
User ──────── Client final, commandes, avis
```

### Algorithme de matching livreur

L'attribution automatique des commandes aux livreurs utilise un scoring multi-criteres :

| Critere | Poids |
|---------|-------|
| Distance (Haversine) | 50% |
| Note moyenne | 20% |
| Experience (livraisons completees) | 15% |
| Activite recente | 15% |

Rayon maximum : **10 km**

### Flux de commande

```
Creee → Payee → Expediee → Livree
                    ↓
                 Annulee (a tout moment avant livraison)
```

### Securite

- **Authentification** : Firebase Auth avec tokens JWT
- **RBAC** : Verification cote serveur via middleware
- **CSRF** : Tokens HMAC-SHA256 avec fenetre d'1 heure
- **Firestore** : Regles de securite par role et proprietaire
- **Storage** : Limite 10 Mo, images uniquement
- **HTTPS** : Force sur toutes les communications

---

## Demarrage rapide

### Pre-requis

- **Node.js** >= 20
- **pnpm** >= 8
- **Xcode** >= 15 (pour iOS)
- **Firebase CLI** : `npm install -g firebase-tools`
- Compte **Stripe** (cles API)
- Projet **Firebase** configure

### 1. Cloner le projet

```bash
git clone https://github.com/Pec5A/greendrop.git
cd greendrop
```

### 2. Application web (admin)

```bash
cd admin
pnpm install
cp .env.example .env.local   # Configurer les variables d'environnement
pnpm dev                     # http://localhost:3000
```

### 3. Application mobile (iOS)

1. Ouvrir `mobile/GreenDrop/GreenDrop.xcodeproj` dans Xcode
2. Placer `GoogleService-Info.plist` dans le dossier du projet
3. Configurer le Bundle Identifier et le Signing Team
4. Build & Run sur simulateur ou appareil

### 4. Firebase (emulateurs locaux)

```bash
cd shared
firebase emulators:start     # Firestore, Functions, Storage
```

### 5. Seed des donnees de test

```bash
cd admin
pnpm seed
```

---

## Variables d'environnement

Creer un fichier `admin/.env.local` :

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-side)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Monitoring — Grafana Public Dashboards
NEXT_PUBLIC_GRAFANA_PUBLIC_KPI=
NEXT_PUBLIC_GRAFANA_PUBLIC_OPERATIONS=
NEXT_PUBLIC_GRAFANA_PUBLIC_ADMIN=
NEXT_PUBLIC_GRAFANA_PUBLIC_MOBILE=
NEXT_PUBLIC_GRAFANA_PUBLIC_FUNNEL=
```

Cloud Functions (`shared/functions/.env`) :

```env
# Grafana Cloud
GRAFANA_URL=
GRAFANA_USER=
GRAFANA_API_KEY=

# Loki (logs)
LOKI_HOST=
LOKI_USER_ID=
GRAFANA_LOKI_TOKEN=

# Sentry
SENTRY_DSN=

# Mobile Logging
MOBILE_LOG_API_KEY=

# Alertes
DISCORD_WEBHOOK_URL=
```

---

## API REST

L'API est construite avec les Next.js API Routes. Toutes les routes sont protegees par authentification et middleware RBAC.

| Methode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/orders` | Lister les commandes (filtres: status, shopId, driverId) |
| `POST` | `/api/orders` | Creer une commande |
| `GET` | `/api/orders/[id]` | Detail d'une commande |
| `PATCH` | `/api/orders/[id]` | Mettre a jour le statut |
| `GET` | `/api/orders/my` | Commandes de l'utilisateur connecte |
| `GET` | `/api/shops` | Lister les boutiques |
| `POST` | `/api/shops` | Creer une boutique |
| `GET` | `/api/shops/[id]/products` | Produits d'une boutique |
| `POST` | `/api/payments/create-intent` | Creer un PaymentIntent Stripe |
| `POST` | `/api/payments/webhook` | Webhook Stripe |
| `POST` | `/api/payments/connect/onboard` | Onboarding Stripe Connect (marchand) |
| `POST` | `/api/payments/connect/driver-onboard` | Onboarding Stripe Connect (livreur) |
| `GET` | `/api/payments/connect/dashboard` | Dashboard Stripe marchand |
| `GET` | `/api/payments/connect/driver-dashboard` | Dashboard Stripe livreur |
| `PUT` | `/api/drivers/location` | Mettre a jour la position GPS |
| `PUT` | `/api/drivers/status` | Mettre a jour le statut (online/offline/busy) |
| `POST` | `/api/notifications` | Envoyer une notification |
| `POST` | `/api/reviews` | Publier un avis |
| `POST` | `/api/upload` | Upload de fichier (images, documents) |
| `GET` | `/api/users/export` | Export GDPR des donnees utilisateur |
| `GET` | `/api/csrf` | Obtenir un token CSRF |
| `GET` | `/api/openapi` | Specification OpenAPI JSON |

Documentation interactive : `/api-docs` (Swagger UI)

---

## Firebase Cloud Functions

Les Cloud Functions gerent la logique asynchrone et les triggers Firestore.

### Endpoints HTTP

| Fonction | Description |
|----------|-------------|
| `createOrder` | Creation de commande avec validation |
| `getOrders` | Recuperation des commandes |
| `getShops` | Recuperation des boutiques |
| `updateOrderStatus` | Mise a jour du statut de commande |
| `updateDriverLocation` | Mise a jour de la position du livreur |
| `updateDriverStatus` | Changement de statut livreur |
| `uploadFile` | Upload de fichiers vers Storage |
| `sendNotification` | Envoi de notifications push |
| `logMobileEvents` | Reception des logs mobile en batch (→ Loki) |

### Triggers Firestore

| Trigger | Description |
|---------|-------------|
| `onOrderCreated` | Notification au commercant + matching livreur automatique |
| `onOrderStatusChange` | Notifications aux parties concernees a chaque etape |
| `onDriverLocationUpdate` | Mise a jour du suivi temps reel |

### Taches Planifiees (Scheduled)

| Fonction | Intervalle | Description |
|----------|-----------|-------------|
| `pushMetrics` | 5 min | Pousse 30+ metriques vers Grafana Cloud (Graphite) |
| `healthCheck` | 5 min | Verifie 8 seuils critiques, alerte Discord + FCM + Firestore |

---

## Monitoring & Observabilite

### Stack d'observabilite

| Outil | Role |
|-------|------|
| **Grafana Cloud (Graphite)** | 30+ metriques business poussees toutes les 5 min via `pushMetrics` |
| **Grafana Cloud (Loki)** | Logs structures admin (Winston) + mobile (Cloud Function `logMobileEvents`) |
| **Sentry** | Error tracking + performance tracing (admin, Cloud Functions, mobile iOS) |
| **Firebase Crashlytics** | Crash reports mobile iOS |
| **Discord Webhooks** | Alertes automatiques via `healthCheck` |
| **FCM Push** | Notifications push aux admins en cas d'alerte critique |

### Dashboards Grafana (5)

| Dashboard | Source | Metriques cles |
|-----------|--------|---------------|
| **Business KPIs** | Graphite | Commandes, revenus, utilisateurs, chauffeurs, verifications |
| **Operations** | Graphite | Duree livraison, utilisation chauffeurs, commandes par zone |
| **Admin Performance** | Loki | Page views, latence API p50/p95/p99, taux d'erreurs |
| **Mobile** | Loki | Lancements, sessions, erreurs API, versions |
| **User Funnel** | Graphite | DAU/WAU/MAU, taux conversion inscription→commande |

### Health Check automatique (toutes les 5 min)

8 verifications avec alerte Discord + notification push + log Firestore :

- Aucun chauffeur en ligne
- Utilisation chauffeurs > 90%
- Litiges ouverts > 10
- Verifications KYC en attente > 20
- Taux de livraison < 80%
- Revenu journalier = 0 apres 12h
- Commandes expediees bloquees > 2h
- Aucune inscription depuis 18h

### Mobile Logging (LoggingService)

Singleton iOS avec buffer (20 events max, flush toutes les 30s) qui envoie les logs vers la Cloud Function `logMobileEvents` → Loki (`app: "greendrop-mobile"`). Events instrumentes : screen views, appels API (avec duree), erreurs, flux commande, login.

---

## Regles de securite

Les regles Firestore implementent un controle d'acces granulaire par role :

| Collection | Lecture | Ecriture | Suppression |
|------------|---------|----------|-------------|
| `users` | Proprietaire / Admin | Admin ou proprietaire | Admin |
| `orders` | Selon role | Utilisateur authentifie | Admin |
| `products` | Tout le monde | Admin / Marchand | Admin / Marchand |
| `shops` | Tout le monde | Admin / Marchand | Admin |
| `drivers` | Admin / Superviseur / Proprietaire | Admin / Proprietaire | Admin |
| `verifications` | Admin / Superviseur / Proprietaire | Utilisateur authentifie | Admin |
| `disputes` | Admin / Superviseur / Parties | Utilisateur authentifie | Admin |
| `legal-zones` | Tout le monde | Admin | Admin |
| `activity-logs` | Admin / Superviseur | Admin (immutable) | Interdit |
| `chats` | Utilisateur authentifie | Utilisateur authentifie | — |

---

## Tests

### Tests API (Web)

```bash
cd admin
pnpm test              # Lancer tous les tests
pnpm test:watch        # Mode watch
pnpm test:coverage     # Rapport de couverture
```

**Suites de tests :**
- `orders-api.test.ts` — CRUD commandes, filtres, pagination
- `shops-api.test.ts` — Gestion des boutiques et produits
- `reviews-api.test.ts` — Systeme d'avis
- `api-middleware.test.ts` — Authentification, RBAC, rate limiting
- `gdpr-export.test.ts` — Export de donnees RGPD

### Tests iOS

- **Tests unitaires** : `GreenDropTests/` (XCTest)
- **Tests UI** : `GreenDropUITests/` (XCUITest)

Lancer via Xcode : `Cmd + U`

---

## CI/CD

Le pipeline GitHub Actions (`.github/workflows/ci.yml`) execute automatiquement sur chaque push et pull request :

```
Lint (ESLint) ──┐
                ├──→ Build (Next.js) ──→ Deploy
Type Check ─────┘
                ├──→ Test (Vitest)
Security Audit ──────────────────────→ Report
```

Un workflow separe gere le build et la release de l'application iOS (`.github/workflows/ios-release.yml`).

---

## Documentation

| Document | Description |
|----------|-------------|
| [Cahier des charges](shared/docs/CAHIER_DES_CHARGES.md) | Specifications fonctionnelles et techniques |
| [Guide de deploiement](shared/docs/DEPLOYMENT_GUIDE.md) | Instructions de deploiement |
| [Configuration Firebase](shared/docs/FIREBASE_SETUP.md) | Setup Firebase complet |
| [Documentation API](shared/docs/API_DOCUMENTATION.md) | Reference API detaillee |
| [Guide OpenAPI](shared/docs/OPENAPI_GUIDE.md) | Utilisation de la spec OpenAPI |
| [Diagrammes d'architecture](shared/docs/architecture/) | Class, sequence, deployment, BPMN |
| [Workflow de test](shared/docs/TESTING_WORKFLOW.md) | Strategie et execution des tests |
| [Guide de seed](shared/docs/SEED_INSTRUCTIONS.md) | Donnees de test |

---

## Equipe

| Membre | Email |
|--------|-------|
| **Yassir Sabbar** | yassir.sabbar@uit.ac.ma |
| **Samy Zerouali** | samyzer1@gmail.com |
| **Kays Zahidi** | kays.zahidi@gmail.com |

**Organisation GitHub** : [Pec5A](https://github.com/Pec5A)

---

## Licence

Projet academique — Ecole Decode, Paris.
