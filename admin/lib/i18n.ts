export const translations = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    users: "Users",
    orders: "Orders",
    verifications: "Verifications",
    disputes: "Disputes",
    legalZones: "Legal Zones",
    configuration: "Configuration",
    catalog: "Catalog",
    products: "Products",
    merchants: "Merchants",
    drivers: "Drivers",
    catalogOverview: "Manage catalog and merchant inventory",
    driverOperations: "Monitor fleet status and live routes",
    pendingShipment: "Pending Shipment",
    deliveredToday: "Delivered Today",
    delayedOrders: "Delayed Orders",
    onTimeRate: "On-time Rate",
    activeDrivers: "Active Drivers",
    notifications: "Notifications",
    minutesAgo: "minutes ago",
    hoursAgo: "hours ago",
    topProducts: "Top Products",
    volume: "volume",

    // User actions
    sendMessage: "Send Message",
    addProduct: "Add Product",
    addMerchant: "Add Merchant",
    resetPassword: "Reset Password",
    suspendAccount: "Suspend Account",
    deleteUser: "Delete User",
    saveChanges: "Save Changes",
    cancel: "Cancel",

    // Order actions
    updateStatus: "Update Status",
    contactCustomer: "Contact Customer",
    cancelOrder: "Cancel Order",

    // Disputes
    resolveDispute: "Resolve Dispute",
    refundCustomer: "Refund Customer",
    closeDispute: "Close Dispute",

    // Common
    confirm: "Confirm",
    close: "Close",
    search: "Search",
    filter: "Filter",
    export: "Export",
    actions: "Actions",
  },
  fr: {
    // Navigation
    dashboard: "Tableau de bord",
    users: "Utilisateurs",
    orders: "Commandes",
    verifications: "Vérifications",
    disputes: "Litiges",
    legalZones: "Zones Légales",
    configuration: "Configuration",
    catalog: "Catalogue",
    products: "Produits",
    merchants: "Marchands",
    drivers: "Chauffeurs",
    catalogOverview: "Gérer le catalogue et les inventaires marchands",
    driverOperations: "Surveiller la flotte et les trajets en direct",
    pendingShipment: "En attente d'expédition",
    deliveredToday: "Livrées aujourd'hui",
    delayedOrders: "Commandes retardées",
    onTimeRate: "Taux à l'heure",
    activeDrivers: "Chauffeurs actifs",
    notifications: "Notifications",
    minutesAgo: "minutes",
    hoursAgo: "heures",
    topProducts: "Produits vedettes",
    volume: "volume",

    // User actions
    sendMessage: "Envoyer un message",
    addProduct: "Ajouter un produit",
    addMerchant: "Ajouter un marchand",
    resetPassword: "Réinitialiser le mot de passe",
    suspendAccount: "Suspendre le compte",
    deleteUser: "Supprimer l'utilisateur",
    saveChanges: "Enregistrer les modifications",
    cancel: "Annuler",

    // Order actions
    updateStatus: "Mettre à jour le statut",
    contactCustomer: "Contacter le client",
    cancelOrder: "Annuler la commande",

    // Disputes
    resolveDispute: "Résoudre le litige",
    refundCustomer: "Rembourser le client",
    closeDispute: "Fermer le litige",

    // Common
    confirm: "Confirmer",
    close: "Fermer",
    search: "Rechercher",
    filter: "Filtrer",
    export: "Exporter",
    actions: "Actions",
  },
}

export type Language = "en" | "fr"

export function useTranslation(lang: Language = "en") {
  return translations[lang]
}
