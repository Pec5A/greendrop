import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "../config"
import { COLLECTIONS } from "../collections"
import type {
  Verification,
  VerificationAttachment,
  VerificationHistoryEntry,
  VerificationHistoryAction,
} from "@/lib/types"

const getCrypto = () => {
  try {
    return (globalThis as { crypto?: Crypto }).crypto
  } catch {
    return undefined
  }
}

const generateHistoryId = () => {
  const cryptoRef = getCrypto()
  if (cryptoRef?.randomUUID) {
    return cryptoRef.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const convertTimestampValue = (value: any): string | undefined => {
  if (!value) return undefined
  if (value instanceof Timestamp) {
    return value.toDate().toISOString()
  }
  if (typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
  }
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString()
  }
  if (typeof value === "object" && "seconds" in value && "nanoseconds" in value) {
    return new Timestamp(value.seconds as number, value.nanoseconds as number).toDate().toISOString()
  }
  return undefined
}

const normalizeAttachments = (
  docId: string,
  rawAttachments: any[] | undefined,
  fallbackUrl: string,
  verificationType: Verification["type"]
): VerificationAttachment[] => {
  if (Array.isArray(rawAttachments) && rawAttachments.length > 0) {
    return rawAttachments.map((attachment, index) => ({
      id: attachment?.id || `${docId}-attachment-${index}`,
      label: attachment?.label || attachment?.name || `Document ${index + 1}`,
      url: attachment?.url || fallbackUrl,
      mimeType: attachment?.mimeType || attachment?.type,
      size: attachment?.size,
    }))
  }

  if (fallbackUrl) {
    return [
      {
        id: `${docId}-primary`,
        label: verificationType === "license" ? "Driver License" : "Document",
        url: fallbackUrl,
        mimeType: "image/jpeg",
      },
    ]
  }

  return []
}

const normalizeHistoryEntries = (
  docId: string,
  rawHistory: any[] | undefined
): VerificationHistoryEntry[] => {
  if (!Array.isArray(rawHistory) || rawHistory.length === 0) {
    return []
  }

  return rawHistory
    .map((entry, index) => {
      const timestamp =
        convertTimestampValue(entry?.timestamp || entry?.createdAt || entry?.performedAt) ||
        new Date().toISOString()

      return {
        id: entry?.id || `${docId}-history-${index}`,
        action: (entry?.action as VerificationHistoryAction) || "note",
        actor: entry?.actor || entry?.reviewerEmail || "system",
        message: entry?.message ?? entry?.reason ?? null,
        timestamp,
      }
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

const sanitizeAttachmentsForWrite = (attachments?: VerificationAttachment[]) => {
  if (!Array.isArray(attachments)) return []
  return attachments
    .filter((attachment) => Boolean(attachment?.url))
    .map((attachment, index) => ({
      id: attachment.id || `${generateHistoryId()}-${index}`,
      label: attachment.label || `Document ${index + 1}`,
      url: attachment.url,
      mimeType: attachment.mimeType || null,
      size: attachment.size || null,
    }))
}

const buildHistoryEntry = (
  action: VerificationHistoryAction,
  actor: string,
  message?: string | null
) => ({
  id: generateHistoryId(),
  action,
  actor,
  message: message ?? null,
  timestamp: serverTimestamp(),
})

// Map iOS documentType values to web type values
const mapDocumentType = (documentType?: string): Verification["type"] => {
  if (!documentType) return "id"
  switch (documentType) {
    case "id_card":
    case "passport":
    case "residence_permit":
      return "id"
    case "driving_license":
      return "license"
    default:
      return "id"
  }
}

// Build attachments from iOS individual URL fields
const buildAttachmentsFromKYC = (
  docId: string,
  data: Record<string, any>
): VerificationAttachment[] => {
  const attachments: VerificationAttachment[] = []

  if (data.documentFrontURL) {
    attachments.push({
      id: `${docId}-front`,
      label: "Document (Recto)",
      url: data.documentFrontURL,
      mimeType: "image/jpeg",
    })
  }

  if (data.documentBackURL) {
    attachments.push({
      id: `${docId}-back`,
      label: "Document (Verso)",
      url: data.documentBackURL,
      mimeType: "image/jpeg",
    })
  }

  if (data.selfieURL) {
    attachments.push({
      id: `${docId}-selfie`,
      label: "Selfie",
      url: data.selfieURL,
      mimeType: "image/jpeg",
    })
  }

  return attachments
}

// Convert Firestore document to Verification type
const convertVerification = (docSnapshot: any): Verification => {
  const data = docSnapshot.data()

  // Determine type: use web `type` field, or map from iOS `documentType`
  const verificationType: Verification["type"] = data.type || mapDocumentType(data.documentType)

  // Build attachments: use web `attachments` array, or construct from iOS individual URL fields
  const fallbackDocumentUrl = data.documentUrl || data.documentFrontURL || ""
  let attachments: VerificationAttachment[]

  if (Array.isArray(data.attachments) && data.attachments.length > 0) {
    attachments = normalizeAttachments(docSnapshot.id, data.attachments, fallbackDocumentUrl, verificationType)
  } else if (data.documentFrontURL || data.documentBackURL || data.selfieURL) {
    attachments = buildAttachmentsFromKYC(docSnapshot.id, data)
  } else {
    attachments = normalizeAttachments(docSnapshot.id, undefined, fallbackDocumentUrl, verificationType)
  }

  // Build history: use existing history array, or create initial entry from submittedAt
  let history = normalizeHistoryEntries(docSnapshot.id, data.history)
  if (history.length === 0 && data.submittedAt) {
    history = [
      {
        id: `${docSnapshot.id}-history-0`,
        action: "submitted",
        actor: data.userId || "user",
        message: null,
        timestamp: convertTimestampValue(data.submittedAt) || new Date().toISOString(),
      },
    ]
  }

  const primaryDocumentUrl = fallbackDocumentUrl || attachments[0]?.url || ""

  return {
    id: docSnapshot.id,
    userId: data.userId,
    type: verificationType,
    status: data.status,
    documentUrl: primaryDocumentUrl,
    submittedAt: convertTimestampValue(data.submittedAt) || new Date().toISOString(),
    reviewedAt: convertTimestampValue(data.reviewedAt),
    reviewedBy: data.reviewedBy,
    attachments,
    history,
    rejectionReason: data.rejectionReason || null,
    // KYC-specific fields
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: convertTimestampValue(data.dateOfBirth),
    documentType: data.documentType,
    documentNumber: data.documentNumber,
  }
}

// Get all verifications
export const getVerifications = async (): Promise<Verification[]> => {
  const verificationsRef = collection(db, COLLECTIONS.VERIFICATIONS)
  const q = query(verificationsRef, orderBy("submittedAt", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertVerification)
}

// Get verification by ID
export const getVerificationById = async (id: string): Promise<Verification | null> => {
  const docRef = doc(db, COLLECTIONS.VERIFICATIONS, id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return convertVerification(docSnap)
  }
  return null
}

// Get verifications by user ID
export const getVerificationsByUserId = async (userId: string): Promise<Verification[]> => {
  const verificationsRef = collection(db, COLLECTIONS.VERIFICATIONS)
  const q = query(verificationsRef, where("userId", "==", userId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertVerification)
}

// Get verifications by status
export const getVerificationsByStatus = async (
  status: Verification["status"]
): Promise<Verification[]> => {
  const verificationsRef = collection(db, COLLECTIONS.VERIFICATIONS)
  const q = query(verificationsRef, where("status", "==", status))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertVerification)
}

// Get verifications by type
export const getVerificationsByType = async (
  type: Verification["type"]
): Promise<Verification[]> => {
  const verificationsRef = collection(db, COLLECTIONS.VERIFICATIONS)
  const q = query(verificationsRef, where("type", "==", type))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertVerification)
}

// Create verification
export const createVerification = async (
  verificationData: Omit<Verification, "id" | "submittedAt">
): Promise<string> => {
  const verificationsRef = collection(db, COLLECTIONS.VERIFICATIONS)
  const { attachments, ...rest } = verificationData
  const sanitizedAttachments = sanitizeAttachmentsForWrite(attachments)
  const docRef = await addDoc(verificationsRef, {
    ...rest,
    attachments: sanitizedAttachments,
    history: [buildHistoryEntry("submitted", verificationData.userId, null)],
    submittedAt: serverTimestamp(),
    rejectionReason: null,
  })
  return docRef.id
}

// Update verification
export const updateVerification = async (
  id: string,
  verificationData: Partial<Verification>
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.VERIFICATIONS, id)
  await updateDoc(docRef, verificationData)
}

// Approve verification
export const approveVerification = async (
  id: string,
  reviewerEmail: string
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.VERIFICATIONS, id)
  await updateDoc(docRef, {
    status: "approved",
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerEmail,
    rejectionReason: null,
    history: arrayUnion(buildHistoryEntry("approved", reviewerEmail, "Verification approved")),
  })
}

// Reject verification
export const rejectVerification = async (
  id: string,
  reviewerEmail: string,
  reason?: string
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.VERIFICATIONS, id)
  await updateDoc(docRef, {
    status: "rejected",
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerEmail,
    rejectionReason: reason,
    history: arrayUnion(buildHistoryEntry("rejected", reviewerEmail, reason || "Verification rejected")),
  })
}

// Delete verification
export const deleteVerification = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.VERIFICATIONS, id)
  await deleteDoc(docRef)
}

// Subscribe to verifications (real-time updates)
export const subscribeToVerifications = (
  callback: (verifications: Verification[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const verificationsRef = collection(db, COLLECTIONS.VERIFICATIONS)
  const q = query(verificationsRef, orderBy("submittedAt", "desc"))
  
  return onSnapshot(
    q,
    (snapshot) => {
      const verifications = snapshot.docs.map(convertVerification)
      callback(verifications)
    },
    (error) => {
      console.error("Error subscribing to verifications:", error)
      onError?.(error)
    }
  )
}

// Subscribe to pending verifications
export const subscribeToPendingVerifications = (
  callback: (verifications: Verification[]) => void
): Unsubscribe => {
  const verificationsRef = collection(db, COLLECTIONS.VERIFICATIONS)
  const q = query(
    verificationsRef,
    where("status", "==", "pending"),
    orderBy("submittedAt", "desc")
  )
  
  return onSnapshot(q, (snapshot) => {
    const verifications = snapshot.docs.map(convertVerification)
    callback(verifications)
  })
}

// Get verification statistics
export const getVerificationStats = async () => {
  const verifications = await getVerifications()
  
  return {
    total: verifications.length,
    pending: verifications.filter((v) => v.status === "pending").length,
    approved: verifications.filter((v) => v.status === "approved").length,
    rejected: verifications.filter((v) => v.status === "rejected").length,
  }
}
