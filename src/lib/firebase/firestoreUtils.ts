// src/lib/firebase/firestoreUtils.ts

import { db } from './firebase'; // Assuming you have firebase.ts to initialize Firebase
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, getDocs, query, where, orderBy, DocumentData, QuerySnapshot, Timestamp } from 'firebase/firestore';
import { Tenant, Unit, Lease, RentPayment, RentalInventory } from '@/types'; // Import our TypeScript interfaces
import logger from '@/lib/logger'; // Assuming you have a logger utility

// ---------------------- Tenant Collection Utility Functions ----------------------

/**
 * Adds a new tenant to the 'tenants' collection in Firestore.
 * @param {Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>} tenantData - Tenant data (excluding ID and timestamps).
 * @returns {Promise<string>} The ID of the newly created tenant document.
 * @throws {Error} If there is an error adding the tenant.
 */
export const addTenant = async (tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    logger.info("firestoreUtils: Adding tenant...");
    const tenantsCollection = collection(db, 'tenants');
    const docRef = await addDoc(tenantsCollection, {
      ...tenantData,
      createdAt: new Date(), // Add createdAt timestamp
      updatedAt: new Date(), // Add updatedAt timestamp
    });
    logger.info(`firestoreUtils: Tenant added successfully with ID: ${docRef.id}`);
    return docRef.id; // Return the auto-generated document ID
  } catch (error: any) {
    logger.error(`firestoreUtils: Error adding tenant: ${error.message}`);
    throw new Error('Failed to add tenant.'); // Re-throw error for component-level handling
  }
};

/**
 * Retrieves a tenant document from Firestore by ID.
 * @param {string} tenantId - The ID of the tenant document to retrieve.
 * @returns {Promise<Tenant | undefined>} The tenant data, or undefined if not found.
 * @throws {Error} If there is an error retrieving the tenant.
 */
export const getTenant = async (tenantId: string): Promise<Tenant | undefined> => {
  try {
    logger.info(`firestoreUtils: Retrieving tenant with ID: ${tenantId}`);
    const tenantDocRef = doc(db, 'tenants', tenantId);
    const docSnap = await getDoc(tenantDocRef);

    if (docSnap.exists()) {
      const tenantData = docSnap.data() as Tenant; // Type cast to Tenant interface
      logger.info(`firestoreUtils: Tenant ${tenantId} retrieved successfully.`);
      return { id: docSnap.id, ...tenantData } as Tenant; // Include the document ID in the returned object
    } else {
      logger.info(`firestoreUtils: Tenant ${tenantId} not found.`);
      return undefined; // Tenant not found
    }
  } catch (error: any) {
    logger.error(`firestoreUtils: Error retrieving tenant ${tenantId}: ${error.message}`);
    throw new Error('Failed to retrieve tenant.');
  }
};

/**
 * Retrieves all documents from a collection with a timeout.
 * @param {string} collectionName - The name of the collection.
 * @param {number} timeoutMs - The timeout in milliseconds (default: 10000ms).
 * @returns {Promise<QuerySnapshot<DocumentData>>} The query snapshot.
 * @throws {Error} If there is an error retrieving the documents or if the request times out.
 */
export const getDocumentsWithTimeout = async (
  collectionName: string,
  timeoutMs: number = 10000
): Promise<QuerySnapshot<DocumentData>> => {
  logger.info(`firestoreUtils: Retrieving all documents from ${collectionName} with timeout ${timeoutMs}ms`);
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Request to get ${collectionName} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  try {
    const queryPromise = getDocs(collection(db, collectionName));
    const result = await Promise.race([queryPromise, timeoutPromise]) as QuerySnapshot<DocumentData>;
    logger.info(`firestoreUtils: Successfully retrieved ${result.docs.length} documents from ${collectionName}`);
    return result;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error retrieving documents from ${collectionName}: ${error.message}`);
    throw error;
  }
};


// ---------------------- Rental Inventory Collection Utility Functions ----------------------

/**
 * Adds a new rental inventory item to the 'rental-inventory' collection in Firestore.
 * @param {Omit<RentalInventory, 'id' | 'createdAt' | 'updatedAt'>} inventoryData - Rental inventory data (excluding ID and timestamps).
 * @returns {Promise<string>} The ID of the newly created inventory document.
 * @throws {Error} If there is an error adding the inventory item.
 */
export const addRentalInventory = async (inventoryData: Omit<RentalInventory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    logger.info("firestoreUtils: Adding rental inventory...");
    
    // Check if a unit with the same unitNumber already exists
    const existingUnit = await checkUnitNumberExists(inventoryData.unitNumber);
    if (existingUnit) {
      throw new Error('Unit number already exists. Please use a unique unit number.');
    }
    
    const rentalInventoryCollection = collection(db, 'rental-inventory');
    const docRef = await addDoc(rentalInventoryCollection, {
      ...inventoryData,
      createdAt: new Date(), // Add createdAt timestamp
      updatedAt: new Date(), // Add updatedAt timestamp
    });
    
    logger.info(`firestoreUtils: Rental inventory added successfully with ID: ${docRef.id}`);
    return docRef.id; // Return the auto-generated document ID
  } catch (error: any) {
    logger.error(`firestoreUtils: Error adding rental inventory: ${error.message}`);
    throw new Error(error.message || 'Failed to add rental inventory.'); // Re-throw error for component-level handling
  }
};

/**
 * Checks if a unit with the given unit number already exists.
 * @param {string} unitNumber - The unit number to check.
 * @returns {Promise<boolean>} True if a unit with the unit number exists, false otherwise.
 */
export const checkUnitNumberExists = async (unitNumber: string): Promise<boolean> => {
  try {
    logger.info(`firestoreUtils: Checking if unit number ${unitNumber} exists...`);
    const rentalInventoryCollection = collection(db, 'rental-inventory');
    const q = query(rentalInventoryCollection, where('unitNumber', '==', unitNumber));
    const querySnapshot = await getDocs(q);
    
    const exists = !querySnapshot.empty;
    logger.info(`firestoreUtils: Unit number ${unitNumber} exists: ${exists}`);
    return exists;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error checking if unit number ${unitNumber} exists: ${error.message}`);
    throw new Error('Failed to check if unit number exists.');
  }
};

/**
 * Retrieves all rental inventory items from the 'rental-inventory' collection.
 * @returns {Promise<RentalInventory[]>} Array of rental inventory items.
 * @throws {Error} If there is an error retrieving the inventory.
 */
export const getAllRentalInventory = async (): Promise<RentalInventory[]> => {
  try {
    logger.info("firestoreUtils: Retrieving all rental inventory...");
    console.log("Attempting to get rental inventory data");
    
    // Try different collection name variants
    let querySnapshot;
    const collectionNames = ['rental-inventory', 'rentalInventory', 'rentalinventory'];
    let foundCollectionName = '';
    
    for (const name of collectionNames) {
      console.log(`Trying collection name: '${name}'`);
      const rentalInventoryCollection = collection(db, name);
      
      try {
        querySnapshot = await getDocs(rentalInventoryCollection);
        if (querySnapshot.docs.length > 0) {
          console.log(`Found data in collection '${name}'`);
          foundCollectionName = name;
          break;
        } else {
          console.log(`No documents found in collection '${name}'`);
        }
      } catch (err) {
        console.log(`Error accessing collection '${name}':`, err);
      }
    }
    
    if (!querySnapshot || !foundCollectionName) {
      console.log("Could not find any rental inventory data in any collections");
      return [];
    }
    
    const inventoryItems: RentalInventory[] = [];
    console.log(`Found ${querySnapshot.docs.length} rental inventory documents in collection '${foundCollectionName}'`);
    
    querySnapshot.forEach((doc) => {
      console.log(`Processing doc ${doc.id}:`, doc.data());
      const data = doc.data();
      
      // Ensure data has the required fields
      const item: RentalInventory = {
        id: doc.id,
        unitNumber: data.unitNumber || '[Unknown]',
        propertyType: data.propertyType || 'Residential',
        ownerDetails: data.ownerDetails || '',
        bankDetails: data.bankDetails,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
      
      inventoryItems.push(item);
    });
    
    logger.info(`firestoreUtils: Retrieved ${inventoryItems.length} rental inventory items.`);
    console.log("Inventory items:", inventoryItems);
    return inventoryItems;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error retrieving rental inventory: ${error.message}`);
    console.error("Error getting rental inventory:", error.message);
    return []; // Return empty array instead of throwing to prevent app crashing
  }
};

/**
 * Updates a rental inventory item in the 'rental-inventory' collection.
 * @param {string} inventoryId - The ID of the inventory item to update.
 * @param {Partial<Omit<RentalInventory, 'id' | 'createdAt' | 'updatedAt'>>} updateData - The data to update.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 * @throws {Error} If there is an error updating the inventory item.
 */
export const updateRentalInventory = async (
  inventoryId: string,
  updateData: Partial<Omit<RentalInventory, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    logger.info(`firestoreUtils: Updating rental inventory ${inventoryId}...`);
    
    // If unit number is being updated, check if new unit number already exists
    if (updateData.unitNumber) {
      const inventoryDocRef = doc(db, 'rental-inventory', inventoryId);
      const docSnap = await getDoc(inventoryDocRef);
      
      if (docSnap.exists()) {
        const currentData = docSnap.data() as RentalInventory;
        
        // Only check if unit number is actually changing
        if (currentData.unitNumber !== updateData.unitNumber) {
          const exists = await checkUnitNumberExists(updateData.unitNumber);
          if (exists) {
            throw new Error('Unit number already exists. Please use a unique unit number.');
          }
        }
      }
    }
    
    const inventoryDocRef = doc(db, 'rental-inventory', inventoryId);
    await updateDoc(inventoryDocRef, {
      ...updateData,
      updatedAt: new Date(), // Update the updatedAt timestamp
    });
    
    logger.info(`firestoreUtils: Rental inventory ${inventoryId} updated successfully.`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error updating rental inventory ${inventoryId}: ${error.message}`);
    throw new Error(error.message || 'Failed to update rental inventory.');
  }
};

/**
 * Deletes a rental inventory item from the 'rental-inventory' collection.
 * @param {string} inventoryId - The ID of the inventory item to delete.
 * @returns {Promise<void>} A promise that resolves when the deletion is complete.
 * @throws {Error} If there is an error deleting the inventory item.
 */
export const deleteRentalInventory = async (inventoryId: string): Promise<void> => {
  try {
    logger.info(`firestoreUtils: Deleting rental inventory ${inventoryId}...`);
    const inventoryDocRef = doc(db, 'rental-inventory', inventoryId);
    await deleteDoc(inventoryDocRef);
    logger.info(`firestoreUtils: Rental inventory ${inventoryId} deleted successfully.`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error deleting rental inventory ${inventoryId}: ${error.message}`);
    throw new Error('Failed to delete rental inventory.');
  }
};

// ---------------------- Lease Collection Utility Functions ----------------------

/**
 * Adds a new lease to the 'leases' collection in Firestore.
 * @param {Omit<Lease, 'id' | 'createdAt' | 'updatedAt'>} leaseData - Lease data (excluding ID and timestamps).
 * @returns {Promise<string>} The ID of the newly created lease document.
 * @throws {Error} If there is an error adding the lease or if there is already an active lease for the unit.
 */
export const addLease = async (leaseData: Omit<Lease, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    logger.info("firestoreUtils: Adding lease...");
    console.log("Adding new lease with data:", leaseData);
    
    if (!leaseData.unitId) {
      throw new Error('Unit ID is required');
    }
    
    // Check if an active lease already exists for this unit
    if (leaseData.isActive) {
      const existingActiveLease = await checkActiveLeaseExists(leaseData.unitId);
      if (existingActiveLease) {
        throw new Error(`An active lease already exists for unit ${leaseData.unitId}. Please deactivate it first.`);
      }
    }
    
    // Verify that the unitId exists in the rental inventory
    const inventoryRef = doc(db, 'rental-inventory', leaseData.unitId);
    const inventoryDoc = await getDoc(inventoryRef);
    
    if (!inventoryDoc.exists()) {
      logger.error(`firestoreUtils: Unit ID ${leaseData.unitId} not found in rental inventory`);
      console.warn(`Unit ID ${leaseData.unitId} not found in rental inventory. Will create lease anyway.`);
    }
    
    // Ensure date fields are properly formatted as Dates, not strings
    const processedLeaseData = {
      ...leaseData,
      leaseStartDate: leaseData.leaseStartDate instanceof Date 
        ? leaseData.leaseStartDate 
        : new Date(leaseData.leaseStartDate),
      leaseEndDate: leaseData.leaseEndDate instanceof Date 
        ? leaseData.leaseEndDate 
        : new Date(leaseData.leaseEndDate),
      rentAmount: Number(leaseData.rentAmount),
      securityDeposit: Number(leaseData.securityDeposit),
    };
    
    const leasesCollection = collection(db, 'leases');
    const docRef = await addDoc(leasesCollection, {
      ...processedLeaseData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    logger.info(`firestoreUtils: Lease added successfully with ID: ${docRef.id}`);
    console.log(`Successfully added lease with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error adding lease: ${error.message}`);
    console.error("Error adding lease:", error);
    throw new Error(error.message || 'Failed to add lease.');
  }
};

/**
 * Checks if an active lease exists for a specific unit.
 * @param {string} unitId - The ID of the unit to check.
 * @returns {Promise<boolean>} True if an active lease exists, false otherwise.
 */
export const checkActiveLeaseExists = async (unitId: string): Promise<boolean> => {
  try {
    logger.info(`firestoreUtils: Checking if active lease exists for unit ${unitId}...`);
    const leasesCollection = collection(db, 'leases');
    const q = query(
      leasesCollection,
      where('unitId', '==', unitId),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    const exists = !querySnapshot.empty;
    logger.info(`firestoreUtils: Active lease for unit ${unitId} exists: ${exists}`);
    return exists;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error checking active lease for unit ${unitId}: ${error.message}`);
    throw new Error('Failed to check if active lease exists.');
  }
};

/**
 * Gets an existing active lease for a specific unit.
 * @param {string} unitId - The ID of the unit to check.
 * @returns {Promise<Lease | null>} The active lease if it exists, null otherwise.
 */
export const getActiveLeaseForUnit = async (unitId: string): Promise<Lease | null> => {
  try {
    logger.info(`firestoreUtils: Getting active lease for unit ${unitId}...`);
    const leasesCollection = collection(db, 'leases');
    const q = query(
      leasesCollection,
      where('unitId', '==', unitId),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      logger.info(`firestoreUtils: No active lease found for unit ${unitId}.`);
      return null;
    }
    
    // There should only be one active lease per unit
    const leaseDoc = querySnapshot.docs[0];
    const data = leaseDoc.data();
    
    // Convert Firestore Timestamps to JavaScript Date objects
    const leaseData: Lease = {
      id: leaseDoc.id,
      ...data,
      leaseStartDate: data.leaseStartDate instanceof Timestamp 
        ? data.leaseStartDate.toDate() 
        : new Date(data.leaseStartDate),
      leaseEndDate: data.leaseEndDate instanceof Timestamp 
        ? data.leaseEndDate.toDate() 
        : new Date(data.leaseEndDate),
      createdAt: data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : new Date(data.createdAt),
      updatedAt: data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate() 
        : new Date(data.updatedAt)
    } as Lease;
    
    logger.info(`firestoreUtils: Active lease found for unit ${unitId}.`);
    return leaseData;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error getting active lease for unit ${unitId}: ${error.message}`);
    throw new Error('Failed to get active lease.');
  }
};

/**
 * Retrieves all leases from the 'leases' collection.
 * @returns {Promise<Lease[]>} Array of lease items.
 * @throws {Error} If there is an error retrieving the leases.
 */
export const getAllLeases = async (): Promise<Lease[]> => {
  try {
    logger.info("firestoreUtils: Retrieving all leases...");
    console.log("Attempting to get lease data from 'leases' collection...");
    
    const leasesCollection = collection(db, 'leases');
    
    // Sort by isActive (active leases first) and then by leaseStartDate (newer first)
    const q = query(
      leasesCollection,
      orderBy('isActive', 'desc'),
      orderBy('leaseStartDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.docs.length} lease documents in 'leases' collection`);
    
    const leases: Lease[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Processing lease doc ${doc.id}:`, data);
      
      try {
        // Handle potential missing or invalid data with defaults
        const lease: Lease = {
          id: doc.id,
          unitId: data.unitId || '',
          tenantName: data.tenantName || 'Unknown Tenant',
          countryCode: data.countryCode || '',
          phoneNumber: data.phoneNumber || '',
          email: data.email || '',
          adhaarNumber: data.adhaarNumber || '',
          panNumber: data.panNumber || '',
          employerName: data.employerName || '',
          permanentAddress: data.permanentAddress || '',
          // Convert Firestore Timestamps to JavaScript Date objects with error handling
          leaseStartDate: data.leaseStartDate instanceof Timestamp 
            ? data.leaseStartDate.toDate() 
            : new Date(data.leaseStartDate || Date.now()),
          leaseEndDate: data.leaseEndDate instanceof Timestamp 
            ? data.leaseEndDate.toDate() 
            : new Date(data.leaseEndDate || Date.now()),
          rentAmount: Number(data.rentAmount) || 0,
          securityDeposit: Number(data.securityDeposit) || 0,
          depositMethod: data.depositMethod || 'Unknown',
          additionalComments: data.additionalComments || '',
          isActive: Boolean(data.isActive),
          createdAt: data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate() 
            : new Date(data.createdAt || Date.now()),
          updatedAt: data.updatedAt instanceof Timestamp 
            ? data.updatedAt.toDate() 
            : new Date(data.updatedAt || Date.now())
        };
        
        leases.push(lease);
        console.log(`Successfully processed lease ${doc.id}`);
      } catch (docError) {
        console.error(`Error processing lease doc ${doc.id}:`, docError);
        // Continue with next doc instead of failing the entire function
      }
    });
    
    logger.info(`firestoreUtils: Retrieved ${leases.length} leases.`);
    console.log("Processed leases:", leases);
    return leases;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error retrieving leases: ${error.message}`);
    console.error("Error getting leases:", error);
    // Return empty array instead of throwing to prevent app from crashing
    return [];
  }
};

/**
 * Updates a lease in the 'leases' collection.
 * @param {string} leaseId - The ID of the lease to update.
 * @param {Partial<Omit<Lease, 'id' | 'createdAt' | 'updatedAt'>>} updateData - The data to update.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 * @throws {Error} If there is an error updating the lease or if trying to activate a lease for a unit that already has an active lease.
 */
export const updateLease = async (
  leaseId: string,
  updateData: Partial<Omit<Lease, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    logger.info(`firestoreUtils: Updating lease ${leaseId}...`);
    
    // Check if we're activating this lease
    if (updateData.isActive === true) {
      // Get the current lease data to get unitId
      const leaseDocRef = doc(db, 'leases', leaseId);
      const docSnap = await getDoc(leaseDocRef);
      
      if (docSnap.exists()) {
        const currentLeaseData = docSnap.data() as Lease;
        const unitId = updateData.unitId || currentLeaseData.unitId;
        
        // Check if the lease is already active (no need to check others in this case)
        if (!currentLeaseData.isActive) {
          // Only check for other active leases if this lease is being activated
          const otherActiveLeaseQuery = query(
            collection(db, 'leases'),
            where('unitId', '==', unitId),
            where('isActive', '==', true)
          );
          const otherActiveLeasesSnapshot = await getDocs(otherActiveLeaseQuery);
          
          // Filter out this lease's ID in case it's already in the query results
          const otherActiveLeases = otherActiveLeasesSnapshot.docs.filter(
            doc => doc.id !== leaseId
          );
          
          if (otherActiveLeases.length > 0) {
            // Get the conflicting lease details for the error message
            const conflictingLease = otherActiveLeases[0].data() as Lease;
            throw new Error(`Cannot activate this lease. An active lease for tenant ${conflictingLease.tenantName} already exists for this unit. Please deactivate it first.`);
          }
        }
      }
    }
    
    // Proceed with the update
    const leaseDocRef = doc(db, 'leases', leaseId);
    await updateDoc(leaseDocRef, {
      ...updateData,
      updatedAt: new Date(),
    });
    
    logger.info(`firestoreUtils: Lease ${leaseId} updated successfully.`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error updating lease ${leaseId}: ${error.message}`);
    throw new Error(error.message || 'Failed to update lease.');
  }
};

/**
 * Deletes a lease from the 'leases' collection.
 * @param {string} leaseId - The ID of the lease to delete.
 * @returns {Promise<void>} A promise that resolves when the deletion is complete.
 * @throws {Error} If there is an error deleting the lease.
 */
export const deleteLease = async (leaseId: string): Promise<void> => {
  try {
    logger.info(`firestoreUtils: Deleting lease ${leaseId}...`);
    const leaseDocRef = doc(db, 'leases', leaseId);
    await deleteDoc(leaseDocRef);
    logger.info(`firestoreUtils: Lease ${leaseId} deleted successfully.`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error deleting lease ${leaseId}: ${error.message}`);
    throw new Error('Failed to delete lease.');
  }
};

// Add more Firestore utility functions here for Units, Leases, RentPayments as we progress
// (e.g., getUnit, addLease, recordRentPayment, updateTenant, deleteTenant, etc.)


// ---------------------- Generic Firestore Helpers (Optional for now, can add later) ----------------------
// You can add generic helper functions here if needed, like a function to convert Firestore Timestamps to Date objects, etc.