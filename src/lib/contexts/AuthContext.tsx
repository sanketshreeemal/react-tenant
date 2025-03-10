"use client";

import React, { createContext, useEffect, useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { User } from "firebase/auth";
import { auth } from "../firebase/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      console.log("Google sign-in successful:", result.user.uid);
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      // Log specific Firebase Auth errors
      if (error.code === 'auth/popup-closed-by-user') {
        console.error("Authentication popup was closed by the user before completing the sign-in process.");
      } else if (error.code === 'auth/popup-blocked') {
        console.error("The popup was blocked by the browser. Please allow popups for this site.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.error("Multiple popup requests were triggered. Only the latest one will be displayed.");
      } else if (error.code === 'auth/unauthorized-domain') {
        console.error("The domain of this site is not authorized for OAuth operations. This is likely a configuration issue.");
      }
      
      throw error; // Re-throw to allow handling in components
    }
  };

  const signOutUser = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut: signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
