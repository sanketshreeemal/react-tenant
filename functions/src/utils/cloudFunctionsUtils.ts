// cloudFunctionsUtils.ts
// Backend-only helpers for Cloud Functions (do not import in frontend/app)

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Helper: Send email using nodemailer (Gmail API)
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
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

// Helper: Fetch all users for a landlord
export async function getAllUsersForLandlord(landlordId: string) {
  const snapshot = await db.collection('allUsers').where('landlordId', '==', landlordId).get();
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
}

// Helper: Fetch automation matrix (TODO: implement actual Firestore logic)
export async function getAutomationMatrix(landlordId: string) {
  // TODO: Fetch from Firestore (e.g., landlords/{landlordId}/emailAutomation)
  // Return: { [userUid]: { [templateId]: boolean } }
  return {};
}

// Helper: Fetch leases, payments, etc. as needed
// TODO: Add more Firestore fetchers as needed for triggers and reports

// Helper: Import templates (TODO: import from src/templates or shared location)
// TODO: Import and use template logic for generating email content 