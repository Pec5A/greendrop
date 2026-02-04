# Guide de Test Complet - GreenDrop

> Document exhaustif couvrant **tous** les workflows de test par role, fonctionnalite et scenario d'erreur.

---

## Comptes de Test

| Role           | Email                 | Mot de passe  |
| -------------- | --------------------- | ------------- |
| **Client 1**   | `client1@pec5a.com`   | `client123`   |
| **Client 2**   | `client2@pec5a.com`   | `client123`   |
| **Livreur 1**  | `driver1@pec5a.com`   | `driver123`   |
| **Livreur 2**  | `driver2@pec5a.com`   | `driver123`   |
| **Marchand 1** | `merchant1@pec5a.com` | `merchant123` |
| **Marchand 2** | `merchant2@pec5a.com` | `merchant123` |
| **Admin**      | `admin@greendrop.com` | `admin123`    |

## Donnees de Demo

### Boutiques (4)

1. **GreenLeaf Paris** - 1er arr. - Livraison: 2.99EUR
2. **Le Chanvre Dore** - Marais - Livraison: 1.99EUR
3. **CBD Factory Bastille** - 11e arr. - Livraison: 2.49EUR
4. **Herbal House Montmartre** - 18e arr. - Livraison: 2.99EUR

### Produits

- Fleurs CBD: 6.90EUR - 9.00EUR
- Huiles CBD: 12.90EUR - 49.90EUR
- Resines: 7.50EUR - 14.90EUR
- Cosmetiques: 14.90EUR - 39.90EUR

### Carte de Test Stripe

- **Numero**: `4242 4242 4242 4242`
- **Carte refusee**: `4000 0000 0000 0002`
- **Date**: Toute date future
- **CVC**: 3 chiffres au choix

---

## SECTION 1 : WORKFLOWS AUTHENTIFICATION (6 scenarios)

### 1.1 Connexion email/mot de passe

- [ ] Ouvrir l'application iOS ou le site web
- [ ] Saisir `client1@pec5a.com` / `client123`
- [ ] Cliquer "Se connecter"
- [ ] Verifier le redirect vers le dashboard client
- [ ] Verifier le nom de l'utilisateur affiche dans le header/profil

### 1.2 Connexion Google OAuth

- [ ] Cliquer "Se connecter avec Google"
- [ ] Selectionner un compte Google
- [ ] Verifier la creation du profil utilisateur dans Firestore
- [ ] Verifier le redirect vers le dashboard appropriate

### 1.3 Inscription nouveau compte

- [ ] Cliquer "Creer un compte"
- [ ] Remplir : nom, email, mot de passe, confirmation mot de passe
- [ ] Soumettre le formulaire
- [ ] Verifier la creation du document dans Firestore `users/{uid}`
- [ ] Verifier le role par defaut = "user"
- [ ] Verifier le redirect vers le dashboard client

### 1.4 Deconnexion

- [ ] Se connecter avec un compte valide
- [ ] Naviguer vers Profil → Deconnexion
- [ ] Cliquer "Se deconnecter"
- [ ] Verifier le retour a l'ecran de connexion
- [ ] Verifier que le token Firebase est invalide
- [ ] Verifier qu'aucune donnee utilisateur n'est persistee

### 1.5 Reset mot de passe

- [ ] Cliquer "Mot de passe oublie ?"
- [ ] Entrer l'adresse email du compte
- [ ] Soumettre
- [ ] Verifier la reception de l'email Firebase Auth
- [ ] Suivre le lien de reinitialisation
- [ ] Definir un nouveau mot de passe
- [ ] Se connecter avec le nouveau mot de passe

### 1.6 Acces role non-autorise

- [ ] Se connecter avec un compte client (`client1@pec5a.com`)
- [ ] Tenter d'acceder a `/admin` → Verifier redirect / message "Acces refuse"
- [ ] Se connecter avec un compte livreur (`driver1@pec5a.com`)
- [ ] Verifier que le dashboard marchand n'est pas accessible
- [ ] Se connecter avec un compte marchand (`merchant1@pec5a.com`)
- [ ] Verifier que le dashboard admin n'est pas accessible

---

## SECTION 2 : WORKFLOWS CLIENT (12 scenarios)

### 2.1 Parcourir les boutiques

- [ ] Se connecter en tant que client
- [ ] Voir la liste des 4 boutiques sur l'ecran d'accueil
- [ ] Verifier : nom, adresse, note, frais de livraison pour chaque boutique
- [ ] Verifier les badges "Ouvert" / "Ferme"

### 2.2 Recherche et filtres

- [ ] Utiliser la barre de recherche : taper "Green"
- [ ] Verifier que seule "GreenLeaf Paris" apparait
- [ ] Appliquer filtre par note (4+ etoiles)
- [ ] Appliquer filtre par frais de livraison (max 2.50EUR)
- [ ] Combiner recherche + filtre
- [ ] Reinitialiser les filtres → toutes les boutiques reapparaissent

### 2.3 Voir un produit

- [ ] Ouvrir une boutique (GreenLeaf Paris)
- [ ] Voir la liste des produits
- [ ] Filtrer par categorie (Fleurs CBD)
- [ ] Ouvrir les details d'un produit
- [ ] Verifier : nom, prix, description, stock disponible, image
- [ ] Verifier badge "18+" pour les produits restreints

### 2.4 Ajout au panier

- [ ] Depuis la fiche produit, cliquer "Ajouter au panier"
- [ ] Verifier le badge compteur sur l'onglet panier
- [ ] Ajouter un 2e produit de la meme boutique
- [ ] Verifier les 2 articles dans le panier

### 2.5 Modifier le panier

- [ ] Ouvrir l'onglet Panier
- [ ] Augmenter la quantite d'un produit (+)
- [ ] Diminuer la quantite d'un produit (-)
- [ ] Verifier le sous-total mis a jour
- [ ] Supprimer un article (swipe ou bouton X)
- [ ] Vider le panier complet
- [ ] Verifier l'etat vide du panier

### 2.6 Changement de boutique dans le panier

- [ ] Ajouter un produit de la boutique A
- [ ] Ajouter un produit de la boutique B
- [ ] Verifier l'alerte "Le panier sera vide si vous changez de boutique"
- [ ] Confirmer → le panier contient uniquement le produit de B

### 2.7 Checkout complet

- [ ] Ajouter des produits au panier
- [ ] Ouvrir le panier → "Passer commande"
- [ ] Entrer/selectionner adresse de livraison
- [ ] Ajouter des instructions ("Digicode 1234")
- [ ] Verifier le resume : articles, sous-total, frais livraison, total
- [ ] (Optionnel) Activer livraison programmee + selectionner creneau
- [ ] (Optionnel) Appliquer code promo
- [ ] (Optionnel) Selectionner un pourboire

### 2.8 Paiement Stripe

- [ ] Cliquer "Payer"
- [ ] Entrer carte test : `4242 4242 4242 4242`, date future, CVC 123
- [ ] Confirmer le paiement
- [ ] Verifier la page de confirmation de commande
- [ ] Verifier le statut "En attente" de la commande
- [ ] Verifier dans Stripe Dashboard (mode test) que le PaymentIntent est cree

### 2.9 Suivi de commande en temps reel

- [ ] Apres le paiement, voir l'ecran de suivi
- [ ] Verifier le statut initial "En attente"
- [ ] Verifier la barre de progression visuelle
- [ ] Verifier l'heure estimee de livraison
- [ ] Verifier les details de la commande (articles, totaux)
- [ ] Attendre un changement de statut et verifier la mise a jour temps reel

### 2.10 Historique des commandes

- [ ] Aller dans l'onglet "Commandes"
- [ ] Voir les commandes en cours (statuts actifs)
- [ ] Voir les commandes passees (livrees/annulees)
- [ ] Ouvrir les details d'une commande passee
- [ ] Verifier : articles, prix, date, statut, adresse

### 2.11 Favoris

- [ ] Depuis la liste des boutiques, ajouter une boutique aux favoris (coeur)
- [ ] Depuis la fiche produit, ajouter un produit aux favoris
- [ ] Aller dans l'onglet Favoris
- [ ] Verifier les boutiques et produits favoris
- [ ] Retirer un favori
- [ ] Verifier la suppression

### 2.12 KYC (Verification d'identite)

- [ ] Se connecter avec un compte sans KYC valide
- [ ] Ajouter un produit CBD restreint (18+) au panier
- [ ] Aller au checkout → message "Verification d'age requise"
- [ ] Le bouton "Payer" est desactive
- [ ] Cliquer "Verifier mon identite"
- [ ] Remplir le formulaire : prenom, nom, date de naissance (18+), type de document, numero
- [ ] Uploader photo recto + verso du document
- [ ] Prendre un selfie
- [ ] Soumettre → statut "En attente de verification"
- [ ] (Admin) Approuver dans Firestore : `verifications/{userId}.status = "approved"`
- [ ] Rafraichir l'app → statut "Identite verifiee"
- [ ] Retourner au checkout → bouton "Payer" actif
- [ ] Finaliser la commande

### 2.13 Gestion des adresses

- [ ] Aller dans Profil → Adresses
- [ ] Ajouter une nouvelle adresse (label, rue, ville, CP, pays, instructions)
- [ ] Definir comme adresse par defaut
- [ ] Modifier une adresse existante
- [ ] Supprimer une adresse
- [ ] Verifier la selection automatique de l'adresse par defaut au checkout

---

## SECTION 3 : WORKFLOWS CHAUFFEUR (8 scenarios)

### 3.1 Connexion chauffeur

- [ ] Se connecter avec `driver1@pec5a.com` / `driver123`
- [ ] Verifier l'affichage du dashboard chauffeur
- [ ] Verifier les statistiques du jour (livraisons, gains)
- [ ] Verifier la note moyenne

### 3.2 Changement de statut en ligne/hors ligne

- [ ] Toggle "En ligne" active
- [ ] Verifier l'indicateur vert
- [ ] Toggle "Hors ligne"
- [ ] Verifier l'indicateur gris
- [ ] Verifier qu'aucune livraison n'est recue hors ligne
- [ ] Remettre "En ligne"

### 3.3 Reception et acceptation d'une livraison

- [ ] Etre "En ligne"
- [ ] Aller dans l'onglet "Livraisons"
- [ ] Voir les livraisons disponibles
- [ ] Voir les details : boutique, adresse client, gain estime, distance
- [ ] Cliquer "Accepter la livraison"
- [ ] Verifier la carte de livraison active avec itineraire

### 3.4 Progression de livraison

- [ ] Voir l'itineraire sur la carte miniature
- [ ] Cliquer "Carte" pour vue plein ecran
- [ ] Fermer la carte
- [ ] Cliquer "Au magasin" (arrive a la boutique)
- [ ] Cliquer "Recuperee" (commande recuperee)
- [ ] Cliquer "En route" (en direction du client)
- [ ] Verifier que le client voit les mises a jour en temps reel

### 3.5 Navigation GPS

- [ ] Verifier l'affichage de la carte avec la position du chauffeur
- [ ] Verifier l'itineraire vers la boutique puis vers le client
- [ ] Autoriser la localisation si demande
- [ ] Verifier la mise a jour de la position en temps reel

### 3.6 Preuve de livraison

- [ ] Arriver a destination
- [ ] Cliquer "Livree"
- [ ] Ecran Preuve de Livraison apparait
- [ ] Prendre une photo de la livraison
- [ ] Collecter la signature du client (dessiner sur l'ecran)
- [ ] Ajouter une note optionnelle ("Laisse a la porte")
- [ ] Soumettre la preuve
- [ ] Verifier "Livraison terminee"

### 3.7 Historique et gains

- [ ] Aller dans "Historique"
- [ ] Voir les livraisons passees avec dates et gains
- [ ] Aller dans "Gains"
- [ ] Voir les gains par jour/semaine/mois
- [ ] Aller dans "Pourboires"
- [ ] Voir le resume des pourboires recus

### 3.8 Stripe Connect onboarding chauffeur

- [ ] Aller dans Profil → Paiements
- [ ] Cliquer "Configurer les paiements"
- [ ] Verifier la redirection vers Stripe Connect Onboarding
- [ ] Completer l'onboarding (mode test)
- [ ] Verifier le retour dans l'app avec compte connecte
- [ ] Verifier l'acces au dashboard Stripe

---

## SECTION 4 : WORKFLOWS MARCHAND (8 scenarios)

### 4.1 Connexion marchand

- [ ] Se connecter avec `merchant1@pec5a.com` / `merchant123`
- [ ] Verifier l'affichage du dashboard marchand
- [ ] Verifier les onglets : Dashboard, Commandes, Produits, Profil

### 4.2 Dashboard marchand

- [ ] Voir les KPIs : commandes du jour, revenu, commandes en attente, total produits
- [ ] Verifier la coherence des chiffres
- [ ] Voir les commandes recentes

### 4.3 CRUD produits - Creation

- [ ] Aller dans l'onglet Produits
- [ ] Cliquer "Ajouter un produit"
- [ ] Remplir : nom, description, prix, categorie, stock
- [ ] Uploader une image
- [ ] Cocher "Produit restreint (18+)" si applicable
- [ ] Sauvegarder
- [ ] Verifier l'apparition du produit dans la liste

### 4.4 CRUD produits - Modification et Suppression

- [ ] Selectionner un produit existant
- [ ] Modifier le prix et le stock
- [ ] Sauvegarder → verifier la mise a jour
- [ ] Changer la disponibilite (actif/inactif)
- [ ] Supprimer un produit
- [ ] Verifier la disparition de la liste

### 4.5 Gestion des commandes

- [ ] Voir les nouvelles commandes dans l'onglet Commandes
- [ ] Ouvrir une commande → voir les details (articles, client, adresse)
- [ ] Changer le statut : En attente → Confirmee → En preparation → Prete
- [ ] Verifier que le client recoit la notification de changement de statut

### 4.6 Statistiques boutique

- [ ] Voir les statistiques de la boutique
- [ ] Nombre de commandes par periode
- [ ] Revenu total
- [ ] Produits les plus vendus
- [ ] Note moyenne des avis clients

### 4.7 Stripe Connect onboarding marchand

- [ ] Aller dans Profil → Paiements
- [ ] Cliquer "Configurer les paiements"
- [ ] Verifier la redirection vers Stripe Connect Onboarding
- [ ] Completer l'onboarding (mode test)
- [ ] Verifier le retour dans l'app avec compte connecte
- [ ] Verifier l'acces au dashboard Stripe marchand

### 4.8 Gestion profil boutique

- [ ] Aller dans Profil → Ma boutique
- [ ] Modifier le nom, l'adresse, les horaires
- [ ] Modifier le logo
- [ ] Modifier les frais de livraison et le montant minimum
- [ ] Sauvegarder et verifier les changements

---

## SECTION 5 : WORKFLOWS ADMIN (15 scenarios)

### 5.1 Dashboard KPIs

- [ ] Se connecter avec `admin@greendrop.com` / `admin123`
- [ ] Verifier le dashboard admin avec KPIs :
  - Nombre total d'utilisateurs
  - Nombre de commandes du jour/semaine/mois
  - Revenu total
  - Commandes en cours
  - Nombre de boutiques actives
  - Nombre de chauffeurs en ligne

### 5.2 Gestion des utilisateurs

- [ ] Aller dans Administration → Utilisateurs
- [ ] Voir la liste paginee de tous les utilisateurs
- [ ] Filtrer par role (client, chauffeur, marchand, admin)
- [ ] Rechercher un utilisateur par nom ou email
- [ ] Voir les details d'un utilisateur
- [ ] Modifier le role d'un utilisateur
- [ ] Suspendre un utilisateur
- [ ] Reactiver un utilisateur

### 5.3 Gestion des commandes (admin)

- [ ] Aller dans Administration → Commandes
- [ ] Voir toutes les commandes avec filtres (statut, date, boutique)
- [ ] Ouvrir le detail d'une commande
- [ ] Modifier le statut d'une commande
- [ ] Assigner/reassigner un chauffeur
- [ ] Voir l'historique des changements de statut

### 5.4 KYC - Approbation

- [ ] Aller dans Administration → Verifications KYC
- [ ] Voir les demandes en attente
- [ ] Ouvrir une demande
- [ ] Verifier : prenom, nom, date de naissance, type de document, photos
- [ ] Approuver la demande
- [ ] Verifier que le statut passe a "approved" dans Firestore
- [ ] Verifier que l'utilisateur peut ensuite acheter des produits 18+

### 5.5 KYC - Rejet

- [ ] Ouvrir une demande KYC
- [ ] Rejeter avec motif ("Document illisible", "Mineur", etc.)
- [ ] Verifier que le statut passe a "rejected" dans Firestore
- [ ] Verifier que l'utilisateur voit le motif de rejet
- [ ] L'utilisateur peut resoumettre une nouvelle demande

### 5.6 Gestion des litiges

- [ ] Voir la liste des litiges/reclamations
- [ ] Ouvrir un litige
- [ ] Voir les details : commande associee, messages, preuves
- [ ] Repondre au litige
- [ ] Clore le litige (en faveur du client / du marchand)

### 5.7 Zones legales et reglementaires

- [ ] Verifier les parametres de conformite CBD
- [ ] Verifier les limites d'age par produit
- [ ] Verifier les zones de livraison autorisees
- [ ] Verifier les mentions legales affichees

### 5.8 Configuration de la plateforme

- [ ] Aller dans Administration → Configuration
- [ ] Modifier les parametres generaux (nom de l'app, devise, langue par defaut)
- [ ] Modifier les frais de commission de la plateforme
- [ ] Modifier les parametres de notification
- [ ] Sauvegarder et verifier l'application des changements

### 5.9 Carte des chauffeurs

- [ ] Aller dans Administration → Carte
- [ ] Voir les chauffeurs en ligne sur la carte en temps reel
- [ ] Voir leur position, statut, livraison en cours
- [ ] Filtrer par statut (disponible, en livraison)

### 5.10 Catalogue global

- [ ] Voir la liste de tous les produits de toutes les boutiques
- [ ] Filtrer par boutique, categorie, disponibilite
- [ ] Desactiver un produit non conforme
- [ ] Verifier que le produit n'apparait plus cote client

### 5.11 Logs d'activite

- [ ] Aller dans Administration → Activite
- [ ] Voir les logs d'activite recents
- [ ] Filtrer par type (commande, utilisateur, paiement, statut)
- [ ] Filtrer par date
- [ ] Voir les details d'une activite

### 5.12 Palette de commandes

- [ ] Voir la vue kanban des commandes par statut
- [ ] Drag & drop une commande d'un statut a un autre
- [ ] Verifier la mise a jour en temps reel

### 5.13 Theme sombre

- [ ] Aller dans les parametres de l'application
- [ ] Activer le mode sombre
- [ ] Verifier que toutes les pages s'affichent correctement en theme sombre
- [ ] Verifier le contraste et la lisibilite
- [ ] Desactiver le mode sombre → retour au theme clair

### 5.14 Internationalisation

- [ ] Verifier l'affichage en francais (langue par defaut)
- [ ] Changer la langue (si option disponible)
- [ ] Verifier la traduction des labels principaux
- [ ] Verifier les formats de date et de prix selon la locale

### 5.15 Gestion des boutiques (admin)

- [ ] Voir la liste de toutes les boutiques
- [ ] Filtrer par statut (active, inactive, en attente)
- [ ] Approuver une boutique en attente
- [ ] Suspendre une boutique
- [ ] Reactiver une boutique
- [ ] Voir les details complets d'une boutique

---

## SECTION 6 : WORKFLOWS SECURITE (6 scenarios)

### 6.1 Protection CSRF

- [ ] Verifier que les requetes POST/PATCH/DELETE incluent un token CSRF
- [ ] Tenter une requete POST sans token CSRF → verifier erreur 403
- [ ] Tenter une requete avec un token CSRF invalide → verifier erreur 403
- [ ] Verifier que le token est renouvele a chaque session

### 6.2 Acces non-autorise aux API

- [ ] Appeler `GET /api/orders` sans token d'authentification → 401 Unauthorized
- [ ] Appeler `PATCH /api/orders/:id` avec un token d'un autre utilisateur → 403 Forbidden
- [ ] Appeler `GET /api/admin/users` avec un token non-admin → 403 Forbidden
- [ ] Appeler `POST /api/notifications/send` avec un token non-admin → 403 Forbidden
- [ ] Verifier que les routes admin sont protegees cote serveur

### 6.3 Firestore Rules

- [ ] Verifier qu'un utilisateur ne peut lire que ses propres commandes
- [ ] Verifier qu'un marchand ne peut modifier que les boutiques dont il est ownerId
- [ ] Verifier qu'un chauffeur ne peut modifier que ses propres livraisons
- [ ] Verifier qu'un admin peut lire/ecrire toutes les collections
- [ ] Verifier que les donnees des autres utilisateurs ne sont pas accessibles

### 6.4 Storage Rules

- [ ] Verifier qu'un utilisateur ne peut uploader que dans son propre dossier
- [ ] Verifier que les images de produits sont accessibles en lecture publique
- [ ] Verifier que les documents KYC ne sont accessibles qu'a l'utilisateur et aux admins
- [ ] Tenter d'uploader un fichier non-image → verifier le rejet

### 6.5 Token expire

- [ ] Se connecter → obtenir un token
- [ ] Attendre l'expiration du token (ou simuler en Firebase Console)
- [ ] Tenter une requete API → verifier la reponse 401
- [ ] Verifier que l'app redirige vers l'ecran de connexion
- [ ] Verifier le refresh automatique du token Firebase

### 6.6 Injection et XSS

- [ ] Entrer du HTML dans les champs de formulaire (`<script>alert('xss')</script>`)
- [ ] Verifier que le HTML est echappe/sanitise a l'affichage
- [ ] Entrer des caracteres speciaux dans la recherche (`'; DROP TABLE users; --`)
- [ ] Verifier qu'aucune erreur serveur n'est declenchee
- [ ] Verifier la validation des inputs cote client et cote serveur

---

## SECTION 7 : WORKFLOWS PAIEMENT (5 scenarios)

### 7.1 Checkout Stripe reussi

- [ ] Ajouter des produits au panier
- [ ] Aller au checkout
- [ ] Entrer carte test : `4242 4242 4242 4242`
- [ ] Date future, CVC : 123
- [ ] Confirmer le paiement
- [ ] Verifier la confirmation de commande
- [ ] Verifier le PaymentIntent dans Stripe Dashboard (mode test)
- [ ] Verifier le statut "succeeded" dans Stripe

### 7.2 Carte refusee

- [ ] Aller au checkout
- [ ] Entrer carte test echec : `4000 0000 0000 0002`
- [ ] Confirmer le paiement
- [ ] Verifier le message d'erreur "Carte refusee"
- [ ] Verifier que la commande n'est PAS creee
- [ ] Reessayer avec la carte valide → succes

### 7.3 Webhook Stripe

- [ ] Effectuer un paiement reussi
- [ ] Verifier dans les logs serveur la reception du webhook `payment_intent.succeeded`
- [ ] Verifier que le statut de la commande est mis a jour automatiquement
- [ ] Simuler un webhook `payment_intent.payment_failed` → verifier le traitement

### 7.4 Onboarding marchand Stripe Connect

- [ ] Se connecter en tant que marchand
- [ ] Aller dans Profil → Paiements
- [ ] Cliquer "Configurer les paiements"
- [ ] Etre redirige vers Stripe Connect Onboarding
- [ ] Completer les informations (mode test)
- [ ] Retourner dans l'app
- [ ] Verifier que le compte Stripe Connect est lie
- [ ] Verifier la reception des paiements lors d'une commande

### 7.5 Onboarding chauffeur Stripe Connect

- [ ] Se connecter en tant que chauffeur
- [ ] Aller dans Profil → Paiements
- [ ] Cliquer "Configurer les paiements"
- [ ] Etre redirige vers Stripe Connect Onboarding
- [ ] Completer les informations (mode test)
- [ ] Retourner dans l'app
- [ ] Verifier que le compte Stripe Connect est lie
- [ ] Verifier la reception des gains apres une livraison

---

## SECTION 8 : WORKFLOWS ERREUR (5 scenarios)

### 8.1 Reseau coupe

- [ ] Couper le reseau (mode avion sur simulateur)
- [ ] Tenter de charger les boutiques → message d'erreur reseau
- [ ] Tenter de passer une commande → message d'erreur
- [ ] Retablir le reseau
- [ ] Rafraichir → les donnees se chargent normalement
- [ ] Verifier qu'aucune donnee corrompue n'a ete enregistree

### 8.2 Formulaire invalide

- [ ] Tenter de soumettre un formulaire de connexion vide → validation cote client
- [ ] Entrer un email invalide (ex: "abc") → message d'erreur
- [ ] Entrer un mot de passe trop court → message d'erreur
- [ ] Connexion avec mauvais mot de passe → message "Identifiants invalides"
- [ ] Verifier que les messages d'erreur sont clairs et en francais

### 8.3 Page 404

- [ ] Naviguer vers une route inexistante (`/page-inexistante`)
- [ ] Verifier l'affichage de la page 404 personnalisee
- [ ] Verifier le lien de retour vers l'accueil
- [ ] API : appeler `/api/orders/id-inexistant` → 404 avec message JSON

### 8.4 Timeout API

- [ ] Simuler une latence elevee (throttle reseau dans les DevTools / simulateur)
- [ ] Effectuer une requete API
- [ ] Verifier l'affichage d'un indicateur de chargement
- [ ] Apres le timeout (30s) → verifier le message d'erreur
- [ ] Verifier que l'utilisateur peut reessayer

### 8.5 Session expiree

- [ ] Se connecter
- [ ] Revoquer le token dans Firebase Console (Authentication → utilisateur → Revoquer les tokens)
- [ ] Tenter une action → verifier la reponse 401
- [ ] Verifier le redirect automatique vers l'ecran de connexion
- [ ] Verifier le message d'information

---

## SECTION 9 : WORKFLOW MULTI-UTILISATEURS (flux complet)

> **Necessite 2 appareils/simulateurs ou test sequentiel**

### Etape 1 : Client cree une commande

- [ ] Client se connecte (`client1@pec5a.com`)
- [ ] Ajoute des produits au panier
- [ ] Passe commande et paie avec carte test
- [ ] Commande creee avec statut "En attente"

### Etape 2 : Marchand confirme

- [ ] Marchand se connecte (`merchant1@pec5a.com`)
- [ ] Voit la nouvelle commande dans son dashboard
- [ ] Change statut : En attente → Confirmee → En preparation → Prete
- [ ] Verifier que le client recoit les notifications de changement

### Etape 3 : Chauffeur recupere

- [ ] Chauffeur se connecte (`driver1@pec5a.com`)
- [ ] Active statut "En ligne"
- [ ] Voit la livraison disponible
- [ ] Accepte la livraison
- [ ] Progresse : Au magasin → Recuperee → En route

### Etape 4 : Communication

- [ ] Client envoie message : "Vous arrivez quand ?"
- [ ] Chauffeur recoit et repond : "Dans 10 minutes"
- [ ] Client voit la reponse en temps reel

### Etape 5 : Livraison

- [ ] Chauffeur arrive et capture preuve de livraison (photo + signature)
- [ ] Commande marquee "Livree"
- [ ] Client recoit notification de livraison

### Etape 6 : Finalisation

- [ ] Client note la boutique (1-5 etoiles + commentaire)
- [ ] Client note le chauffeur (1-5 etoiles)
- [ ] (Optionnel) Client ajoute un pourboire supplementaire
- [ ] Chauffeur voit la note et le pourboire recus
- [ ] Admin voit la commande complete dans le dashboard

---

## SECTION 10 : TESTS UNITAIRES iOS (XCTest / Swift Testing)

### 10.1 Tests du modele (GreenDropTests.swift)

- [ ] UserProfile : creation, egalite, roles
- [ ] UserRole : rawValue, displayName
- [ ] APIConfig : baseURL, timeout
- [ ] APIError : descriptions d'erreur
- [ ] Cart : ajout, suppression, modification quantite, vidage
- [ ] Product : creation, formattedPrice, requiresAgeVerification, Codable
- [ ] OrderStatus : displayName, icon, color, isActive, progressValue, stepNumber
- [ ] OrderItem : calcul du total
- [ ] Shop : creation, coordinate
- [ ] ShopCategory : displayName, icon, rawValue
- [ ] DeliveryStatus : displayName, rawValue
- [ ] MerchantStats / DriverStats : valeurs vides, egalite
- [ ] Email role detection : driver, merchant, admin, user
- [ ] CartProduct : restriction, egalite

### 10.2 Tests UI (GreenDropUITests.swift)

- [ ] Ecran de login : elements visibles (titre, champs, bouton)
- [ ] Bouton login desactive quand champs vides
- [ ] Bouton login actif quand champs remplis
- [ ] Bouton Google Sign-In present
- [ ] Navigation vers l'ecran d'inscription
- [ ] Onglets client visibles apres connexion
- [ ] Navigation entre onglets
- [ ] Performance de lancement

---

## Checklist Recapitulative

### Core

- [ ] Authentification (connexion/deconnexion/inscription)
- [ ] Google OAuth
- [ ] Navigation boutiques
- [ ] Recherche et filtres
- [ ] Gestion panier
- [ ] Checkout complet
- [ ] Paiement Stripe
- [ ] Suivi commande temps reel
- [ ] Chat client <-> chauffeur
- [ ] Preuve de livraison
- [ ] Notation et avis
- [ ] Pourboires
- [ ] Code promo
- [ ] Livraison programmee

### Verification d'identite

- [ ] Declenchement sur produit 18+
- [ ] Formulaire KYC complet
- [ ] Upload documents + selfie
- [ ] Approbation / rejet admin
- [ ] Deblocage achat

### Roles

- [ ] Parcours client fonctionnel
- [ ] Parcours chauffeur fonctionnel
- [ ] Parcours marchand fonctionnel
- [ ] Parcours admin fonctionnel

### Securite

- [ ] CSRF protection
- [ ] Acces non-autorise API
- [ ] Firestore / Storage rules
- [ ] Token expire
- [ ] Anti-injection / XSS

### Paiement

- [ ] Checkout Stripe reussi
- [ ] Carte refusee
- [ ] Webhook
- [ ] Onboarding marchand
- [ ] Onboarding chauffeur

### Robustesse

- [ ] Gestion erreurs reseau
- [ ] Gestion erreurs formulaire
- [ ] Page 404
- [ ] Timeout API
- [ ] Session expiree

---

## Notes Techniques

### Firebase Console

- **URL** : https://console.firebase.google.com
- **Collections importantes** :
  - `users` - Profils utilisateurs
  - `orders` - Commandes
  - `shops` - Boutiques
  - `products` - Produits
  - `deliveries` - Livraisons
  - `verifications` - KYC
  - `notifications` - Notifications push
  - `fcmTokens` - Tokens FCM
  - `activities` - Logs d'activite
  - `chats/{orderId}/messages` - Messages

### Stripe Dashboard

- **URL** : https://dashboard.stripe.com/test
- Verifier les paiements de test
- Voir les PaymentIntents crees
- Verifier les comptes Connect (marchands et chauffeurs)

### Simulateur iOS

- Utiliser iPhone 15 Pro ou similaire
- Activer la localisation simulee si besoin
- Pour les photos : le simulateur utilise la bibliotheque
- Pour les notifications push : utiliser un appareil physique

### Deploiement

- **Frontend** : Vercel (`pec5a-kaysv2-hm7i.vercel.app`)
- **Backend** : Next.js API routes (meme deploiement Vercel)
- **Firebase Functions** : Cloud Functions for Firebase
- **Base de donnees** : Firestore
- **Stockage** : Firebase Storage
- **Auth** : Firebase Authentication

---

## Resolution de Problemes

| Probleme                               | Solution                                                 |
| -------------------------------------- | -------------------------------------------------------- |
| "No such module Firebase"              | File → Packages → Resolve Package Versions               |
| Boutiques ne chargent pas              | Verifier `pnpm seed` execute                             |
| Paiement echoue toujours               | Verifier cles Stripe dans `.env.local`                   |
| KYC bloque sur "pending"               | Approuver manuellement dans Firestore                    |
| Chat ne fonctionne pas                 | Verifier les regles Firestore                            |
| Localisation non disponible            | Autoriser dans Reglages simulateur                       |
| Notifications push ne fonctionnent pas | Utiliser un appareil physique                            |
| Erreur CORS                            | Verifier les headers dans `next.config.ts`               |
| Build TypeScript echoue                | Lancer `npx tsc --noEmit` pour voir les erreurs          |
| Firebase Admin SDK erreur              | Verifier les variables d'environnement dans `.env.local` |
