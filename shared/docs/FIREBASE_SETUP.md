# Configuration Firebase - GreenDrop Admin

Ce document explique comment configurer Firebase pour l'application GreenDrop Admin.

## 1. Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Ajouter un projet"
3. Donnez un nom à votre projet (ex: "greendrop-admin")
4. Suivez les étapes de configuration

## 2. Activer les services Firebase

### Authentication
1. Dans Firebase Console, allez dans **Authentication**
2. Cliquez sur **Get started**
3. Dans l'onglet **Sign-in method**, activez **Email/Password**

### Firestore Database
1. Allez dans **Firestore Database**
2. Cliquez sur **Create database**
3. Choisissez **Start in test mode** (pour le développement)
4. Sélectionnez une région proche de vous

### Storage (optionnel)
1. Allez dans **Storage**
2. Cliquez sur **Get started**
3. Acceptez les règles par défaut

## 3. Obtenir les credentials

1. Dans Firebase Console, allez dans **Project settings** (icône engrenage)
2. Scrollez jusqu'à **Your apps**
3. Cliquez sur l'icône **Web** (</>)
4. Enregistrez l'app avec un nom (ex: "GreenDrop Admin Web")
5. Copiez les valeurs de `firebaseConfig`

## 4. Configurer les variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_FIREBASE_API_KEY=votre_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id
```

## 5. Créer un utilisateur admin

1. Dans Firebase Console, allez dans **Authentication** > **Users**
2. Cliquez sur **Add user**
3. Entrez un email et un mot de passe
4. Notez l'UID de l'utilisateur créé

## 6. Configurer les règles Firestore

Dans Firebase Console > Firestore > Rules, copiez les règles suivantes :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    match /orders/{orderId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    match /verifications/{verificationId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    match /disputes/{disputeId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    match /legalZones/{zoneId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    match /config/{configId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    match /activityLogs/{logId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
  }
}
```

## 7. Peupler la base de données

### Option A: Via l'interface admin
1. Connectez-vous à l'application avec votre compte admin
2. Allez dans `/setup`
3. Cliquez sur "Peupler la base de données"

### Option B: Via la console Firebase
Vous pouvez importer manuellement les données depuis la console Firestore.

## 8. Créer le document utilisateur admin

Après avoir créé l'utilisateur dans Authentication, créez un document dans Firestore :

1. Allez dans **Firestore Database**
2. Créez une collection `users`
3. Ajoutez un document avec l'UID de l'utilisateur comme ID
4. Ajoutez les champs suivants :
   - `email`: "votre@email.com"
   - `name`: "Admin"
   - `role`: "admin"
   - `status`: "verified"
   - `createdAt`: (timestamp actuel)

## Structure des collections

```
├── users/
│   └── {userId}
│       ├── email: string
│       ├── name: string
│       ├── role: "admin" | "user" | "driver"
│       ├── status: "pending" | "verified" | "rejected"
│       ├── phone?: string
│       ├── avatar?: string
│       └── createdAt: timestamp
│
├── orders/
│   └── {orderId}
│       ├── userId: string
│       ├── shopId: string
│       ├── status: "created" | "paid" | "shipped" | "delivered" | "cancelled"
│       ├── total: number
│       ├── items: array
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── verifications/
│   └── {verificationId}
│       ├── userId: string
│       ├── type: "id" | "license" | "business"
│       ├── status: "pending" | "approved" | "rejected"
│       ├── documentUrl: string
│       ├── submittedAt: timestamp
│       ├── reviewedAt?: timestamp
│       └── reviewedBy?: string
│
├── disputes/
│   └── {disputeId}
│       ├── orderId: string
│       ├── userId: string
│       ├── userName: string
│       ├── userEmail: string
│       ├── reason: string
│       ├── description: string
│       ├── status: "open" | "investigating" | "resolved" | "closed"
│       ├── priority: "low" | "medium" | "high"
│       ├── amount: number
│       ├── createdAt: timestamp
│       ├── updatedAt: timestamp
│       ├── resolvedAt?: timestamp
│       ├── resolvedBy?: string
│       └── resolution?: string
│
├── legalZones/
│   └── {zoneId}
│       ├── name: string
│       ├── type: "delivery" | "restricted"
│       ├── coordinates: array
│       ├── color: string
│       ├── active: boolean
│       └── createdAt: timestamp
│
├── config/
│   └── app
│       ├── platformSettings: object
│       ├── deliverySettings: object
│       ├── paymentSettings: object
│       ├── featureFlags: array
│       └── updatedAt: timestamp
│
└── activityLogs/
    └── {logId}
        ├── type: string
        ├── message: string
        ├── userId?: string
        ├── userName?: string
        ├── entityId?: string
        ├── entityType?: string
        ├── metadata?: object
        └── createdAt: timestamp
```

## Développement local avec les émulateurs Firebase (optionnel)

Pour un développement local sans affecter la base de production :

1. Installez Firebase CLI : `npm install -g firebase-tools`
2. Initialisez Firebase : `firebase init`
3. Démarrez les émulateurs : `firebase emulators:start`
4. Créez un fichier `.env.local` avec :

```env
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
```

## Problèmes courants

### "Permission denied"
- Vérifiez que l'utilisateur est bien créé dans Authentication
- Vérifiez que le document utilisateur existe dans Firestore avec `role: "admin"`
- Vérifiez les règles Firestore

### "Firebase App named '[DEFAULT]' already exists"
- Ce n'est pas une erreur critique, l'app est déjà initialisée

### Les données ne se mettent pas à jour en temps réel
- Vérifiez que vous êtes connecté
- Vérifiez la console pour les erreurs de permission
