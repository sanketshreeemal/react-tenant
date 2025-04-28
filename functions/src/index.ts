/**
 * Main entry point for Firebase Cloud Functions
 *
 * This file:
 * 1. Initializes Firebase Admin
 * 2. Exports all event-driven and scheduled functions
 * 3. Sets up error handling and logging
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import {onNewLease, onRentPayment} from "./emailTriggers";
import {summaryReportBiweekly, summaryReportMonthly} from "./reportScheduler";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Validate required configuration
const requiredConfig = ["gmail.user", "gmail.pass"];
for (const config of requiredConfig) {
  if (!functions.config().gmail?.[config.split(".")[1]]) {
    throw new Error(`Missing required Firebase config: ${config}`);
  }
}

// Global error handler for all functions
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Log to Firebase Monitoring
  functions.logger.error("Unhandled Rejection", {reason, promise});
});

// Export all functions
export {onNewLease, onRentPayment, summaryReportBiweekly, summaryReportMonthly};
