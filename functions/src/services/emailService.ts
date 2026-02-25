/**
 * Email Service
 *
 * Handles email sending and logging functionality.
 * Extracted from index.ts for better organization and reusability.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import nodemailer from "nodemailer";

export type MailAttachment = { filename: string; content: string };

export interface EmailLogData {
  recipients: string[];
  subject: string;
  content: string;
  sentAt: Date;
  status: "sent" | "failed" | "pending";
  templateId?: string;
  error?: string;
}

/**
 * Sends an email using Nodemailer with Gmail configuration
 *
 * @param options - Email options including recipient, subject, HTML content, and optional attachments
 * @returns Promise that resolves when email is sent
 * @throws Error if Gmail credentials are missing or email sending fails
 */
export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}): Promise<void> {
  const user = functions.config().gmail?.user as string | undefined;
  const pass = functions.config().gmail?.pass as string | undefined;

  if (!user || !pass) {
    throw new Error("Missing gmail.user or gmail.pass in functions config");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `Property Management <${user}>`,
    to,
    subject,
    html,
    attachments: attachments?.map((att) => ({
      filename: att.filename,
      content: att.content,
    })),
  });
}

/**
 * Logs email activity to Firestore
 *
 * @param landlordId - The landlord ID to associate the email log with
 * @param emailData - Email log data including recipients, subject, content, status, etc.
 * @returns Promise that resolves when email log is saved
 */
export async function logSentEmail(
  landlordId: string,
  emailData: EmailLogData
): Promise<void> {
  const db = admin.firestore();
  await db.collection("landlords").doc(landlordId).collection("emails").add(emailData);
}
