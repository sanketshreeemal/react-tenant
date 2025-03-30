"use client";

import React, { createContext, useEffect, useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { User } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { handleAuthFlow } from "../firebase/firestoreUtils";
import { useRouter } from "next/navigation";

// Extend the User type to include landlordId
interface ExtendedUser extends User {
  landlordId?: string;
  // isSandboxUser?: boolean; // Commented out sandbox functionality
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
        // JUST set the basic firebase user initially.
        // The landlordId will be added by signInWithGoogle/handleAuthFlow later.
        setUser(firebaseUser);
        // Optionally, you could try to fetch landlordId here IF AND ONLY IF
        // you are sure handleAuthFlow hasn't run yet for this session,
        // but it's cleaner to let handleAuthFlow manage it.
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

      try {
        // Handle the authentication flow - THIS is where landlordId is determined
        const { landlordId, isNewUser: newUser } = await handleAuthFlow(result.user);

        if (!landlordId) {
          // User is not authorized, sign them out and show error
          await firebaseSignOut(auth);
          setError("Access denied. You are not authorized to use this application.");
          setUser(null);
          setIsNewUser(false);
          return; // Don't redirect, stay on the landing page
        }

        // Set user WITH landlordId - this updates the context properly
        const extendedUser: ExtendedUser = {
          ...result.user,
          landlordId,
          // isSandboxUser: false // Commented out sandbox functionality
        };

        setUser(extendedUser);
        setIsNewUser(newUser);
        setError(null); // Clear any previous errors

        console.log("User signed in:", result.user.uid, "with landlordId:", landlordId);

        router.push('/dashboard'); // Only redirect to dashboard if authorized
      } catch (authError: any) {
        // Handle specific auth flow errors
        console.error("Auth flow error:", authError);

        // Sign out the user
        await firebaseSignOut(auth);
        setUser(null);
        setIsNewUser(false);

        // Set specific error message based on error code
        if (authError.code === 'auth/unauthorized') {
          setError(authError.message || "You do not have permission to access this application.");
        } else if (authError.code === 'auth/no-email') {
          setError("No email address associated with this account. Please use an account with a valid email.");
        } else if (authError.code === 'auth/check-failed') {
          setError("Unable to verify your authorization. Please try again later.");
        } else {
          setError(authError.message || "An error occurred during authentication. Please try again.");
        }
        return; // Stay on landing page
      }
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
      
      // Ensure user is signed out on error
      await firebaseSignOut(auth);
      setUser(null);
      setIsNewUser(false);
      
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
