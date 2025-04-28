// cloudFunctionsUtils.ts
// Backend-only helpers for Cloud Functions (do not import in frontend/app)
// Note: Firebase Admin is initialized in index.ts, this file assumes it's already initialized

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import nodemailer from "nodemailer";
import {ZodError, z} from "zod";

// Get Firestore instance (assumes Firebase Admin is initialized in index.ts)
const db = admin.firestore();

/**
 * Sends an email using nodemailer (Gmail API)
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML content of the email
 * @return {Promise<nodemailer.SentMessageInfo>} Information about the sent message
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<nodemailer.SentMessageInfo> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: functions.config().gmail.user,
      pass: functions.config().gmail.pass,
    },
  });
  return transporter.sendMail({
    from: `Property Management <${functions.config().gmail.user}>`,
    to,
    subject,
    html,
  });
}


/**
 * Helper function to fetch all users for a landlord.
 * @param {string} landlordId The ID of the landlord.
 * @return {Promise<Array<{uid: string; [key: string]: any}>>} Array of user objects with their data.
 */
export async function getAllUsersForLandlord(landlordId: string) {
  const snapshot = await db.collection("allUsers")
    .where("landlordId", "==", landlordId)
    .get();
  return snapshot.docs.map((doc) => ({uid: doc.id, ...doc.data()}));
}
/**
 * Type definition for the automation matrix.
 * Maps user IDs to their template permissions.
 */
export type AutomationMatrix = {
    [userId: string]: {
      [templateId: string]: boolean;
    };
  };

/**
 * Fetch the automation matrix for a landlord
 * @param {string} landlordId - The ID of the landlord
 * @return {Promise<AutomationMatrix>} Promise resolving to the automation matrix
 */
export async function getAutomationMatrix(landlordId: string): Promise<AutomationMatrix> {
  const docRef = db.collection("landlords")
    .doc(landlordId)
    .collection("automationMatrix")
    .doc("matrix");
  const doc = await docRef.get();
  if (!doc.exists) {
    return {};
  }
  return doc.data() as AutomationMatrix;
}

// Type for user (from allUsers)
export interface AllUser {
  uid: string;
  email: string;
  [key: string]: unknown; // Use unknown instead of any
}

/**
 * Interface for email templates
 * @template T - The type of data expected by the template
 */
export interface EmailTemplate<T = unknown> {
  id: string;
  schema: z.ZodType<T>; // Use z.ZodType instead of Zod.Schema
  generate: (data: T) => {subject: string; html: string};
}

/**
 * Get recipients for a specific email template
 * @param {string} landlordId - The ID of the landlord
 * @param {string} templateId - The ID of the email template
 * @return {Promise<AllUser[]>} Array of users who should receive the email
 */
export async function getRecipientsForTemplate(
  landlordId: string,
  templateId: string
): Promise<AllUser[]> {
  const matrix = await getAutomationMatrix(landlordId);
  if (!matrix || Object.keys(matrix).length === 0) return [];

  // Find userIds with matrix[userId][templateId] === true
  const recipientUserIds = Object.entries(matrix)
    .filter(([, perms]) => perms[templateId]) // Use comma instead of underscore
    .map(([userId]) => userId);

  if (recipientUserIds.length === 0) return [];

  // 3. Fetch user details from allUsers
  // Firestore 'in' queries are limited to 10 items per query, so batch if needed
  const batchSize = 10;
  let users: AllUser[] = [];
  for (let i = 0; i < recipientUserIds.length; i += batchSize) {
    const batchIds = recipientUserIds.slice(i, i + batchSize);
    const snapshot = await db.collection("allUsers")
      .where(admin.firestore.FieldPath.documentId(), "in", batchIds)
      .get();
    users = users.concat(
      snapshot.docs.map((doc) => ({uid: doc.id, ...doc.data()} as AllUser))
    );
  }
  return users;
}

// Helper: Fetch leases, payments, etc. as needed
// TODO: Add more Firestore fetchers as needed for triggers and reports

// Helper: Import templates (TODO: import from src/templates or shared location)
// TODO: Import and use template logic for generating email content

/**
 * Validates data against a template's Zod schema. Logs and returns null if invalid.
 * @template T - The type of the template data
 * @param {EmailTemplate<T>} template - The email template (with schema)
 * @param {unknown} data - The data to validate
 * @param {Record<string, unknown>} [context] - Optional context for logging
 * @return {T | null} Parsed data if valid, null if invalid
 */
export function validateTemplateData<T>(
  template: EmailTemplate<T>,
  data: unknown,
  context?: Record<string, unknown>
): T | null {
  try {
    return template.schema.parse(data) as T;
  } catch (err) {
    if (err instanceof ZodError) {
      console.error("Schema validation failed:", {
        templateId: template.id,
        errors: err.errors,
        data,
        context,
      });
    } else {
      console.error("Unknown validation error:", err);
    }
    return null;
  }
}

/**
 * Logs a sent email in Firestore under landlords/{landlordId}/emails
 * @param {string} landlordId - The landlord's Firestore document ID
 * @param {Object} emailData - The email data to log
 * @param {string[]} emailData.recipients - Array of recipient email addresses
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.content - Email content
 * @param {Date} emailData.sentAt - When the email was sent
 * @param {"sent" | "failed" | "pending"} emailData.status - Email status
 * @param {string} [emailData.templateId] - Optional template ID
 * @param {string} [emailData.error] - Optional error message
 * @return {Promise<void>}
 */
export async function logSentEmail(
  landlordId: string,
  emailData: {
    recipients: string[];
    subject: string;
    content: string;
    sentAt: Date;
    status: "sent" | "failed" | "pending";
    templateId?: string;
    error?: string;
  }
): Promise<void> {
  const db = admin.firestore();
  await db.collection("landlords")
    .doc(landlordId)
    .collection("emails")
    .add(emailData);
}
