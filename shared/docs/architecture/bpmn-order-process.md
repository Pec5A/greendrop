# Diagramme BPMN - Processus de Commande GreenDrop

Ce document décrit le processus métier de commande du point de vue des différents acteurs.

## Processus Principal de Commande

```mermaid
flowchart TB
    subgraph Client["🛒 Client"]
        C_Start([Début]) --> C_Browse[Parcourir les boutiques]
        C_Browse --> C_Select[Sélectionner produits]
        C_Select --> C_Cart[Ajouter au panier]
        C_Cart --> C_Checkout[Valider commande]
        C_Checkout --> C_Pay{Paiement}
        C_Pay -->|Succès| C_Wait[Attendre livraison]
        C_Pay -->|Échec| C_Retry[Réessayer]
        C_Retry --> C_Pay
        C_Wait --> C_Track[Suivre en temps réel]
        C_Track --> C_Receive[Réceptionner commande]
        C_Receive --> C_Rate[Noter la livraison]
        C_Rate --> C_End([Fin])
    end

    subgraph Merchant["🏪 Commerçant"]
        M_Notif[Notification nouvelle commande] --> M_Check{Vérifier stock}
        M_Check -->|OK| M_Prepare[Préparer commande]
        M_Check -->|Rupture| M_Cancel[Annuler commande]
        M_Prepare --> M_Ready[Marquer prêt]
        M_Ready --> M_Wait[Attendre livreur]
        M_Wait --> M_Handover[Remettre au livreur]
        M_Handover --> M_End([Fin])
        M_Cancel --> M_End
    end

    subgraph Driver["🚴 Livreur"]
        D_Notif[Notification commande disponible] --> D_Accept{Accepter?}
        D_Accept -->|Oui| D_GoShop[Se rendre à la boutique]
        D_Accept -->|Non| D_Skip[Ignorer]
        D_GoShop --> D_Pickup[Récupérer commande]
        D_Pickup --> D_GoClient[Se rendre chez client]
        D_GoClient --> D_Update[Mettre à jour position]
        D_Update --> D_Deliver[Livrer commande]
        D_Deliver --> D_Photo[Prendre photo]
        D_Photo --> D_Confirm[Confirmer livraison]
        D_Confirm --> D_Rate[Noter le client]
        D_Rate --> D_End([Fin])
        D_Skip --> D_End
    end

    subgraph System["⚙️ Système"]
        S_Create[Créer commande] --> S_PayCheck{Paiement vérifié?}
        S_PayCheck -->|Oui| S_NotifMerchant[Notifier commerçant]
        S_PayCheck -->|Non| S_WaitPay[Attendre paiement]
        S_NotifMerchant --> S_WaitPrep[Attendre préparation]
        S_WaitPrep --> S_NotifDrivers[Notifier livreurs]
        S_NotifDrivers --> S_Assign[Assigner livreur]
        S_Assign --> S_Track[Tracking temps réel]
        S_Track --> S_Complete[Marquer livré]
        S_Complete --> S_Transfer[Transférer paiement]
        S_Transfer --> S_Archive[Archiver]
    end

    %% Liens inter-processus
    C_Checkout -.-> S_Create
    S_NotifMerchant -.-> M_Notif
    M_Ready -.-> S_NotifDrivers
    S_NotifDrivers -.-> D_Notif
    D_Update -.-> C_Track
    D_Confirm -.-> S_Complete
```

## États de la Commande (State Machine)

```mermaid
stateDiagram-v2
    [*] --> pending : Commande créée

    pending --> confirmed : Paiement réussi
    pending --> cancelled : Paiement échoué / Annulation

    confirmed --> preparing : Commerçant accepte
    confirmed --> cancelled : Commerçant refuse

    preparing --> ready : Préparation terminée
    preparing --> cancelled : Problème de stock

    ready --> assigned : Livreur accepte
    ready --> cancelled : Timeout (pas de livreur)

    assigned --> delivering : Livreur en route
    assigned --> ready : Livreur annule

    delivering --> delivered : Livraison confirmée
    delivering --> failed : Problème livraison

    delivered --> [*]
    cancelled --> [*]
    failed --> [*]

    note right of pending
        Durée max: 15 min
        Auto-annulation si non payé
    end note

    note right of ready
        Notification tous les livreurs
        dans un rayon de 5km
    end note

    note right of delivering
        Mise à jour position
        toutes les 30 secondes
    end note
```

## Processus de Litige

```mermaid
flowchart LR
    subgraph Création["📝 Création Litige"]
        Start([Client/Driver]) --> Report[Signaler problème]
        Report --> Type{Type de litige}
        Type -->|Produit| Product[Produit endommagé/manquant]
        Type -->|Livraison| Delivery[Retard/Non livré]
        Type -->|Comportement| Behavior[Comportement inapproprié]
        Type -->|Paiement| Payment[Problème paiement]
    end

    subgraph Resolution["⚖️ Résolution"]
        Product --> Open[Litige ouvert]
        Delivery --> Open
        Behavior --> Open
        Payment --> Open

        Open --> Review[Examen admin]
        Review --> Evidence[Demande preuves]
        Evidence --> Decision{Décision}

        Decision -->|Faveur client| RefundFull[Remboursement total]
        Decision -->|Partiel| RefundPartial[Remboursement partiel]
        Decision -->|Rejet| Reject[Litige rejeté]
        Decision -->|Médiation| Mediation[Médiation]
    end

    subgraph Closing["✅ Clôture"]
        RefundFull --> Close[Litige fermé]
        RefundPartial --> Close
        Reject --> Close
        Mediation --> Agreement{Accord?}
        Agreement -->|Oui| Close
        Agreement -->|Non| Escalate[Escalade]
        Escalate --> Close
        Close --> Notify[Notifier parties]
        Notify --> Archive[Archivage]
    end
```

## Processus d'Onboarding Livreur

```mermaid
flowchart TB
    subgraph Inscription["📋 Inscription"]
        Start([Début]) --> CreateAccount[Créer compte]
        CreateAccount --> ChooseRole[Choisir rôle livreur]
        ChooseRole --> BasicInfo[Informations de base]
        BasicInfo --> VehicleInfo[Informations véhicule]
    end

    subgraph Verification["✅ Vérification"]
        VehicleInfo --> StripeConnect[Onboarding Stripe]
        StripeConnect --> IDVerif[Vérification identité]
        IDVerif --> BankInfo[Coordonnées bancaires]
        BankInfo --> Review{Vérification}
        Review -->|Approuvé| Approved[Compte vérifié]
        Review -->|Documents manquants| Missing[Demande docs]
        Review -->|Rejeté| Rejected[Compte rejeté]
        Missing --> StripeConnect
    end

    subgraph Activation["🚀 Activation"]
        Approved --> Training[Formation app]
        Training --> FirstMission[Première mission]
        FirstMission --> Active[Livreur actif]
        Active --> End([Fin])
        Rejected --> End
    end
```

## Métriques Clés (KPIs)

| Métrique | Description | Objectif |
|----------|-------------|----------|
| **Temps moyen de livraison** | De la commande à la livraison | < 45 min |
| **Taux d'acceptation livreur** | Commandes acceptées / proposées | > 80% |
| **Taux de satisfaction client** | Notes 4-5 étoiles | > 90% |
| **Taux de litiges** | Litiges / commandes totales | < 2% |
| **Taux de résolution** | Litiges résolus favorablement | > 95% |
| **Temps d'onboarding livreur** | Inscription à première mission | < 48h |

## Règles Métier

### Commandes
- Commande annulée automatiquement après 15 min sans paiement
- Remboursement automatique si annulation avant préparation
- Frais de livraison fixe de 5€

### Livreurs
- Rayon de notification : 5 km
- Commission livreur : calculée par Stripe Connect
- Minimum 3.5 étoiles pour rester actif

### Litiges
- Délai de signalement : 24h après livraison
- Délai de résolution : 72h maximum
- Remboursement automatique si pas de réponse sous 48h
