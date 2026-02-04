# 🚀 Guide de Déploiement - PEC5A API

## Architecture

- **Frontend + API:** Next.js 15 avec App Router
- **Hébergement:** Vercel (GRATUIT)
- **Base de données:** Firebase Firestore (plan Spark gratuit)
- **Authentification:** Firebase Auth
- **Storage:** Firebase Storage

## ✅ Avant le déploiement

### 1. Obtenir les credentials Firebase Admin

1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Sélectionner votre projet **pec5a-116e0**
3. Cliquer sur ⚙️ **Settings** → **Project settings**
4. Onglet **Service accounts**
5. Cliquer sur **Generate new private key**
6. Télécharger le fichier JSON

Vous aurez besoin de ces 3 valeurs du fichier JSON :
- `project_id`
- `client_email`
- `private_key`

## 🌐 Déploiement sur Vercel

### Étape 1: Créer un compte Vercel

1. Aller sur [vercel.com](https://vercel.com)
2. S'inscrire avec GitHub (gratuit)

### Étape 2: Installer Vercel CLI (optionnel)

```bash
npm install -g vercel
```

### Étape 3: Déployer

**Option A - Via GitHub (Recommandé):**

1. Pusher le code sur GitHub
2. Aller sur [vercel.com/new](https://vercel.com/new)
3. Importer le repository GitHub
4. Vercel détectera automatiquement Next.js
5. Cliquer sur **Deploy**

**Option B - Via CLI:**

```bash
cd C:\Users\User\Desktop\pec5a
vercel login
vercel
```

### Étape 4: Configurer les variables d'environnement

Sur le dashboard Vercel :

1. Aller dans **Settings** → **Environment Variables**
2. Ajouter les 3 variables suivantes :

```
Variable Name: FIREBASE_ADMIN_PROJECT_ID
Value: pec5a-116e0

Variable Name: FIREBASE_ADMIN_CLIENT_EMAIL
Value: firebase-adminsdk-xxxxx@pec5a-116e0.iam.gserviceaccount.com

Variable Name: FIREBASE_ADMIN_PRIVATE_KEY
Value: -----BEGIN PRIVATE KEY-----
VOTRE_CLE_PRIVEE_ICI_AVEC_LES_\n
-----END PRIVATE KEY-----
```

⚠️ **Important:** Pour `FIREBASE_ADMIN_PRIVATE_KEY`, copier la clé EXACTEMENT comme dans le fichier JSON, y compris les `\n` (ne pas les remplacer par de vrais sauts de ligne).

3. Cliquer **Save**
4. **Redéployer** le projet pour prendre en compte les variables

### Étape 5: Tester l'API

Votre API sera accessible sur :
```
https://votre-projet.vercel.app/api
```

Test avec curl :
```bash
# Obtenir un token Firebase
# (depuis votre app admin web, ouvrir la console et taper:)
# await firebase.auth().currentUser.getIdToken()

curl https://votre-projet.vercel.app/api/shops \
  -H "Authorization: Bearer VOTRE_TOKEN_FIREBASE"
```

## 📱 Configuration Mobile

Une fois l'API déployée, mettre à jour le **Base URL** dans les apps mobiles :

**React Native:**
```javascript
const API_BASE_URL = 'https://votre-projet.vercel.app/api';
```

**Flutter:**
```dart
const String apiBaseUrl = 'https://votre-projet.vercel.app/api';
```

## 🔄 Mises à jour

Après chaque modification du code :

**Option A - Auto-deploy via GitHub:**
- Push sur `main` → Vercel redéploie automatiquement

**Option B - Via CLI:**
```bash
vercel --prod
```

## 📊 Limites Gratuites

### Vercel (Plan Hobby - Gratuit)
- ✅ Bande passante : 100 GB/mois
- ✅ Invocations : Illimitées
- ✅ Durée exécution : 10 secondes max par requête
- ✅ HTTPS inclus
- ✅ Domaine personnalisé gratuit

### Firebase Spark (Gratuit)
- ✅ Firestore : 1 GB stockage, 50K lectures/jour, 20K écritures/jour
- ✅ Auth : Utilisateurs illimités
- ✅ Storage : 5 GB stockage, 1 GB download/jour
- ✅ Functions : ❌ Non disponibles sur Spark (c'est pour ça on utilise Vercel!)

## ⚠️ Monitoring

- **Vercel:** Dashboard → Analytics (temps de réponse, erreurs)
- **Firebase:** Console → Usage (Firestore, Auth, Storage)

## 🐛 Debug

### API ne répond pas
1. Vérifier les variables d'environnement sur Vercel
2. Vérifier les logs : Dashboard Vercel → Functions → Logs

### Erreur 401 Unauthorized
1. Vérifier que le token Firebase est valide
2. Vérifier que `FIREBASE_ADMIN_PRIVATE_KEY` contient bien les `\n`

### Erreur 500 Internal Server Error
1. Regarder les logs sur Vercel Dashboard
2. Vérifier que Firebase Admin est bien initialisé

## 📚 Documentation

- Documentation complète : [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Endpoints : 11 routes REST API
- Authentification : Bearer token Firebase

## ✅ Checklist Déploiement

- [ ] Code pushé sur GitHub
- [ ] Compte Vercel créé
- [ ] Projet importé sur Vercel
- [ ] 3 variables d'environnement configurées
- [ ] Projet redéployé après ajout des variables
- [ ] Test d'un endpoint (ex: GET /api/shops)
- [ ] Base URL mise à jour dans les apps mobiles
- [ ] Documentation partagée avec les devs mobile

## 🎉 Résultat

Vous avez maintenant :
- ✅ Un backend API REST hébergé gratuitement
- ✅ Accessible publiquement via HTTPS
- ✅ Authentification sécurisée avec Firebase
- ✅ Prêt pour les apps mobiles (React Native + Flutter)
- ✅ Firestore comme base de données
- ✅ 0€ de coût (plans gratuits suffisants)

---

**Questions?** Voir [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) pour tous les détails des endpoints.
