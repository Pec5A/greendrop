"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type Language = "en" | "fr"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
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
    chat: "Chat",

    // Dashboard
    overviewOfOperations: "Overview of GreenDrop operations and key metrics",
    catalogOverview: "Manage catalog and merchant inventory",
    driverOperations: "Monitor fleet status and live routes",
    totalRevenue: "Total Revenue",
    activeUsers: "Active Users",
    pendingVerifications: "Pending Verifications",
    openDisputes: "Open Disputes",
    activityLog: "Activity Log",
    recentActions: "Recent actions performed by admin team",
    allActivity: "All Activity",
    today: "Today",
    thisWeek: "This Week",
    weeklyActivity: "Weekly Activity",
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

    // Users
    manageUsers: "Manage user accounts and permissions",
    addUser: "Add User",
    addProduct: "Add Product",
    addMerchant: "Add Merchant",
    name: "Name",
    email: "Email",
    role: "Role",
    status: "Status",
    joinedDate: "Joined Date",
    allStatuses: "All Statuses",
    allRoles: "All Roles",
    viewDetails: "View Details",
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    admin: "Admin",
    user: "User",
    driver: "Driver",

    // Orders
    trackOrders: "Track and manage customer orders",
    orderNumber: "Order #",
    customer: "Customer",
    amount: "Amount",
    date: "Date",
    allOrders: "All Orders",
    pending: "Pending",
    completed: "Completed",
    cancelled: "Cancelled",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",

    // Verifications
    reviewDocuments: "Review and approve user identity documents",
    documentType: "Document Type",
    allTypes: "All Types",
    governmentId: "Government ID",
    driverLicense: "Driver License",
    businessLicense: "Business License",
    approved: "Approved",
    rejected: "Rejected",
    noVerificationsFound: "No verifications found",

    // Disputes
    manageDisputes: "Manage customer disputes and resolutions",
    priority: "Priority",
    allPriorities: "All Priorities",
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
    open: "Open",
    inProgress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
    noDisputesFound: "No disputes found",

    // Legal Zones
    manageLegalZones: "Manage delivery and restricted zones",
    addZone: "Add Zone",
    zoneName: "Zone Name",
    zoneType: "Zone Type",
    deliveryZone: "Delivery Zone",
    restrictedZone: "Restricted Zone",
    drawOnMap: "Draw on map to create zone",
    clickToPlace: "Click to place points",
    deliveryZones: "Delivery Zones",
    restrictedZones: "Restricted Zones",

    // User actions
    sendMessage: "Send Message",
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
    language: "en",
    noResultsFound: "No results found",
    loading: "Loading...",
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
    chat: "Chat",

    // Dashboard
    overviewOfOperations: "Aperçu des opérations et métriques clés de GreenDrop",
    catalogOverview: "Gérer le catalogue et les inventaires marchands",
    driverOperations: "Surveiller la flotte et les trajets en direct",
    totalRevenue: "Revenu Total",
    activeUsers: "Utilisateurs Actifs",
    pendingVerifications: "Vérifications en Attente",
    openDisputes: "Litiges Ouverts",
    activityLog: "Journal d'Activité",
    recentActions: "Actions récentes effectuées par l'équipe admin",
    allActivity: "Toute l'Activité",
    today: "Aujourd'hui",
    thisWeek: "Cette Semaine",
    weeklyActivity: "Activité Hebdomadaire",
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

    // Users
    manageUsers: "Gérer les comptes utilisateurs et permissions",
    addUser: "Ajouter Utilisateur",
    addProduct: "Ajouter un produit",
    addMerchant: "Ajouter un marchand",
    name: "Nom",
    email: "E-mail",
    role: "Rôle",
    status: "Statut",
    joinedDate: "Date d'Inscription",
    allStatuses: "Tous les Statuts",
    allRoles: "Tous les Rôles",
    viewDetails: "Voir Détails",
    active: "Actif",
    inactive: "Inactif",
    suspended: "Suspendu",
    admin: "Administrateur",
    user: "Utilisateur",
    driver: "Chauffeur",

    // Orders
    trackOrders: "Suivre et gérer les commandes clients",
    orderNumber: "Commande #",
    customer: "Client",
    amount: "Montant",
    date: "Date",
    allOrders: "Toutes les Commandes",
    pending: "En Attente",
    completed: "Terminé",
    cancelled: "Annulé",
    processing: "En Traitement",
    shipped: "Expédié",
    delivered: "Livré",

    // Verifications
    reviewDocuments: "Examiner et approuver les documents d'identité",
    documentType: "Type de Document",
    allTypes: "Tous les Types",
    governmentId: "Pièce d'Identité",
    driverLicense: "Permis de Conduire",
    businessLicense: "Licence Commerciale",
    approved: "Approuvé",
    rejected: "Rejeté",
    noVerificationsFound: "Aucune vérification trouvée",

    // Disputes
    manageDisputes: "Gérer les litiges et résolutions clients",
    priority: "Priorité",
    allPriorities: "Toutes les Priorités",
    low: "Faible",
    medium: "Moyenne",
    high: "Haute",
    critical: "Critique",
    open: "Ouvert",
    inProgress: "En Cours",
    resolved: "Résolu",
    closed: "Fermé",
    noDisputesFound: "Aucun litige trouvé",

    // Legal Zones
    manageLegalZones: "Gérer les zones de livraison et restreintes",
    addZone: "Ajouter Zone",
    zoneName: "Nom de la Zone",
    zoneType: "Type de Zone",
    deliveryZone: "Zone de Livraison",
    restrictedZone: "Zone Restreinte",
    drawOnMap: "Dessiner sur la carte pour créer une zone",
    clickToPlace: "Cliquer pour placer des points",
    deliveryZones: "Zones de Livraison",
    restrictedZones: "Zones Restreintes",

    // User actions
    sendMessage: "Envoyer un message",
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
    language: "fr",
    noResultsFound: "Aucun résultat trouvé",
    loading: "Chargement...",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("fr")

  const t = (key: string) => {
    return translations[language][key as keyof (typeof translations)["en"]] || key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
