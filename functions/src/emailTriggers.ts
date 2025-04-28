// emailTriggers.ts
// Event-driven Cloud Functions for automated emails

import * as functions from "firebase-functions/v1";
import {
  sendEmail,
  getRecipientsForTemplate,
  logSentEmail,
  validateTemplateData,
  EmailTemplate,
} from "./utils/cloudFunctionsUtils";
import {emailEventTemplates} from "../../src/lib/email/templates/indexEvent";

/**
 * Creates a generic event handler for event-driven emails
 * @param {string} templateId - The ID of the email template to use
 * @param {string} docPath - The Firestore document path to watch
 * @param {function} extractData - Function to extract data from the document
 * @return {functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>} The configured Cloud Function
 */
function createEventTrigger(
  templateId: string,
  docPath: string,
  extractData: (
    snap: functions.firestore.QueryDocumentSnapshot
  ) => Record<string, unknown>
): functions.CloudFunction<functions.firestore.QueryDocumentSnapshot> {
  const template = emailEventTemplates.find((t) => t.id === templateId) as EmailTemplate;
  if (!template) throw new Error(`Template not found: ${templateId}`);

  return functions.firestore
    .document(docPath)
    .onCreate(async (snap, context) => {
      try {
        const landlordId = context.params.landlordId;
        const rawData = extractData(snap);
        const parsedData = validateTemplateData(template, rawData, {
          landlordId,
          event: templateId,
        });
        if (!parsedData) return null;

        const recipients = await getRecipientsForTemplate(landlordId, template.id);
        if (!recipients.length) return null;

        const {subject, html} = template.generate(parsedData);

        // Process each recipient independently with error handling
        const emailPromises = recipients.map(async (user) => {
          try {
            await sendEmail({to: user.email, subject, html});
            await logSentEmail(landlordId, {
              recipients: [user.email],
              subject,
              content: html,
              sentAt: new Date(),
              status: "sent",
              templateId: template.id,
            });
            return {success: true, email: user.email};
          } catch (error) {
            console.error(`Failed to send email to ${user.email} for ${template.id}:`, error);
            // Log the failed attempt
            await logSentEmail(landlordId, {
              recipients: [user.email],
              subject,
              content: html,
              sentAt: new Date(),
              status: "failed",
              templateId: template.id,
              error: error instanceof Error ? error.message : "Unknown error",
            });
            return {success: false, email: user.email, error};
          }
        });

        // Wait for all emails to be processed
        const results = await Promise.allSettled(emailPromises);
        const failedEmails = results
          .filter(
            (result): result is PromiseRejectedResult =>
              result.status === "rejected"
          )
          .map((result) => result.reason);

        if (failedEmails.length > 0) {
          console.error(`Failed to send ${failedEmails.length} emails for ${template.id}:`, failedEmails);
        }
        return null;
      } catch (error) {
        console.error(`Error in ${templateId} trigger:`, error);
        return null;
      }
    });
}

/**
 * Trigger for new lease creation
 */
export const onNewLease = createEventTrigger(
  "new-lease",
  "landlords/{landlordId}/leases/{leaseId}",
  (snap) => {
    const data = snap.data();
    return {
      tenantName: data.tenantName,
      unitNumber: data.unitNumber,
      leaseStartDate: data.leaseStartDate,
      leaseEndDate: data.leaseEndDate,
      rentAmount: data.rentAmount,
    };
  }
);

/**
 * Trigger for rent payment recording
 */
export const onRentPayment = createEventTrigger(
  "rent-payment",
  "landlords/{landlordId}/rent-collection/{paymentId}",
  (snap) => {
    const data = snap.data();
    return {
      tenantName: data.tenantName,
      unitNumber: data.unitNumber,
      amountPaid: data.actualRentPaid,
      paymentDate: data.paymentDate,
    };
  }
);

/*
TODO: Future Enhancements [DO NOT DELETE]
1. Add Lease Expiry Reminder Trigger
   - Could be triggered by a scheduled job or a manual action
   - Would notify landlords when leases are about to expire
2. Add Maintenance Request Trigger
   - Triggered when a new maintenance request is created
   - Would notify relevant parties about new maintenance issues
3. Add Tenant Welcome Email Trigger
   - Triggered when a new tenant is added to a lease
   - Would send welcome information and onboarding details
4. Add Payment Reminder Trigger
   - Could be scheduled to run before rent is due
   - Would remind tenants about upcoming payments
*/
