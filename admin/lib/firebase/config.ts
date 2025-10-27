import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

// Firebase configuration - use environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase only in the browser — "use client" modules are bundled
// separately for client and server; on the server (SSR/build) we skip init
// to avoid "auth/invalid-api-key" during static page generation.
// On the client, Firebase is fully initialized and all exports are real instances.
function initFirebase() {
  if (typeof window === "undefined" || !firebaseConfig.apiKey) {
    return { app: null, auth: null, db: null, storage: null }
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
  }
}

const firebase = initFirebase()

export const auth = firebase.auth as Auth
export const db = firebase.db as Firestore
export const storage = firebase.storage as FirebaseStorage
export default firebase.app as FirebaseApp
