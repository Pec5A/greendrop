# 📖 Documentation API OpenAPI

## 🎯 Accès à la documentation interactive

### En développement local
```
http://localhost:3000/api-docs
```

### En production
```
https://votre-projet.vercel.app/api-docs
```

## 📄 Spécification OpenAPI

Le fichier [openapi.yaml](./openapi.yaml) contient la spécification complète de l'API au format OpenAPI 3.0.

**Endpoints:**
- `GET /api/openapi` - Récupérer la spec OpenAPI en JSON

## 🚀 Utilisation

### 1. Documentation interactive (Swagger UI)

La meilleure façon d'explorer l'API est via Swagger UI :

1. Ouvrir http://localhost:3000/api-docs (ou en prod)
2. Cliquer sur "Authorize" 🔒
3. Entrer votre token Firebase : `Bearer YOUR_TOKEN`
4. Tester les endpoints directement depuis l'interface

**Obtenir un token Firebase:**
```javascript
// Dans la console du navigateur de l'admin web
await firebase.auth().currentUser.getIdToken()
```

### 2. Génération de clients

Vous pouvez générer automatiquement des clients pour différents langages :

**TypeScript / JavaScript:**
```bash
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-fetch \
  -o ./generated/typescript
```

**Dart (Flutter):**
```bash
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g dart \
  -o ./generated/dart
```

**Kotlin (Android):**
```bash
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g kotlin \
  -o ./generated/kotlin
```

**Swift (iOS):**
```bash
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g swift5 \
  -o ./generated/swift
```

### 3. Validation des requêtes

Utilisez la spec OpenAPI pour valider vos requêtes :

**Avec Postman:**
1. Importer `openapi.yaml` dans Postman
2. Créer une collection automatiquement
3. Tester tous les endpoints

**Avec Insomnia:**
1. Import → From URL
2. Coller : `http://localhost:3000/api/openapi`
3. Générer les requêtes automatiquement

### 4. Tests automatisés

**Avec Dredd:**
```bash
npm install -g dredd
dredd openapi.yaml http://localhost:3000
```

**Avec Schemathesis:**
```bash
pip install schemathesis
schemathesis run openapi.yaml --base-url http://localhost:3000
```

## 📊 Endpoints disponibles

| Endpoint | Méthode | Description | Auth |
|----------|---------|-------------|------|
| `/api/orders` | POST | Créer commande | ✅ |
| `/api/orders/my` | GET | Mes commandes | ✅ |
| `/api/orders/:id` | GET | Détails commande | ✅ |
| `/api/orders/:id` | PATCH | Update statut | ✅ Admin/Driver |
| `/api/shops` | GET | Liste boutiques | ✅ |
| `/api/shops/:id/products` | GET | Produits boutique | ✅ |
| `/api/drivers/location` | POST | Update GPS | ✅ Driver |
| `/api/drivers/status` | POST | Update statut | ✅ Driver |
| `/api/upload` | POST | Upload fichier | ✅ |
| `/api/notifications/send` | POST | Envoyer notif | ✅ Admin |
| `/api/notifications/token` | PUT | Register FCM | ✅ |

## 🔐 Authentification

Toutes les requêtes nécessitent un header `Authorization` :

```http
Authorization: Bearer YOUR_FIREBASE_TOKEN
```

**Obtenir le token :**

**React Native:**
```javascript
import auth from '@react-native-firebase/auth';
const token = await auth().currentUser.getIdToken();
```

**Flutter:**
```dart
import 'package:firebase_auth/firebase_auth.dart';
final token = await FirebaseAuth.instance.currentUser?.getIdToken();
```

**Web:**
```javascript
import { getAuth } from 'firebase/auth';
const auth = getAuth();
const token = await auth.currentUser.getIdToken();
```

## 📱 Exemple d'utilisation

### Avec cURL

```bash
# Obtenir le token
TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI..."

# Créer une commande
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "shop_123",
    "items": [
      { "productId": "prod_1", "quantity": 2 }
    ],
    "deliveryAddress": "10 Rue de Rivoli, 75001 Paris",
    "deliveryLocation": {
      "latitude": 48.8566,
      "longitude": 2.3522
    },
    "paymentMethod": "card"
  }'
```

### Avec JavaScript/TypeScript

```typescript
import axios from 'axios';

const API_BASE_URL = 'https://votre-projet.vercel.app/api';

async function createOrder(token: string) {
  const response = await axios.post(`${API_BASE_URL}/orders`, {
    shopId: 'shop_123',
    items: [
      { productId: 'prod_1', quantity: 2 }
    ],
    deliveryAddress: '10 Rue de Rivoli, 75001 Paris',
    deliveryLocation: {
      latitude: 48.8566,
      longitude: 2.3522
    },
    paymentMethod: 'card'
  }, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
}
```

## 🛠️ Outils recommandés

### IDE Extensions

**VS Code:**
- [OpenAPI (Swagger) Editor](https://marketplace.visualstudio.com/items?itemName=42Crunch.vscode-openapi)
- [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)

**IntelliJ IDEA:**
- OpenAPI Specifications plugin

### Clients API

- **Swagger UI** (intégré) - Interface web interactive
- **Postman** - Client API complet
- **Insomnia** - Alternative à Postman
- **HTTPie** - CLI moderne pour tester les APIs

### Validation & Tests

- **Dredd** - Tests de contrats API
- **Schemathesis** - Tests basés sur les propriétés
- **Prism** - Mock server OpenAPI

## 📚 Ressources

- [Spécification OpenAPI 3.0](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Documentation détaillée
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guide de déploiement

## 💡 Avantages OpenAPI

✅ **Documentation interactive** - Testez l'API en temps réel  
✅ **Génération de code** - Clients auto-générés pour mobile  
✅ **Validation automatique** - Schémas de requêtes/réponses  
✅ **Tests automatisés** - Contrats API vérifiés  
✅ **Standardisé** - Format industriel reconnu  
✅ **Versionnable** - Git-friendly (YAML)  

---

**Questions?** Consultez [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) pour des exemples détaillés.
