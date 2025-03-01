import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import logger from '../logger';

/**
 * Add a document to Firestore with timeout and error handling
 * @param collectionName The collection to add the document to
 * @param data The document data
 * @param timeoutMs Timeout in milliseconds (default: 15000 - 15 seconds)
 * @returns Promise with the document reference
 */
export const addDocumentWithTimeout = async (
  collectionName: string,
  data: any,
  timeoutMs: number = 15000
) => {
  try {
    logger.info(`Adding document to ${collectionName}`, {
      additionalInfo: {
        collection: collectionName,
        dataKeys: Object.keys(data)
      }
    });

    // Create the add document promise
    const addDocPromise = addDoc(collection(db, collectionName), data);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Firestore addDoc operation timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    });
    
    // Race the promises to implement the timeout
    const docRef = await Promise.race([addDocPromise, timeoutPromise]);
    
    logger.info(`Document added successfully to ${collectionName}`, {
      additionalInfo: {
        documentId: docRef.id,
        collection: collectionName
      }
    });
    
    return docRef;
  } catch (error) {
    logger.error(`Error adding document to ${collectionName}`, {
      additionalInfo: {
        collection: collectionName,
        dataKeys: Object.keys(data),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    throw error;
  }
};

/**
 * Update a document in Firestore with timeout and error handling
 * @param collectionName The collection containing the document
 * @param documentId The document ID
 * @param data The update data
 * @param timeoutMs Timeout in milliseconds (default: 15000 - 15 seconds)
 */
export const updateDocumentWithTimeout = async (
  collectionName: string,
  documentId: string,
  data: any,
  timeoutMs: number = 15000
) => {
  try {
    logger.info(`Updating document in ${collectionName}`, {
      additionalInfo: {
        collection: collectionName,
        documentId,
        dataKeys: Object.keys(data)
      }
    });

    // Create the document reference
    const docRef = doc(db, collectionName, documentId);
    
    // Create the update document promise
    const updateDocPromise = updateDoc(docRef, data);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Firestore updateDoc operation timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    });
    
    // Race the promises to implement the timeout
    await Promise.race([updateDocPromise, timeoutPromise]);
    
    logger.info(`Document updated successfully in ${collectionName}`, {
      additionalInfo: {
        documentId,
        collection: collectionName
      }
    });
  } catch (error) {
    logger.error(`Error updating document in ${collectionName}`, {
      additionalInfo: {
        collection: collectionName,
        documentId,
        dataKeys: Object.keys(data),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    throw error;
  }
};

/**
 * Get documents from Firestore with timeout and error handling
 * @param collectionName The collection to query
 * @param constraints Optional query constraints (where, orderBy, limit)
 * @param timeoutMs Timeout in milliseconds (default: 15000 - 15 seconds)
 * @returns Promise with the query snapshot
 */
export const getDocumentsWithTimeout = async (
  collectionName: string,
  constraints: any[] = [],
  timeoutMs: number = 15000
) => {
  try {
    logger.info(`Querying documents from ${collectionName}`, {
      additionalInfo: {
        collection: collectionName,
        constraintsCount: constraints.length
      }
    });

    // Create the collection reference and apply constraints
    const collectionRef = collection(db, collectionName);
    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
    
    // Create the get documents promise
    const getDocsPromise = getDocs(q);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Firestore getDocs operation timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    });
    
    // Race the promises to implement the timeout
    const querySnapshot = await Promise.race([getDocsPromise, timeoutPromise]);
    
    logger.info(`Documents retrieved successfully from ${collectionName}`, {
      additionalInfo: {
        collection: collectionName,
        documentCount: querySnapshot.size
      }
    });
    
    return querySnapshot;
  } catch (error) {
    logger.error(`Error querying documents from ${collectionName}`, {
      additionalInfo: {
        collection: collectionName,
        constraintsCount: constraints.length,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    throw error;
  }
}; 