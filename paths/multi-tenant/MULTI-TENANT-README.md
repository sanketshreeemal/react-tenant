# Multi-Tenant Migration Guide

This guide explains how to initialize the multi-tenant structure for your application and implement the necessary changes.

## Prerequisites

1. Node.js installed on your machine
2. Firebase Admin SDK service account key (JSON file)

## Understanding the Multi-Tenant Implementation

### Collection Structure
- **landlords**: Top-level collection containing documents for each landlord
- **approvedLandlords**: Collection of pre-approved email addresses that can create landlord accounts
- **users**: Collection storing user profiles with references to their landlordId
- **[All other collections]**: Now exist as subcollections under each landlord document

### Authentication Flow
1. A user signs in with Google authentication
2. The system checks if their email exists in the approvedLandlords collection
3. If approved, they're either:
   - Associated with an existing landlord account, or
   - Prompted to create a new landlord account
4. The landlordId is stored in the authentication context and used to scope all data access

### Custom Hooks
The `useLandlord` custom hook provides easy access to the current landlord context throughout the application:
- Centralizes landlordId retrieval logic
- Handles loading and error states
- Prevents repetitive code in components
- Example usage: `const { landlordId, isLoading } = useLandlord();`

### Higher-Order Component (HOC)
The `withLandlordContext` HOC:
- Wraps components to ensure they only render when a valid landlordId is available
- Redirects unauthenticated or unauthorized users
- Protects routes that require landlord access
- Example: `export default withLandlordContext(YourComponent);`

## Steps to Initialize Multi-Tenant Structure

### 1. Set up Service Account Key

1. Go to your Firebase Project Console > Project Settings > Service Accounts
2. Click "Generate New Private Key" to download a new service account key
3. Save the downloaded JSON file as `service-account-key.json` in the root directory of your project

### 2. Run the Consolidated Initialization Script

```bash
# Install dependencies (if not already installed)
npm install

# Run the consolidated initialization script (creates all required collections)
npm run init-multi-tenant
```

This script will:
- Create the approvedLandlords collection with initial approved emails
- Create the landlords collection with initial landlord documents
- Migrate all existing collections as subcollections under landlord1
- Create the users collection with appropriate records

### 3. Verify Migration

After running the script, verify in the Firebase Console that:

1. The `landlords` collection has been created with required documents
2. All of your previous top-level collections have been moved as subcollections under landlord1
3. The `approvedLandlords` collection contains the approved email addresses
4. The `users` collection has been created with records from the adminAccess collection

**Important Note**: In the Firebase Console, subcollections are only visible when you:
1. Click into a specific document within the landlords collection
2. Look at the "Collections" tab within that document
3. The subcollection must have at least one document to be visible

### 4. Manual Migration (If Needed)

If the automatic migration script fails or you prefer to migrate manually, follow these steps in the Firebase Console:

1. **Create Landlord Documents**:
   - Create a new collection called `landlords`
   - Add a document with ID `landlord1` containing:
     ```json
     {
       "landlordName": "Your Name",
       "landlordEmail": "your.email@example.com",
       "createdAt": ServerTimestamp,
       "updatedAt": ServerTimestamp
     }
     ```

2. **Migrate Collections Manually**:
   - For each collection you want to migrate:
     1. Open the source collection
     2. Export the collection data (using Firebase Console's Export JSON feature)
     3. Navigate to: landlords > landlord1
     4. Create a new collection with the same name as the source
     5. Import the exported JSON data
     6. Add `landlordId: "landlord1"` field to each document

3. **Verify Manual Migration**:
   - Click into the landlord1 document
   - Check that all subcollections are present
   - Verify document counts match the original collections
   - Test a few documents to ensure data integrity

### 5. Clean Up

Once the migration is complete and verified, run the cleanup script to remove initialization files:

```bash
npm run cleanup-migration
```

This script will:
- Remove the initialization scripts and admin panel components
- Remove the service account key
- Remove temporary migration utility files
- Keep only the necessary production code

**Important:** Keep the `landlordUtils.ts` file as it contains useful utility functions for the multi-tenant application.

## Using the Multi-Tenant Structure in Components

### Basic Component Example
```tsx
import { useLandlord } from '@/hooks/useLandlord';
import { getAllLeases } from '@/lib/firebase/firestoreUtils';
import { useEffect, useState } from 'react';

function LeaseList() {
  const { landlordId, isLoading } = useLandlord();
  const [leases, setLeases] = useState([]);
  
  useEffect(() => {
    // Only fetch data when landlordId is available
    if (landlordId) {
      const fetchLeases = async () => {
        const fetchedLeases = await getAllLeases(landlordId);
        setLeases(fetchedLeases);
      };
      
      fetchLeases();
    }
  }, [landlordId]);
  
  if (isLoading) return <p>Loading...</p>;
  
  return (
    <div>
      {/* Your component UI */}
    </div>
  );
}

export default LeaseList;
```

### Protected Component Example
```tsx
import { withLandlordContext } from '@/components/hoc/withLandlordContext';

function SecureComponent({ landlordId }) {
  // This component will only render if a valid landlordId exists
  // Otherwise, the HOC redirects to login
  
  return (
    <div>
      {/* Your secure component UI */}
    </div>
  );
}

export default withLandlordContext(SecureComponent);
```

## Troubleshooting

- **Error: "Service account file not found"**: Make sure the service-account-key.json file is in the root directory.
- **Error: "Permission denied"**: Ensure your service account has sufficient permissions to read/write to the Firestore database.
- **Migration incomplete**: Check the console output for specific error messages. You may need to run specific parts of the migration manually.
- **Subcollections not visible**: Remember that subcollections only appear when you click into a specific landlord document. They won't be visible at the root level.
- **Authentication issues**: Verify that the user's email exists in the approvedLandlords collection and that the user document has the correct landlordId.

## Next Steps for Implementation

1. **Incorporate Authentication Changes**:
   - Update your AuthProvider to retrieve and store the landlordId
   - Implement the login flow with approvedLandlord verification

2. **Add Custom Hooks to Your Project**:
   - Add the useLandlord hook to your hooks directory
   - Use the hook in components that need access to the landlordId

3. **Implement Higher-Order Components**:
   - Add the withLandlordContext HOC to protect authenticated routes
   - Apply the HOC to components that require authentication

4. **Update Firestore Utility Functions**:
   - Modify all Firestore utility functions to include the landlordId parameter
   - Update collection paths to use the landlordId in the path

5. **Update UI Components**:
   - Modify components to use the landlordId when fetching or updating data
   - Add loading states while landlordId is being retrieved

6. **Test the Multi-Tenant Structure**:
   - Test with multiple landlord accounts to ensure data isolation
   - Verify that users can only access their landlord's data
   - Test all CRUD operations with the new multi-tenant structure 
 