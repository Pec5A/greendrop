# Guide de Déploiement GreenDrop

Ce guide détaille les étapes pour déployer l'application GreenDrop en production.

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Déploiement Backend (Vercel)](#2-déploiement-backend-vercel)
3. [Déploiement Firebase](#3-déploiement-firebase)
4. [Build iOS](#4-build-ios)
5. [Variables d'environnement](#5-variables-denvironnement)
6. [Vérification post-déploiement](#6-vérification-post-déploiement)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prérequis

### Comptes nécessaires

| Service | Obligatoire | URL |
|---------|-------------|-----|
| GitHub | Oui | https://github.com |
| Vercel | Oui | https://vercel.com |
| Firebase | Oui | https://console.firebase.google.com |
| Apple Developer | Non* | https://developer.apple.com |
| Stripe | Oui | https://dashboard.stripe.com |

*\*Requis uniquement pour la distribution iOS sur de vrais appareils*

### Outils à installer

```bash
# Node.js (v18+)
node --version

# pnpm (gestionnaire de paquets)
npm install -g pnpm

# Firebase CLI
npm install -g firebase-tools

# Vercel CLI (optionnel)
npm install -g vercel

# Xcode (Mac uniquement, pour iOS)
xcode-select --install
```

### Estimation des coûts

| Service | Plan Gratuit | Plan Payant |
|---------|--------------|-------------|
| **Vercel** | Hobby (100 GB/mois) | Pro: $20/mois |
| **Firebase** | Spark (50K lectures/jour) | Blaze: Pay-as-you-go |
| **Apple Developer** | Simulateur uniquement | $99/an |
| **Stripe** | 2.9% + 0.30€/transaction | - |
| **TOTAL minimum** | **$0/mois** | - |

---

## 2. Déploiement Backend (Vercel)

### 2.1 Création du compte Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur **"Sign Up"**
3. Connectez-vous avec votre compte **GitHub**
4. Autorisez l'accès à vos repositories

### 2.2 Import du projet

1. Sur le dashboard Vercel, cliquez sur **"Add New Project"**
2. Sélectionnez le repository **pec5a** (ou le nom de votre repo)
3. Vercel détecte automatiquement Next.js

### 2.3 Configuration du projet

**Framework Preset:** Next.js (auto-détecté)

**Build Settings:**
```
Build Command: pnpm build
Output Directory: .next
Install Command: pnpm install
```

### 2.4 Variables d'environnement

Avant de déployer, ajoutez les variables d'environnement dans Vercel:

1. Dans les paramètres du projet, allez dans **"Environment Variables"**
2. Ajoutez chaque variable (voir [Section 5](#5-variables-denvironnement))

**Variables requises:**
```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

### 2.5 Déploiement

1. Cliquez sur **"Deploy"**
2. Attendez la fin du build (~2-3 minutes)
3. Votre application est accessible sur `https://votre-projet.vercel.app`

### 2.6 Configuration du domaine (optionnel)

1. Allez dans **Settings > Domains**
2. Ajoutez votre domaine personnalisé
3. Configurez les DNS selon les instructions

### 2.7 Déploiement automatique

Vercel déploie automatiquement à chaque push sur la branche `main`:
- Push sur `main` → Production
- Push sur autres branches → Preview

---

## 3. Déploiement Firebase

### 3.1 Connexion à Firebase CLI

```bash
# Connexion à votre compte Firebase
firebase login

# Vérifier le projet actuel
firebase projects:list

# Sélectionner le projet (si nécessaire)
firebase use pec5a-116e0
```

### 3.2 Déploiement des règles Firestore

```bash
# Déployer uniquement les règles et index
firebase deploy --only firestore:rules,firestore:indexes
```

Sortie attendue:
```
✔  firestore.rules uploaded
✔  firestore.indexes.json uploaded
✔  Deploy complete!
```

### 3.3 Vérification dans Firebase Console

1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Sélectionnez le projet **pec5a-116e0**
3. Vérifiez:
   - **Firestore Database** → Rules (règles déployées)
   - **Firestore Database** → Indexes (index créés)
   - **Authentication** → Sign-in method (méthodes activées)

### 3.4 Population des données de démo

```bash
# Exécuter le script de seed
pnpm seed
```

Ce script crée:
- Utilisateurs de démo
- Boutiques partenaires
- Produits
- Commandes exemple

### 3.5 Configuration Authentication

Dans Firebase Console > Authentication > Sign-in method:

1. Activez **Email/Password**
2. (Optionnel) Activez **Google Sign-In**

### 3.6 Script de déploiement automatisé

Utilisez le script fourni:

```bash
./scripts/deploy.sh
```

---

## 4. Build iOS

### Option A: Simulateur (GRATUIT - Recommandé pour soutenance)

Cette option ne nécessite **pas** de compte Apple Developer ($99/an).

#### 4.A.1 Prérequis

- Mac avec macOS 13+ (Ventura ou plus récent)
- Xcode 15+ installé depuis l'App Store
- Command Line Tools installés

```bash
# Installer les Command Line Tools
xcode-select --install

# Vérifier l'installation
xcode-select -p
# Devrait afficher: /Applications/Xcode.app/Contents/Developer
```

#### 4.A.2 Ouverture du projet

```bash
# Naviguer vers le projet iOS
cd ios/GreenDrop

# Ouvrir dans Xcode
open GreenDrop.xcodeproj
```

#### 4.A.3 Configuration Firebase pour iOS

1. Vérifiez que `GoogleService-Info.plist` est présent dans le projet
2. Ce fichier contient la configuration Firebase pour iOS
3. Pour obtenir ce fichier:
   - Firebase Console > Project Settings > Your apps
   - Cliquez sur l'app iOS ou ajoutez-en une
   - Téléchargez `GoogleService-Info.plist`

#### 4.A.4 Build et Run sur Simulateur

1. Dans Xcode, sélectionnez un simulateur:
   - Cliquez sur la liste déroulante à côté du bouton Play
   - Choisissez "iPhone 15 Pro" ou tout autre simulateur

2. Lancez le build:
   - Cliquez sur le bouton **Play** (▶) ou `Cmd + R`
   - Attendez la compilation
   - Le simulateur se lance automatiquement

3. L'application s'ouvre dans le simulateur iOS

#### 4.A.5 Démonstration en soutenance

Pour une démo en soutenance:
1. Ouvrez Xcode et le projet
2. Sélectionnez un simulateur iPhone récent
3. `Cmd + R` pour lancer
4. Démontrez les fonctionnalités dans le simulateur

**Avantages:**
- Gratuit
- Pas besoin de vrai iPhone
- Parfait pour démonstration
- Accès au débogage Xcode

---

### Option B: IPA pour TestFlight ($99/an)

Cette option nécessite un compte **Apple Developer Program**.

#### 4.B.1 Inscription Apple Developer

1. Allez sur [developer.apple.com](https://developer.apple.com)
2. Cliquez sur **"Account"** puis **"Enroll"**
3. Payez les $99/an
4. Attendez l'approbation (24-48h)

#### 4.B.2 Configuration des certificats

##### Créer un certificat de distribution

1. Dans Xcode: **Settings > Accounts**
2. Ajoutez votre Apple ID
3. Sélectionnez votre équipe
4. Cliquez sur **"Manage Certificates"**
5. Créez un certificat **Apple Distribution**

##### Créer un App ID

1. Sur [developer.apple.com/account](https://developer.apple.com/account)
2. Allez dans **Certificates, Identifiers & Profiles**
3. **Identifiers** > **+**
4. Sélectionnez **App IDs**
5. Bundle ID: `com.greendrop.app` (ou votre bundle ID)
6. Activez les capabilities nécessaires (Push Notifications, etc.)

##### Créer un profil de provisioning

1. **Profiles** > **+**
2. Sélectionnez **App Store** (pour TestFlight)
3. Sélectionnez votre App ID
4. Sélectionnez votre certificat
5. Téléchargez et double-cliquez pour installer

#### 4.B.3 Configuration Xcode pour distribution

1. Ouvrez le projet dans Xcode
2. Sélectionnez la target **GreenDrop**
3. Onglet **Signing & Capabilities**
4. Cochez **"Automatically manage signing"**
5. Sélectionnez votre Team

#### 4.B.4 Création de l'Archive

1. Sélectionnez **"Any iOS Device (arm64)"** comme destination
2. Menu **Product > Archive**
3. Attendez la fin de l'archivage
4. L'Organizer s'ouvre automatiquement

#### 4.B.5 Distribution sur TestFlight

1. Dans l'Organizer, sélectionnez l'archive
2. Cliquez sur **"Distribute App"**
3. Sélectionnez **"App Store Connect"**
4. Suivez les étapes:
   - Upload
   - Attendre le processing (10-30 min)
5. Dans [App Store Connect](https://appstoreconnect.apple.com):
   - Allez dans **TestFlight**
   - Ajoutez des testeurs
   - Les testeurs reçoivent une invitation

#### 4.B.6 Distribution Ad Hoc (alternative)

Pour distribuer à un nombre limité d'appareils (100 max):

1. Collectez les UDIDs des appareils
2. Ajoutez-les dans **Devices** sur le portail développeur
3. Créez un profil **Ad Hoc**
4. Exportez l'IPA avec ce profil
5. Distribuez via AirDrop, email, ou service comme Diawi

---

## 5. Variables d'environnement

### Liste complète

```env
# =============================================
# FIREBASE CLIENT (publiques - visibles dans le code)
# =============================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pec5a-116e0.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pec5a-116e0
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pec5a-116e0.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# =============================================
# FIREBASE ADMIN (privées - JAMAIS dans le code client)
# =============================================
FIREBASE_ADMIN_PROJECT_ID=pec5a-116e0
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@pec5a-116e0.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# =============================================
# STRIPE
# =============================================
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Où obtenir ces valeurs

#### Firebase Client

1. [Firebase Console](https://console.firebase.google.com)
2. Project Settings (engrenage)
3. Scroll jusqu'à "Your apps"
4. Sélectionnez l'app Web
5. Copiez la configuration

#### Firebase Admin

1. [Firebase Console](https://console.firebase.google.com)
2. Project Settings > Service Accounts
3. Cliquez sur "Generate new private key"
4. Téléchargez le fichier JSON
5. Extrayez les valeurs:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY`

#### Stripe

1. [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copiez:
   - Publishable key → `STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
3. Pour le webhook:
   - Developers > Webhooks
   - Add endpoint
   - URL: `https://votre-domaine.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`

### Configuration par environnement

| Variable | Local (.env.local) | Vercel | Firebase |
|----------|-------------------|--------|----------|
| NEXT_PUBLIC_* | Oui | Oui | N/A |
| FIREBASE_ADMIN_* | Oui | Oui | N/A |
| STRIPE_* | Oui | Oui | N/A |

---

## 6. Vérification post-déploiement

### 6.1 Tests manuels

#### API Backend

```bash
# Vérifier que l'API répond
curl https://votre-projet.vercel.app/api/shops

# Devrait retourner une liste de boutiques
```

#### Frontend

1. Ouvrez `https://votre-projet.vercel.app`
2. Vérifiez que la page d'accueil se charge
3. Testez la navigation

#### Authentification

1. Créez un compte utilisateur
2. Vérifiez l'email de confirmation (si activé)
3. Connectez-vous
4. Vérifiez dans Firebase Console > Authentication

#### Commande complète

1. Parcourez les boutiques
2. Ajoutez des produits au panier
3. Passez une commande
4. Vérifiez dans Firebase Console > Firestore

### 6.2 Checklist finale

```
DÉPLOIEMENT VERCEL
[ ] Site web accessible sur *.vercel.app
[ ] Pas d'erreurs dans les logs Vercel
[ ] Variables d'environnement configurées
[ ] Build réussi sans warnings critiques

FIREBASE
[ ] Firestore rules déployées
[ ] Firestore indexes créés
[ ] Authentication configurée
[ ] Données de démo présentes (optionnel)

iOS (si applicable)
[ ] Build réussi sur simulateur
[ ] Application fonctionnelle
[ ] Connexion Firebase OK depuis l'app
[ ] (TestFlight) Build uploadé et approuvé

STRIPE (si paiements actifs)
[ ] Webhook configuré
[ ] Test de paiement réussi
[ ] Events reçus dans le dashboard
```

### 6.3 Monitoring

#### Vercel Analytics

Activez Vercel Analytics pour suivre:
- Nombre de visiteurs
- Performance (Core Web Vitals)
- Erreurs

```bash
# Déjà installé dans le projet
# @vercel/analytics est inclus dans package.json
```

#### Firebase Console

Surveillez:
- **Usage** > Firestore reads/writes
- **Authentication** > Users
- **Functions** > Logs (si utilisé)

---

## 7. Troubleshooting

### Erreurs courantes

#### "Module not found" sur Vercel

**Cause:** Dépendance manquante ou chemin incorrect

**Solution:**
```bash
# Vérifier les imports
# S'assurer que toutes les dépendances sont dans package.json
pnpm install
pnpm build  # Tester localement
```

#### "FIREBASE_ADMIN_PRIVATE_KEY invalid"

**Cause:** La clé privée n'est pas correctement formatée

**Solution:**
1. Dans Vercel, assurez-vous que la clé est entre guillemets
2. Les `\n` doivent être présents (pas de vraies nouvelles lignes)
3. Format correct:
```
"-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

#### "Firestore permission denied"

**Cause:** Règles Firestore non déployées ou incorrectes

**Solution:**
```bash
# Redéployer les règles
firebase deploy --only firestore:rules

# Vérifier dans Firebase Console
```

#### Build iOS échoue - "Signing requires a development team"

**Cause:** Pas d'équipe de développement sélectionnée

**Solution:**
1. Xcode > Target > Signing & Capabilities
2. Cochez "Automatically manage signing"
3. Sélectionnez "Personal Team" (pour simulateur)

#### "No such module 'Firebase'" (iOS)

**Cause:** Dépendances Swift Package Manager non résolues

**Solution:**
1. Xcode > File > Packages > Reset Package Caches
2. Xcode > File > Packages > Resolve Package Versions
3. Clean Build: `Cmd + Shift + K`
4. Rebuild: `Cmd + B`

#### Stripe webhook ne reçoit pas les events

**Cause:** URL incorrecte ou secret invalide

**Solution:**
1. Vérifiez l'URL du webhook dans Stripe Dashboard
2. Regenerez le webhook secret
3. Mettez à jour `STRIPE_WEBHOOK_SECRET` dans Vercel
4. Redéployez

### Logs et debugging

#### Vercel

```bash
# Voir les logs en temps réel
vercel logs https://votre-projet.vercel.app --follow

# Ou dans le dashboard
# Vercel > Project > Deployments > Logs
```

#### Firebase

```bash
# Logs des fonctions (si utilisées)
firebase functions:log

# Ou dans Firebase Console > Functions > Logs
```

#### Xcode

- Console: `Cmd + Shift + C`
- Breakpoints pour debugger
- Network: Utiliser Charles Proxy ou Proxyman

---

## Résumé des commandes

```bash
# === FIREBASE ===
firebase login                              # Connexion
firebase use pec5a-116e0                    # Sélectionner projet
firebase deploy --only firestore            # Déployer Firestore
pnpm seed                                   # Données de démo

# === VERCEL (optionnel, CLI) ===
vercel                                      # Déploiement preview
vercel --prod                               # Déploiement production
vercel env pull                             # Récupérer les variables

# === iOS ===
cd ios/GreenDrop && open GreenDrop.xcodeproj  # Ouvrir Xcode
# Puis Cmd + R pour build + run

# === DÉVELOPPEMENT LOCAL ===
pnpm install                                # Installer dépendances
pnpm dev                                    # Lancer en développement
pnpm build                                  # Build production
pnpm test                                   # Lancer les tests
```

---

## Support

- **Issues GitHub:** https://github.com/votre-repo/issues
- **Firebase Support:** https://firebase.google.com/support
- **Vercel Support:** https://vercel.com/support
- **Apple Developer:** https://developer.apple.com/support
