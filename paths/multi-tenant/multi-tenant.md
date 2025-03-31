# Multi-Tenant Refactor: Landlord-Centric Application

**Project Goal:** Refactor the existing property management application to support multiple landlords, each with their own isolated data and team access.


**Introduction:**

This document outlines a detailed, step-by-step plan to refactor the application for multi-tenancy. We will focus on creating a "landlord" wrapper collection and ensuring data isolation and team-based access control.

## Phase 1: Database Restructuring and Tenant Identification

## Step 1.1: Create the `landlords` Collection (Programmatically)

**Task:** Create the `landlords` collection and add initial landlord documents using JavaScript within the codebase.

**Implementation:**

1.  **Create a Utility Function:**
    * Create a new file, e.g., `src/lib/firebase/landlordUtils.ts`.
    * Add the following JavaScript function to create the `landlords` collection and initial documents:

    ```javascript
    // src/lib/firebase/landlordUtils.ts

    import { db } from './firebase';
    import { collection, doc, setDoc } from 'firebase/firestore';
    import logger from '@/lib/logger';

    export const initializeLandlords = async () => {
      try {
        logger.info('landlordUtils: Initializing landlords collection...');

        // Create landlord 1
        await setDoc(doc(collection(db, 'landlords'), 'landlord1'), {
          landlordName: 'Sanket Shreemal',
          landlordEmail: 'sanket.sshreemal@gmail.com',
        });

        // Create landlord 2
        await setDoc(doc(collection(db, 'landlords'), 'landlord2'), {
          landlordName: 'Jane Doe',
          landlordEmail: 'ecityhsr.re@gmail.com',
        });

        logger.info('landlordUtils: Landlords collection initialized.');
      } catch (error: any) {
        logger.error(`landlordUtils: Error initializing landlords: ${error.message}`);
        throw error;
      }
    };
    ```

2.  **Execute the Function:**
    * Call the `initializeLandlords()` function from a suitable place in your application, such as during the initial setup or from a dedicated admin page.
    * For testing, you could temporarily call it from a component that renders on app load.

    ```javascript
    // Example: In a component
    import { useEffect } from 'react';
    import { initializeLandlords } from '@/lib/firebase/landlordUtils';

    function SomeComponent() {
      useEffect(() => {
        initializeLandlords();
      }, []);

      return <div>Initializing Landlords.</div>;
    }
    ```

3.  **Verification:**
    * After running the code, verify in the Firebase console that the `landlords` collection exists and contains the two landlord documents (`landlord1` and `landlord2`) with the specified fields and values.

## Step 1.2: Move Existing Collections to Subcollections
    One-Time Execution (Data Migration Script):
    The process of moving existing collections into subcollections of the landlords collection is also a one-time operation.
    This is typically achieved through a data migration script.
    Data Migration Script Details:
    This script will utilize the Firebase Admin SDK.
    The script will iterate through the existing top-level collections.
    For each document in those collections, it will:
    Read the data.
    Write the data to the corresponding subcollection under the appropriate landlord document.
    After running the script:
    The script should be removed.

**Task:** Modify the `firestoreUtils.ts` functions to handle subcollections under the `landlords` collection.

**Functions to Modify:**

* `addTenant`
* `getTenant`
* `getDocumentsWithTimeout`
* `addRentalInventory`
* `checkUnitNumberExists`
* `getAllRentalInventory`
* `updateRentalInventory`
* `deleteRentalInventory`
* `addLease`
* `checkActiveLeaseExists`
* `getActiveLeaseForUnit`
* `getAllLeases`
* `updateLease`
* `deleteLease`
* `addRentPayment`
* `getAllPayments` (and `getAllRentPayments` alias)
* `getRentalInventoryDetails`
* `getAllActiveLeases`
* `addPropertyGroup`
* `getAllPropertyGroups`
* `updatePropertyGroup`
* `deletePropertyGroup`
* `checkAdminAccess`

**Type of Modification:**

* **Add `landlordId` Parameter:** Modify each function to accept a `landlordId` parameter (of type `string`).
* **Update Collection Paths:** Update the Firestore collection paths within each function to include the `landlordId`.
* **Example Modification:**

    ```typescript
    // Original:
    export const getAllLeases = async (): Promise<Lease[]> => {
      const leasesCollection = collection(db, 'leases');
      // ...
    };

    // Modified:
    export const getAllLeases = async (landlordId: string): Promise<Lease[]> => {
      const leasesCollection = collection(db, `landlords/${landlordId}/leases`);
      // ...
    };
    ```

**General Function Modification Steps:**

1.  **Locate Collection References:** Find all instances where `collection(db, 'collectionName')` is used.
2.  **Add `landlordId` Parameter:** Add a `landlordId: string` parameter to the function signature.
3.  **Modify Collection Path:** Replace the collection name with a template literal that includes the `landlordId`.
    * Example: `collection(db, \`landlords/${landlordId}/collectionName\`)`
4.  **Update Function Calls:** Modify all places where these functions are called to pass the `landlordId` as an argument.

## Clarification on Collections

* **`landlords` Collection:**
    * This is the new top-level collection that acts as a container for all data belonging to a specific landlord.
    * It's used to isolate data between different landlords.
* **`adminAccess` Collection:**
    * This collection currently stores email addresses of users who have admin access to the entire application.
    * In the multi-tenant architecture, this collection becomes redundant. The team access will be managed through the 'users' collection, and the landlord ID.
    * This collection should be removed. 
* **`users` Collection:**
    * This is a new collection that stores user profiles, including the `landlordId` for each user.
    * This collection will be used to determine which landlord a user belongs to and to enforce access control.
    * This collection replaces the functionality of adminAccess.

**Redundancy and Adjustments:**

* The `adminAccess` collection is redundant and should be removed. 
* The `users` collection should be used to manage user access and tenant affiliation.
* The authentication flow should be modified to rely on the `users` collection for tenant identification.

## Phase 2: Authentication and Authorization

**Step 2.1: Retrieve Landlord ID During Login**

* **Task:** Modify the Google Sign-In function to retrieve the user's `landlordId` from the `users` collection and store it in the authentication context.
* **Implementation:**
    * Modify the `signInWithGoogle` function in `AuthProvider.tsx`.
    * After successful Google sign-in, query the `users` collection using the user's UID to retrieve their user document.
    * Extract the `landlordId` from the user document.
    * Store the `landlordId` in the authentication context.
    * **Example:**

        ```typescript
        // In AuthProvider.tsx
        const signInWithGoogle = async () => {
          // ... (Google Sign-In logic) ...

          const userDoc = await getDoc(doc(db, 'users', result.user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const landlordId = userData.landlordId;
            // Store landlordId in context or state
            setUser({ ...result.user, landlordId });
          }
        };
        ```

Collection architecture for implementation and user flow 
     User Collection (users)

        Purpose:
        Stores user profiles, including the landlordId to associate users with specific landlords.
        Replaces the adminAccess collection, centralizing user management.
        Structure:
        userId (Document ID): The user's unique Firebase Authentication UID.
        landlordId (String): The ID of the landlord the user belongs to.
        email (String): The user's email address.
        role (String, Optional): If you plan to implement role-based access control, this field can store the user's role (e.g., "admin," "manager," "tenant").
        2. Authentication Flow

        Landlord A's Initial Login:
        You'll need a collection, lets call it approvedLandlords, or landlordRequests that stores pre-approved landlord emails.
        When Landlord A signs in with a fresh email address, the application checks if that email exists in the approvedLandlords collection.
        If the email exists:
        The application creates a new landlord document in the landlords collection (if it doesn't already exist).
        The application creates a user document in the users collection, with the landlordId set to the newly created landlord's ID.
        Landlord A is logged in and redirected to their empty application shell.
        If the email does not exist in the approvedLandlords collection.
        The login is denied, and an error message is shown.
        Landlord A Adding User B:
        Landlord A uses the "Manage Users" feature to add User B.
        The application creates a user document in the users collection for User B, with the landlordId set to Landlord A's ID.
        User B's Login:
        When User B logs in, the application retrieves their user document from the users collection.
        The application uses the landlordId from the user document to scope all Firestore queries to Landlord A's data.
        User B is logged in and redirected to Landlord A's data.
        3. Sandbox Feature

        Sandbox Collection:
        Create a separate collection, for example sandboxData, that contains dummy data for testing.
        Sandbox Login:
        When a user logs in, and their email is not found in the approvedLandlords collection, you can give them the option to enter the sandbox.
        If they select the sandbox option, create a user document in the users collection, with a landlordId that points to the sandboxData collection.
        All firestore functions will point to the sandboxData collection for these users.
        Sandbox Cleanup:
        Implement a Cloud Function that triggers on user sign-out or on a scheduled basis (e.g., every 24 hours).
        This function will delete the sandboxData collection or reset it to its initial state.

Structure: 
approvedLandlords (collection)
    |--- document (email address)
        |--- email: "landlordA@example.com"
landlords (collection)
    |--- landlord1 (document)
        |--- properties (subcollection)
        |--- leases (subcollection)
        |--- ...
    |--- landlord2 (document)
        |--- properties (subcollection)
        |--- leases (subcollection)
        |--- ...
users (collection)
    |--- user1 (document)
        |--- landlordId: "landlord1"
        |--- email: "user1@example.com"
    |--- user2 (document)
        |--- landlordId: "landlord1"
        |--- email: "user2@example.com"
    |--- user3 (document)
        |--- landlordId: "landlord2"
        |--- email: "user3@example.com"

    approvedLandlords Collection:
    This collection will reside at the top level of the Firestore database, alongside the landlords and users collections.
    It will contain documents representing pre-approved landlords, with fields like email (the landlord's email address).

**Step 2.2: Modify Firestore Queries to Use Landlord ID (from Authentication Context)**

* **Task:** Modify the application to retrieve the `landlordId` from the authentication context and pass it to the Firestore functions.
* **Detailed Instructions:**
    1.  **Locate Function Calls:**
        * Identify all places in your application where the Firestore functions (listed in Step 1.2) are called.
        * This will typically be in components, services, or other utility files.
        Some examples for the functions that abolutely must be updated include - 
        ✅ addTenant
        ✅ getTenant
        ✅ getDocumentsWithTimeout
        ✅ addRentalInventory
        ✅ checkUnitNumberExists
        ✅ getAllRentalInventory
        ✅ updateRentalInventory
        ✅ deleteRentalInventory
        addLease
        checkActiveLeaseExists
        getActiveLeaseForUnit
        getAllLeases
        updateLease
        deleteLease
        addRentPayment
        getAllPayments (and getAllRentPayments alias)
        getRentalInventoryDetails
        getAllActiveLeases
        addPropertyGroup
        getAllPropertyGroups
        updatePropertyGroup
        deletePropertyGroup
        checkAdminAccess

        Every function that interacts with Firestore needs to be aware of the landlordId to correctly scope data access to the appropriate tenant's subcollections.
        If you miss even one function, it could lead to data leakage or incorrect data display, compromising the multi-tenancy implementation.
        It is very important that all of the functions that interact with firestore are updated to use the landlordID, to prevent data leaks.

    2.  **Retrieve `landlordId` from Authentication Context:**
        * Access the `landlordId` from the authentication context.
        * **Example (using `AuthContext`):**

            ```typescript
            // Example: In a component or service
            import { useContext } from 'react';
            import { AuthContext } from '@/path/to/AuthProvider'; // Adjust the import path
            import { getAllLeases } from '@/lib/firebase/firestoreUtils';

            function SomeComponent() {
              const { user } = useContext(AuthContext);

              const fetchLeases = async () => {
                if (user && user.landlordId) {
                  const leases = await getAllLeases(user.landlordId);
                  // ...
                } else {
                  // Handle case where landlordId is not available
                  console.error("Landlord ID is missing. Please log in again.");
                }
              };

              // ...
            }
            ```

    3.  **Pass `landlordId` to Firestore Functions:**
        * Modify the function calls to pass the `landlordId` as an argument.
        * **Example:**

            ```typescript
            // Original:
            const leases = await getAllLeases();

            // Modified:
            const leases = await getAllLeases(user.landlordId);
            ```

    4.  **Handle Missing `landlordId`:**
        * Implement error handling for cases where the `landlordId` is not available (e.g., user is not logged in or `landlordId` is not yet loaded).
        * This could involve displaying an error

    Example Modification (Using getAllLeases):

        //TypeScript

        // Original (firestoreUtils.ts):
        export const getAllLeases = async (): Promise<Lease[]> => {
        const leasesCollection = collection(db, 'leases');
        // ...
        };

        // Modified (firestoreUtils.ts):
        export const getAllLeases = async (landlordId: string): Promise<Lease[]> => {
        const leasesCollection = collection(db, `landlords/${landlordId}/leases`);
        // ...
        };

        // Example (Component):
        import { useContext, useEffect, useState } from 'react';
        import { AuthContext } from '@/path/to/AuthProvider';
        import { getAllLeases, Lease } from '@/lib/firebase/firestoreUtils';

        function LeaseList() {
        const { user } = useContext(AuthContext);
        const [leases, setLeases] = useState<Lease[]>([]);

        useEffect(() => {
            const fetchLeases = async () => {
            if (user && user.landlordId) {
                const fetchedLeases = await getAllLeases(user.landlordId);
                setLeases(fetchedLeases);
            } else {
                console.error("Landlord ID is missing. Please log in again.");
            }
            };

            fetchLeases();
        }, [user]);

        // ...
        }

    Things to Watch Out For:
    1. Asynchronous Operations: Ensure that landlordId is retrieved before making Firestore queries, as the retrieval process is asynchronous.
    2. Error Handling: Implement robust error handling for cases where landlordId is missing or invalid.
    3. Code Duplication: Avoid duplicating code for retrieving and passing the landlordId. Consider creating a reusable utility function or hook.
    4. Type Safety: Use TypeScript types to ensure that landlordId is always passed as a string.


**Step 2.3: Update Cloud Functions for Landlord Context**

* **Task:** Modify all Cloud Functions to work with the new database structure and include the `landlordId`.
* **Implementation:**
    Identify Triggering Events:

    Determine the events that trigger each Cloud Function.
    This could be:
    Firestore document creates, updates, or deletes.
    User sign-ups or sign-ins.
    HTTP requests.
    Instructions:
    carefully examine the Cloud Function code to identify the triggering events.
    pay attention to the functions.firestore.document().onCreate(), functions.auth.user().onCreate(), and functions.https.onRequest() patterns.
    Receive landlordId:
    Modify the Cloud Functions to receive the landlordId.
    For Firestore triggers, the landlordId might be available in the triggering document's data.
    For HTTP requests, the landlordId might be passed as a query parameter or in the request body.
    For Authentication triggers, you will have to query the user table to get the landlord ID.
    Instructions:
    extract the landlordId from the event data or request parameters.
    They should add error handling for cases where the landlordId is missing or invalid.
    Modify Firestore Operations:
    Update Firestore operations within the Cloud Functions to use the landlordId in document paths.
    Example:
    JavaScript
    // Original:
    admin.firestore().collection('leases').doc(leaseId).set(leaseData);
    // Modified:
    admin.firestore().collection(`landlords/${landlordId}/leases`).doc(leaseId).set(leaseData);
    Instructions:
    find all Firestore operations within the Cloud Functions.
    modify the collection paths to include the landlordId.
    Error Handling:

    Implement robust error handling for all Firestore operations and data processing.
    Log errors and provide informative error messages.
    Instructions:
    Tell your junior developers to use try...catch blocks to handle potential errors.
    They should use console.error() or a logging library to log errors.


* **Testing Milestone 2.3:**
    * Trigger Cloud Functions and verify that data is written to the correct landlord subcollections.

**Step 2.4: Modify Firestore Security Rules**

* **Task:** Update the Firestore Security Rules to enforce tenant-specific access control based on the `landlordId`.
* **Implementation:**
    * Modify the security rules to ensure that users can only access data within their respective landlord's subcollections.
    * **Example Rules:**

    rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow reading approvedLandlords collection for authentication
    match /approvedLandlords/{document} {
      allow read: if request.auth != null;
    }
    
    // Allow reading allUsers collection for authentication
    match /allUsers/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
    }

    // Allow users to read their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Secure access to landlord-specific data
    match /landlords/{landlordId}/{document=**} {
      allow read, write: if request.auth != null && 
        (
          // User's landlordId in allUsers matches the requested landlordId path
          exists(/databases/$(database)/documents/allUsers/$(request.auth.uid)) && 
          get(/databases/$(database)/documents/allUsers/$(request.auth.uid)).data.landlordId == landlordId
        ) ||
        (
          // Legacy path: User's landlordId in users collection matches the requested landlordId path
          exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.landlordId == landlordId
        );
    }
  }
}

* **Testing Milestone 2.4:**
    * Test the application with multiple user accounts from different landlords to ensure that data access is restricted correctly.

**Phase 3: Application Adjustments and Testing**

* **Task:** Adjust the application to reflect the multi-tenant structure and thoroughly test all functionalities.

* **Implementation:**
    * Test all data entry and retrieval functions to ensure that data is correctly scoped to the landlord.
        **Data Handling Logic Adjustments:**
    * **Data Entry Forms:**
        * Modify data entry forms to include a hidden field or logic that automatically sets the `landlordId` when creating new documents.
        * Example: When adding a new lease, set the `landlordId` field in the lease document to the current landlord's ID.
    * **Data Retrieval:**
        * Ensure that all data retrieval functions (e.g., `getAllLeases`, `getAllRentPayments`) use the `landlordId` from the authentication context to fetch data.
        * Implement error handling for cases where the `landlordId` is missing or invalid.
    * **Data Updates:**
        * Modify data update functions to prevent users from updating data that belongs to other landlords.
        * Check the `landlordId` of the document being updated against the current landlord's ID.
    * **Data Deletion:**
        * Modify data deletion functions to prevent users from deleting data that belongs to other landlords.
        * Check the `landlordId` of the document being deleted against the current landlord's ID.

    3.  **Example Code Snippets:**
        * **Data Scoping in a Component:**

            ```typescript
            // Example: Displaying leases for the current landlord
            import { useContext, useEffect, useState } from 'react';
            import { AuthContext } from '@/path/to/AuthProvider';
            import { getAllLeases, Lease } from '@/lib/firebase/firestoreUtils';

            function LeaseList() {
            const { user } = useContext(AuthContext);
            const [leases, setLeases] = useState<Lease[]>([]);

            useEffect(() => {
                const fetchLeases = async () => {
                if (user && user.landlordId) {
                    const fetchedLeases = await getAllLeases(user.landlordId);
                    setLeases(fetchedLeases);
                } else {
                    console.error("Landlord ID is missing. Please log in again.");
                }
                };

                fetchLeases();
            }, [user]);

            // ... render leases ...
            }
            ```
        * **Data Entry Form:**

            ```typescript
            // Example: Adding a new lease
            import { useContext } from 'react';
            import { AuthContext } from '@/path/to/AuthProvider';
            import { addLease } from '@/lib/firebase/firestoreUtils';

            function AddLeaseForm() {
            const { user } = useContext(AuthContext);

            const handleSubmit = async (leaseData: any) => {
                if (user && user.landlordId) {
                await addLease(user.landlordId, { ...leaseData });
                // ... handle success ...
                } else {
                console.error("Landlord ID is missing. Please log in again.");
                }
            };

            // ... form fields ...
            }
            ```

    * Test the authentication and authorization flow to ensure that users can only access their respective landlord's data.
    * Test cloud functions and security rules.
* **Final Testing Milestone:**
    * Perform end-to-end testing with multiple landlord accounts to ensure that the application is fully functional and secure.


**Sandbox funtionality**
If a user email is not found, they are taken to a special sandbox page where they can try out the application. 
Files that are needed to be edited to approve sandbox (currently commented out for testing)
    In AuthContext.tsx:
        Commented out the isSandboxUser property in the ExtendedUser interface
        Removed sandbox-related code from the user state management
        Simplified the sign-in flow to only handle authorized users
    In firestoreUtils.ts:
        Commented out the isSandboxUser return type in handleAuthFlow
        Removed the sandbox user creation logic
        Added explicit denial of access for unauthorized users
        Commented out all sandbox-related code while preserving it for future use
    In useLandlordId.ts:
        Updated the hook's documentation to remove sandbox-related references
        Simplified the hook to only handle authorized users
        Improved the code structure for better readability