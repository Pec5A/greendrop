"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  confirmPasswordReset,
  sendEmailVerification,
  type User as FirebaseUser,
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { logLogin, logLogout } from "@/lib/firebase/services/activity-logs"
import type { User } from "@/lib/types"

interface AuthContextType {
  user: FirebaseUser | null
  userProfile: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  confirmReset: (oobCode: string, newPassword: string) => Promise<void>
  sendVerificationEmail: () => Promise<void>
  clearError: () => void
}

const googleProvider = new GoogleAuthProvider()

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user profile from Firestore
  const fetchUserProfile = async (uid: string): Promise<User | null> => {
    try {
      const docRef = doc(db, COLLECTIONS.USERS, uid)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          email: data.email,
          name: data.name,
          role: data.role,
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          phone: data.phone,
          avatar: data.avatar,
        }
      }
      return null
    } catch (err) {
      console.error("Error fetching user profile:", err)
      return null
    }
  }

  // Create user profile if doesn't exist
  const createUserProfile = async (firebaseUser: FirebaseUser): Promise<User> => {
    const userProfile: Omit<User, "id"> = {
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
      role: "admin", // Default role for admin panel
      status: "verified",
      createdAt: new Date().toISOString(),
    }

    const docRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid)
    await setDoc(docRef, {
      ...userProfile,
      createdAt: serverTimestamp(),
    })

    return {
      id: firebaseUser.uid,
      ...userProfile,
    }
  }

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      
      if (firebaseUser) {
        let profile = await fetchUserProfile(firebaseUser.uid)
        
        if (!profile) {
          profile = await createUserProfile(firebaseUser)
        }
        
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const profile = await fetchUserProfile(userCredential.user.uid)
      
      // Check if user has admin or merchant role (allowed for web panel)
      if (profile && !['admin', 'merchant'].includes(profile.role)) {
        await firebaseSignOut(auth)
        throw new Error("Accès non autorisé. Seuls les administrateurs et marchands peuvent se connecter au panneau web.")
      }
      
      // Log the login activity
      if (userCredential.user) {
        await logLogin(userCredential.user.uid, email)
      }
    } catch (err: any) {
      const errorMessage = getAuthErrorMessage(err.code)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Sign in with Google OAuth
  const signInWithGoogleHandler = async () => {
    try {
      setError(null)
      setLoading(true)

      const userCredential = await signInWithPopup(auth, googleProvider)
      let profile = await fetchUserProfile(userCredential.user.uid)

      if (!profile) {
        profile = await createUserProfile(userCredential.user)
      }

      // Check if user has admin or merchant role (allowed for web panel)
      if (profile && !['admin', 'merchant'].includes(profile.role)) {
        await firebaseSignOut(auth)
        throw new Error("Accès non autorisé. Seuls les administrateurs et marchands peuvent se connecter au panneau web.")
      }

      if (userCredential.user) {
        await logLogin(userCredential.user.uid, userCredential.user.email || "")
      }
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        setLoading(false)
        return
      }
      const errorMessage = err.code ? getAuthErrorMessage(err.code) : err.message
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      if (user) {
        await logLogout(user.uid, user.email || "")
      }
      await firebaseSignOut(auth)
      setUserProfile(null)
    } catch (err: any) {
      console.error("Error signing out:", err)
      throw err
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      setError(null)
      await sendPasswordResetEmail(auth, email)
    } catch (err: any) {
      const errorMessage = getAuthErrorMessage(err.code)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Confirm password reset
  const confirmReset = async (oobCode: string, newPassword: string) => {
    try {
      setError(null)
      await confirmPasswordReset(auth, oobCode, newPassword)
    } catch (err: any) {
      const errorMessage = getAuthErrorMessage(err.code)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Send verification email
  const sendVerificationEmail = async () => {
    try {
      setError(null)
      if (user) {
        await sendEmailVerification(user)
      }
    } catch (err: any) {
      const errorMessage = getAuthErrorMessage(err.code)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Clear error
  const clearError = () => setError(null)

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        signIn,
        signInWithGoogle: signInWithGoogleHandler,
        signOut,
        resetPassword,
        confirmReset,
        sendVerificationEmail,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Helper function to convert Firebase error codes to user-friendly messages
function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Adresse email invalide."
    case "auth/user-disabled":
      return "Ce compte a été désactivé."
    case "auth/user-not-found":
      return "Aucun compte trouvé avec cette adresse email."
    case "auth/wrong-password":
      return "Mot de passe incorrect."
    case "auth/invalid-credential":
      return "Email ou mot de passe incorrect."
    case "auth/email-already-in-use":
      return "Cette adresse email est déjà utilisée."
    case "auth/weak-password":
      return "Le mot de passe doit contenir au moins 6 caractères."
    case "auth/too-many-requests":
      return "Trop de tentatives. Veuillez réessayer plus tard."
    case "auth/network-request-failed":
      return "Erreur de connexion. Vérifiez votre connexion internet."
    default:
      return "Une erreur s'est produite. Veuillez réessayer."
  }
}
