export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "supervisor" | "user" | "driver" | "merchant"
  status: "pending" | "verified" | "rejected"
  createdAt: string
  phone?: string
  avatar?: string
  shopId?: string
}

export type OrderStatus = "created" | "paid" | "shipped" | "delivered" | "cancelled"
export type OrderPriority = "low" | "normal" | "high" | "urgent"

export interface OrderDocument {
  id: string
  orderId: string
  label: string
  type: "invoice" | "proof" | "photo" | "note" | "other"
  url: string
  uploadedAt: string
  uploadedBy?: string
}

export type OrderTimelineEventType = "status" | "assignment" | "exception" | "note" | "document"
export type OrderTimelineVisualState = "completed" | "current" | "upcoming"

export interface OrderTimelineEvent {
  id: string
  orderId: string
  type: OrderTimelineEventType
  title: string
  description?: string
  actor?: string
  timestamp: string
  status?: OrderTimelineVisualState
  metadata?: Record<string, any>
}

export interface OrderAddress {
  label: "pickup" | "dropoff"
  street: string
  city: string
  postalCode?: string
  instructions?: string
}

export interface Order {
  id: string
  userId: string
  shopId: string
  status: OrderStatus
  total: number
  items: OrderItem[]
  createdAt: string
  updatedAt: string
  priority?: OrderPriority
  reference?: string
  currency?: string
  driverId?: string | null
  driverName?: string | null
  driverPhone?: string | null
  pickupAddress?: string
  dropoffAddress?: string
  addresses?: OrderAddress[]
  expectedDelivery?: string | null
  deliveredAt?: string | null
  notes?: string[]
  timeline?: OrderTimelineEvent[]
  documents?: OrderDocument[]
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  price: number
}

export type MerchantStatus = "active" | "inactive" | "pending" | "suspended"
export type ShopApprovalStatus = "pending" | "approved" | "rejected"

export interface Shop {
  id: string
  name: string
  ownerId: string
  ownerName?: string
  status: MerchantStatus
  approvalStatus?: ShopApprovalStatus
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string
  address: string
  contactEmail?: string
  contactPhone?: string
  logoUrl?: string
  categories?: string[]
  rating?: number
  totalOrders?: number
  totalProducts?: number
  createdAt: string
  updatedAt?: string
}

export interface Product {
  id: string
  shopId: string
  shopName?: string
  name: string
  description: string
  sku: string
  category: string
  tags?: string[]
  price: number
  stock: number
  minStock?: number
  status: "draft" | "active" | "inactive" | "archived" | "out_of_stock"
  imageUrl?: string
  featured?: boolean
  createdAt: string
  updatedAt: string
}

export type DriverStatus = "online" | "offline" | "busy" | "break"
export type VehicleType = "bike" | "scooter" | "car" | "van"

export interface DriverLocation {
  lat: number
  lng: number
  heading?: number
  speed?: number
  updatedAt: string
}

export interface Driver {
  id: string
  name: string
  email: string
  phone: string
  status: DriverStatus
  vehicleType: VehicleType
  vehiclePlate?: string
  lastSeenAt: string
  avatar?: string
  rating?: number
  completedDeliveries?: number
  currentOrderId?: string | null
  location?: DriverLocation
}

export interface VerificationAttachment {
  id: string
  label: string
  url: string
  mimeType?: string
  size?: number
}

export type VerificationHistoryAction = "submitted" | "approved" | "rejected" | "note" | "resubmitted"

export interface VerificationHistoryEntry {
  id: string
  action: VerificationHistoryAction
  actor: string
  timestamp: string
  message?: string | null
}

export interface Verification {
  id: string
  userId: string
  type: "id" | "license" | "business"
  status: "pending" | "approved" | "rejected"
  documentUrl: string
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  attachments?: VerificationAttachment[]
  history?: VerificationHistoryEntry[]
  rejectionReason?: string | null
  // KYC-specific fields from iOS app
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  documentType?: string
  documentNumber?: string
}

export interface Dispute {
  id: string
  orderId: string
  userId: string
  userName: string
  userEmail: string
  reason: string
  description: string
  status: "open" | "investigating" | "resolved" | "closed"
  priority: "low" | "medium" | "high"
  amount: number
  createdAt: string
  updatedAt?: string
  resolvedAt?: string
  resolvedBy?: string
  resolution?: string
}

export interface MapCoordinate {
  x: number
  y: number
}

export interface LegalZone {
  id: string
  name: string
  type: "delivery" | "restricted"
  coordinates: MapCoordinate[]
  active: boolean
  color?: string
}

export interface ChatMessage {
  id: string
  orderId: string
  senderId: string
  senderName: string
  senderRole: string
  content: string
  timestamp: string
  isRead: boolean
}

export interface ChatThread {
  orderId: string
  participants: string[]
  lastMessage?: string
  lastMessageAt?: string
  unreadCount?: number
}
