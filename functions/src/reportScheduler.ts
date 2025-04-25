// reportScheduler.ts
// Scheduled Cloud Functions for periodic report emails

import * as functions from 'firebase-functions';
import { sendEmail, getAllUsersForLandlord, getAutomationMatrix } from './utils/cloudFunctionsUtils';
// TODO: Import report templates from ../templates/indexReport

// Example: Biweekly summary report
export const biweeklyReport = functions.pubsub
  .schedule('every 2 weeks')
  .onRun(async (context) => {
    // TODO: Gather stats for the report
    // TODO: Fetch automation matrix for all landlords
    // TODO: For each landlord, determine which users should get this report
    // TODO: Generate email content using template
    // TODO: Send email using sendEmail helper
    // Example:
    // await sendEmail({ to, subject, html });
    return null;
  });

// TODO: Add more scheduled report functions as needed 