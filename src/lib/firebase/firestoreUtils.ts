// src/lib/firebase/firestoreUtils.ts

import { db } from './firebase'; // Assuming you have firebase.ts to initialize Firebase
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, getDocs, query, where, orderBy, DocumentData, QuerySnapshot, Timestamp, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Tenant, Lease, RentPayment, RentalInventory, PropertyGroup } from '@/types'; // Import our TypeScript interfaces
import logger from '@/lib/logger'; // Assuming you have a logger utility

// Helper function to validate landlordId
const validateLandlordId = (landlordId: string | undefined | null): string => {
  if (!landlordId) {
    const error = new Error('LandlordId is missing. Please ensure you are properly authenticated.');
    logger.error('firestoreUtils: LandlordId validation failed:', error);
    throw error;
  }
  return landlordId;
};

// ---------------------- Tenant Collection Utility Functions ----------------------

/**
 * Adds a new tenant to the 'tenants' collection in Firestore.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>} tenantData - Tenant data (excluding ID and timestamps).
 * @returns {Promise<string>} The ID of the newly created tenant document.
 * @throws {Error} If landlordId is missing or if there is an error adding the tenant.
 */
export const addTenant = async (
  landlordId: string | undefined | null,
  tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info("firestoreUtils: Adding tenant...");
    
    const tenantsCollection = collection(db, `landlords/${validLandlordId}/tenants`);
    const docRef = await addDoc(tenantsCollection, {
      ...tenantData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      landlordId: validLandlordId, // Add landlordId to the document for additional security
    });
    
    logger.info(`firestoreUtils: Tenant added successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error adding tenant: ${error.message}`);
    throw new Error(error.message || 'Failed to add tenant.');
  }
};

/**
 * Retrieves a tenant document from Firestore by ID.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {string} tenantId - The ID of the tenant document to retrieve.
 * @returns {Promise<Tenant | undefined>} The tenant data, or undefined if not found.
 * @throws {Error} If landlordId is missing or if there is an error retrieving the tenant.
 */
export const getTenant = async (
  landlordId: string | undefined | null,
  tenantId: string
): Promise<Tenant | undefined> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info(`firestoreUtils: Retrieving tenant with ID: ${tenantId}`);
    
    const tenantDocRef = doc(db, `landlords/${validLandlordId}/tenants`, tenantId);
    const docSnap = await getDoc(tenantDocRef);

    if (docSnap.exists()) {
      const tenantData = docSnap.data();
      logger.info(`firestoreUtils: Tenant ${tenantId} retrieved successfully.`);
      return {
        id: docSnap.id,
        ...tenantData,
        createdAt: tenantData.createdAt?.toDate(),
        updatedAt: tenantData.updatedAt?.toDate(),
      } as Tenant;
    } else {
      logger.info(`firestoreUtils: Tenant ${tenantId} not found.`);
      return undefined;
    }
  } catch (error: any) {
    logger.error(`firestoreUtils: Error retrieving tenant ${tenantId}: ${error.message}`);
    throw new Error(error.message || 'Failed to retrieve tenant.');
  }
};

/**
 * Retrieves all documents from a collection with a timeout.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {string} collectionName - The name of the collection.
 * @param {number} timeoutMs - The timeout in milliseconds (default: 10000ms).
 * @returns {Promise<QuerySnapshot<DocumentData>>} The query snapshot.
 * @throws {Error} If landlordId is missing or if there is an error retrieving the documents.
 */
export const getDocumentsWithTimeout = async (
  landlordId: string | undefined | null,
  collectionName: string,
  timeoutMs: number = 10000
): Promise<QuerySnapshot<DocumentData>> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info(`firestoreUtils: Retrieving all documents from ${collectionName} with timeout ${timeoutMs}ms`);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Request to get ${collectionName} timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    const queryPromise = getDocs(collection(db, `landlords/${validLandlordId}/${collectionName}`));
    const result = await Promise.race([queryPromise, timeoutPromise]) as QuerySnapshot<DocumentData>;
    
    logger.info(`firestoreUtils: Successfully retrieved ${result.docs.length} documents from ${collectionName}`);
    return result;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error retrieving documents from ${collectionName}: ${error.message}`);
    throw new Error(error.message || `Failed to retrieve documents from ${collectionName}`);
  }
};


// ---------------------- Rental Inventory Collection Utility Functions ----------------------

/**
 * Adds a new rental inventory item to the 'rental-inventory' collection in Firestore.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {Omit<RentalInventory, 'id' | 'createdAt' | 'updatedAt'>} inventoryData - Rental inventory data.
 * @returns {Promise<string>} The ID of the newly created inventory document.
 * @throws {Error} If landlordId is missing or if there is an error adding the inventory item.
 */
export const addRentalInventory = async (
  landlordId: string | undefined | null,
  inventoryData: Omit<RentalInventory, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info("firestoreUtils: Adding rental inventory...");
    
    // Check if a unit with the same unitNumber already exists
    const existingUnit = await checkUnitNumberExists(validLandlordId, inventoryData.unitNumber);
    if (existingUnit) {
      throw new Error('Unit number already exists. Please use a unique unit number.');
    }
    
    const rentalInventoryCollection = collection(db, `landlords/${validLandlordId}/rental-inventory`);
    const docRef = await addDoc(rentalInventoryCollection, {
      ...inventoryData,
      landlordId: validLandlordId, // Add landlordId to the document for additional security
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    logger.info(`firestoreUtils: Rental inventory added successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error adding rental inventory: ${error.message}`);
    throw new Error(error.message || 'Failed to add rental inventory.');
  }
};

/**
 * Checks if a unit with the given unit number already exists.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {string} unitNumber - The unit number to check.
 * @returns {Promise<boolean>} True if a unit with the unit number exists, false otherwise.
 * @throws {Error} If landlordId is missing or if there is an error checking the unit number.
 */
export const checkUnitNumberExists = async (
  landlordId: string | undefined | null,
  unitNumber: string
): Promise<boolean> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info(`firestoreUtils: Checking if unit number ${unitNumber} exists...`);
    
    const rentalInventoryCollection = collection(db, `landlords/${validLandlordId}/rental-inventory`);
    const q = query(rentalInventoryCollection, where('unitNumber', '==', unitNumber));
    const querySnapshot = await getDocs(q);
    
    const exists = !querySnapshot.empty;
    logger.info(`firestoreUtils: Unit number ${unitNumber} exists: ${exists}`);
    return exists;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error checking if unit number ${unitNumber} exists: ${error.message}`);
    throw new Error(error.message || 'Failed to check if unit number exists.');
  }
};

/**
 * Retrieves all rental inventory items from the 'rental-inventory' collection.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @returns {Promise<RentalInventory[]>} Array of rental inventory items.
 * @throws {Error} If landlordId is missing or if there is an error retrieving the inventory.
 */
export const getAllRentalInventory = async (
  landlordId: string | undefined | null
): Promise<RentalInventory[]> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info("firestoreUtils: Retrieving all rental inventory...");
    
    // Use the new path structure with validated landlordId
    const rentalInventoryCollection = collection(db, `landlords/${validLandlordId}/rental-inventory`);
    const querySnapshot = await getDocs(rentalInventoryCollection);
    
    if (querySnapshot.empty) {
      logger.info(`No documents found in rental-inventory collection for landlord ${validLandlordId}`);
      return [];
    }
    
    const inventoryItems: RentalInventory[] = [];
    logger.info(`Found ${querySnapshot.docs.length} rental inventory documents`);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Ensure data has the required fields and preserve the groupName
      const item: RentalInventory = {
        id: doc.id,
        unitNumber: data.unitNumber || '[Unknown]',
        propertyType: data.propertyType || 'Residential',
        ownerDetails: data.ownerDetails || '',
        bankDetails: data.bankDetails,
        groupName: data.groupName, // Keep the original groupName
        numberOfBedrooms: data.numberOfBedrooms !== undefined ? data.numberOfBedrooms : null,
        squareFeetArea: data.squareFeetArea !== undefined ? data.squareFeetArea : null,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      };
      
      inventoryItems.push(item);
    });
    
    logger.info(`firestoreUtils: Retrieved ${inventoryItems.length} rental inventory items.`);
    return inventoryItems;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error retrieving rental inventory: ${error.message}`);
    throw new Error(error.message || 'Failed to retrieve rental inventory.');
  }
};

/**
 * Updates a rental inventory item in the 'rental-inventory' collection.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {string} inventoryId - The ID of the inventory item to update.
 * @param {Partial<Omit<RentalInventory, 'id' | 'createdAt' | 'updatedAt'>>} updateData - The data to update.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 * @throws {Error} If landlordId is missing or if there is an error updating the inventory item.
 */
export const updateRentalInventory = async (
  landlordId: string | undefined | null,
  inventoryId: string,
  updateData: Partial<Omit<RentalInventory, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info(`firestoreUtils: Updating rental inventory ${inventoryId}...`);
    
    // If unit number is being updated, check if new unit number already exists
    if (updateData.unitNumber) {
      const inventoryDocRef = doc(db, `landlords/${validLandlordId}/rental-inventory`, inventoryId);
      const docSnap = await getDoc(inventoryDocRef);
      
      if (docSnap.exists()) {
        const currentData = docSnap.data() as RentalInventory;
        
        // Only check if unit number is actually changing
        if (currentData.unitNumber !== updateData.unitNumber) {
          const exists = await checkUnitNumberExists(validLandlordId, updateData.unitNumber);
          if (exists) {
            throw new Error('Unit number already exists. Please use a unique unit number.');
          }
        }
      }
    }
    
    const inventoryDocRef = doc(db, `landlords/${validLandlordId}/rental-inventory`, inventoryId);
    await updateDoc(inventoryDocRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
    
    logger.info(`firestoreUtils: Rental inventory ${inventoryId} updated successfully.`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error updating rental inventory ${inventoryId}: ${error.message}`);
    throw new Error(error.message || 'Failed to update rental inventory.');
  }
};

/**
 * Deletes a rental inventory item from the 'rental-inventory' collection.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {string} inventoryId - The ID of the inventory item to delete.
 * @returns {Promise<void>} A promise that resolves when the deletion is complete.
 * @throws {Error} If landlordId is missing or if there is an error deleting the inventory item.
 */
export const deleteRentalInventory = async (
  landlordId: string | undefined | null,
  inventoryId: string
): Promise<void> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info(`firestoreUtils: Deleting rental inventory ${inventoryId}...`);
    
    const inventoryDocRef = doc(db, `landlords/${validLandlordId}/rental-inventory`, inventoryId);
    await deleteDoc(inventoryDocRef);
    
    logger.info(`firestoreUtils: Rental inventory ${inventoryId} deleted successfully.`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error deleting rental inventory ${inventoryId}: ${error.message}`);
    throw new Error(error.message || 'Failed to delete rental inventory.');
  }
};

// ---------------------- Lease Collection Utility Functions ----------------------

/**
 * Adds a new lease to the 'leases' collection in Firestore.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {Omit<Lease, 'id' | 'createdAt' | 'updatedAt'>} leaseData - Lease data (excluding ID and timestamps).
 * @returns {Promise<string>} The ID of the newly created lease document.
 * @throws {Error} If landlordId is missing or if there is an error adding the lease.
 */
export const addLease = async (
  landlordId: string | undefined | null,
  leaseData: Omit<Lease, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info("firestoreUtils: Adding lease...");
    
    if (!leaseData.unitId) {
      throw new Error('Unit ID is required');
    }
    
    // Check if unitNumber is missing but unitId is present
    if (!leaseData.unitNumber && leaseData.unitId) {
      // Try to get the unit number from rental inventory
      const inventoryRef = doc(db, `landlords/${validLandlordId}/rental-inventory`, leaseData.unitId);
      const inventoryDoc = await getDoc(inventoryRef);
      
      if (inventoryDoc.exists()) {
        const inventoryData = inventoryDoc.data() as RentalInventory;
        leaseData.unitNumber = inventoryData.unitNumber;
      }
    }
    
    // Check if an active lease already exists for this unit
    if (leaseData.isActive) {
      const existingActiveLease = await checkActiveLeaseExists(validLandlordId, leaseData.unitId);
      if (existingActiveLease) {
        throw new Error(`An active lease already exists for unit ${leaseData.unitId}. Please deactivate it first.`);
      }
    }
    
    // Verify that the unitId exists in the rental inventory
    const inventoryRef = doc(db, `landlords/${validLandlordId}/rental-inventory`, leaseData.unitId);
    const inventoryDoc = await getDoc(inventoryRef);
    
    if (!inventoryDoc.exists()) {
      logger.error(`firestoreUtils: Unit ID ${leaseData.unitId} not found in rental inventory`);
      throw new Error(`Unit ID ${leaseData.unitId} not found in rental inventory. Cannot create lease for non-existent unit.`);
    }
    
    // Ensure date fields are properly formatted as Dates
    const processedLeaseData = {
      ...leaseData,
      landlordId: validLandlordId, // Add landlordId to the document for additional security
      unitNumber: leaseData.unitNumber || "Unknown",
      leaseStartDate: leaseData.leaseStartDate instanceof Date 
        ? leaseData.leaseStartDate 
        : new Date(leaseData.leaseStartDate),
      leaseEndDate: leaseData.leaseEndDate instanceof Date 
        ? leaseData.leaseEndDate 
        : new Date(leaseData.leaseEndDate),
      rentAmount: Number(leaseData.rentAmount),
      securityDeposit: Number(leaseData.securityDeposit),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const leasesCollection = collection(db, `landlords/${validLandlordId}/leases`);
    const docRef = await addDoc(leasesCollection, processedLeaseData);
    
    logger.info(`firestoreUtils: Lease added successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error adding lease: ${error.message}`);
    throw new Error(error.message || 'Failed to add lease.');
  }
};

/**
 * Checks if an active lease exists for a specific unit.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {string} unitId - The ID of the unit to check.
 * @returns {Promise<boolean>} True if an active lease exists, false otherwise.
 * @throws {Error} If landlordId is missing or if there is an error checking the lease.
 */
export const checkActiveLeaseExists = async (
  landlordId: string | undefined | null,
  unitId: string
): Promise<boolean> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info(`firestoreUtils: Checking if active lease exists for unit ${unitId}...`);
    
    const leasesCollection = collection(db, `landlords/${validLandlordId}/leases`);
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
    throw new Error(error.message || 'Failed to check if active lease exists.');
  }
};

/**
 * Gets an existing active lease for a specific unit.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {string} unitId - The ID of the unit to check.
 * @returns {Promise<Lease | null>} The active lease if it exists, null otherwise.
 * @throws {Error} If landlordId is missing or if there is an error retrieving the lease.
 */
export const getActiveLeaseForUnit = async (
  landlordId: string | undefined | null,
  unitId: string
): Promise<Lease | null> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info(`firestoreUtils: Getting active lease for unit ${unitId}...`);
    
    const leasesCollection = collection(db, `landlords/${validLandlordId}/leases`);
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
      landlordId: validLandlordId,
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
    throw new Error(error.message || 'Failed to get active lease.');
  }
};

/**
 * Retrieves all leases from the 'leases' collection.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @returns {Promise<Lease[]>} Array of lease items.
 * @throws {Error} If landlordId is missing or if there is an error retrieving the leases.
 */
export const getAllLeases = async (
  landlordId: string | undefined | null
): Promise<Lease[]> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info("firestoreUtils: Retrieving all leases...");
    
    const leasesCollection = collection(db, `landlords/${validLandlordId}/leases`);
    
    // Sort by isActive (active leases first) and then by leaseStartDate (newer first)
    const q = query(
      leasesCollection,
      orderBy('isActive', 'desc'),
      orderBy('leaseStartDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const leases: Lease[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      try {
        // Handle potential missing or invalid data with defaults
        const lease: Lease = {
          id: doc.id,
          landlordId: validLandlordId, // Add the landlordId from the validated parameter
          unitId: data.unitId || '',
          unitNumber: data.unitNumber || '',
          tenantName: data.tenantName || 'Unknown Tenant',
          countryCode: data.countryCode || '',
          phoneNumber: data.phoneNumber || '',
          email: data.email || '',
          adhaarNumber: data.adhaarNumber || '',
          panNumber: data.panNumber || '',
          employerName: data.employerName || '',
          permanentAddress: data.permanentAddress || '',
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
        logger.info(`Successfully processed lease ${doc.id}`);
      } catch (docError: any) {
        logger.error(`Error processing lease doc ${doc.id}: ${docError.message}`);
        // Continue with next doc instead of failing the entire function
      }
    });
    
    logger.info(`firestoreUtils: Retrieved ${leases.length} leases.`);
    return leases;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error retrieving leases: ${error.message}`);
    throw new Error(error.message || 'Failed to retrieve leases.');
  }
};

/**
 * Updates a lease in the 'leases' collection.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {string} leaseId - The ID of the lease to update.
 * @param {Partial<Omit<Lease, 'id' | 'createdAt' | 'updatedAt'>>} updateData - The data to update.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 * @throws {Error} If landlordId is missing or if there is an error updating the lease.
 */
export const updateLease = async (
  landlordId: string | undefined | null,
  leaseId: string,
  updateData: Partial<Omit<Lease, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info(`firestoreUtils: Updating lease ${leaseId}...`);
    
    // Check if we're activating this lease
    if (updateData.isActive === true) {
      // Get the current lease data to get unitId
      const leaseDocRef = doc(db, `landlords/${validLandlordId}/leases`, leaseId);
      const docSnap = await getDoc(leaseDocRef);
      
      if (docSnap.exists()) {
        const currentLeaseData = docSnap.data() as Lease;
        const unitId = updateData.unitId || currentLeaseData.unitId;
        
        // Check if the lease is already active (no need to check others in this case)
        if (!currentLeaseData.isActive) {
          // Only check for other active leases if this lease is being activated
          const otherActiveLeaseQuery = query(
            collection(db, `landlords/${validLandlordId}/leases`),
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
    
    // If unitNumber is not provided but unitId is changed, try to get the unitNumber
    if (!updateData.unitNumber && updateData.unitId) {
      const inventoryRef = doc(db, `landlords/${validLandlordId}/rental-inventory`, updateData.unitId);
      const inventoryDoc = await getDoc(inventoryRef);
      
      if (inventoryDoc.exists()) {
        const inventoryData = inventoryDoc.data() as RentalInventory;
        updateData.unitNumber = inventoryData.unitNumber;
      }
    }
    
    const leaseDocRef = doc(db, `landlords/${validLandlordId}/leases`, leaseId);
    await updateDoc(leaseDocRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
    
    logger.info(`firestoreUtils: Lease ${leaseId} updated successfully.`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error updating lease ${leaseId}: ${error.message}`);
    throw new Error(error.message || 'Failed to update lease.');
  }
};

/**
 * Deletes a lease from the 'leases' collection.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {string} leaseId - The ID of the lease to delete.
 * @returns {Promise<void>} A promise that resolves when the deletion is complete.
 * @throws {Error} If landlordId is missing or if there is an error deleting the lease.
 */
export const deleteLease = async (
  landlordId: string | undefined | null,
  leaseId: string
): Promise<void> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info(`firestoreUtils: Deleting lease ${leaseId}...`);
    
    const leaseDocRef = doc(db, `landlords/${validLandlordId}/leases`, leaseId);
    await deleteDoc(leaseDocRef);
    
    logger.info(`firestoreUtils: Lease ${leaseId} deleted successfully.`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error deleting lease ${leaseId}: ${error.message}`);
    throw new Error(error.message || 'Failed to delete lease.');
  }
};

// ---------------------- Rent Collection Utility Functions ----------------------

/**
 * Adds a new rent payment to the 'rent-collection' collection in Firestore.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {Omit<RentPayment, 'id' | 'createdAt' | 'updatedAt'>} paymentData - Rent payment data (excluding ID and timestamps).
 * @returns {Promise<string>} The ID of the newly created rent payment document.
 * @throws {Error} If landlordId is missing or if there is an error adding the rent payment.
 */
export const addRentPayment = async (
  landlordId: string | undefined | null,
  paymentData: Omit<RentPayment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info("firestoreUtils: Adding rent payment...");
    
    // Ensure payment has a payment type (default to "Rent Payment" for backward compatibility)
    const paymentWithDefaults = {
      ...paymentData,
      landlordId: validLandlordId, // Add landlordId to the document for additional security
      paymentType: paymentData.paymentType || "Rent Payment",
      collectionMethod: paymentData.collectionMethod || "",
      paymentDate: paymentData.paymentDate || new Date(),
    };
    
    const rentCollectionRef = collection(db, `landlords/${validLandlordId}/rent-collection`);
    const docRef = await addDoc(rentCollectionRef, {
      ...paymentWithDefaults,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    logger.info(`firestoreUtils: Rent payment added successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error adding rent payment: ${error.message}`);
    throw new Error(error.message || 'Failed to add rent payment.');
  }
};

/**
 * Retrieves all payments from the 'rent-collection' collection.
 * This includes rent payments, bill payments, maintenance fees, and other payment types.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @returns {Promise<RentPayment[]>} Array of payment items.
 * @throws {Error} If landlordId is missing or if there is an error retrieving the payments.
 */
export const getAllPayments = async (
  landlordId: string | undefined | null
): Promise<RentPayment[]> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info("firestoreUtils: Retrieving all payments...");
    
    const rentCollectionRef = collection(db, `landlords/${validLandlordId}/rent-collection`);
    const q = query(rentCollectionRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const payments: RentPayment[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      try {
        // Convert Firestore Timestamps to JavaScript Date objects
        const payment: RentPayment = {
          id: doc.id,
          ...data,
          // Add default paymentType for backward compatibility with existing records
          paymentType: data.paymentType || "Rent Payment",
          collectionMethod: data.collectionMethod || "",
          paymentDate: data.paymentDate instanceof Timestamp 
            ? data.paymentDate.toDate() 
            : new Date(data.paymentDate),
          createdAt: data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate() 
            : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Timestamp 
            ? data.updatedAt.toDate() 
            : new Date(data.updatedAt)
        } as RentPayment;
        
        payments.push(payment);
        logger.info(`Successfully processed payment ${doc.id}`);
      } catch (docError: any) {
        logger.error(`Error processing payment doc ${doc.id}: ${docError.message}`);
        // Continue with next doc instead of failing the entire function
      }
    });
    
    logger.info(`firestoreUtils: Retrieved ${payments.length} payments.`);
    return payments;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error retrieving payments: ${error.message}`);
    throw new Error(error.message || 'Failed to retrieve payments.');
  }
};

// For backward compatibility, alias the old function name to the new one
export const getAllRentPayments = getAllPayments;

/**
 * Retrieves rental inventory details for a unit, including owner and bank details.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {string} unitId - The ID of the unit to retrieve details for.
 * @returns {Promise<RentalInventory | null>} The rental inventory data or null if not found.
 * @throws {Error} If landlordId is missing or if there is an error retrieving the inventory details.
 */
export const getRentalInventoryDetails = async (
  landlordId: string | undefined | null,
  unitId: string
): Promise<RentalInventory | null> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info(`firestoreUtils: Getting rental inventory details for unit ${unitId}...`);
    
    const inventoryDocRef = doc(db, `landlords/${validLandlordId}/rental-inventory`, unitId);
    const docSnap = await getDoc(inventoryDocRef);
    
    if (!docSnap.exists()) {
      logger.info(`firestoreUtils: No rental inventory found for unit ${unitId}.`);
      return null;
    }
    
    const data = docSnap.data();
    const inventoryData: RentalInventory = {
      id: docSnap.id,
      unitNumber: data.unitNumber || '[Unknown]',
      propertyType: data.propertyType || 'Residential',
      ownerDetails: data.ownerDetails || '',
      bankDetails: data.bankDetails,
      groupName: data.groupName,
      numberOfBedrooms: data.numberOfBedrooms !== undefined ? data.numberOfBedrooms : null,
      squareFeetArea: data.squareFeetArea !== undefined ? data.squareFeetArea : null,
      createdAt: data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : new Date(data.createdAt || Date.now()),
      updatedAt: data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate() 
        : new Date(data.updatedAt || Date.now()),
    };
    
    logger.info(`firestoreUtils: Found rental inventory for unit ${unitId}.`);
    return inventoryData;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error getting rental inventory details for unit ${unitId}: ${error.message}`);
    throw new Error(error.message || 'Failed to get rental inventory details.');
  }
};

/**
 * Retrieves all active leases.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @returns {Promise<Lease[]>} Array of active lease items.
 * @throws {Error} If landlordId is missing or if there is an error retrieving the active leases.
 */
export const getAllActiveLeases = async (
  landlordId: string | undefined | null
): Promise<Lease[]> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info("firestoreUtils: Retrieving all active leases...");
    
    const leasesCollection = collection(db, `landlords/${validLandlordId}/leases`);
    const q = query(
      leasesCollection,
      where('isActive', '==', true),
      orderBy('unitId')
    );
    
    const querySnapshot = await getDocs(q);
    const leases: Lease[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      try {
        // Convert Firestore Timestamps to JavaScript Date objects
        const leaseData: Lease = {
          id: doc.id,
          landlordId: validLandlordId,
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
        
        leases.push(leaseData);
        logger.info(`Successfully processed active lease ${doc.id}`);
      } catch (docError: any) {
        logger.error(`Error processing active lease doc ${doc.id}: ${docError.message}`);
        // Continue with next doc instead of failing the entire function
      }
    });
    
    logger.info(`firestoreUtils: Retrieved ${leases.length} active leases.`);
    return leases;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error retrieving active leases: ${error.message}`);
    throw new Error(error.message || 'Failed to retrieve active leases.');
  }
};


// Property Group Functions

/**
 * Adds a new property group to the 'property-groups' collection.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {Omit<PropertyGroup, 'id' | 'createdAt' | 'updatedAt'>} groupData - Property group data.
 * @returns {Promise<string>} The ID of the newly created property group document.
 * @throws {Error} If landlordId is missing or if there is an error adding the property group.
 */
export const addPropertyGroup = async (
  landlordId: string | undefined | null,
  groupData: Omit<PropertyGroup, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info("firestoreUtils: Adding property group...");
    
    // Check if a group with this name already exists
    const existingGroups = await getAllPropertyGroups(validLandlordId);
    const groupExists = existingGroups.some(
      group => group.groupName.toLowerCase() === groupData.groupName.toLowerCase()
    );
    
    if (groupExists) {
      throw new Error(`A property group with the name "${groupData.groupName}" already exists.`);
    }
    
    const docRef = await addDoc(collection(db, `landlords/${validLandlordId}/property-groups`), {
      ...groupData,
      landlordId: validLandlordId, // Add landlordId to the document for additional security
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    logger.info(`firestoreUtils: Property group added successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error adding property group: ${error.message}`);
    throw new Error(error.message || 'Failed to add property group.');
  }
};

/**
 * Retrieves all property groups.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @returns {Promise<PropertyGroup[]>} Array of property group items.
 * @throws {Error} If landlordId is missing or if there is an error retrieving the property groups.
 */
export const getAllPropertyGroups = async (
  landlordId: string | undefined | null
): Promise<PropertyGroup[]> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info("firestoreUtils: Retrieving all property groups...");
    
    const q = query(
      collection(db, `landlords/${validLandlordId}/property-groups`),
      orderBy('groupName', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    const propertyGroups: PropertyGroup[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      try {
        const group: PropertyGroup = {
          id: doc.id,
          groupName: data.groupName || 'Unnamed Group',
          createdAt: data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate() 
            : new Date(data.createdAt || Date.now()),
          updatedAt: data.updatedAt instanceof Timestamp 
            ? data.updatedAt.toDate() 
            : new Date(data.updatedAt || Date.now())
        };
        
        propertyGroups.push(group);
        logger.info(`Successfully processed property group ${doc.id}`);
      } catch (docError: any) {
        logger.error(`Error processing property group doc ${doc.id}: ${docError.message}`);
        // Continue with next doc instead of failing the entire function
      }
    });
    
    logger.info(`firestoreUtils: Retrieved ${propertyGroups.length} property groups.`);
    return propertyGroups;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error retrieving property groups: ${error.message}`);
    throw new Error(error.message || 'Failed to retrieve property groups.');
  }
};

/**
 * Updates a property group.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {string} groupId - The ID of the property group to update.
 * @param {Partial<Omit<PropertyGroup, 'id' | 'createdAt' | 'updatedAt'>>} groupData - The data to update.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 * @throws {Error} If landlordId is missing or if there is an error updating the property group.
 */
export const updatePropertyGroup = async (
  landlordId: string | undefined | null,
  groupId: string, 
  groupData: Partial<Omit<PropertyGroup, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info(`firestoreUtils: Updating property group ${groupId}...`);
    
    // If group name is being updated, check if the new name already exists
    if (groupData.groupName) {
      const existingGroups = await getAllPropertyGroups(validLandlordId);
      const groupExists = existingGroups.some(
        group => group.id !== groupId && 
                group.groupName.toLowerCase() === groupData.groupName?.toLowerCase()
      );
      
      if (groupExists) {
        throw new Error(`A property group with the name "${groupData.groupName}" already exists.`);
      }
    }
    
    const docRef = doc(db, `landlords/${validLandlordId}/property-groups`, groupId);
    await updateDoc(docRef, {
      ...groupData,
      updatedAt: serverTimestamp()
    });
    
    logger.info(`firestoreUtils: Property group ${groupId} updated successfully.`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error updating property group ${groupId}: ${error.message}`);
    throw new Error(error.message || 'Failed to update property group.');
  }
};

/**
 * Deletes a property group.
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {string} groupId - The ID of the property group to delete.
 * @returns {Promise<void>} A promise that resolves when the deletion is complete.
 * @throws {Error} If landlordId is missing or if there is an error deleting the property group.
 */
export const deletePropertyGroup = async (
  landlordId: string | undefined | null,
  groupId: string
): Promise<void> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    logger.info(`firestoreUtils: Deleting property group ${groupId}...`);
    
    // Check if there are any rental inventory items using this group
    const rentalInventoryRef = collection(db, `landlords/${validLandlordId}/rental-inventory`);
    const q = query(rentalInventoryRef, where('groupName', '==', groupId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error('Cannot delete property group because it is being used by one or more rental inventory items.');
    }
    
    await deleteDoc(doc(db, `landlords/${validLandlordId}/property-groups`, groupId));
    logger.info(`firestoreUtils: Property group ${groupId} deleted successfully.`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error deleting property group ${groupId}: ${error.message}`);
    throw new Error(error.message || 'Failed to delete property group.');
  }
};

/**
 * Checks if a user's email exists in the users collection and returns their landlordId.
 * @param {string} email - The email address to check.
 * @returns {Promise<string | null>} The landlordId if found, null otherwise.
 */
export const getUserLandlordId = async (email: string): Promise<string | null> => {
  try {
    logger.info(`firestoreUtils: Checking user landlord for email ${email}...`);
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      logger.info(`firestoreUtils: No user found for email ${email}`);
      return null;
    }
    
    const userData = querySnapshot.docs[0].data();
    logger.info(`firestoreUtils: Found landlordId ${userData.landlordId} for email ${email}`);
    return userData.landlordId;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error checking user landlord for email ${email}: ${error.message}`);
    throw new Error('Failed to check user landlord association.');
  }
};

/**
 * Checks if an email is in the approvedLandlords collection.
 * @param {string} email - The email address to check.
 * @returns {Promise<boolean>} True if the email is in the approvedLandlords collection, false otherwise.
 */
export const isApprovedLandlord = async (email: string): Promise<boolean> => {
  try {
    logger.info(`firestoreUtils: Checking if ${email} is an approved landlord...`);
    const approvedLandlordsCollection = collection(db, 'approvedLandlords');
    const q = query(approvedLandlordsCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    const isApproved = !querySnapshot.empty;
    logger.info(`firestoreUtils: ${email} is${isApproved ? '' : ' not'} an approved landlord.`);
    return isApproved;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error checking if ${email} is an approved landlord: ${error.message}`);
    throw new Error('Failed to check if email is an approved landlord.');
  }
};

/**
 * Creates a new landlord document in the landlords collection.
 * @param {string} email - The email address of the landlord.
 * @param {string} name - The name of the landlord.
 * @returns {Promise<string>} The ID of the newly created landlord document.
 */
export const createLandlord = async (email: string, name: string): Promise<string> => {
  try {
    logger.info(`firestoreUtils: Creating landlord document for ${email}...`);
    const landlordsCollection = collection(db, 'landlords');
    
    // Check if a landlord with this email already exists
    const q = query(landlordsCollection, where('landlordEmail', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      logger.info(`firestoreUtils: Landlord document for ${email} already exists.`);
      return querySnapshot.docs[0].id;
    }
    
    // Create a new landlord document
    const docRef = await addDoc(landlordsCollection, {
      landlordName: name,
      landlordEmail: email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    logger.info(`firestoreUtils: Landlord document created with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error: any) {
    logger.error(`firestoreUtils: Error creating landlord document for ${email}: ${error.message}`);
    throw new Error('Failed to create landlord document.');
  }
};

/**
 * Creates a user document in the users collection.
 * @param {string} uid - The Firebase Authentication UID of the user.
 * @param {string} email - The email address of the user.
 * @param {string} landlordId - The ID of the landlord the user belongs to.
 * @param {string} role - The role of the user (default: 'admin').
 * @returns {Promise<void>} A promise that resolves when the user document is created.
 */
export const createUserDocument = async (
  uid: string,
  email: string,
  landlordId: string,
  role: 'admin' | 'user' | 'tenant' = 'admin'
): Promise<void> => {
  try {
    logger.info(`firestoreUtils: Creating user document for ${email}...`);
    const userDocRef = doc(db, 'users', uid);
    
    // Check if the user document already exists
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      logger.info(`firestoreUtils: User document for ${email} already exists.`);
      return;
    }
    
    // Create a new user document
    await setDoc(userDocRef, {
      email,
      landlordId,
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    logger.info(`firestoreUtils: User document created for ${email}.`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error creating user document for ${email}: ${error.message}`);
    throw new Error('Failed to create user document.');
  }
};

/**
 * Handles the authentication flow for a user.
 * Checks if the user is an approved landlord, creates landlord and user documents if needed.
 * @param {User} user - The Firebase Authentication user object.
 * @returns {Promise<{landlordId: string | null, isNewUser: boolean, isSandboxUser: boolean}>} 
 *          The landlordId of the user, whether they are a new user, and whether they are a sandbox user.
 */
export const handleAuthFlow = async (user: User): Promise<{
  landlordId: string | null;
  isNewUser: boolean;
  isSandboxUser: boolean;
}> => {
  try {
    logger.info(`firestoreUtils: Handling auth flow for ${user.email}...`);
    
    // Check if the user has a document in the users collection
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      // User document exists, extract landlordId
      const userData = userDocSnap.data();
      logger.info(`firestoreUtils: User document found for ${user.email}. LandlordId: ${userData.landlordId}`);
      return { 
        landlordId: userData.landlordId, 
        isNewUser: false, 
        isSandboxUser: userData.landlordId === 'sandbox' 
      };
    }
    
    // No user document found, check if they are an approved landlord
    const isApproved = await isApprovedLandlord(user.email || '');
    
    if (isApproved) {
      // Create a new landlord document
      const landlordId = await createLandlord(user.email || '', user.displayName || user.email || 'New Landlord');
      
      // Create a new user document
      await createUserDocument(user.uid, user.email || '', landlordId, 'admin');
      
      logger.info(`firestoreUtils: Auth flow completed for approved landlord ${user.email}. LandlordId: ${landlordId}`);
      return { landlordId, isNewUser: true, isSandboxUser: false };
    } else {
      // Not an approved landlord, offer sandbox mode
      // In this implementation, we'll automatically create a sandbox user
      // In a real application, you might want to prompt the user first
      
      await createUserDocument(user.uid, user.email || '', 'sandbox', 'user');
      
      logger.info(`firestoreUtils: Auth flow completed for sandbox user ${user.email}.`);
      return { landlordId: 'sandbox', isNewUser: true, isSandboxUser: true };
    }
  } catch (error: any) {
    logger.error(`firestoreUtils: Error handling auth flow for ${user.email}: ${error.message}`);
    throw new Error('Failed to handle authentication flow.');
  }
};