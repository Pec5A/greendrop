// Firebase Configuration
export { db, auth, storage } from "./config"
export { COLLECTIONS, type CollectionName } from "./collections"

// User Services
export {
  getUsers,
  getUserById,
  getUsersByStatus,
  getUsersByRole,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  deleteUsers,
  subscribeToUsers,
  subscribeToUsersByStatus,
} from "./services/users"

// Order Services
export {
  getOrders,
  getOrderById,
  getOrdersByUserId,
  getOrdersByStatus,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  addOrderItem,
  subscribeToOrders,
  subscribeToOrdersByStatus,
  getOrderStats,
} from "./services/orders"

// Verification Services
export {
  getVerifications,
  getVerificationById,
  getVerificationsByUserId,
  getVerificationsByStatus,
  getVerificationsByType,
  createVerification,
  updateVerification,
  approveVerification,
  rejectVerification,
  deleteVerification,
  subscribeToVerifications,
  subscribeToPendingVerifications,
  getVerificationStats,
} from "./services/verifications"

// Dispute Services
export {
  getDisputes,
  getDisputeById,
  getDisputesByUserId,
  getDisputesByStatus,
  getDisputesByPriority,
  createDispute,
  updateDispute,
  updateDisputeStatus,
  resolveDispute,
  closeDispute,
  deleteDispute,
  subscribeToDisputes,
  subscribeToOpenDisputes,
  getDisputeStats,
} from "./services/disputes"

// Legal Zone Services
export {
  getLegalZones,
  getLegalZoneById,
  getActiveLegalZones,
  getLegalZonesByType,
  createLegalZone,
  updateLegalZone,
  toggleLegalZoneActive,
  deleteLegalZone,
  saveAllLegalZones,
  subscribeToLegalZones,
  getLegalZoneStats,
  type LegalZoneExtended,
} from "./services/legal-zones"

// Config Services
export {
  getAppConfig,
  initializeConfig,
  updatePlatformSettings,
  updateDeliverySettings,
  updatePaymentSettings,
  updateFeatureFlags,
  toggleFeatureFlag,
  updateAppConfig,
  subscribeToConfig,
  type PlatformSettings,
  type DeliverySettings,
  type PaymentSettings,
  type FeatureFlag,
  type AppConfig,
} from "./services/config"

// Activity Log Services
export {
  createActivityLog,
  logUserCreated,
  logUserUpdated,
  logUserDeleted,
  logOrderCreated,
  logOrderUpdated,
  logVerificationApproved,
  logVerificationRejected,
  logDisputeResolved,
  logLogin,
  logLogout,
  getRecentActivityLogs,
  getActivityLogsByEntity,
  getActivityLogsByUser,
  subscribeToRecentActivityLogs,
  type ActivityType,
  type ActivityLog,
} from "./services/activity-logs"

// Driver Services
export {
  subscribeToDrivers,
  createDriver,
  updateDriverStatus,
  updateDriverLocation,
  assignDriverToOrder,
  releaseDriver,
} from "./services/drivers"

// Driver Matching Services
export {
  findBestDrivers,
  autoAssignDriver,
} from "./services/driver-matching"

// Seed function
export { seedDatabase } from "./seed"
