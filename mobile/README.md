# GreenDrop iOS App

Application mobile iOS native pour la plateforme GreenDrop de livraison éco-responsable.

## Prérequis

- macOS 14+ (Sonoma)
- Xcode 15+
- iOS 17+ (simulateur ou appareil)
- CocoaPods ou Swift Package Manager

## Structure du Projet

```
ios/
├── GreenDrop/
│   ├── App/
│   │   ├── GreenDropApp.swift      # Point d'entrée
│   │   ├── Services.swift          # Services (Auth, Cart, Location)
│   │   └── Views/
│   │       ├── Auth/               # Login, Register, ForgotPassword
│   │       ├── Client/             # Home, Shop, Cart, Orders
│   │       ├── Driver/             # Dashboard, Deliveries, History
│   │       ├── Merchant/           # Dashboard, Orders, Products
│   │       └── Shared/             # Profile, etc.
│   ├── Resources/
│   │   ├── Assets.xcassets/
│   │   └── GoogleService-Info.plist # Firebase config (à ajouter)
│   └── Info.plist
├── GreenDropCore/                   # Swift Package
│   ├── Package.swift
│   └── Sources/
│       ├── Common/
│       ├── Domain/
│       ├── DesignSystem/
│       └── Networking/
└── README.md
```

## Configuration

### 1. Créer le projet Xcode

1. Ouvrez Xcode
2. **File > New > Project**
3. Choisissez **iOS > App**
4. Configurez:
   - **Product Name**: `GreenDrop`
   - **Bundle Identifier**: `com.greendrop.app`
   - **Interface**: SwiftUI
   - **Language**: Swift
   - **Minimum iOS**: 17.0

5. Sauvegardez le projet dans le dossier `ios/`

### 2. Ajouter les fichiers existants

1. Dans Xcode, **File > Add Files to "GreenDrop"**
2. Sélectionnez le dossier `GreenDrop/App/` et ajoutez-le
3. Ajoutez également `GreenDrop/Resources/`

### 3. Configurer Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Ouvrez votre projet GreenDrop
3. Ajoutez une app iOS avec le Bundle ID: `com.greendrop.app`
4. Téléchargez `GoogleService-Info.plist`
5. Placez-le dans `ios/GreenDrop/Resources/`

### 4. Ajouter les dépendances

Dans Xcode:
1. **File > Add Package Dependencies**
2. Ajoutez les packages suivants:

```
https://github.com/firebase/firebase-ios-sdk.git (11.0.0+)
https://github.com/onevcat/Kingfisher.git (8.0.0+)
```

3. Sélectionnez les produits Firebase:
   - FirebaseAuth
   - FirebaseFirestore
   - FirebaseStorage

### 5. Configurer les permissions

Vérifiez que `Info.plist` contient:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>GreenDrop utilise votre position pour afficher les boutiques proches.</string>
<key>NSCameraUsageDescription</key>
<string>GreenDrop utilise la caméra pour les photos de produits.</string>
```

## Lancer l'application

### Via Xcode

1. Ouvrez `GreenDrop.xcodeproj`
2. Sélectionnez un simulateur iOS 17+
3. Appuyez sur **Cmd+R** pour lancer

### Via Terminal

```bash
# Ouvrir le projet Xcode
open ios/GreenDrop.xcodeproj

# Ou si vous utilisez xcodebuild
cd ios
xcodebuild -scheme GreenDrop -destination 'platform=iOS Simulator,name=iPhone 15'
```

## Comptes de Test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Client | user@test.com | test123 |
| Chauffeur | driver@test.com | test123 |
| Marchand | merchant@test.com | test123 |

## Architecture

### Navigation par Rôle

L'application utilise une navigation basée sur le rôle de l'utilisateur:

- **Client** (`user`): Accueil, Boutiques, Panier, Commandes, Profil
- **Chauffeur** (`driver`): Dashboard, Livraisons, Historique, Profil
- **Marchand** (`merchant`): Dashboard, Commandes, Produits, Profil

### Services

- **AuthService**: Authentification Firebase
- **CartManager**: Gestion du panier (persistence locale)
- **LocationManager**: GPS et géolocalisation

### Modèles

Les modèles sont partagés avec le backend Firebase:
- User, Shop, Product, Order, Driver

## Fonctionnalités

### Client
- [x] Parcourir les boutiques
- [x] Voir les produits
- [x] Ajouter au panier
- [x] Passer une commande
- [x] Suivre ses commandes
- [x] Gérer son profil

### Chauffeur
- [x] Dashboard avec statistiques
- [x] Voir les livraisons disponibles
- [x] Accepter une livraison
- [x] Navigation vers le client
- [x] Confirmer la livraison
- [x] Historique des gains

### Marchand
- [x] Dashboard avec stats
- [x] Gérer les commandes
- [x] Gérer les produits (CRUD)
- [x] Changer le statut boutique
- [ ] Statistiques avancées

## Limitations (sans Apple Developer Program)

Sans compte développeur Apple ($99/an):
- ❌ Push Notifications (APNs)
- ❌ Distribution App Store
- ❌ Sign in with Apple
- ❌ Apple Pay

### Contournements
- **Notifications**: Utilisation de Firestore real-time listeners
- **Paiement**: Espèces ou paiement à la livraison
- **Test**: Simulateur uniquement ou TestFlight limité

## Support

Pour toute question, consultez le projet web admin ou contactez l'équipe de développement.
