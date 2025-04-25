// emailTriggers.ts
// Event-driven Cloud Functions for automated emails

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendEmail, getAllUsersForLandlord, getAutomationMatrix } from './utils/cloudFunctionsUtils';
// TODO: Import event templates from ../templates/indexEvent

// Example: Trigger on new lease creation
export const onNewLease = functions.firestore
  .document('landlords/{landlordId}/leases/{leaseId}')
  .onCreate(async (snap, context) => {
    const leaseData = snap.data();
    const landlordId = context.params.landlordId;
    // TODO: Fetch automation matrix for this landlord
    // const automationMatrix = await getAutomationMatrix(landlordId);
    // TODO: Determine which users should get this email
    // TODO: Generate email content using template
    // TODO: Send email using sendEmail helper
    // Example:
    // await sendEmail({ to, subject, html });
    return null;
  });

// TODO: Add more event-driven triggers as needed 