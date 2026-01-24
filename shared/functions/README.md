# Firebase Cloud Functions

This directory contains serverless Cloud Functions that automate backend operations for the delivery platform.

## Functions Overview

### Triggers

- **onOrderCreated** - Initializes order timeline and logs activity when new orders are placed
- **onOrderStatusChange** - Sends notifications, logs activity, and releases drivers when order status updates
- **onDriverLocationUpdate** - Tracks driver proximity to delivery address and sends "driver nearby" alerts

### Callable Endpoints (Mobile API)

- **updateDriverLocation** - Secure endpoint for driver mobile app to push GPS coordinates
- **updateDriverStatus** - Allows drivers to change status (online/offline/busy) from mobile app

## Setup

1. Install dependencies:
   ```bash
   cd functions
   npm install
   ```

2. Build TypeScript:
   ```bash
   npm run build
   ```

3. Deploy to Firebase:
   ```bash
   npm run deploy
   ```

4. Test with emulator:
   ```bash
   npm run serve
   ```

## Mobile Integration

### Update Driver Location (React Native example)

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase-config';

const updateLocation = httpsCallable(functions, 'updateDriverLocation');

// Call from mobile app
const result = await updateLocation({
  latitude: 45.5017,
  longitude: -73.5673,
  accuracy: 10
});
```

### Update Driver Status

```typescript
const updateStatus = httpsCallable(functions, 'updateDriverStatus');

const result = await updateStatus({
  status: 'online' // or 'offline', 'busy'
});
```

## Security

- All callable functions verify Firebase Authentication
- Firestore rules enforce role-based access control
- Rate limiting should be configured in Firebase console
- GPS coordinates are validated before saving

## Monitoring

View logs:
```bash
npm run logs
```

Or in Firebase Console → Functions → Logs
