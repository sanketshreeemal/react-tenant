## Firebase Firestore Utility Functions Documentation

This document outlines the utility functions available in `src/lib/firebase/firestoreUtils.ts` for interacting with Firebase Firestore.

---

### 1. `addTenant`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>` - An object containing the tenant's information, excluding system-generated fields like `id`, `createdAt`, and `updatedAt`.
*   **Function Output:** `Promise<string>` - A promise that resolves with the ID of the newly created tenant document.
*   **Explanation:** This function adds a new tenant document to the `tenants` subcollection under the specified `landlordId`. It automatically adds `createdAt` and `updatedAt` timestamps and includes the `landlordId` in the tenant document.

---

### 2. `getTenant`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `tenantId: string` - The ID of the tenant document to retrieve.
*   **Function Output:** `Promise<Tenant | undefined>` - A promise that resolves with the tenant's data if found, or `undefined` if the tenant does not exist.
*   **Explanation:** Retrieves a specific tenant document by its `tenantId` from the `tenants` subcollection under the given `landlordId`. Timestamps are converted to Date objects.

---

### 3. `getDocumentsWithTimeout`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `collectionName: string` - The name of the collection to retrieve documents from (relative to the landlord's path, e.g., 'tenants', 'leases').
    *   `timeoutMs: number = 10000` - Optional timeout in milliseconds (default is 10 seconds).
*   **Function Output:** `Promise<QuerySnapshot<DocumentData>>` - A promise that resolves with a Firestore `QuerySnapshot` containing the documents from the specified collection.
*   **Explanation:** Fetches all documents from a specified subcollection under the given `landlordId`. It includes a timeout mechanism to prevent indefinitely hanging requests.

---

### 4. `addRentalInventory`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `inventoryData: Omit<RentalInventory, 'id' | 'createdAt' | 'updatedAt'>` - An object containing the rental inventory item's details, excluding system-generated fields.
*   **Function Output:** `Promise<string>` - A promise that resolves with the ID of the newly added rental inventory document.
*   **Explanation:** Adds a new rental inventory item to the `rental-inventory` subcollection for the specified `landlordId`. It checks for duplicate `unitNumber` before adding and includes timestamps and `landlordId` in the document.

---

### 5. `checkUnitNumberExists`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `unitNumber: string` - The unit number to check for existence.
*   **Function Output:** `Promise<boolean>` - A promise that resolves to `true` if a rental inventory item with the given `unitNumber` already exists for the landlord, `false` otherwise.
*   **Explanation:** Checks if a specific `unitNumber` is already in use within the landlord's `rental-inventory` collection. This is useful for preventing duplicate unit entries.

---

### 6. `getAllRentalInventory`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
*   **Function Output:** `Promise<RentalInventory[]>` - A promise that resolves with an array of all rental inventory items for the given landlord.
*   **Explanation:** Retrieves all documents from the `rental-inventory` subcollection for the specified `landlordId`. It processes each document, converting timestamps and ensuring essential fields are present.

---

### 7. `updateRentalInventory`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `inventoryId: string` - The ID of the rental inventory item to update.
    *   `updateData: Partial<Omit<RentalInventory, 'id' | 'createdAt' | 'updatedAt'>>` - An object containing the fields to update in the inventory item.
*   **Function Output:** `Promise<void>` - A promise that resolves when the inventory item has been successfully updated.
*   **Explanation:** Updates an existing rental inventory item identified by `inventoryId` for the given `landlordId`. If the `unitNumber` is being changed, it first checks if the new `unitNumber` already exists to prevent duplicates. It also updates the `updatedAt` timestamp.

---

### 8. `deleteRentalInventory`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `inventoryId: string` - The ID of the rental inventory item to delete.
*   **Function Output:** `Promise<void>` - A promise that resolves when the inventory item has been successfully deleted.
*   **Explanation:** Deletes a specific rental inventory item identified by `inventoryId` from the landlord's `rental-inventory` collection.

---

### 9. `addLease`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `leaseData: Omit<Lease, 'id' | 'createdAt' | 'updatedAt'>` - An object containing the lease details, excluding system-generated fields.
*   **Function Output:** `Promise<string>` - A promise that resolves with the ID of the newly created lease document.
*   **Explanation:** Adds a new lease to the `leases` subcollection for the specified `landlordId`. It performs several checks: ensures `unitId` is present, tries to populate `unitNumber` if missing, verifies the `unitId` exists in rental inventory, and checks for existing active leases on the unit if the new lease is active. Dates are normalized and converted to timestamps.

---

### 10. `checkActiveLeaseExists`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `unitId: string` - The ID of the unit to check for an active lease.
*   **Function Output:** `Promise<boolean>` - A promise that resolves to `true` if an active lease exists for the specified unit, `false` otherwise.
*   **Explanation:** Checks if there is currently an active lease associated with a particular `unitId` within the landlord's `leases` collection.

---

### 11. `getActiveLeaseForUnit`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `unitId: string` - The ID of the unit for which to retrieve the active lease.
*   **Function Output:** `Promise<Lease | null>` - A promise that resolves with the active lease data if found, or `null` if no active lease exists for the unit.
*   **Explanation:** Retrieves the currently active lease document for a specific `unitId` under the given `landlordId`. It converts Firestore timestamps in the lease data to JavaScript Date objects.

---

### 12. `getAllLeases`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
*   **Function Output:** `Promise<Lease[]>` - A promise that resolves with an array of all lease items for the landlord, sorted with active leases first, then by start date (newest first).
*   **Explanation:** Retrieves all lease documents from the `leases` subcollection for the specified `landlordId`. It handles potential missing/invalid data with defaults and converts timestamps to Date objects.

---

### 13. `getLeaseById`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `leaseId: string` - The ID of the lease to retrieve.
*   **Function Output:** `Promise<Lease | null>` - A promise that resolves with the lease data if found, or `null` if not found.
*   **Explanation:** Fetches a specific lease document by its `leaseId` from the landlord's `leases` subcollection. Converts timestamps to Date objects.

---

### 14. `updateLease`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `leaseId: string` - The ID of the lease to update.
    *   `updateData: Partial<Omit<Lease, 'id' | 'createdAt' | 'updatedAt'>>` - An object containing the fields to update in the lease document.
*   **Function Output:** `Promise<void>` - A promise that resolves when the lease has been successfully updated.
*   **Explanation:** Updates an existing lease identified by `leaseId`. If activating a lease (`isActive: true`), it checks if another active lease already exists for the same unit to prevent conflicts. It also attempts to update `unitNumber` if `unitId` is changed and `unitNumber` isn't provided.

---

### 15. `deleteLease`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `leaseId: string` - The ID of the lease to delete.
*   **Function Output:** `Promise<void>` - A promise that resolves when the lease has been successfully deleted.
*   **Explanation:** Deletes a specific lease document identified by `leaseId` from the landlord's `leases` subcollection.

---

### 16. `addRentPayment`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `paymentData: Omit<RentPayment, 'id' | 'createdAt' | 'updatedAt'>` - An object containing the rent payment details.
*   **Function Output:** `Promise<string>` - A promise that resolves with the ID of the newly created rent payment document.
*   **Explanation:** Adds a new rent payment to the `rent-collection` subcollection for the specified `landlordId`. It sets default values for `paymentType` (to "Rent Payment"), `collectionMethod`, and `paymentDate` if not provided.

---

### 17. `getAllPayments` (also aliased as `getAllRentPayments`)

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
*   **Function Output:** `Promise<RentPayment[]>` - A promise that resolves with an array of all payment items, ordered by creation date (descending).
*   **Explanation:** Retrieves all documents from the `rent-collection` subcollection for the specified `landlordId`. This function is intended to fetch various payment types (rent, bills, etc.). It provides a default `paymentType` of "Rent Payment" for backward compatibility and converts timestamps.

---

### 18. `getRentalInventoryDetails`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `unitId: string` - The ID of the rental inventory unit to retrieve details for.
*   **Function Output:** `Promise<RentalInventory | null>` - A promise that resolves with the rental inventory data (including owner and bank details if present) if found, or `null` otherwise.
*   **Explanation:** Fetches detailed information for a specific rental inventory item identified by `unitId` from the landlord's `rental-inventory` collection. Converts timestamps.

---

### 19. `getAllActiveLeases`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
*   **Function Output:** `Promise<Lease[]>` - A promise that resolves with an array of all currently active lease items, ordered by `unitId`.
*   **Explanation:** Retrieves all lease documents from the `leases` subcollection where the `isActive` flag is true for the specified `landlordId`. Converts timestamps to Date objects.

---

### 20. `addPropertyGroup`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `groupData: Omit<PropertyGroup, 'id' | 'createdAt' | 'updatedAt'>` - An object containing the property group details (e.g., `groupName`).
*   **Function Output:** `Promise<string>` - A promise that resolves with the ID of the newly created property group document.
*   **Explanation:** Adds a new property group to the `property-groups` subcollection for the specified `landlordId`. It checks if a group with the same name (case-insensitive) already exists before creating a new one.

---

### 21. `getAllPropertyGroups`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
*   **Function Output:** `Promise<PropertyGroup[]>` - A promise that resolves with an array of all property group items, ordered by `groupName` (ascending).
*   **Explanation:** Retrieves all property group documents from the `property-groups` subcollection for the specified `landlordId`. Converts timestamps and handles default values.

---

### 22. `updatePropertyGroup`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `groupId: string` - The ID of the property group to update.
    *   `groupData: Partial<Omit<PropertyGroup, 'id' | 'createdAt' | 'updatedAt'>>` - An object containing the fields to update (e.g., `groupName`).
*   **Function Output:** `Promise<void>` - A promise that resolves when the property group has been successfully updated.
*   **Explanation:** Updates an existing property group. If the `groupName` is being changed, it checks for naming conflicts (case-insensitive) with other existing groups for that landlord.

---

### 23. `deletePropertyGroup`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord.
    *   `groupId: string` - The ID of the property group to delete.
*   **Function Output:** `Promise<void>` - A promise that resolves when the property group has been successfully deleted.
*   **Explanation:** Deletes a property group. Before deletion, it checks if any rental inventory items are currently associated with this group; if so, deletion is prevented to maintain data integrity.

---

### 24. `getUserLandlordId`

*   **Function Parameters:**
    *   `email: string` - The email address of the user.
*   **Function Output:** `Promise<string | null>` - A promise that resolves with the `landlordId` associated with the user's email if found in the `users` collection, or `null` otherwise.
*   **Explanation:** This function queries the global `users` collection to find a user by their email and return their associated `landlordId`. This is likely used to map a user to their specific landlord context.

---

### 25. `isApprovedLandlord`

*   **Function Parameters:**
    *   `email: string` - The email address to check.
*   **Function Output:** `Promise<boolean>` - A promise that resolves to `true` if the email exists (case-insensitive) in the `approvedLandlords` collection, `false` otherwise.
*   **Explanation:** Checks if an email address is present in a global `approvedLandlords` collection. This is used to determine if a new user is authorized to create a new landlord account.

---

### 26. `createLandlord`

*   **Function Parameters:**
    *   `email: string` - The email address of the new landlord.
    *   `name: string` - The name of the new landlord.
*   **Function Output:** `Promise<string>` - A promise that resolves with the ID of the newly created landlord document in the global `landlords` collection.
*   **Explanation:** Creates a new landlord document in the top-level `landlords` collection. It first checks if a landlord with the given email already exists; if so, it returns the existing landlord's ID.

---

### 27. `checkAllUsersCollection`

*   **Function Parameters:**
    *   `email: string` - The email address to check.
*   **Function Output:** `Promise<{uid: string, landlordId: string, role: string} | null>` - A promise that resolves with an object containing the user's `uid`, `landlordId`, and `role` if found in the `allUsers` collection, or `null` otherwise.
*   **Explanation:** Queries the global `allUsers` collection to find a user by email. This collection seems to store a mapping of user UIDs to their `landlordId` and role.

---

### 28. `updateAllUsersCollection`

*   **Function Parameters:**
    *   `uid: string` - The Firebase Auth UID of the user.
    *   `email: string` - The user's email address.
    *   `landlordId: string` - The landlord ID to associate with the user.
    *   `role: 'admin' | 'user' | 'tenant' = 'admin'` - The role of the user (defaults to 'admin').
    *   `name?: string` - Optional name of the user.
*   **Function Output:** `Promise<void>` - A promise that resolves when the `allUsers` collection has been updated or the document created.
*   **Explanation:** Creates or updates a document in the global `allUsers` collection, mapping a user's UID to their `email`, `landlordId`, `role`, and optionally `name`. This is a key function for maintaining user-to-landlord associations.

---

### 29. `createUserDocument`

*   **Function Parameters:**
    *   `uid: string` - The Firebase Auth UID of the user.
    *   `email: string` - The user's email address.
    *   `landlordId: string` - The landlord ID to associate with the user.
    *   `role: 'admin' | 'user' | 'tenant' = 'admin'` - The role of the user (defaults to 'admin').
    *   `name?: string` - Optional name of the user.
*   **Function Output:** `Promise<void>` - A promise that resolves when the user document in the `users` collection and the corresponding entry in `allUsers` collection have been created or updated.
*   **Explanation:** This crucial function creates or updates a user's primary document in the `users` collection (scoped by UID) and also ensures the `allUsers` collection is updated with the user's UID, email, landlordId, role, and name. It sets `createdAt` only on initial creation.

---

### 30. `inviteUser`

*   **Function Parameters:**
    *   `landlordId: string | undefined | null` - The ID of the landlord sending the invitation.
    *   `email: string` - The email address of the invitee.
    *   `role: 'admin' | 'user' | 'tenant' = 'user'` - The role to be assigned to the invitee upon accepting (defaults to 'user').
    *   `name?: string` - Optional name of the invitee.
*   **Function Output:** `Promise<void>` - A promise that resolves when the invitation document has been created in the `invitations` collection.
*   **Explanation:** Creates an invitation document in the global `invitations` collection. The invitee's email is stored in lowercase. This allows users to be invited to a specific landlord's account with a designated role.

---

### 31. `removeUserAccess`

*   **Function Parameters:**
    *   `emailToRemove: string` - The email address of the user whose access needs to be revoked.
*   **Function Output:** `Promise<void>` - A promise that resolves when the user's documents have been removed.
*   **Explanation:** Removes a user's access by deleting their documents from both the `allUsers` and `users` collections based on their email (case-insensitive). It also attempts to delete any pending invitations for that email. This does not sign the user out from Firebase Auth but prevents them from passing the application's authorization checks.

---

### 32. `handleAuthFlow`

*   **Function Parameters:**
    *   `user: User` - The Firebase Auth `User` object obtained after successful sign-in.
*   **Function Output:** `Promise<{ landlordId: string | null, isNewUser: boolean }>` - A promise that resolves with an object containing the determined `landlordId` for the user and a boolean `isNewUser` indicating if this is their first time through this flow.
*   **Explanation:** This is a core function for handling user authentication and authorization. It checks for pending invitations, whether the user is an approved landlord (for creating new landlord accounts), or if they exist in `allUsers` or `users` collections to determine their `landlordId` and role. It then creates/updates user records accordingly and consumes invitations if used.

---

### 33. `getInvitation` (Internal Helper)

*   **Function Parameters:**
    *   `emailLower: string` - The lowercase email address to search for in invitations.
*   **Function Output:** `Promise<{id: string, landlordId: string, role: 'admin' | 'user' | 'tenant', name?: string} | null>` - A promise that resolves with the invitation data (id, landlordId, role, and optional name) if an invitation is found for the lowercase email, or `null` otherwise.
*   **Explanation:** This internal helper function is used by `handleAuthFlow` to retrieve a pending invitation from the `invitations` collection based on a lowercase email address. It returns the first matching invitation found.

---

### 34. `deleteInvitation` (Internal Helper)

*   **Function Parameters:**
    *   `invitationId: string` - The ID of the invitation document to delete.
*   **Function Output:** `Promise<void>` - A promise that resolves once the deletion attempt is complete.
*   **Explanation:** This internal helper function is used by `handleAuthFlow` to delete an invitation document from the `invitations` collection by its ID after it has been processed. It does not throw an error if deletion fails, allowing the auth flow to continue.

---

### 35. `getUserDoc`

*   **Function Parameters:**
    *   `uid: string` - The Firebase Auth UID of the user.
*   **Function Output:** `Promise<UserProfile | null>` - A promise that resolves with the user's profile data from the `users` collection if found, or `null` otherwise.
*   **Explanation:** Retrieves a user's document (profile) from the global `users` collection using their UID. The returned data includes email, landlordId, role, name, and timestamps.

---

### 36. `getAllUserDoc`

*   **Function Parameters:**
    *   `uid: string` - The Firebase Auth UID of the user.
*   **Function Output:** `Promise<AllUser | null>` - A promise that resolves with the user's data from the `allUsers` collection if found, or `null` otherwise.
*   **Explanation:** Retrieves a user's document from the global `allUsers` collection using their UID. This collection stores a mapping of UIDs to email, landlordId, role, name, and an update timestamp.

---

### 37. `compareUnitNumbers` (Internal Helper)

*   **Function Parameters:**
    *   `a: string` - The first unit number string.
    *   `b: string` - The second unit number string.
*   **Function Output:** `number` - Returns `-1` if `a` comes before `b`, `1` if `a` comes after `b`, and `0` if they are equivalent for sorting purposes.
*   **Explanation:** This internal helper function provides a more sophisticated way to compare unit numbers that may contain a mix of letters and numbers (e.g., "A101", "101A", "B20"). It parses the unit numbers into segments of letters and numbers and compares them segment by segment, treating numbers as numerically lower than letters if types differ in a segment.

---

### 38. `groupLeasesByProperty`

*   **Function Parameters:**
    *   `leases: Lease[]` - An array of all lease objects.
    *   `rentalInventory: RentalInventory[]` - An array of all rental inventory objects.
    *   `propertyGroups: PropertyGroup[]` - An array of all defined property group objects.
*   **Function Output:** `Array<{ groupName: string, units: Array<{ id: string, unitNumber: string, rent?: number, daysVacant?: number, isActive: boolean, lastUpdated: Date }>, totalUnits: number }>` - An array of objects, where each object represents a property group and contains its name, a list of its units (both occupied and vacant with relevant details like rent, days vacant, status), and the total number of units in that group.
*   **Explanation:** This complex function processes leases, rental inventory, and property groups to categorize units by property group. For each unit, it determines if it's occupied (active lease) or vacant, calculates days vacant for empty units based on lease history or inventory creation date, and includes rent for occupied units. Units within each group are sorted by status (occupied then vacant) and then by unit number using the `compareUnitNumbers` helper. Groups are sorted with 'Default' last, then by total units (descending), then by group name.

---

### 39. `isPaymentEditable`

*   **Function Parameters:**
    *   `rentalPeriod: string` - The rental period string in "YYYY-MM" format.
*   **Function Output:** `boolean` - Returns `true` if the payment record for the given rental period is still within the editable window (currently 65 days from the start of the rental period), `false` otherwise.
*   **Explanation:** Determines if a payment record associated with a specific `rentalPeriod` can still be edited. It calculates a deadline (65 days after the first day of the rental month) and compares it to the current date.

---

### 40. `getRentCollectionStatus`

*   **Function Parameters:**
    *   `activeLeases: Lease[]` - An array of currently active leases.
    *   `rentPayments: RentPayment[]` - An array of all rent payment records.
    *   `currentMonth: string` - The month to check in "YYYY-MM" format.
*   **Function Output:** `{ paid: number, unpaid: number, unpaidLeases: Lease[], totalPendingAmount: number }` - An object containing the count of paid units, count of unpaid units, an array of unpaid lease objects (sorted by rent amount descending), and the total pending rent amount for the specified month.
*   **Explanation:** Calculates the rent collection status for a given month. It identifies which active leases have corresponding rent payments for that month and which do not, then aggregates the counts and total pending amount.

---

### 41. `getLeaseExpirations`

*   **Function Parameters:**
    *   `activeLeases: Lease[]` - An array of currently active leases.
    *   `daysThreshold: number = 30` - The number of days to look ahead for leases that are expiring (defaults to 30 days).
*   **Function Output:** `{ leases: Array<Lease & { daysLeft: number }>, totalLeaseValue: number, count: number }` - An object containing an array of active leases that are expiring within the `daysThreshold` (each augmented with a `daysLeft` property), the total rent value of these expiring leases, and the count of such leases.
*   **Explanation:** Identifies active leases that are set to expire within a specified number of days (`daysThreshold`). It calculates the number of days left for each lease and returns a list of these leases, their total rental value, and their count, sorted by days left (ascending).

---
