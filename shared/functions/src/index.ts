import * as admin from "firebase-admin";

admin.initializeApp();

// ========================================
// ENDPOINTS API (Callable Functions)
// ========================================

// Commandes
export { createOrder } from "./endpoints/create-order";
export { updateOrderStatus } from "./endpoints/update-order-status";
export { getMyOrders, getOrderDetails } from "./endpoints/get-orders";

// Boutiques & Produits
export { getShops, getProducts } from "./endpoints/get-shops";

// Chauffeurs
export { updateDriverLocation } from "./endpoints/update-driver-location";
export { updateDriverStatus } from "./endpoints/update-driver-status";

// Upload & Notifications
export { uploadFile } from "./endpoints/upload-file";
export { sendNotification, registerFCMToken } from "./endpoints/send-notification";

// ========================================
// TRIGGERS (Automatiques)
// ========================================

export { onOrderStatusChange } from "./triggers/order-status-change";
export { onDriverLocationUpdate } from "./triggers/driver-location-update";
export { onOrderCreated } from "./triggers/order-created";
