// src/lib/firebase/firestoreUtils.ts

import { db } from './firebase'; // Assuming you have firebase.ts to initialize Firebase
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, getDocs, query, where, orderBy, DocumentData, QuerySnapshot, Timestamp, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Tenant, Lease, RentPayment, RentalInventory, PropertyGroup, UserProfile, AllUser } from '@/types'; // Import our TypeScript interfaces
import logger from '@/lib/logger'; // Assuming you have a logger utility
import { normalizeDate, dateToTimestamp } from '../utils/dateUtils';

// Add this at the top of the file after imports
class AuthError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthError';
  }
}

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
      leaseStartDate: dateToTimestamp(
        leaseData.leaseStartDate instanceof Date
          ? leaseData.leaseStartDate
          : normalizeDate(leaseData.leaseStartDate)
      ),
      leaseEndDate: dateToTimestamp(
        leaseData.leaseEndDate instanceof Date
          ? leaseData.leaseEndDate
          : normalizeDate(leaseData.leaseEndDate)
      ),
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
 * Retrieves a specific lease by its ID.
 * @param {string} landlordId - The ID of the landlord.
 * @param {string} leaseId - The ID of the lease to retrieve.
 * @returns {Promise<Lease | null>} The lease data or null if not found.
 * @throws {Error} If landlordId or leaseId is missing, or if there is a Firestore error.
 */
export const getLeaseById = async (
  landlordId: string | undefined | null,
  leaseId: string
): Promise<Lease | null> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    if (!leaseId) {
      throw new Error('Lease ID is required to retrieve a lease.');
    }
    logger.info(`firestoreUtils: Retrieving lease with ID: ${leaseId} for landlord ${validLandlordId}`);

    const leaseDocRef = doc(db, `landlords/${validLandlordId}/leases`, leaseId);
    const docSnap = await getDoc(leaseDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      logger.info(`firestoreUtils: Lease ${leaseId} retrieved successfully.`);
      // Convert Firestore Timestamps to JavaScript Date objects
      const lease: Lease = {
        id: docSnap.id,
        landlordId: validLandlordId,
        ...data,
        leaseStartDate: data.leaseStartDate instanceof Timestamp 
          ? data.leaseStartDate.toDate() 
          : new Date(data.leaseStartDate || Date.now()),
        leaseEndDate: data.leaseEndDate instanceof Timestamp 
          ? data.leaseEndDate.toDate() 
          : new Date(data.leaseEndDate || Date.now()),
        rentAmount: Number(data.rentAmount) || 0,
        securityDeposit: Number(data.securityDeposit) || 0,
        depositMethod: data.depositMethod || 'Unknown',
        isActive: Boolean(data.isActive),
        createdAt: data.createdAt instanceof Timestamp 
          ? data.createdAt.toDate() 
          : new Date(data.createdAt || Date.now()),
        updatedAt: data.updatedAt instanceof Timestamp 
          ? data.updatedAt.toDate() 
          : new Date(data.updatedAt || Date.now())
      } as Lease; // Type assertion might be needed depending on strictness
      return lease;
    } else {
      logger.warn(`firestoreUtils: Lease ${leaseId} not found for landlord ${validLandlordId}.`);
      return null;
    }
  } catch (error: any) {
    logger.error(`firestoreUtils: Error retrieving lease ${leaseId}: ${error.message}`);
    throw new Error(error.message || 'Failed to retrieve lease.');
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
    
    // Get all documents and do case-insensitive comparison
    const querySnapshot = await getDocs(approvedLandlordsCollection);
    const isApproved = querySnapshot.docs.some(doc => 
      doc.data().email?.toLowerCase() === email?.toLowerCase()
    );
    
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
 * Checks if an email exists in the allUsers collection and returns user data if found.
 * @param {string} email - The email address to check.
 * @returns {Promise<{uid: string, landlordId: string, role: string} | null>} User data if found, null otherwise.
 */
export const checkAllUsersCollection = async (email: string): Promise<{uid: string, landlordId: string, role: string} | null> => {
  try {
    logger.info(`firestoreUtils: Checking allUsers collection for email ${email}...`);
    const allUsersCollection = collection(db, 'allUsers');
    const q = query(allUsersCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      logger.info(`firestoreUtils: No user found in allUsers collection for email ${email}`);
      return null;
    }
    
    const userData = querySnapshot.docs[0].data();
    logger.info(`firestoreUtils: Found user in allUsers collection for email ${email}, landlordId: ${userData.landlordId}`);
    return {
      uid: querySnapshot.docs[0].id,
      landlordId: userData.landlordId,
      role: userData.role || 'user'
    };
  } catch (error: any) {
    logger.error(`firestoreUtils: Error checking allUsers collection for email ${email}: ${error.message}`);
    throw new Error('Failed to check allUsers collection.');
  }
};

/**
 * Updates or creates the document in the 'allUsers' collection.
 * Stores UID -> landlordId and role mapping.
 * @param {string} uid - Firebase Auth UID.
 * @param {string} email - User's original case email.
 * @param {string} landlordId - Associated landlord ID.
 * @param {'admin' | 'user' | 'tenant'} [role='admin'] - User's role.
 * @returns {Promise<void>}
 */
export const updateAllUsersCollection = async (
  uid: string,
  email: string,
  landlordId: string,
  role: 'admin' | 'user' | 'tenant' = 'admin'
): Promise<void> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    if (!uid) throw new Error('UID is required to update allUsers collection');
    if (!email) throw new Error('Email is required to update allUsers collection');

    logger.info(`firestoreUtils: Updating allUsers collection for UID ${uid}`);

    const allUsersDocRef = doc(db, 'allUsers', uid);
    // Prepare data specifically for Firestore write, allowing FieldValue
    const userDataForWrite: { [key: string]: any } = { 
      email: email, 
      landlordId: validLandlordId,
      role: role,
      updatedAt: serverTimestamp() // Use serverTimestamp directly here
    };

    // Use setDoc with merge: true to create or update
    await setDoc(allUsersDocRef, userDataForWrite, { merge: true });

    logger.info(`firestoreUtils: Successfully updated allUsers collection for UID ${uid}`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error updating allUsers collection for UID ${uid}: ${error.message}`);
    throw new Error(error.message || 'Failed to update allUsers collection.');
  }
};

/**
 * Creates or updates the user document in the 'users' collection AND updates the 'allUsers' collection.
 * @param {string} uid - Firebase Auth UID.
 * @param {string} email - User's original case email.
 * @param {string} landlordId - Associated landlord ID.
 * @param {'admin' | 'user' | 'tenant'} [role='admin'] - User's role.
 * @returns {Promise<void>}
 */
export const createUserDocument = async (
  uid: string,
  email: string,
  landlordId: string,
  role: 'admin' | 'user' | 'tenant' = 'admin'
): Promise<void> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    if (!uid) throw new Error('UID is required to create user document');
    if (!email) throw new Error('Email is required to create user document');

    logger.info(`firestoreUtils: Creating/updating user document for UID ${uid}`);

    const userDocRef = doc(db, 'users', uid);
    // Prepare data specifically for Firestore write, allowing FieldValue
    const userDataForWrite: { [key: string]: any } = { 
      email: email, 
      landlordId: validLandlordId,
      role: role,
      updatedAt: serverTimestamp() // Use serverTimestamp directly here
    };

    // Check if document exists to set createdAt only once
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      userDataForWrite.createdAt = serverTimestamp(); // Use serverTimestamp here too
    }

    // Use setDoc with merge: true to create or update
    await setDoc(userDocRef, userDataForWrite, { merge: true });

    // **Crucially, update the allUsers collection as well**
    await updateAllUsersCollection(uid, email, landlordId, role);

    logger.info(`firestoreUtils: Successfully created/updated user document for UID ${uid}`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error creating/updating user document for UID ${uid}: ${error.message}`);
    throw new Error(error.message || 'Failed to create/update user document.');
  }
};

/**
 * Creates an invitation document in the 'invitations' collection.
 * @param {string} landlordId - The ID of the inviting landlord.
 * @param {string} email - The email address of the invitee.
 * @param {'admin' | 'user' | 'tenant'} [role='user'] - The role assigned to the invitee.
 * @param {string} [name] - Optional name of the invitee.
 * @returns {Promise<void>}
 * @throws {Error} If landlordId is missing or if there is an error creating the invitation.
 */
export const inviteUser = async (
  landlordId: string | undefined | null,
  email: string,
  role: 'admin' | 'user' | 'tenant' = 'user', 
  name?: string 
): Promise<void> => {
  try {
    const validLandlordId = validateLandlordId(landlordId);
    const lowerCaseEmail = email.trim().toLowerCase();

    if (!lowerCaseEmail) {
      throw new Error('Email address cannot be empty.');
    }
    if (!/\S+@\S+\.\S+/.test(lowerCaseEmail)) {
      throw new Error('Invalid email address format.');
    }

    logger.info(`firestoreUtils: Creating invitation for ${lowerCaseEmail} to landlord ${validLandlordId} with role ${role}${name ? ' and name ' + name : ''}`);

    const invitationsCollection = collection(db, 'invitations');

    // Consider querying first if you want to prevent duplicate pending invitations
    // const q = query(invitationsCollection, where('email', '==', lowerCaseEmail), where('landlordId', '==', validLandlordId));
    // const existingInvites = await getDocs(q);
    // if (!existingInvites.empty) {
    //   logger.warn(`firestoreUtils: Invitation already exists for ${lowerCaseEmail} and landlord ${validLandlordId}.`);
    //   // Decide how to handle: throw error, update existing, or silently ignore?
    //   // For now, let's allow overwriting/creating multiple, cleanup happens on accept.
    // }

    const invitationData: any = { // Use any temporarily for flexibility
      email: lowerCaseEmail, // Store email in lowercase for case-insensitive lookup
      landlordId: validLandlordId,
      role: role,
      invitedAt: serverTimestamp()
    };

    if (name) {
      invitationData.name = name.trim(); // Store the name if provided
    }

    await addDoc(invitationsCollection, invitationData);

    logger.info(`firestoreUtils: Invitation created successfully for ${lowerCaseEmail}.`);
  } catch (error: any) {
    logger.error(`firestoreUtils: Error creating invitation for ${email}: ${error.message}`);
    throw new Error(error.message || 'Failed to create invitation.');
  }
};

/**
 * Removes a user's access by deleting their documents from 'users' and 'allUsers'.
 * IMPORTANT: This does not sign the user out or revoke Firebase Auth. They just won't pass handleAuthFlow anymore.
 * @param {string} emailToRemove - The email of the user whose access should be removed.
 * @returns {Promise<void>}
 * @throws {Error} If email is missing, user not found, or delete fails.
 */
export const removeUserAccess = async (emailToRemove: string): Promise<void> => {
    if (!emailToRemove) {
        throw new Error('Email is required to remove user access.');
    }
    try {
        const lowercaseEmail = emailToRemove.toLowerCase();
        logger.info(`firestoreUtils: Removing access for user ${lowercaseEmail}...`);

        // Find the user in allUsers to get their UID
        const allUsersCollection = collection(db, 'allUsers');
        const q = query(allUsersCollection, where('email', '==', lowercaseEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            logger.warn(`firestoreUtils: User ${lowercaseEmail} not found in allUsers. Cannot remove access.`);
             // Optionally check 'users' collection too for robustness? Maybe they only exist in users (legacy)?
             // For now, we'll assume they must be in allUsers if properly added.
             throw new Error(`User with email ${lowercaseEmail} not found.`);
        }

        const userToRemoveUid = querySnapshot.docs[0].id;
        logger.info(`firestoreUtils: Found UID ${userToRemoveUid} for email ${lowercaseEmail}. Proceeding with deletion.`);

        // Delete from allUsers
        const allUserDocRef = doc(db, 'allUsers', userToRemoveUid);
        await deleteDoc(allUserDocRef);
        logger.info(`firestoreUtils: Deleted user ${userToRemoveUid} from allUsers.`);

        // Delete from users
        const userDocRef = doc(db, 'users', userToRemoveUid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            await deleteDoc(userDocRef);
            logger.info(`firestoreUtils: Deleted user ${userToRemoveUid} from users.`);
        } else {
             logger.warn(`firestoreUtils: User document for UID ${userToRemoveUid} not found in users collection (already deleted or inconsistent data).`);
        }

        // Optional: Delete any pending invitations for this email
        try {
            const invitationsCollection = collection(db, 'invitations');
            const invitationQuery = query(invitationsCollection, where('email', '==', lowercaseEmail));
            const invitationSnapshot = await getDocs(invitationQuery);
            if (!invitationSnapshot.empty) {
                 const invitationId = invitationSnapshot.docs[0].id;
                 await deleteDoc(doc(db, 'invitations', invitationId));
                 logger.info(`firestoreUtils: Deleted pending invitation for removed user ${lowercaseEmail}.`);
            }
        } catch (inviteDeleteError: any) {
             logger.error(`firestoreUtils: Failed to delete pending invitation for removed user ${lowercaseEmail}: ${inviteDeleteError.message}`);
        }


        logger.info(`firestoreUtils: Successfully removed access for ${lowercaseEmail} (UID: ${userToRemoveUid}).`);

    } catch (error: any) {
        logger.error(`firestoreUtils: Error removing access for user ${emailToRemove}: ${error.message}`);
        throw new Error(error.message || 'Failed to remove user access.');
    }
};

/**
 * Handles the core authentication flow after Google Sign-In.
 * Checks invitations, approved landlords, and existing users to determine landlordId and role.
 * Creates/updates user records in 'users' and 'allUsers' collections.
 * @param {User} user - The Firebase Auth User object.
 * @returns {Promise<{ landlordId: string | null, isNewUser: boolean }>} The determined landlordId and whether the user is new.
 * @throws {AuthError} If user has no email or is unauthorized.
 */
export const handleAuthFlow = async (user: User): Promise<{
  landlordId: string | null;
  isNewUser: boolean;
}> => {
  if (!user || !user.email) {
    logger.error('handleAuthFlow: User object or email is missing.');
    throw new AuthError('Authentication failed: User email not available.', 'auth/no-email');
  }

  const userEmail = user.email;
  const userEmailLower = userEmail.toLowerCase();
  const uid = user.uid;

  logger.info(`handleAuthFlow: Starting auth flow for ${userEmail} (UID: ${uid})`);

  // 1. Check Invitations (using userEmailLower)
  logger.debug(`handleAuthFlow: Checking invitations for ${userEmailLower}`);
  const invitation = await getInvitation(userEmailLower);
  if (invitation) {
    logger.info(`handleAuthFlow: Found invitation for ${userEmailLower}. Landlord: ${invitation.landlordId}, Role: ${invitation.role}`);
    await createUserDocument(uid, userEmail, invitation.landlordId, invitation.role);
    await deleteInvitation(invitation.id); // Consume invitation
    logger.info(`handleAuthFlow: Invitation processed. Returning landlordId: ${invitation.landlordId}`);
    return { landlordId: invitation.landlordId, isNewUser: true };
  }

  // 2. Check Approved Landlord (using original case userEmail)
  logger.debug(`handleAuthFlow: No invitation found. Checking approved landlords for ${userEmail}`);
  const isApproved = await isApprovedLandlord(userEmail);
  if (isApproved) {
    logger.info(`handleAuthFlow: Email ${userEmail} is approved to create/access a landlord account.`);
    // Check if user already exists in 'users' collection
    const existingUserDoc = await getUserDoc(uid);
    if (existingUserDoc) {
      logger.info(`handleAuthFlow: Existing user found in 'users' collection (UID: ${uid}). Updating allUsers.`);
      await updateAllUsersCollection(uid, userEmail, existingUserDoc.landlordId, existingUserDoc.role || 'admin');
      return { landlordId: existingUserDoc.landlordId, isNewUser: false };
    } else {
      logger.info(`handleAuthFlow: No existing user found for UID ${uid}. Creating new landlord and user (admin).`);
      const landlordName = user.displayName || userEmail;
      const newLandlordId = await createLandlord(userEmail, landlordName);
      await createUserDocument(uid, userEmail, newLandlordId, 'admin'); 
      return { landlordId: newLandlordId, isNewUser: true };
    }
  }

  // 3. Check allUsers Collection (using original case userEmail)
  logger.debug(`handleAuthFlow: Not approved landlord. Checking allUsers collection for ${userEmail}`);
  const allUserData = await checkAllUsersCollection(userEmail);
  if (allUserData) {
    logger.info(`handleAuthFlow: User found in allUsers collection for email ${userEmail}. Ensuring user doc exists.`);
    const userRole = allUserData.role as 'admin' | 'user' | 'tenant'; 
    await createUserDocument(allUserData.uid, userEmail, allUserData.landlordId, userRole);
    return { landlordId: allUserData.landlordId, isNewUser: false };
  }

  // 4. Check users Collection (Legacy Fallback - by UID)
  logger.debug(`handleAuthFlow: Not found in allUsers. Checking users collection directly for UID ${uid}`);
  const userDoc = await getUserDoc(uid);
  if (userDoc) {
    logger.warn(`handleAuthFlow: User found in users collection (UID: ${uid}) but not in allUsers. This indicates potential inconsistency.`);
    await updateAllUsersCollection(uid, userEmail, userDoc.landlordId, userDoc.role || 'user');
    return { landlordId: userDoc.landlordId, isNewUser: false };
  }

  // 5. Deny Access
  logger.warn(`handleAuthFlow: User ${userEmail} (UID: ${uid}) is not authorized. No invitation, not approved, not found in allUsers or users.`);
  throw new AuthError('You do not have permission to access this application. Please contact your administrator.', 'auth/unauthorized');
};

// --- Helper Functions used by handleAuthFlow ---

/**
 * Retrieves an invitation document from Firestore by email (lowercase).
 * @param {string} emailLower - The lowercase email address to search for.
 * @returns {Promise<{id: string, landlordId: string, role: 'admin' | 'user' | 'tenant', name?: string} | null>} Invitation data or null.
 */
const getInvitation = async (emailLower: string): Promise<{id: string, landlordId: string, role: 'admin' | 'user' | 'tenant', name?: string} | null> => {
  if (!emailLower) return null;
  try {
    const invitationsRef = collection(db, 'invitations');
    const q = query(invitationsRef, where("email", "==", emailLower));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Assuming only one active invitation per email, take the first one
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      logger.info(`getInvitation: Found invitation for ${emailLower}: ${doc.id}`);
      return {
        id: doc.id,
        landlordId: data.landlordId,
        role: data.role,
        name: data.name // Include name if it exists
      };
    }
    logger.info(`getInvitation: No invitation found for ${emailLower}`);
    return null;
  } catch (error: any) {
    logger.error(`getInvitation: Error fetching invitation for ${emailLower}: ${error.message}`);
    throw error; // Re-throw to be caught by handleAuthFlow
  }
};

/**
 * Deletes an invitation document by its ID.
 * @param {string} invitationId - The ID of the invitation document to delete.
 * @returns {Promise<void>}
 */
const deleteInvitation = async (invitationId: string): Promise<void> => {
  if (!invitationId) return;
  try {
    logger.info(`deleteInvitation: Deleting invitation ${invitationId}`);
    await deleteDoc(doc(db, 'invitations', invitationId));
    logger.info(`deleteInvitation: Successfully deleted invitation ${invitationId}`);
  } catch (error: any) {
    logger.error(`deleteInvitation: Error deleting invitation ${invitationId}: ${error.message}`);
    // Don't throw here, allow auth flow to continue if deletion fails
  }
};

/**
 * Retrieves the user document from the 'users' collection by UID.
 * @param {string} uid - The Firebase Auth UID of the user.
 * @returns {Promise<UserProfile | null>} The user profile data, or null if not found.
 * @throws {Error} If there is an error retrieving the user document.
 */
export const getUserDoc = async (uid: string): Promise<UserProfile | null> => {
  if (!uid) return null;
  try {
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        email: data.email,
        landlordId: data.landlordId,
        role: data.role,
        name: data.name, // Include name if it exists
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      } as UserProfile;
    } else {
      return null;
    }
  } catch (error: any) {
    logger.error(`firestoreUtils: Error getting user document for UID ${uid}: ${error.message}`);
    throw new Error(error.message || 'Failed to retrieve user document.');
  }
};

/**
 * Retrieves the user data from the 'allUsers' collection by UID.
 * @param {string} uid - The Firebase Auth UID of the user.
 * @returns {Promise<AllUser | null>} The allUsers data, or null if not found.
 * @throws {Error} If there is an error retrieving the allUsers document.
 */
export const getAllUserDoc = async (uid: string): Promise<AllUser | null> => {
  if (!uid) return null;
  try {
    const userDocRef = doc(db, 'allUsers', uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        email: data.email,
        landlordId: data.landlordId,
        role: data.role,
        name: data.name, // Include name if it exists
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      } as AllUser;
    } else {
      return null;
    }
  } catch (error: any) {
    logger.error(`firestoreUtils: Error getting allUsers document for UID ${uid}: ${error.message}`);
    throw new Error(error.message || 'Failed to retrieve allUsers document.');
  }
};

/**
 * Helper function to parse and compare unit numbers that may contain both letters and numbers.
 * Examples of unit numbers it can handle:
 * - Pure numbers: "101", "1002"
 * - Letters with numbers: "A101", "B202", "1A", "2B"
 * - Pure letters: "A", "B"
 * - Complex combinations: "A-101", "B-202", "1-A", "2-B"
 */
const compareUnitNumbers = (a: string, b: string): number => {
  // Helper function to split unit number into parts
  const parseUnitNumber = (unit: string) => {
    // Convert to uppercase for case-insensitive comparison
    unit = unit.toUpperCase();
    
    // Split the unit number into parts (letters and numbers)
    const parts: (string | number)[] = [];
    let currentPart = '';
    
    for (let i = 0; i < unit.length; i++) {
      const char = unit[i];
      if (char === '-' || char === ' ') {
        if (currentPart) {
          // Try to convert to number if possible
          const num = parseFloat(currentPart);
          parts.push(isNaN(num) ? currentPart : num);
          currentPart = '';
        }
        continue;
      }
      
      const isCurrentPartNumber = !isNaN(parseFloat(currentPart));
      const isCharNumber = !isNaN(parseFloat(char));
      
      if (currentPart && isCurrentPartNumber !== isCharNumber) {
        // Type transition (letter to number or vice versa)
        const num = parseFloat(currentPart);
        parts.push(isNaN(num) ? currentPart : num);
        currentPart = char;
      } else {
        currentPart += char;
      }
    }
    
    if (currentPart) {
      const num = parseFloat(currentPart);
      parts.push(isNaN(num) ? currentPart : num);
    }
    
    return parts;
  };
  
  const partsA = parseUnitNumber(a);
  const partsB = parseUnitNumber(b);
  
  // Compare each part
  for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
    if (partsA[i] !== partsB[i]) {
      // If both parts are numbers or both are strings, compare directly
      if (typeof partsA[i] === typeof partsB[i]) {
        return partsA[i] < partsB[i] ? -1 : 1;
      }
      // If types are different, numbers come before letters
      return typeof partsA[i] === 'number' ? -1 : 1;
    }
  }
  
  // If all parts match up to the shortest length, shorter comes first
  return partsA.length - partsB.length;
};

export const groupLeasesByProperty = (
  leases: Lease[],
  rentalInventory: RentalInventory[],
  propertyGroups: PropertyGroup[]
): Array<{
  groupName: string;
  units: Array<{
    id: string;
    unitNumber: string;
    rent?: number;
    daysVacant?: number;
    isActive: boolean;
    lastUpdated: Date;
  }>;
  totalUnits: number;
}> => {
  logger.info("firestoreUtils: Grouping leases by property and identifying vacant vs occupied units");
  
  const groups: Record<string, {
    groupName: string;
    units: Array<{
      id: string;
      unitNumber: string;
      rent?: number;
      daysVacant?: number;
      isActive: boolean;
      lastUpdated: Date;
    }>;
    totalUnits: number;
  }> = {};

  // 1. Initialize groups based on PropertyGroups and ensure a 'Default' group exists if needed
  propertyGroups.forEach(pg => {
    if (!groups[pg.groupName]) {
      groups[pg.groupName] = { groupName: pg.groupName, units: [], totalUnits: 0 };
    }
  });
  
  if (rentalInventory.some(inv => !inv.groupName) && !groups['Default']) {
    groups['Default'] = { groupName: 'Default', units: [], totalUnits: 0 };
  }

  // 2. Create a map of rental inventory for easy lookup and initialize totalUnits
  const inventoryMap = new Map<string, RentalInventory>();
  rentalInventory.forEach(inv => {
    if (inv.id) {
      inventoryMap.set(inv.id, inv);
      const groupName = inv.groupName || 'Default';
      if (!groups[groupName]) { // Ensure group exists if inventory item belongs to a group not in PropertyGroups
        groups[groupName] = { groupName: groupName, units: [], totalUnits: 0 };
      }
      groups[groupName].totalUnits++;
    } else {
      logger.warn("firestoreUtils: Inventory item missing ID:", inv);
    }
  });

  // 3. Identify units with active leases
  const activeLeaseUnits = new Map<string, Lease>();
  leases.forEach(lease => {
    if (lease.isActive && lease.unitId) {
      // If multiple active leases exist for the same unit, prioritize the one updated most recently
      const existingActive = activeLeaseUnits.get(lease.unitId);
      if (!existingActive || new Date(lease.updatedAt) > new Date(existingActive.updatedAt)) {
        activeLeaseUnits.set(lease.unitId, lease);
      }
    }
  });
  
  // 4. Process each unit from the inventory map
  inventoryMap.forEach((inv, unitId) => {
    const groupName = inv.groupName || 'Default';
    const group = groups[groupName];
    
    if (!group) {
      logger.warn(`firestoreUtils: Inventory unit ${unitId} belongs to group "${groupName}" which was not initialized. Skipping.`);
      return; // Should not happen if initialization is correct, but safety check
    }

    const activeLease = activeLeaseUnits.get(unitId);

    if (activeLease) {
      // Unit is OCCUPIED
      logger.debug(`firestoreUtils: Unit ${unitId} (${inv.unitNumber}) is OCCUPIED by active lease ${activeLease.id}`);
      group.units.push({
        id: activeLease.id || `lease-${unitId}`, // Use lease ID if available
        unitNumber: inv.unitNumber, // Get unit number from inventory
        rent: activeLease.rentAmount,
        isActive: true,
        lastUpdated: new Date(activeLease.updatedAt),
        daysVacant: undefined // Occupied units don't have daysVacant
      });
    } else {
      // Unit is VACANT
      logger.debug(`firestoreUtils: Unit ${unitId} (${inv.unitNumber}) is VACANT.`);
      
      // Find the most recently updated inactive lease for this unit
      const inactiveLeases = leases
        .filter(l => l.unitId === unitId && !l.isActive)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      let daysVacant: number | undefined = undefined;
      let lastUpdatedDate: Date | null = null;

      if (inactiveLeases.length > 0) {
        // Use the updatedAt date of the most recently updated inactive lease
        lastUpdatedDate = new Date(inactiveLeases[0].updatedAt);
        const diffTime = Math.abs(new Date().getTime() - lastUpdatedDate.getTime());
        daysVacant = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else {
        // If no lease history found at all, consider vacancy from inventory creation if available
        lastUpdatedDate = inv.createdAt ? new Date(inv.createdAt) : new Date();
        const diffTime = Math.abs(new Date().getTime() - lastUpdatedDate.getTime());
        daysVacant = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      // Ensure daysVacant is not negative
      daysVacant = Math.max(0, daysVacant ?? 0);

      logger.debug(`firestoreUtils: Unit ${unitId} vacancy details: daysVacant=${daysVacant}, lastUpdated=${lastUpdatedDate}`);

      group.units.push({
        id: `inv-${unitId}`, // Create a unique ID based on inventory
        unitNumber: inv.unitNumber,
        rent: undefined, // Vacant units don't have current rent
        isActive: false,
        lastUpdated: lastUpdatedDate || new Date(), // Use calculated date or now
        daysVacant: daysVacant
      });
    }
  });
    
  // 5. Sort units within each group (by unit number using the new compareUnitNumbers function)
  Object.values(groups).forEach(group => {
    // First split units into occupied and vacant
    const occupiedUnits = group.units.filter(u => u.isActive);
    const vacantUnits = group.units.filter(u => !u.isActive);
    
    // Sort each array separately
    occupiedUnits.sort((a, b) => compareUnitNumbers(a.unitNumber, b.unitNumber));
    vacantUnits.sort((a, b) => compareUnitNumbers(a.unitNumber, b.unitNumber));
    
    // Combine the sorted arrays back
    group.units = [...occupiedUnits, ...vacantUnits];
  });

  // 6. Sort the groups themselves (keep existing group sorting logic)
  const sortedGroups = Object.values(groups).sort((a, b) => {
    if (a.groupName === 'Default') return 1;
    if (b.groupName === 'Default') return -1;
    // Sort primarily by number of units descending
    if (a.totalUnits !== b.totalUnits) {
      return b.totalUnits - a.totalUnits;
    }
    // Then by group name alphabetically
    return a.groupName.localeCompare(b.groupName);
  });
    
  logger.info(`firestoreUtils: Grouped ${sortedGroups.length} property groups with units.`);
  return sortedGroups;
};

/** Number of days after which a payment record becomes uneditable (2 months + 5 days) */
const EDITABLE_PERIOD_DAYS = 65;

/**
 * Determines if a payment record is still editable based on its rental period
 * A payment is editable if the current date is within EDITABLE_PERIOD_DAYS of the rental period
 * 
 * @param rentalPeriod - The rental period in format "YYYY-MM"
 * @returns boolean indicating if the payment record is still editable
 */
export const isPaymentEditable = (rentalPeriod: string): boolean => {
  try {
    // Parse the rental period (format: "YYYY-MM")
    const [year, month] = rentalPeriod.split('-').map(Number);
    if (!year || !month) return false;

    // Create date object for the first day of the rental period
    const rentalDate = new Date(year, month - 1); // month is 0-based in Date constructor

    // Calculate deadline by adding EDITABLE_PERIOD_DAYS
    const deadline = new Date(rentalDate);
    deadline.setDate(deadline.getDate() + EDITABLE_PERIOD_DAYS);

    // Compare with current date
    return new Date() <= deadline;
  } catch (error) {
    console.error('Error checking payment editability:', error);
    return false;
  }
};

/**
 * Gets the rent collection status for a specific month
 * @param {string} landlordId - The ID of the landlord from authentication context.
 * @param {string} currentMonth - The month to check in YYYY-MM format
 * @param {Lease[]} activeLeases - Array of active leases
 * @param {RentPayment[]} rentPayments - Array of rent payments
 * @returns {Promise<{paid: number, unpaid: number, unpaidLeases: Lease[], totalPendingAmount: number}>}
 */
export const getRentCollectionStatus = (
  activeLeases: Lease[],
  rentPayments: RentPayment[],
  currentMonth: string
): {
  paid: number;
  unpaid: number;
  unpaidLeases: Lease[];
  totalPendingAmount: number;
} => {
  try {
    logger.info(`firestoreUtils: Getting rent collection status for ${currentMonth}`);
    
    const paidUnitIds = rentPayments
      .filter(payment => 
        payment.rentalPeriod === currentMonth && 
        (payment.paymentType === "Rent Payment" || !payment.paymentType)
      )
      .map(payment => payment.unitId);
    
    const unpaidLeases = activeLeases.filter(
      lease => !paidUnitIds.includes(lease.unitId)
    );
    
    const totalPendingAmount = unpaidLeases.reduce(
      (sum, lease) => sum + lease.rentAmount, 0
    );

    logger.info(`firestoreUtils: Found ${paidUnitIds.length} paid units and ${unpaidLeases.length} unpaid units`);
    
    return {
      paid: paidUnitIds.length,
      unpaid: unpaidLeases.length,
      unpaidLeases: unpaidLeases.sort((a, b) => b.rentAmount - a.rentAmount),
      totalPendingAmount
    };
  } catch (error: any) {
    logger.error(`firestoreUtils: Error getting rent collection status: ${error.message}`);
    throw new Error(error.message || 'Failed to get rent collection status.');
  }
};

/**
 * Gets upcoming and expired lease information
 * @param {Lease[]} activeLeases - Array of active leases
 * @param {number} daysThreshold - Number of days to look ahead for upcoming expirations (default 30)
 * @returns {{ leases: Array<Lease & { daysLeft: number }>, totalLeaseValue: number, count: number }}
 */
export const getLeaseExpirations = (
  activeLeases: Lease[],
  daysThreshold: number = 30
): {
  leases: Array<Lease & { daysLeft: number }>;
  totalLeaseValue: number;
  count: number;
} => {
  try {
    logger.info(`firestoreUtils: Getting lease expirations with ${daysThreshold} days threshold`);
    
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + daysThreshold);
    
    const expiringLeases = activeLeases
      .map(lease => {
        const endDate = new Date(lease.leaseEndDate);
        const daysLeft = Math.ceil(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { ...lease, daysLeft };
      })
      .filter(lease => lease.daysLeft <= daysThreshold)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const totalLeaseValue = expiringLeases.reduce(
      (sum, lease) => sum + lease.rentAmount, 0
    );

    logger.info(`firestoreUtils: Found ${expiringLeases.length} expiring leases worth ${totalLeaseValue}`);

    return {
      leases: expiringLeases,
      totalLeaseValue,
      count: expiringLeases.length
    };
  } catch (error: any) {
    logger.error(`firestoreUtils: Error getting lease expirations: ${error.message}`);
    throw new Error(error.message || 'Failed to get lease expirations.');
  }
};