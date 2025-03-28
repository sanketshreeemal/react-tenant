import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, addDoc } from 'firebase/firestore';
import logger from '@/lib/logger';
import { User } from 'firebase/auth';

// This file contains utility functions for landlord operations
// It has been cleaned up to remove initialization functions that are no longer needed

/**
 * Gets a landlord by ID
 * @param landlordId - The ID of the landlord
 * @returns The landlord document data
 */
export const getLandlord = async (landlordId: string) => {
  try {
    logger.info(`landlordUtils: Getting landlord with ID: ${landlordId}`);
    const landlordDocRef = doc(db, 'landlords', landlordId);
    const docSnap = await getDoc(landlordDocRef);

    if (docSnap.exists()) {
      const landlordData = docSnap.data();
      logger.info(`landlordUtils: Landlord ${landlordId} retrieved successfully.`);
      return { id: docSnap.id, ...landlordData };
    } else {
      logger.info(`landlordUtils: Landlord ${landlordId} not found.`);
      return null;
    }
  } catch (error: any) {
    logger.error(`landlordUtils: Error getting landlord ${landlordId}: ${error.message}`);
    throw error;
  }
};



/**
 * Gets a landlord by email
 * @param email - The email of the landlord
 * @returns The landlord document data with ID
 */
export const getLandlordByEmail = async (email: string) => {
  try {
    logger.info(`landlordUtils: Getting landlord with email: ${email}`);
    const landlordsCollection = collection(db, 'landlords');
    const q = query(landlordsCollection, where('landlordEmail', '==', email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const landlordData = doc.data();
      logger.info(`landlordUtils: Landlord with email ${email} retrieved successfully.`);
      return { id: doc.id, ...landlordData };
    } else {
      logger.info(`landlordUtils: No landlord found with email ${email}.`);
      return null;
    }
  } catch (error: any) {
    logger.error(`landlordUtils: Error getting landlord by email ${email}: ${error.message}`);
    throw error;
  }
}; 

