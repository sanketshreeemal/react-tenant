//New rules from Gemini YOLO prompt
 rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow reading approvedLandlords collection for authentication
    match /approvedLandlords/{document} {
      allow read: if request.auth != null;
      allow write: if false; // Managed via Admin SDK/Console
    }

    // Rules for 'invitations' collection
    match /invitations/{invitationId} {
       allow create: if request.auth != null &&
                      exists(/databases/$(database)/documents/allUsers/$(request.auth.uid)) &&
                      request.resource.data.landlordId == get(/databases/$(database)/documents/allUsers/$(request.auth.uid)).data.landlordId;
       allow read, delete: if request.auth != null; // Read/Delete allowed for backend logic triggered by auth user
       allow update: if false;
    }

    // Rule for allUsers collection
    match /allUsers/{userId} {
      allow read: if request.auth != null;
      // Allow writes initiated by authenticated users (via backend logic like handleAuthFlow/createUserDocument)
      allow write: if request.auth != null && request.auth.uid != null;
      allow delete: if false; // Deletes must go through removeUserAccess function logic
    }

    // Rule for users collection
    match /users/{userId} {
      // Users can manage their own document (get, update)
      allow get, update: if request.auth != null && request.auth.uid == userId;
      
      // Allow LIST operation (needed for querying with `where`) 
      // if the requesting user exists in allUsers and belongs to the same landlordId 
      // as the documents being listed.
      allow list: if request.auth != null &&
                     exists(/databases/$(database)/documents/allUsers/$(request.auth.uid)) &&
                     get(/databases/$(database)/documents/allUsers/$(request.auth.uid)).data.landlordId == resource.data.landlordId;

      // Allow create operations initiated by authenticated users (via backend logic)
      allow create: if request.auth != null;
      
      // Explicitly deny direct writes/deletes from client
      allow write: if request.auth != null && request.auth.uid == userId; // Allow write only to own doc
      allow delete: if false; // Deletes must go through removeUserAccess function logic
    }

    // Rule for landlord-specific data
    match /landlords/{landlordId}/{document=**} {
      allow read, write: if request.auth != null &&
        // Ensure user is associated with this landlordId via allUsers collection
        exists(/databases/$(database)/documents/allUsers/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/allUsers/$(request.auth.uid)).data.landlordId == landlordId;
    }
  }
}