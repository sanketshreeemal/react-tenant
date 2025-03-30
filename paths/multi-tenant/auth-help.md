# Multi-Tenant Application Authentication Flow

This document details the authentication and authorization flow for the multi-tenant property management application, utilizing Firebase Authentication, Firestore, and an invitation system.

## 1. Overview

The application uses **Firebase Authentication** with **Google Sign-In** as the primary method. User authorization and access are determined through a multi-step process involving Firestore collections (`invitations`, `approvedLandlords`, `allUsers`, `users`).

Upon successful Google Sign-In, the backend `handleAuthFlow` function determines the user's associated **landlord account** (`landlordId`) and role. Data access is then scoped to the specific landlord's data using this `landlordId` throughout the application.

## 2. Key Firestore Collections

*   **`invitations`**: Stores pending invitations sent by existing landlords. An invitation includes the invitee's email (lowercase), the inviting `landlordId`, and the assigned `role`. It's checked first during login. Once a user signs in using an invited email, the corresponding invitation is consumed (deleted), and the user is created.
    ```
    invitations (collection)
        |--- inviteDocId (document)
            |--- email: "inviteduser@example.com" (lowercase)
            |--- landlordId: "landlord1"
            |--- role: "user"
            |--- invitedAt: Timestamp
    ```
*   **`approvedLandlords`**: Stores email addresses (case-insensitive) of landlords pre-approved to create *new* landlord accounts upon their first sign-in.
    ```
    approvedLandlords (collection)
        |--- document (email address)
            |--- email: "landlordA@example.com"
    ```
*   **`landlords`**: Top-level collection where each document represents a landlord account.
    ```
    landlords (collection)
        |--- landlord1 (document)
            |--- landlordName: "Sanket Shreemal"
            |--- landlordEmail: "sanket.sshreemal@gmail.com"
            |--- properties (subcollection)
            |--- leases (subcollection)
            |--- ...
    ```
*   **`users`**: Stores individual user profiles linked to a specific landlord. The document ID is the Firebase Auth UID. This stores the canonical user data *after* they have successfully logged in at least once.
    ```typescript
    // src/types.d.ts
    export interface UserProfile {
      id: string; // Firebase Auth UID
      email: string; // Original case email
      landlordId: string;
      role: 'admin' | 'user' | 'tenant';
      createdAt: Date;
      updatedAt: Date;
    }
    ```
    ```
    users (collection)
        |--- userAuthUid1 (document)
            |--- landlordId: "landlord1"
            |--- email: "User1@example.com" // Stores original case
            |--- role: "admin"
            |--- ...
    ```
*   **`allUsers`**: A centralized registry mapping user UIDs to their `landlordId` and `role`. Primarily used for quick lookups and ensuring consistency. The document ID is the Firebase Auth UID. This collection is updated whenever a user logs in or is created.
    ```typescript
    // src/types.d.ts
    export interface AllUser {
      uid: string; // Firebase Auth UID as document ID
      email: string; // Original case email
      landlordId: string; // ID of the landlord this user belongs to
      role: 'admin' | 'user' | 'tenant'; // User role within their landlord organization
      updatedAt: Date; // Last update timestamp
    }
    ```
    ```
    allUsers (collection)
        |--- userAuthUid1 (document)
            |--- landlordId: "landlord1"
            |--- email: "User1@example.com" // Stores original case
            |--- role: "admin"
            |--- ...
    ```

## 3. Frontend Flow (`AuthContext.tsx`)

The `AuthContext` manages the user's authentication state.

**Initialization (`useEffect` with `onAuthStateChanged`):**
*   Listens for Firebase auth state changes.
*   If a user is logged in via Firebase (`firebaseUser`), it sets the basic user object in the context state.
*   **Crucially, it does NOT fetch `landlordId` here.** The `landlordId` is determined and added to the context state *only* after a successful `signInWithGoogle` call completes the `handleAuthFlow`.

```typescript
// src/lib/contexts/AuthContext.tsx
useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      // JUST set the basic firebase user initially.
      // The landlordId will be added by signInWithGoogle/handleAuthFlow later.
      setUser(firebaseUser);
    } else {
      setUser(null);
    }
    setLoading(false);
  });

  return () => unsubscribe();
}, []);
```

**Sign-In (`signInWithGoogle`):**
1.  Initiates the Google Sign-In popup.
2.  On successful Google authentication, it retrieves the Firebase `User` object (`result.user`).
3.  Calls the backend `handleAuthFlow(result.user)` function.
4.  **`handleAuthFlow` determines authorization**: It checks invitations, approved landlords, and existing user records (see Section 4) to find the correct `landlordId` and `role`.
5.  **If `handleAuthFlow` returns a `landlordId`**: 
    *   The `AuthContext` state is updated with an `ExtendedUser` object containing the Firebase user data *plus* the retrieved `landlordId`.
    *   The user is redirected to `/dashboard`.
6.  **If `handleAuthFlow` throws an error (e.g., `auth/unauthorized`) or returns no `landlordId`**: 
    *   The user is immediately signed out from Firebase.
    *   An appropriate error message is set in the `AuthContext` state.
    *   The user remains on the current page (usually the landing page) and is not redirected.
7.  Handles various Google Sign-In errors (popup closed, blocked, etc.) by signing the user out and setting error messages.

```typescript
// src/lib/contexts/AuthContext.tsx (Relevant Snippet)
const signInWithGoogle = async () => {
  // ... Google Sign-In setup ...
  try {
    const result = await signInWithPopup(auth, provider);
    try {
      // THIS is where landlordId is determined
      const { landlordId, isNewUser: newUser } = await handleAuthFlow(result.user);

      if (!landlordId) {
        // Not authorized
        await firebaseSignOut(auth);
        setError("Access denied. You are not authorized to use this application.");
        setUser(null);
        return; // Stay on landing page
      }

      // Authorized: Set user WITH landlordId
      const extendedUser: ExtendedUser = {
        ...result.user,
        landlordId,
      };
      setUser(extendedUser);
      // ... set isNewUser, clear error ...
      router.push('/dashboard'); // Redirect
    } catch (authError: any) {
      // Handle errors from handleAuthFlow (e.g., unauthorized)
      await firebaseSignOut(auth);
      setUser(null);
      setError(authError.message || "An error occurred during authentication.");
      return; // Stay on landing page
    }
  } catch (error: any) {
    // Handle Google Sign-In errors (e.g., popup closed)
    await firebaseSignOut(auth);
    setUser(null);
    setError(error.message || "An error occurred during authentication.");
    throw error;
  }
};
```

**Sign-Out (`signOutUser`):**
*   Signs the user out of Firebase.
*   Clears the context state (`user`, `error`, `isNewUser`).
*   Redirects the user to the landing page (`/`).

**Fetching `landlordId` in Components (`useLandlordId` hook):**
*   Components needing the `landlordId` *after* initial login and redirection use the `useLandlordId` hook.
*   This hook observes the `user` object from `AuthContext`.
*   Once the `user` object is available (meaning `onAuthStateChanged` has run), it queries the `users/{user.uid}` document in Firestore to retrieve the `landlordId` associated with the current user's UID.
*   It provides the `landlordId` and loading/error states to the component.
    *   **Note:** This hook relies on the `users` collection having been populated by `handleAuthFlow` during the sign-in process. It does *not* use the `landlordId` potentially stored directly in the `AuthContext`'s `user` object, but fetches it fresh from Firestore based on the UID.

```typescript
// src/lib/hooks/useLandlordId.ts (Relevant Snippet)
useEffect(() => {
  const fetchLandlordId = async () => {
    if (!user) { /* ... */ return; }
    try {
      // Fetches from 'users' collection using the UID
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setLandlordId(userDoc.data().landlordId);
      } else { setError('User document not found'); }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };
  fetchLandlordId();
}, [user]);
```

## 4. Backend Flow (`firestoreUtils.ts`)

The `handleAuthFlow` function is the core authorization logic executed *after* a successful Google Sign-In.

**Input:** Firebase `User` object.
**Output:** `{ landlordId: string | null, isNewUser: boolean }` or throws `AuthError`.

**Execution Order:**

1.  **Email Check:** Verifies the user object has an email. If not, throws `auth/no-email` error.
2.  **Invitation Check:**
    *   Queries the `invitations` collection for the user's email (lowercase).
    *   **If an invitation exists:**
        *   Retrieves `landlordId` and `role` from the invitation.
        *   Calls `createUserDocument` (using original case email) to create/update records in `users` and `allUsers` collections with the details from the invitation.
        *   Deletes the consumed invitation document.
        *   Returns `{ landlordId: invitedLandlordId, isNewUser: true }`.
3.  **Approved Landlord Check:** (Only if no invitation was found)
    *   Uses `isApprovedLandlord` to check (case-insensitively) if the user's email exists in the `approvedLandlords` collection.
    *   **If approved:**
        *   Checks if a document for this user's UID already exists in the `users` collection.
        *   **If user exists:** Retrieves existing `landlordId`, updates `allUsers`, returns `{ landlordId: existingLandlordId, isNewUser: false }`.
        *   **If user does not exist:** Calls `createLandlord` to create a new landlord document, then calls `createUserDocument` to create the user (`role: 'admin'`) in `users` and `allUsers`. Returns `{ landlordId: newLandlordId, isNewUser: true }`.
4.  **`allUsers` Check:** (Only if not invited and not an approved landlord)
    *   Uses `checkAllUsersCollection` to query the `allUsers` collection by the user's original case email.
    *   **If found:** Retrieves `landlordId` and `role`. Ensures the user document exists in the `users` collection via `createUserDocument`. Returns `{ landlordId: foundLandlordId, isNewUser: false }`.
5.  **`users` Check (Legacy/Fallback):** (Only if not found in previous steps)
    *   Directly checks the `users` collection by UID.
    *   **If found:** Retrieves `landlordId` and `role`. Updates `allUsers` for consistency. Returns `{ landlordId: foundLandlordId, isNewUser: false }`.
6.  **Deny Access:**
    *   If the user is not found through any of the above checks (invitation, approved, allUsers, users), an `AuthError` with code `auth/unauthorized` is thrown. This prevents the login process from completing in the `AuthContext`.

**Key Helper Functions:**

*   `inviteUser(landlordId, email, role)`: Adds a document to the `invitations` collection (lowercase email). Called from the Manage Users page.
*   `removeUserAccess(emailToRemove)`: Finds the user's UID via the `allUsers` collection (lowercase email lookup), then deletes the corresponding documents from *both* `users` and `allUsers`. Also attempts to delete any pending invitations for that email. Called from the Manage Users page.
*   `createUserDocument(uid, email, landlordId, role)`: Creates/updates the document in the `users` collection (using the provided UID and original case email). Crucially, it *also* calls `updateAllUsersCollection`.
*   `updateAllUsersCollection(uid, email, landlordId, role)`: Creates/updates the document in the `allUsers` collection (using the provided UID and original case email).
*   `isApprovedLandlord(email)`: Checks `approvedLandlords` collection (case-insensitive).
*   `createLandlord(email, name)`: Creates document in `landlords` collection.
*   `checkAllUsersCollection(email)`: Queries `allUsers` by email (original case).

```typescript
// src/lib/firebase/firestoreUtils.ts (handleAuthFlow Simplified Logic)
export const handleAuthFlow = async (user: User): Promise<{
  landlordId: string | null;
  isNewUser: boolean;
}> => {
  // 1. Check email exists
  const userEmailLower = user.email.toLowerCase();

  // 2. Check Invitations (using userEmailLower)
  const invitation = await getInvitation(userEmailLower);
  if (invitation) {
    await createUserDocument(user.uid, user.email, invitation.landlordId, invitation.role);
    await deleteInvitation(invitation.id);
    return { landlordId: invitation.landlordId, isNewUser: true };
  }

  // 3. Check Approved Landlord (using user.email)
  const isApproved = await isApprovedLandlord(user.email);
  if (isApproved) {
    const userDoc = await getUserDoc(user.uid);
    if (userDoc) {
      await updateAllUsersCollection(user.uid, user.email, userDoc.landlordId, userDoc.role || 'admin');
      return { landlordId: userDoc.landlordId, isNewUser: false };
    } else {
      const newLandlordId = await createLandlord(user.email, user.displayName || user.email || 'New Landlord');
      await createUserDocument(user.uid, user.email, newLandlordId, 'admin');
      return { landlordId: newLandlordId, isNewUser: true };
    }
  }

  // 4. Check allUsers Collection (using user.email)
  const allUserData = await checkAllUsersCollection(user.email);
  if (allUserData) {
    await createUserDocument(user.uid, user.email, allUserData.landlordId, allUserData.role);
    return { landlordId: allUserData.landlordId, isNewUser: false };
  }

  // 5. Check users Collection (Legacy) (using user.uid)
  const userDoc = await getUserDoc(user.uid);
  if (userDoc) {
    await updateAllUsersCollection(user.uid, user.email, userDoc.landlordId, userDoc.role || 'user');
    return { landlordId: userDoc.landlordId, isNewUser: false };
  }

  // 6. Deny Access
  throw new AuthError('You do not have permission to access this application. Please contact your administrator.', 'auth/unauthorized');
};
```

## 5. Authorization and Data Scoping

Once a user is authenticated and their `landlordId` is obtained (either during `handleAuthFlow` and stored in `AuthContext`, or fetched later via `useLandlordId`):

*   **Frontend**: The `landlordId` is passed as an argument to all Firestore utility functions that interact with landlord-specific data (e.g., `getAllLeases(landlordId)`, `addTenant(landlordId, tenantData)`). The `validateLandlordId` helper function ensures it's present.
*   **Backend (`firestoreUtils.ts`)**: Each function accepting `landlordId` uses it to construct the correct Firestore path (e.g., `collection(db, \`landlords/${validLandlordId}/leases\`)`).
*   **Security Rules**: Firestore Security Rules (defined in `firestore.rules`) are essential to enforce that authenticated users can *only* read/write data within the path corresponding to their *own* `landlordId` (as stored securely in their associated `users/{userId}` or `allUsers/{userId}` document, which the rules can access). This prevents users from accessing data belonging to other landlords.

This combination ensures strict data isolation between different landlord accounts.
