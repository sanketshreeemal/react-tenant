// src/lib/firebase/firestoreUtils.ts

import { db } from './firebase'; // Assuming you have firebase.ts to initialize Firebase
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { Tenant, Unit, Lease, RentPayment } from '@/types'; // Import our TypeScript interfaces
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
    logger.info("firestoreUtils: Adding tenant...", tenantData);
    const tenantsCollection = collection(db, 'tenants');
    const docRef = await addDoc(tenantsCollection, {
      ...tenantData,
      createdAt: new Date(), // Add createdAt timestamp
      updatedAt: new Date(), // Add updatedAt timestamp
    });
    logger.info("firestoreUtils: Tenant added successfully with ID:", docRef.id);
    return docRef.id; // Return the auto-generated document ID
  } catch (error: any) {
    logger.error("firestoreUtils: Error adding tenant:", error);
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
      logger.info(`firestoreUtils: Tenant ${tenantId} retrieved successfully.`, tenantData);
      return { id: docSnap.id, ...tenantData } as Tenant; // Include the document ID in the returned object
    } else {
      logger.info(`firestoreUtils: Tenant ${tenantId} not found.`);
      return undefined; // Tenant not found
    }
  } catch (error: any) {
    logger.error(`firestoreUtils: Error retrieving tenant ${tenantId}:`, error);
    throw new Error('Failed to retrieve tenant.');
  }
};


// Add more Firestore utility functions here for Units, Leases, RentPayments as we progress
// (e.g., getUnit, addLease, recordRentPayment, updateTenant, deleteTenant, etc.)


// ---------------------- Generic Firestore Helpers (Optional for now, can add later) ----------------------
// You can add generic helper functions here if needed, like a function to convert Firestore Timestamps to Date objects, etc.