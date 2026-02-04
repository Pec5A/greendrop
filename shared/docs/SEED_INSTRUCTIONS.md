# PEC5A - Seed Instructions

## 🌱 Peupler la base de données avec des données de démo

### Prérequis

1. **Firebase Admin SDK credentials** - Ajouter ces variables dans `.env.local`:

```env
# Déjà existant
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pec5a-116e0
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# À ajouter pour le seed (Firebase Admin SDK)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@pec5a-116e0.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Comment obtenir ces credentials:**
1. Aller sur [Firebase Console](https://console.firebase.google.com/project/pec5a-116e0/settings/serviceaccounts/adminsdk)
2. Cliquer sur "Generate new private key"
3. Copier `client_email` → `FIREBASE_CLIENT_EMAIL`
4. Copier `private_key` → `FIREBASE_PRIVATE_KEY` (garder les `\n`)

### Installation

```bash
# Installer tsx pour exécuter TypeScript
pnpm install -D tsx firebase-admin
```

### Exécution

```bash
# Lancer le seed
pnpm seed
```

### Données créées

Le script va créer:

#### 👥 **7 Utilisateurs**
- 1 Admin
- 2 Marchands
- 2 Chauffeurs  
- 2 Clients

#### 🏪 **3 Boutiques**
- Bio Market Paris (approuvée)
- Épicerie du Marais (approuvée)
- Délices de Montmartre (en attente de validation)

#### 📦 **7 Produits**
- 4 produits dans Bio Market Paris
- 3 produits dans Épicerie du Marais

#### 🚗 **2 Chauffeurs**
- Avec localisation GPS
- Statuts: online, busy

#### 📋 **3 Commandes**
- 1 livrée
- 1 en cours de livraison
- 1 payée (en attente d'assignation)

---

## 🔐 Comptes de démo

### Admin (Accès complet)
- **Email:** admin@pec5a.com
- **Mot de passe:** admin123

### Marchands (Gestion boutique)
- **Email:** merchant1@pec5a.com / merchant2@pec5a.com
- **Mot de passe:** merchant123

### Chauffeurs (Mobile - pas encore implémenté)
- **Email:** driver1@pec5a.com / driver2@pec5a.com
- **Mot de passe:** driver123

### Clients (Mobile - pas encore implémenté)
- **Email:** client1@pec5a.com / client2@pec5a.com
- **Mot de passe:** client123

---

## ⚠️ Notes importantes

- Le script **NE supprime PAS** les données existantes par défaut
- Si vous voulez tout recommencer, décommentez les lignes `clearCollection()` dans `scripts/seed.ts`
- Les mots de passe sont simples car c'est pour une démo académique
- Les images produits utilisent Unsplash (URLs publiques)

---

## 🚀 Prochaines étapes

Après le seed:

1. **Connexion Admin**
   - Aller sur http://localhost:3000/login
   - Se connecter avec admin@pec5a.com / admin123

2. **Tester les fonctionnalités**
   - Dashboard avec statistiques
   - Gestion des commandes
   - Validation des boutiques en attente
   - Gestion des utilisateurs/chauffeurs
   - Catalogue produits

3. **Connexion Marchand** (à implémenter)
   - Interface spécifique pour gérer sa boutique
   - CRUD produits
   - Voir ses commandes

---

## 🐛 Troubleshooting

### Erreur "Permission denied"
→ Vérifier que les Firestore Rules sont bien déployées:
```bash
cd functions
firebase deploy --only firestore:rules
```

### Erreur "FIREBASE_PRIVATE_KEY invalid"
→ S'assurer que la clé privée contient bien les `\n` (retours à la ligne)

### Erreur "Email already exists"
→ Les comptes existent déjà, le script les réutilise automatiquement

---

## 📝 Structure des données

```
Firestore Collections:
├── users/          (Profils utilisateurs)
├── shops/          (Boutiques)
├── products/       (Produits)
├── drivers/        (Chauffeurs)
├── orders/         (Commandes)
├── activity-logs/  (Logs admin)
└── verifications/  (Vérifications KYC)
```
