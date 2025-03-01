/**
 * Simple Firebase connection test script
 */

// Import Firebase modules
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, limit, deleteDoc, doc } = require('firebase/firestore');
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDqg1M3QzLjNEXm7ZwvpjVT5O-BrOnMpOU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tenant-mgmt-a7f81.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tenant-mgmt-a7f81",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tenant-mgmt-a7f81.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "734544321530",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:734544321530:web:e8ce8d8b00dd51fed2a243"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

console.log('Firebase initialized with config:', {
  ...firebaseConfig,
  apiKey: '[HIDDEN]',
  appId: '[HIDDEN]'
});

// Test Firestore connection
async function testFirestore() {
  console.log('\n--- Testing Firestore Connection ---');
  try {
    // Create a test document
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Connection test'
    };
    
    console.log('Adding test document to Firestore...');
    const docRef = await addDoc(collection(db, 'connection_tests'), testData);
    console.log(`Test document added with ID: ${docRef.id}`);
    
    // Query the document back
    console.log('Querying test document...');
    const q = query(collection(db, 'connection_tests'), where('test', '==', true), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('No documents found');
    } else {
      console.log(`Found ${querySnapshot.size} document(s)`);
      
      // Clean up - delete the test document
      console.log('Cleaning up - deleting test document...');
      await deleteDoc(doc(db, 'connection_tests', docRef.id));
      console.log('Test document deleted');
    }
    
    console.log('✅ Firestore connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Firestore connection test failed:', error);
    return false;
  }
}

// Test Storage connection
async function testStorage() {
  console.log('\n--- Testing Firebase Storage Connection ---');
  try {
    // Create a small test file
    const testContent = 'Test file content for Firebase Storage connection test';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    const testFilePath = `connection_tests/test_${Date.now()}.txt`;
    
    console.log(`Uploading test file to ${testFilePath}...`);
    const storageRef = ref(storage, testFilePath);
    await uploadBytes(storageRef, testFile);
    console.log('Test file uploaded successfully');
    
    // Get the download URL
    console.log('Getting download URL...');
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`Download URL: ${downloadURL}`);
    
    // Clean up - delete the test file
    console.log('Cleaning up - deleting test file...');
    await deleteObject(storageRef);
    console.log('Test file deleted');
    
    console.log('✅ Firebase Storage connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Firebase Storage connection test failed:', error);
    return false;
  }
}

// Run the tests
async function runTests() {
  console.log('=== Firebase Connection Tests ===');
  
  const firestoreResult = await testFirestore();
  const storageResult = await testStorage();
  
  console.log('\n=== Test Results ===');
  console.log(`Firestore: ${firestoreResult ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`Storage: ${storageResult ? 'PASS ✅' : 'FAIL ❌'}`);
  
  if (firestoreResult && storageResult) {
    console.log('\n✅ All Firebase services are working correctly');
  } else {
    console.log('\n❌ Some Firebase services are not working correctly');
  }
}

// Run the tests
runTests().catch(console.error); 