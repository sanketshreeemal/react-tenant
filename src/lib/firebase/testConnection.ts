import { db, storage } from './firebase';
import { collection, addDoc, getDocs, DocumentData } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import logger from '../logger';

/**
 * Test Firebase Firestore connection by adding and retrieving a test document
 */
export const testFirestoreConnection = async (): Promise<{success: boolean; error?: string; details?: any}> => {
  try {
    logger.info('Testing Firestore connection...');
    
    // Create a test document
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Connection test'
    };
    
    // Add the test document with a timeout
    const addDocPromise = addDoc(collection(db, 'connectionTests'), testData);
    
    // Set a timeout for the operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firestore connection timed out after 10 seconds')), 10000);
    });
    
    // Race the promises
    const docRef = await Promise.race([addDocPromise, timeoutPromise]) as any;
    
    logger.info(`Test document added with ID: ${docRef.id}`);
    
    // Retrieve the test document
    const querySnapshot = await getDocs(collection(db, 'connectionTests'));
    logger.info(`Retrieved ${querySnapshot.size} test documents`);
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code || 'unknown';
    
    logger.error('Firestore connection test failed', {
      additionalInfo: {
        error: errorMessage,
        code: errorCode,
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    
    return { 
      success: false, 
      error: errorMessage,
      details: {
        code: errorCode,
        stack: error instanceof Error ? error.stack : undefined
      }
    };
  }
};

/**
 * Test Firebase Storage connection by uploading and retrieving a test file
 */
export const testStorageConnection = async (): Promise<{success: boolean; error?: string; details?: any}> => {
  try {
    logger.info('Testing Firebase Storage connection...');
    
    // Create a small test file (as a Blob)
    const testContent = 'Test file content for Firebase Storage connection test';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    // Create a reference to the test file location
    const testFilePath = `connection_tests/test_${Date.now()}.txt`;
    const storageRef = ref(storage, testFilePath);
    
    // Upload the test file with a timeout
    const uploadPromise = uploadBytes(storageRef, testFile);
    
    // Set a timeout for the operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Storage connection timed out after 15 seconds')), 15000);
    });
    
    // Race the promises
    await Promise.race([uploadPromise, timeoutPromise]);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    logger.info(`Test file uploaded successfully. Download URL: ${downloadURL}`);
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code || 'unknown';
    const serverResponse = (error as any)?.customData?.serverResponse || '';
    
    logger.error('Firebase Storage connection test failed', {
      additionalInfo: {
        error: errorMessage,
        code: errorCode,
        serverResponse,
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    
    return { 
      success: false, 
      error: errorMessage,
      details: {
        code: errorCode,
        serverResponse,
        stack: error instanceof Error ? error.stack : undefined
      }
    };
  }
};

/**
 * Run all Firebase connection tests
 */
export const testFirebaseConnections = async (): Promise<{
  firestore: {success: boolean; error?: string; details?: any};
  storage: {success: boolean; error?: string; details?: any};
}> => {
  const firestoreResult = await testFirestoreConnection();
  const storageResult = await testStorageConnection();
  
  return {
    firestore: firestoreResult,
    storage: storageResult
  };
}; 