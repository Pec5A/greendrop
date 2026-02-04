# 📡 API Documentation - PEC5A Mobile

Documentation complète des API REST pour les applications mobiles (Client & Chauffeur).

**Base URL:** `https://votre-projet.vercel.app/api`

---

## 🔑 Authentification

Toutes les requêtes nécessitent un **Firebase Auth Token** dans le header `Authorization`.

### React Native
```javascript
import auth from '@react-native-firebase/auth';
import axios from 'axios';

const API_BASE_URL = 'https://votre-projet.vercel.app/api';

// Obtenir le token
const token = await auth().currentUser.getIdToken();

// Faire une requête
const response = await axios.post(`${API_BASE_URL}/orders`, {
  shopId: '123',
  items: [...]
}, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Flutter
```dart
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

final apiBaseUrl = 'https://votre-projet.vercel.app/api';

// Obtenir le token
final token = await FirebaseAuth.instance.currentUser?.getIdToken();

// Faire une requête
final response = await http.post(
  Uri.parse('$apiBaseUrl/orders'),
  headers: {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'shopId': '123',
    'items': [...]
  }),
);
```

---

## 📦 **1. COMMANDES (Orders)**

### 1.1 Créer une commande
**Endpoint:** `POST /api/orders`  
**Auth:** ✅ Requise (Client)

**Request Body:**
```typescript
{
  shopId: string              // ID de la boutique
  items: Array<{
    productId: string         // ID du produit
    quantity: number          // Quantité
  }>
  deliveryAddress: string     // Adresse de livraison
  deliveryLocation: {
    latitude: number          // Latitude
    longitude: number         // Longitude
  }
  paymentMethod: 'card' | 'cash'
  notes?: string              // Notes optionnelles
}
```

**Response:**
```typescript
{
  success: true
  order: {
    id: string                // ID de la commande
    reference: string         // Référence (ex: ORD-1737000000)
    userId: string
    shopId: string
    items: Array<...>
    total: number             // Montant total (€)
    deliveryFee: number
    status: 'pending'
    paymentMethod: string
    paymentStatus: 'pending'
    deliveryAddress: string
    deliveryLocation: { latitude, longitude }
    estimatedDeliveryTime: string  // ISO date
    createdAt: string         // ISO date
    updatedAt: string
  }
}
```

**Exemple React Native:**
```javascript
const token = await auth().currentUser.getIdToken();

const response = await fetch('https://votre-projet.vercel.app/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    shopId: 'shop_123',
    items: [
      { productId: 'prod_1', quantity: 2 },
      { productId: 'prod_2', quantity: 1 }
    ],
    deliveryAddress: '10 Rue de Rivoli, 75001 Paris',
    deliveryLocation: { latitude: 48.8566, longitude: 2.3522 },
    paymentMethod: 'card',
    notes: 'Sonner à l\'interphone'
  }),
});

const data = await response.json();
console.log(data.order.reference); // ORD-1737000000
```

---

### 1.2 Récupérer mes commandes
**Endpoint:** `GET /api/orders/my?status=pending`  
**Auth:** ✅ Requise (Client)

**Query Parameters:**
- `status` (optional): Filtrer par statut (pending, confirmed, preparing, ready, delivering, completed, cancelled)

**Response:**
```typescript
{
  success: true
  orders: Array<Order>        // Liste des commandes
}
```

**Exemple:**
```javascript
const token = await auth().currentUser.getIdToken();

const response = await fetch('https://votre-projet.vercel.app/api/orders/my?status=delivering', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
console.log(data.orders); // [{ id: '...', status: 'delivering', ... }]
```

---

### 1.3 Détails d'une commande
**Endpoint:** `GET /api/orders/:id`  
**Auth:** ✅ Requise (Client/Driver/Admin)

**Response:**
```typescript
{
  success: true
  order: Order                // Détails complets de la commande
}
```

**Exemple:**
```javascript
const response = await fetch(`https://votre-projet.vercel.app/api/orders/${orderId}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

---

### 1.4 Mettre à jour le statut d'une commande
**Endpoint:** `PATCH /api/orders/:id`  
**Auth:** ✅ Requise (Driver/Admin)

**Request Body:**
```typescript
{
  status: 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled'
  driverId?: string           // Optionnel: assigner un chauffeur
}
```

**Response:**
```typescript
{
  success: true
  message: 'Commande mise à jour'
}
```

**Exemple:**
```javascript
await fetch(`https://votre-projet.vercel.app/api/orders/${orderId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    status: 'delivering',
  }),
});
```

---

### 1.2 Mettre à jour le statut d'une commande
**Endpoint:** `updateOrderStatus`  
**Auth:** ✅ Requise (Chauffeur, Marchand, Admin)

**Request:**
```typescript
{
  orderId: string
  status: 'created' | 'paid' | 'confirmed' | 'preparing' | 'ready' | 
          'picked_up' | 'in_transit' | 'delivered' | 'cancelled'
  notes?: string              // Notes optionnelles
  deliveryPhoto?: string      // URL de la photo de livraison
  signature?: string          // URL de la signature
}
```

**Response:**
```typescript
{
  success: true
  orderId: string
  status: string
  message: string
}
```

**Exemple:**
```javascript
// Chauffeur marque la commande comme livrée
await updateOrderStatus({
  orderId: 'abc123',
  status: 'delivered',
  deliveryPhoto: 'https://storage.googleapis.com/...',
  notes: 'Livré au client directement'
});
```

---

### 1.3 Récupérer mes commandes
**Endpoint:** `getMyOrders`  
**Auth:** ✅ Requise (Client)

**Request:**
```typescript
{
  status?: string             // Filtrer par statut (optionnel)
  limit?: number              // Nombre max de résultats
}
```

**Response:**
```typescript
{
  success: true
  orders: Array<{
    id: string
    reference: string
    status: string
    total: number
    shopName: string
    createdAt: string
    expectedDelivery: string
    items: Array<...>
    // ... autres champs
  }>
}
```

**Exemple:**
```javascript
// Récupérer les commandes en cours
const result = await getMyOrders({ 
  status: 'in_transit',
  limit: 10 
});

result.data.orders.forEach(order => {
  console.log(`${order.reference} - ${order.status}`);
});
```

---

### 1.4 Détails d'une commande
**Endpoint:** `getOrderDetails`  
**Auth:** ✅ Requise

**Request:**
```typescript
{
  orderId: string
}
```

**Response:**
```typescript
{
  success: true
  order: {
    id: string
    reference: string
    status: string
    total: number
    items: Array<...>
    pickupAddress: string
    dropoffAddress: string
    dropoffCoordinates: { lat, lng }
    driverId?: string
    driverName?: string
    driverPhone?: string
    deliveryPhoto?: string
    signature?: string
    createdAt: string
    expectedDelivery: string
    deliveredAt?: string
  }
}
```

---

## 🏪 **2. BOUTIQUES & PRODUITS (Shops & Products)**

### 2.1 Récupérer les boutiques
**Endpoint:** `GET /api/shops`  
**Auth:** ✅ Requise

**Query Parameters:**
- `lat` (optional): Latitude utilisateur
- `lng` (optional): Longitude utilisateur
- `radius` (optional): Rayon en km (défaut: 10)
- `category` (optional): Filtrer par catégorie
- `search` (optional): Recherche texte

**Response:**
```typescript
{
  success: true
  shops: Array<{
    id: string
    name: string
    address: string
    category: string
    rating: number
    deliveryFee?: number
    minimumOrder?: number
    distance?: number         // Si lat/lng fournis
    location: { latitude, longitude }
    phone: string
    email: string
    isOpen: boolean
  }>
}
```

**Exemple:**
```javascript
// Boutiques à 5km de ma position
const token = await auth().currentUser.getIdToken();

const response = await fetch(
  'https://votre-projet.vercel.app/api/shops?lat=48.8566&lng=2.3522&radius=5&category=Bio',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const data = await response.json();
data.shops.forEach(shop => {
  console.log(`${shop.name} - ${shop.distance}km`);
});
```

---

### 2.2 Récupérer les produits d'une boutique
**Endpoint:** `GET /api/shops/:id/products`  
**Auth:** ✅ Requise

**Response:**
```typescript
{
  success: true
  products: Array<{
    id: string
    shopId: string
    name: string
    description: string
    price: number
    category: string
    imageUrl?: string
    isAvailable: boolean
    stock?: number
  }>
}
```

**Exemple:**
```javascript
const response = await fetch(
  `https://votre-projet.vercel.app/api/shops/${shopId}/products`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const data = await response.json();
console.log(`${data.products.length} produits disponibles`);
```

---

---

## 🚗 **3. CHAUFFEURS (Drivers)**

### 3.1 Mettre à jour la position GPS
**Endpoint:** `POST /api/drivers/location`  
**Auth:** ✅ Requise (Driver)

**Request Body:**
```typescript
{
  latitude: number
  longitude: number
  heading?: number            // Direction (0-360°)
  speed?: number              // Vitesse (km/h)
}
```

**Response:**
```typescript
{
  success: true
  message: 'Position mise à jour'
}
```

**Exemple:**
```javascript
// Mettre à jour la position toutes les 10 secondes
setInterval(async () => {
  const position = await getCurrentPosition();
  
  await fetch('https://votre-projet.vercel.app/api/drivers/location', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      heading: position.coords.heading,
      speed: position.coords.speed,
    }),
  });
}, 10000);
```

---

### 3.2 Mettre à jour le statut
**Endpoint:** `POST /api/drivers/status`  
**Auth:** ✅ Requise (Driver)

**Request Body:**
```typescript
{
  status: 'available' | 'busy' | 'offline'
}
```

**Response:**
```typescript
{
  success: true
  message: 'Statut mis à jour'
  status: string
}
```

**Exemple:**
```javascript
// Passer en mode disponible
await fetch('https://votre-projet.vercel.app/api/drivers/status', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    status: 'available',
  }),
});
```

---

**Exemple:**
```javascript
// App chauffeur envoie position toutes les 10s
setInterval(async () => {
  const position = await getCurrentPosition();
  await updateDriverLocation({
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    speed: position.coords.speed || 0
  });
}, 10000);
```

---

### 3.2 Mettre à jour le statut
**Endpoint:** `updateDriverStatus`  
**Auth:** ✅ Requise (Chauffeur)

**Request:**
```typescript
{
  status: 'online' | 'busy' | 'break' | 'offline'
}
```

**Response:**
```typescript
{
  success: true
  message: string
}
```

---

## 📸 **4. UPLOAD DE FICHIERS (Files)**

### 4.1 Upload de photo/signature
**Endpoint:** `POST /api/upload`  
**Auth:** ✅ Requise

**Request Body:**
```typescript
{
  base64Data: string          // Données Base64 (sans préfixe data:image)
  mimeType: string            // ex: 'image/jpeg', 'image/png'
  orderId?: string            // ID commande (si applicable)
  fileType?: string           // 'delivery_proof', 'signature', etc.
}
```

**Response:**
```typescript
{
  success: true
  url: string                 // URL publique du fichier
  fileName: string
}
```

**Exemple React Native:**
```javascript
import { launchCamera } from 'react-native-image-picker';
import RNFS from 'react-native-fs';

// Prendre une photo de livraison
const photo = await launchCamera({ mediaType: 'photo' });
const base64 = await RNFS.readFile(photo.assets[0].uri, 'base64');

const response = await fetch('https://votre-projet.vercel.app/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    base64Data: base64,
    mimeType: 'image/jpeg',
    orderId: 'order_123',
    fileType: 'delivery_proof',
  }),
});

const data = await response.json();
console.log(data.url); // https://storage.googleapis.com/...
```

---

## 🔔 **5. NOTIFICATIONS (Push Notifications)**

### 5.1 Enregistrer un token FCM
**Endpoint:** `PUT /api/notifications/token`  
**Auth:** ✅ Requise

**Request Body:**
```typescript
{
  token: string               // Token FCM du device
  deviceId?: string           // ID unique du device (optionnel)
}
```

**Response:**
```typescript
{
  success: true
  message: 'Token FCM enregistré'
}
```

**Exemple React Native:**
```javascript
import messaging from '@react-native-firebase/messaging';

// Au démarrage de l'app ou après login
const token = await messaging().getToken();

await fetch('https://votre-projet.vercel.app/api/notifications/token', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token,
    deviceId: DeviceInfo.getUniqueId(),
  }),
});

// Écouter les rafraîchissements de token
messaging().onTokenRefresh(async (newToken) => {
  await fetch('https://votre-projet.vercel.app/api/notifications/token', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${authToken}` },
    body: JSON.stringify({ token: newToken }),
  });
});
```

---

### 5.2 Envoyer une notification (Admin uniquement)
**Endpoint:** `POST /api/notifications/send`  
**Auth:** ✅ Requise (Admin)

**Request Body:**
```typescript
{
  userId: string              // ID de l'utilisateur cible
  title: string               // Titre notification
  message: string             // Message
  data?: Record<string, string>  // Données additionnelles
}
```

**Response:**
```typescript
{
  success: true
  successCount: number        // Nombre d'envois réussis
  failureCount: number        // Nombre d'échecs
}
```

**Exemple:**
```javascript
// Envoyer une notification à un utilisateur
await fetch('https://votre-projet.vercel.app/api/notifications/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 'user_123',
    title: 'Nouvelle commande',
    message: 'Vous avez reçu une nouvelle commande #ORD-1234',
    data: {
      orderId: 'order_123',
      type: 'new_order',
    },
  }),
});
```

---

## 🛠️ **Configuration Client**

### Installation Firebase SDK

**React Native:**
```bash
npm install @react-native-firebase/app
npm install @react-native-firebase/auth
npm install @react-native-firebase/firestore
npm install @react-native-firebase/messaging
npm install @react-native-firebase/storage
npm install axios # Pour les appels REST
```

**Flutter:**
```yaml
dependencies:
  firebase_core: ^2.24.0
  firebase_auth: ^4.15.0
  cloud_firestore: ^4.13.0
  firebase_messaging: ^14.7.0
  firebase_storage: ^11.5.0
  http: ^1.1.0  # Pour les appels REST
```

### Initialisation

**React Native:**
```javascript
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import messaging from '@react-native-firebase/messaging';
import axios from 'axios';

// Configuration
const API_BASE_URL = 'https://votre-projet.vercel.app/api';

// Helper pour les requêtes authentifiées
async function apiCall(endpoint, options = {}) {
  const token = await auth().currentUser?.getIdToken();
  
  return axios({
    url: `${API_BASE_URL}${endpoint}`,
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// Exemple d'utilisation
const response = await apiCall('/orders', {
  method: 'POST',
  data: {
    shopId: 'shop_123',
    items: [...],
  },
});
```

**Flutter:**
```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

// Configuration
const String apiBaseUrl = 'https://votre-projet.vercel.app/api';

// Helper pour les requêtes authentifiées
Future<http.Response> apiCall(String endpoint, {
  String method = 'GET',
  Map<String, dynamic>? body,
}) async {
  final token = await FirebaseAuth.instance.currentUser?.getIdToken();
  
  final request = http.Request(method, Uri.parse('$apiBaseUrl$endpoint'));
  request.headers['Authorization'] = 'Bearer $token';
  request.headers['Content-Type'] = 'application/json';
  
  if (body != null) {
    request.body = jsonEncode(body);
  }
  
  final streamedResponse = await request.send();
  return await http.Response.fromStream(streamedResponse);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  
  runApp(MyApp());
}

// Exemple d'utilisation
final response = await apiCall('/orders', 
  method: 'POST',
  body: {
    'shopId': 'shop_123',
    'items': [...]
  },
);
```

---

## ⚠️ **Codes d'erreur**

| Code | Message | Description |
|------|---------|-------------|
| `400` | Bad Request | Données manquantes ou invalides |
| `401` | Unauthorized | Token d'authentification invalide ou manquant |
| `403` | Forbidden | Permissions insuffisantes pour cette action |
| `404` | Not Found | Ressource introuvable (commande, boutique, etc.) |
| `500` | Internal Server Error | Erreur serveur interne |

**Format des erreurs:**
```json
{
  "error": "Bad Request",
  "message": "Le champ 'shopId' est requis"
}
```

---

## 🚀 **Déploiement**

### Déployer sur Vercel (GRATUIT)

1. **Créer compte Vercel:**
   - Aller sur [vercel.com](https://vercel.com)
   - S'inscrire avec GitHub

2. **Connecter le projet:**
   ```bash
   npm install -g vercel
   cd c:\Users\User\Desktop\pec5a
   vercel login
   vercel
   ```

3. **Configurer les variables d'environnement:**
   Dans le dashboard Vercel → Settings → Environment Variables:
   ```
   FIREBASE_ADMIN_PROJECT_ID=pec5a-116e0
   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@pec5a-116e0.iam.gserviceaccount.com
   FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
   ```

4. **Déployer:**
   ```bash
   vercel --prod
   ```
   
   Votre API sera accessible sur: `https://votre-projet.vercel.app/api`

### Tester localement

```bash
# Démarrer le serveur Next.js
cd c:\Users\User\Desktop\pec5a
pnpm dev

# API disponible sur http://localhost:3000/api
# Tester avec curl:
curl http://localhost:3000/api/shops \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Obtenir les credentials Firebase Admin

1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Sélectionner votre projet `pec5a-116e0`
3. Settings (⚙️) → Project settings → Service accounts
4. Cliquer "Generate new private key"
5. Télécharger le fichier JSON
6. Extraire les valeurs:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY`

---

## 📊 **Limites & Quotas**

| Ressource | Limite gratuite | Limite payante |
|-----------|----------------|----------------|
| Invocations | 2M/mois | Illimité |
| GB-seconds | 400K/mois | Illimité |
| CPU-seconds | 200K/mois | Illimité |
| Sortie réseau | 5 GB/mois | Payant |

---

## 📞 **Support**

- **Documentation Firebase Functions:** https://firebase.google.com/docs/functions
- **Console Firebase:** https://console.firebase.google.com
- **Status:** https://status.firebase.google.com

---

**Version:** 1.0.0  
**Dernière mise à jour:** Janvier 2026  
**Région:** europe-west1 (Belgique)
