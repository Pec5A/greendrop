// Collection names for Firestore
export const COLLECTIONS = {
  USERS: "users",
  ORDERS: "orders",
  VERIFICATIONS: "verifications",
  DISPUTES: "disputes",
  LEGAL_ZONES: "legalZones",
  CONFIG: "config",
  ACTIVITY_LOGS: "activityLogs",
  NOTIFICATIONS: "notifications",
  SHOPS: "shops",
  PRODUCTS: "products",
  DRIVERS: "drivers",
  CHATS: "chats",
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]
