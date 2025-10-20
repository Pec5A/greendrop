# GreenDrop

Application de livraison collaborative — marketplace connectant clients, commerçants et livreurs.

## Structure du projet

```
greendrop/
├── admin/    — Application web Next.js (panel d'administration)
├── mobile/   — Application iOS native (SwiftUI)
└── shared/   — Firebase Cloud Functions, configuration & documentation
```

## Équipe

| Membre | Email |
|--------|-------|
| Yassir Sabbar | yassir.sabbar@uit.ac.ma |
| Samy Zerouali | samyzer1@gmail.com |
| Kays Zahidi | kays.zahidi@gmail.com |

## Stack technique

- **Web** : Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Mobile** : Swift, SwiftUI, Firebase SDK
- **Backend** : Firebase (Firestore, Auth, Storage, Cloud Functions)
- **Paiements** : Stripe Connect
- **CI/CD** : GitHub Actions

## Démarrage rapide

### Application web (admin)
```bash
cd admin
pnpm install
pnpm dev
```

### Application mobile (iOS)
Ouvrir `mobile/GreenDrop/GreenDrop.xcodeproj` dans Xcode.

### Firebase
```bash
cd shared
firebase emulators:start
```
