# Firebase Setup Guide

This guide will help you fix the Firebase connection issues that are preventing you from adding new tenants to your application.

## Issue Diagnosis

The application is encountering permission errors when trying to connect to Firebase services:

1. **Firestore Database**: Permission denied error
2. **Firebase Storage**: Unknown error (likely also a permission issue)

These errors occur because the Firebase security rules are not properly configured to allow read/write access to your application.

## Solution: Update Firebase Security Rules

Follow these steps to update your Firebase security rules:

### Step 1: Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `tenant-mgmt-a7f81`

### Step 2: Update Firestore Rules

1. In the Firebase Console, navigate to **Firestore Database** in the left sidebar
2. Click on the **Rules** tab
3. Replace the existing rules with the following:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all users for all documents
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

4. Click **Publish** to save the changes

### Step 3: Update Storage Rules

1. In the Firebase Console, navigate to **Storage** in the left sidebar
2. Click on the **Rules** tab
3. Replace the existing rules with the following:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow read/write access to all users for all files
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

4. Click **Publish** to save the changes

### Step 4: Verify Storage Bucket

1. In the Firebase Console, navigate to **Storage** in the left sidebar
2. Check the URL of your storage bucket at the top of the page
3. Verify that it matches the value in your `.env.local` file:
   ```
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tenant-mgmt-a7f81.appspot.com
   ```
4. If it doesn't match, update your `.env.local` file with the correct value

### Step 5: Restart Your Application

1. Stop your development server (if running)
2. Start it again with `npm run dev`
3. Try adding a tenant again

## Security Considerations

The rules provided above allow unrestricted access to your Firebase resources, which is suitable for development but **not recommended for production**. 

For a production environment, you should implement proper authentication and restrict access based on user roles. Here's an example of more secure rules:

### Firestore Production Rules Example

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Require authentication for all operations
    match /tenants/{tenantId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /leases/{leaseId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /connectionTests/{testId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Production Rules Example

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Require authentication for all operations
    match /tenants/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /connection_tests/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Troubleshooting

If you're still experiencing issues after following these steps:

1. Check the browser console for detailed error messages
2. Verify that your Firebase project is properly set up and the services are enabled
3. Ensure that your Firebase API key and other credentials in `.env.local` are correct
4. Try running the test script to verify the connection:
   ```
   node src/scripts/testConnection.js
   ```
5. If the issue persists, you may need to check your Firebase project's billing status or service quotas 