import { NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase/firebase';
import { collection, addDoc, getDocs, query, where, limit, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import logger from '@/lib/logger';

// Test data
const TEST_TENANT = {
  unitNumber: 'TEST-001',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phone: '1234567890',
  leaseStart: '2023-01-01',
  leaseEnd: '2023-12-31',
  rentAmount: 1000,
  securityDeposit: 2000,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Test Firestore operations
 */
async function testFirestore() {
  try {
    logger.info('Testing Firestore operations');
    
    // Add test tenant
    const testTenantRef = await addDoc(collection(db, 'test_tenants'), TEST_TENANT);
    logger.info(`Test tenant added with ID: ${testTenantRef.id}`);
    
    // Query test tenant
    const q = query(
      collection(db, 'test_tenants'),
      where('email', '==', TEST_TENANT.email),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    logger.info(`Query returned ${querySnapshot.size} results`);
    
    if (querySnapshot.size > 0) {
      logger.info('Test tenant found in database');
      
      // Clean up - delete test tenant
      await deleteDoc(doc(db, 'test_tenants', querySnapshot.docs[0].id));
      logger.info('Test tenant deleted');
    }
    
    return { success: true, message: 'Firestore operations test completed successfully' };
  } catch (error) {
    logger.error('Error testing Firestore operations', {
      additionalInfo: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    return { 
      success: false, 
      message: 'Firestore operations test failed', 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test Firebase Storage operations
 */
async function testStorage() {
  try {
    logger.info('Testing Firebase Storage operations');
    
    // Create test file (as Blob)
    const testContent = 'Test file content for Firebase Storage connection test';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    const testFilePath = `test/test_file_${Date.now()}.txt`;
    
    // Upload test file
    logger.info(`Uploading test file to ${testFilePath}`);
    const storageRef = ref(storage, testFilePath);
    await uploadBytes(storageRef, testFile);
    logger.info('Test file uploaded successfully');
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    logger.info(`Download URL obtained: ${downloadURL}`);
    
    // Clean up - delete test file
    await deleteObject(storageRef);
    logger.info('Test file deleted');
    
    return { success: true, message: 'Firebase Storage operations test completed successfully' };
  } catch (error) {
    logger.error('Error testing Firebase Storage operations', {
      additionalInfo: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    return { 
      success: false, 
      message: 'Firebase Storage operations test failed', 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test Firebase operations with timeout
 */
async function testWithTimeout<T>(testFn: () => Promise<T>, timeoutMs: number = 15000): Promise<T> {
  return Promise.race([
    testFn(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    })
  ]);
}

export async function GET() {
  try {
    logger.info('Starting Firebase API endpoint testing');
    
    // Test Firestore with timeout
    const firestoreResult = await testWithTimeout(testFirestore);
    
    // Test Storage with timeout
    const storageResult = await testWithTimeout(testStorage);
    
    // Prepare response
    const results = {
      firestore: firestoreResult,
      storage: storageResult,
      allPassed: firestoreResult.success && storageResult.success
    };
    
    logger.info('Firebase API endpoint testing completed', {
      additionalInfo: { results }
    });
    
    return NextResponse.json(results);
  } catch (error) {
    logger.error('Firebase API endpoint testing failed', {
      additionalInfo: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      success: false
    }, { status: 500 });
  }
} 