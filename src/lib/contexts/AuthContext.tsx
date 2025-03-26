"use client";

import React, { createContext, useEffect, useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { User } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { checkAdminAccess } from "../firebase/firestoreUtils";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      console.log("Attempting to sign in with Google...");
      const result = await signInWithPopup(auth, provider);
      
      // Check if user has admin access
      const hasAdminAccess = await checkAdminAccess(result.user.email || '');
      
      if (!hasAdminAccess) {
        // Sign out the user if they don't have admin access
        await firebaseSignOut(auth);
        setError("Sorry, you are not authorized to sign in.");
        router.push('/'); // Redirect to landing page
        return;
      }
      
      console.log("Google sign-in successful:", result.user.uid);
      setError(null); // Clear any previous errors
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
      router.push('/'); // Redirect to landing page
    } catch (error) {
      console.error("Error signing out", error);
      setError("An error occurred while signing out.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut: signOutUser, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
