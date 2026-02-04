# Cahier des Charges - GreenDrop

## Plateforme de Livraison CBD Eco-Responsable

**Version :** 1.0
**Date :** Fevrier 2026
**Projet Semestriel 5A TL - S1 - Bloc 2**

---

## 1. Presentation du Projet

### 1.1 Contexte

GreenDrop est une plateforme de livraison de produits CBD (cannabidiol) legaux en France, concue avec une approche eco-responsable. Le projet repond a un besoin croissant de digitalisation des circuits de distribution de produits CBD, tout en integrant des pratiques de livraison respectueuses de l'environnement.

### 1.2 Objectifs

- **Marketplace CBD** : Permettre aux commercants agrees de vendre des produits CBD conformes a la legislation francaise
- **Livraison eco-responsable** : Privilegier les modes de transport doux (velo, scooter electrique)
- **Conformite legale** : Verification d'identite (KYC) obligatoire pour les acheteurs et vendeurs
- **Transparence** : Suivi en temps reel des commandes et livraisons
- **Multi-plateforme** : Application iOS native + Back-office web d'administration

### 1.3 Cible Utilisateurs

| Role | Description | Plateforme |
|------|-------------|-----------|
| **Client** | Acheteur de produits CBD | iOS |
| **Marchand** | Vendeur de produits CBD agree | iOS + Web |
| **Chauffeur** | Livreur eco-responsable | iOS |
| **Administrateur** | Gestionnaire de la plateforme | Web |

---

## 2. Specifications Fonctionnelles

### 2.1 Module Authentification

| Fonctionnalite | Description | Priorite |
|----------------|-------------|----------|
| Inscription email/mot de passe | Creation de compte avec choix du role | Haute |
| Connexion email/mot de passe | Authentification Firebase Auth | Haute |
| Connexion Google OAuth | Sign-In avec compte Google (popup web, native iOS) | Haute |
| Mot de passe oublie | Envoi d'email de reinitialisation via Firebase | Moyenne |
| Verification email | Envoi d'email de verification | Moyenne |
| Deconnexion | Nettoyage session et tokens | Haute |
| Gestion des roles | RBAC : admin, merchant, driver, user | Haute |

### 2.2 Module Client (iOS)

| Fonctionnalite | Description |
|----------------|-------------|
| Catalogue boutiques | Liste des boutiques avec recherche et filtres |
| Catalogue produits | Produits par boutique avec details, prix, stock |
| Panier d'achat | Ajout/suppression articles, calcul total |
| Commande | Passage de commande avec adresse de livraison |
| Paiement | Integration Stripe PaymentSheet |
| Suivi commande | Timeline en temps reel du statut |
| Historique | Liste des commandes passees |
| Favoris | Boutiques et produits favoris |
| Profil | Edition nom, telephone, adresse |
| KYC | Verification d'identite avec upload de documents |
| Adresses | Gestion de plusieurs adresses de livraison |

### 2.3 Module Chauffeur (iOS)

| Fonctionnalite | Description |
|----------------|-------------|
| Dashboard | Vue d'ensemble activite, gains, statistiques |
| Livraisons disponibles | Liste des commandes assignees |
| Navigation | Itineraire vers point de collecte et livraison |
| Statut | Changement de disponibilite (en ligne/hors ligne/pause) |
| Geolocalisation | Envoi position GPS temps reel toutes les 10s |
| Preuve de livraison | Photo de confirmation |
| Onboarding Stripe | Configuration paiement via Stripe Connect |
| Historique | Liste des livraisons effectuees |

### 2.4 Module Marchand (iOS + Web)

| Fonctionnalite | Description |
|----------------|-------------|
| Dashboard | CA, commandes, statistiques boutique |
| Gestion produits | CRUD produits avec prix, stock, images |
| Gestion commandes | Validation, preparation, suivi |
| Onboarding Stripe | Configuration paiements entrants |
| Profil boutique | Informations, horaires, adresse |

### 2.5 Module Administration (Web)

| Fonctionnalite | Description |
|----------------|-------------|
| Dashboard | KPIs temps reel (CA, utilisateurs, commandes, litiges) |
| Gestion utilisateurs | CRUD, changement role/statut, suppression |
| Gestion commandes | Vue d'ensemble, details, historique, timeline |
| Gestion catalogue | Produits et boutiques, approbation marchands |
| Verification KYC | Approbation/rejet des documents d'identite |
| Gestion litiges | Resolution des reclamations clients |
| Suivi chauffeurs | Carte temps reel, statuts, localisation GPS |
| Zones legales | Edition cartographique des zones de livraison autorisees |
| Configuration | Parametres plateforme, frais, feature flags |
| Logs d'activite | Journal des actions administratives |
| Palette de commandes | Recherche rapide (Cmd+K) |
| Mode sombre | Theme clair/sombre avec persistance |
| Internationalisation | Interface FR/EN |

### 2.6 Module Paiement

| Fonctionnalite | Description |
|----------------|-------------|
| Paiement client | Stripe PaymentSheet (carte bancaire) |
| Onboarding marchand | Stripe Connect Express |
| Onboarding chauffeur | Stripe Connect Express |
| Dashboard Stripe | Acces au tableau de bord Stripe Express |
| Webhooks | Reception des evenements Stripe |

### 2.7 Module Matching Chauffeur

| Fonctionnalite | Description |
|----------------|-------------|
| Algorithme de proximite | Calcul distance Haversine entre chauffeur et point de collecte |
| Scoring multi-criteres | Distance (50pts) + Note (20pts) + Experience (15pts) + Activite recente (15pts) |
| Auto-assignation | Attribution automatique du meilleur chauffeur disponible |
| Rayon maximum | 10km de distance maximale |

---

## 3. Specifications Techniques

### 3.1 Architecture

```
+-------------------+     +-------------------+     +-------------------+
|    iOS App        |     |   Web Admin       |     |   API Routes      |
|   (SwiftUI)       |     |   (Next.js)       |     |   (Next.js API)   |
+--------+----------+     +--------+----------+     +--------+----------+
         |                         |                          |
         +-------------------------+--------------------------+
                                   |
                    +----------------------------+
                    |     Firebase Platform       |
                    |  Auth | Firestore | Storage |
                    |  Crashlytics | Messaging    |
                    +----------------------------+
                                   |
                    +----------------------------+
                    |      Stripe Connect         |
                    |   Payments | Webhooks        |
                    +----------------------------+
```

### 3.2 Stack Technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| **iOS** | SwiftUI + Swift | Swift 5.9+ / iOS 17+ |
| **Web Frontend** | Next.js App Router | v16 |
| **Langage Web** | TypeScript | Strict mode |
| **UI Components** | shadcn/ui + Tailwind CSS | v4 |
| **Base de donnees** | Cloud Firestore | - |
| **Authentification** | Firebase Auth (Email + Google OAuth) | - |
| **Stockage fichiers** | Firebase Storage | - |
| **Crash Reporting** | Firebase Crashlytics | - |
| **Notifications** | Firebase Cloud Messaging | - |
| **Paiement** | Stripe (PaymentSheet + Connect) | - |
| **Hebergement Web** | Vercel | Hobby (gratuit) |
| **CI/CD** | GitHub Actions | - |
| **Tests** | Vitest + XCTest | - |
| **Linting iOS** | SwiftLint | - |

### 3.3 Architecture iOS (MVVM)

```
GreenDrop/
  GreenDropApp.swift          # Entry point, Firebase init, Crashlytics
  LoginView.swift             # Authentification (email + Google)
  Services.swift              # AuthService, APIService, PaymentService, etc.
  ClientViews.swift           # Vues client (Home, Boutique, Produit)
  CartViews.swift             # Panier et checkout
  DriverViews.swift           # Vues chauffeur (Dashboard, Livraisons)
  MerchantViews.swift         # Vues marchand (Dashboard, Produits)
  KYCViews.swift              # Verification d'identite
  OrderViews.swift            # Suivi commandes
  MapViews.swift              # Carte et geolocalisation
  ProfileViews.swift          # Profil, parametres, FAQ
```

### 3.4 Architecture Web (Next.js App Router)

```
app/
  layout.tsx                  # Root layout (ThemeProvider, AuthWrapper, i18n)
  login/page.tsx              # Page de connexion (email + Google OAuth)
  dashboard/page.tsx          # Tableau de bord KPIs temps reel
  users/page.tsx              # Gestion utilisateurs
  orders/page.tsx             # Gestion commandes
  catalog/page.tsx            # Catalogue produits/boutiques
  drivers/page.tsx            # Suivi chauffeurs temps reel
  verifications/page.tsx      # Verification KYC
  disputes/page.tsx           # Gestion litiges
  legal-zones/page.tsx        # Zones de livraison (carte)
  config/page.tsx             # Configuration plateforme
  api/                        # Routes API Next.js
    orders/                   # CRUD commandes
    shops/                    # CRUD boutiques
    users/                    # CRUD utilisateurs
    drivers/                  # Localisation chauffeurs
    payments/                 # Stripe webhooks
    csrf/                     # Token CSRF
    upload/                   # Upload fichiers
```

### 3.5 Securite

| Mesure | Implementation |
|--------|---------------|
| Authentification | Firebase Auth (JWT tokens) |
| Autorisation | RBAC verifie cote serveur (middleware) |
| CSRF | Token HMAC-SHA256 avec fenetre temporelle 1h |
| Firestore Rules | Regles d'acces par role et proprietaire |
| Storage Rules | Validation taille (max 10MB), type MIME (images only) |
| API Middleware | Verification token Bearer + role |
| Donnees sensibles | Variables d'environnement (.env.local) |
| HTTPS | Force par Vercel et Firebase |

### 3.6 Base de Donnees (Collections Firestore)

| Collection | Description | Champs principaux |
|------------|-------------|-------------------|
| `users` | Utilisateurs | email, name, role, status, phone |
| `shops` | Boutiques | name, ownerId, status, address, rating |
| `products` | Produits | shopId, name, price, stock, category |
| `orders` | Commandes | userId, shopId, status, total, items, timeline |
| `drivers` | Chauffeurs | name, status, vehicleType, location, rating |
| `verifications` | KYC | userId, type, documentUrl, status |
| `disputes` | Litiges | orderId, userId, reason, status, priority |
| `legalZones` | Zones legales | name, type, coordinates, active |
| `config` | Configuration | platform, delivery, payment, features |
| `activityLogs` | Journal activites | type, actor, entity, timestamp |

---

## 4. Maquettes et Interfaces

### 4.1 Charte Graphique

| Element | Valeur |
|---------|--------|
| **Couleur principale** | `#22C55E` (vert eco) |
| **Couleur secondaire** | `#3B82F6` (bleu) |
| **Couleur danger** | `#EF4444` (rouge) |
| **Couleur Stripe** | `#6772E5` (violet) |
| **Police** | Geist (web), SF Pro (iOS) |
| **Coins arrondis** | 12px (iOS), variable (web via shadcn) |
| **Mode sombre** | Supporte (web + iOS auto) |

### 4.2 Ecrans iOS

1. **Splash Screen** - Logo GreenDrop avec loader
2. **Login** - Email/MDP + Google Sign-In + Comptes demo
3. **Register** - Choix role + formulaire
4. **Client Home** - Liste boutiques + recherche
5. **Boutique** - Produits + infos boutique
6. **Produit** - Details + ajout panier
7. **Panier** - Articles + total + checkout
8. **Commande** - Timeline temps reel
9. **Profil** - Infos + KYC + Stripe + Parametres
10. **KYC** - Upload documents identite
11. **Driver Dashboard** - Stats + livraisons actives
12. **Driver Livraison** - Navigation + preuve
13. **Merchant Dashboard** - CA + commandes
14. **Merchant Produits** - CRUD produits

### 4.3 Ecrans Web Admin

1. **Login** - Formulaire + Google OAuth
2. **Dashboard** - 4 KPIs + graphiques + activite recente
3. **Utilisateurs** - Tableau + filtres + edition
4. **Commandes** - Tableau + timeline + documents
5. **Catalogue** - Produits et boutiques
6. **Chauffeurs** - Carte temps reel + statuts
7. **Verifications** - Cartes KYC + approbation
8. **Litiges** - Tableau + resolution
9. **Zones Legales** - Editeur cartographique
10. **Configuration** - Parametres plateforme

---

## 5. Contraintes

### 5.1 Contraintes Techniques

- iOS 17+ minimum (SwiftUI)
- Node.js 18+ pour le build Next.js
- Navigateurs modernes (Chrome, Firefox, Safari, Edge)
- Connexion internet obligatoire (pas de mode offline)

### 5.2 Contraintes Legales

- Verification d'age (KYC) obligatoire pour l'achat de CBD
- Conformite RGPD pour le traitement des donnees personnelles
- Zones de livraison restreintes selon la legislation locale
- Produits CBD conformes a la reglementation francaise (< 0.3% THC)

### 5.3 Contraintes de Performance

- Temps de chargement initial < 3s
- Lighthouse score >= 92 (Performance, Accessibility, Best Practices)
- Mise a jour temps reel < 2s (Firestore listeners)
- Upload images < 10MB

---

## 6. Tests

### 6.1 Strategie de Test

| Type | Outil | Couverture |
|------|-------|-----------|
| Tests unitaires | Vitest | Services Firebase, utilitaires |
| Tests integration | Vitest | Routes API |
| Tests UI iOS | XCTest / XCUITest | Flows principaux |
| Tests accessibilite | Lighthouse + audit manuel | WCAG 2.1 AA |
| Tests performance | Lighthouse | Score >= 92 |

### 6.2 Scenarios de Test Principaux

1. Inscription et connexion (email + Google)
2. Parcours client complet (catalogue -> panier -> commande -> paiement)
3. Verification KYC (upload -> approbation admin)
4. Flux chauffeur (connexion -> livraison -> preuve)
5. Administration (gestion utilisateurs, commandes, litiges)
6. Paiement Stripe (checkout -> webhook -> confirmation)

---

## 7. Deploiement

### 7.1 Environnements

| Environnement | URL | Usage |
|---------------|-----|-------|
| Developpement | localhost:3000 | Developpement local |
| Firebase Emulators | localhost:4000 | Tests locaux Firebase |
| Production Web | *.vercel.app | Deploiement automatique |
| Production Firebase | Console Firebase | Rules, indexes, storage |
| iOS Simulateur | Xcode | Demo et tests |

### 7.2 CI/CD

- **GitHub Actions** : Build + tests automatiques a chaque push
- **Vercel** : Deploiement automatique sur push `main`
- **Firebase** : `firebase deploy` pour rules et indexes

### 7.3 Couts

| Service | Gratuit | Payant |
|---------|---------|--------|
| Vercel | Plan Hobby | Pro: $20/mois |
| Firebase | Plan Spark | Blaze: Pay-as-you-go |
| Apple Developer | - | $99/an (pour distribution) |
| Stripe | 2.9% + 0.30EUR/tx | - |
| **Total minimum** | **$0/mois** | - |

---

## 8. Planning

### Phase 1 - Fondations
- Setup projet (Next.js + Firebase + iOS)
- Authentification (email + Google OAuth)
- Structure base de donnees Firestore
- Design system (shadcn/ui + SwiftUI)

### Phase 2 - Core Features
- CRUD utilisateurs, boutiques, produits
- Panier et commandes
- Integration Stripe
- Dashboard admin

### Phase 3 - Avancees
- Geolocalisation chauffeurs temps reel
- Matching automatique chauffeur/commande
- Verification KYC
- Zones de livraison legales

### Phase 4 - Qualite
- Tests unitaires et integration
- Accessibilite (WCAG 2.1 AA)
- Crashlytics et monitoring
- Documentation et cahier des charges

### Phase 5 - Deploiement
- Deploiement Vercel + Firebase
- Build iOS (simulateur / TestFlight)
- Guide de deploiement
- Soutenance

---

## 9. Competences RNCP Couvertes

| Competence | Implementation |
|-----------|---------------|
| **Developper une application web** | Next.js 16 App Router + TypeScript + API Routes |
| **Developper une application mobile** | SwiftUI iOS native avec MVVM |
| **Mettre en place une base de donnees** | Cloud Firestore (NoSQL) avec regles de securite |
| **Implementer la securite** | Firebase Auth, RBAC, CSRF, Storage Rules, JWT |
| **Deployer une application** | Vercel (CI/CD), Firebase Deploy, Xcode Build |
| **Tester une application** | Vitest, XCTest, Lighthouse |
| **Documenter un projet** | Cahier des charges, diagrammes UML, guide deploiement |

---

## 10. Livrables

1. **Code source** - Repository GitHub (monorepo web + iOS)
2. **Application web** - Deployee sur Vercel
3. **Application iOS** - Build Xcode (simulateur)
4. **Documentation technique** - Architecture, diagrammes, API
5. **Cahier des charges** - Ce document
6. **Guide de deploiement** - Instructions pas-a-pas
7. **Tests** - Suite de tests avec resultats
8. **Donnees de demo** - Script seed pour Firestore
