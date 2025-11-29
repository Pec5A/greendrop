import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"
import { getAuth } from "firebase-admin/auth"
import { getMessaging } from "firebase-admin/messaging"

// Initialize Firebase Admin SDK
if (!getApps().length) {
  // Support both FIREBASE_ADMIN_* and FIREBASE_* variable names for flexibility
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY
  const privateKey = rawPrivateKey?.replace(/\\n/g, "\n")

  if (!privateKey || !clientEmail || !projectId) {
    console.warn("⚠️ Firebase Admin credentials not found, using application default credentials")
    initializeApp()
  } else {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: `${projectId}.appspot.com`,
    })
  }
}

export const adminDb = getFirestore()
export const adminAuth = getAuth()
export const adminStorage = getStorage()
export const messaging = getMessaging()
