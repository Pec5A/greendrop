# Changelog

Toutes les modifications notables du projet GreenDrop sont documentees dans ce fichier.

Le format est base sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet respecte le [Semantic Versioning](https://semver.org/lang/fr/).

## [1.0.0] - 2026-02-05

### Ajoute

- **Authentification** : Connexion email/mot de passe et Google OAuth via Firebase Auth
- **Dashboard Admin** : KPIs temps reel, gestion utilisateurs, commandes, boutiques
- **Gestion des commandes** : CRUD complet avec suivi de statut en temps reel
- **Gestion des boutiques** : CRUD produits, statistiques marchand
- **Systeme de paiement** : Integration Stripe (PaymentSheet + Connect pour marchands/chauffeurs)
- **Verification d'identite (KYC)** : Upload documents, validation admin, restriction produits 18+
- **Chauffeurs** : Matching algorithmique (Haversine), geolocalisation temps reel, preuve de livraison
- **Chat** : Messagerie temps reel client-chauffeur via Firestore
- **Notifications** : Push notifications via Firebase Cloud Messaging
- **Gestion des litiges** : Interface admin pour les reclamations
- **Zones legales** : Configuration des zones de livraison autorisees
- **Internationalisation** : Support francais/anglais
- **Theme sombre** : Mode clair/sombre avec persistance
- **Application iOS** : App native SwiftUI avec tous les parcours (client, chauffeur, marchand)
- **Securite** : CSRF protection, rate limiting, security headers (CSP, HSTS, X-Frame-Options)
- **Tests** : Suite Vitest (37 tests API) + Swift Testing (50+ tests unitaires) + XCUITest (7 tests UI)
- **CI/CD** : Pipeline GitHub Actions (lint, type-check, build, test, security audit)
- **Documentation** : Cahier des charges, diagrammes UML/BPMN, guide de deploiement, OpenAPI 3.0
- **SEO** : Sitemap, robots.txt, metadata Open Graph
- **Export RGPD** : Export des donnees utilisateur au format JSON

### Securite

- Protection CSRF avec tokens HMAC-SHA256
- Rate limiting sur toutes les routes API
- Headers HTTP securises (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- Firestore Security Rules avec RBAC
- Firebase Storage Rules avec validation MIME et taille
- Middleware Next.js pour protection des routes admin

## [0.2.0] - 2026-01-20

### Ajoute

- Integration Google Sign-In iOS
- Firebase Crashlytics
- Dependances SPM (GoogleSignIn-iOS, FirebaseCrashlytics)
- Driver matching algorithm

### Modifie

- Mise a jour GoogleService-Info.plist avec CLIENT_ID

## [0.1.0] - 2026-01-16

### Ajoute

- Initialisation du projet Next.js 16 + TypeScript
- Configuration Firebase (Auth, Firestore, Storage)
- Structure de base de l'application iOS SwiftUI
- Configuration Tailwind CSS + shadcn/ui
- Scripts de seeding pour donnees de demo
