"use client";

import React, { createContext, useEffect, useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { User } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { handleAuthFlow, getUserLandlordId } from "../firebase/firestoreUtils";
import { useRouter } from "next/navigation";

// Extend the User type to include landlordId
interface ExtendedUser extends User {
  landlordId?: string;
  isSandboxUser?: boolean;
}

interface AuthContextType {
  user: ExtendedUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  isNewUser: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  error: null,
  isNewUser: false
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch landlordId for existing users
          const landlordId = await getUserLandlordId(firebaseUser.email || '');
          const extendedUser: ExtendedUser = {
            ...firebaseUser,
            landlordId: landlordId || undefined,
            isSandboxUser: landlordId === 'sandbox'
          };
          setUser(extendedUser);
        } catch (error) {
          console.error("Error getting landlord ID:", error);
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      console.log("Attempting to sign in with Google...");
      const result = await signInWithPopup(auth, provider);
      
      // Handle the authentication flow
      const { landlordId, isNewUser: newUser, isSandboxUser } = await handleAuthFlow(result.user);
      
      if (!landlordId) {
        // This should not happen based on our flow, but just in case
        await firebaseSignOut(auth);
        setError("Sorry, something went wrong during sign-in. Please try again.");
        router.push('/'); // Redirect to landing page
        return;
      }
      
      // Set user with landlordId
      const extendedUser: ExtendedUser = {
        ...result.user,
        landlordId,
        isSandboxUser
      };
      
      setUser(extendedUser);
      setIsNewUser(newUser);
      setError(null); // Clear any previous errors
      
      if (isSandboxUser) {
        console.log("Sandbox user signed in:", result.user.uid, "with landlordId:", landlordId);
        // You could show a different welcome message or tour for sandbox users
      } else {
        console.log("User signed in:", result.user.uid, "with landlordId:", landlordId);
      }
      
      router.push('/dashboard'); // Redirect to dashboard on successful auth
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      // Log specific Firebase Auth errors
      if (error.code === 'auth/popup-closed-by-user') {
        setError("Authentication was cancelled.");
      } else if (error.code === 'auth/popup-blocked') {
        setError("The popup was blocked by your browser. Please allow popups for this site.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized for sign-in operations.");
      } else {
        setError("An error occurred during sign-in. Please try again.");
      }
      
      throw error; // Re-throw to allow handling in components
    }
  };

  const signOutUser = async () => {
    try {
      await firebaseSignOut(auth);
      setError(null); // Clear any errors on sign out
      setUser(null);
      setIsNewUser(false);
      router.push('/'); // Redirect to landing page
    } catch (error) {
      console.error("Error signing out", error);
      setError("An error occurred while signing out.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut: signOutUser, error, isNewUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
