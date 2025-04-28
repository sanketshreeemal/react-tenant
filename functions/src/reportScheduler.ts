/**
 * Scheduled Cloud Functions for periodic report emails
 *
 * This file:
 * 1. Defines helper functions for report data calculation
 * 2. Implements scheduled Cloud Functions for different report cadences
 * 3. Handles email generation and sending for reports
 */

import * as functions from "firebase-functions/v1";
import {
  sendEmail,
  getRecipientsForTemplate,
  logSentEmail,
  validateTemplateData,
  EmailTemplate,
} from "./utils/cloudFunctionsUtils";
import {emailReportTemplates} from "../../src/lib/email/templates/indexReport";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";

interface Lease {
  id: string;
  createdAt: Timestamp;
  leaseEndDate?: Timestamp;
  isActive?: boolean;
}

interface Payment {
  id: string;
  paymentDate: Timestamp;
  actualRentPaid: number;
}

interface RentalUnit {
  id: string;
}

/**
 * Helper to calculate period start/end dates
 * @param {string} cadence - The report cadence (biweekly, monthly, or quarterly)
 * @return {Object} Object containing start and end dates for the period
 */
function getPeriodDates(
  cadence: "biweekly" | "monthly" | "quarterly"
): {start: Date; end: Date} {
  const now = new Date();
  let start: Date;
  let end: Date;
  end = new Date(now);
  if (cadence === "biweekly") {
    // Last 14 days
    start = new Date(now);
    start.setDate(now.getDate() - 13);
  } else if (cadence === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else {
    // Calculate the start and end dates for the quarter
    const quarter = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), quarter * 3, 1);
    end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
  }
  return {start, end};
}

/**
 * Helper to aggregate report data for a landlord
 * @param {string} landlordId - The ID of the landlord
 * @param {Date} periodStart - Start date of the reporting period
 * @param {Date} periodEnd - End date of the reporting period
 * @return {Promise<Object>} Object containing period, totalRentCollected, newLeases, endedLeases, and occupancyRate
 */
async function getSummaryReportData(
  landlordId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{
  period: string;
  totalRentCollected: number;
  newLeases: number;
  endedLeases: number;
  occupancyRate: number;
}> {
  const db = admin.firestore();
  // Fetch leases
  const leasesSnap = await db.collection(`landlords/${landlordId}/leases`).get();
  const leases = leasesSnap.docs.map((doc) => ({id: doc.id, ...doc.data()} as Lease));
  // Fetch payments
  const paymentsSnap = await db.collection(`landlords/${landlordId}/rent-collection`).get();
  const payments = paymentsSnap.docs.map((doc) => ({id: doc.id, ...doc.data()} as Payment));
  // Fetch rental inventory
  const inventorySnap = await db.collection(`landlords/${landlordId}/rental-inventory`).get();
  const inventory = inventorySnap.docs.map((doc) => ({id: doc.id, ...doc.data()} as RentalUnit));

  // Filter by period
  const isInPeriod = (date: Timestamp | Date) => {
    const d = date instanceof Date ? date : date.toDate();
    return d >= periodStart && d <= periodEnd;
  };

  const newLeases = leases.filter((l) => isInPeriod(l.createdAt)).length;
  const endedLeases = leases.filter((l) => l.leaseEndDate && isInPeriod(l.leaseEndDate)).length;
  const totalRentCollected = payments
    .filter((p) => isInPeriod(p.paymentDate))
    .reduce((sum, p) => sum + (p.actualRentPaid || 0), 0);
  // Occupancy: active leases at end of period / total units
  const activeLeases = leases.filter(
    (l) => l.isActive !== false && (!l.leaseEndDate || l.leaseEndDate.toDate() > periodEnd)
  );
  const totalUnits = inventory.length;
  const occupancyRate = totalUnits > 0 ? Math.round((activeLeases.length / totalUnits) * 100) : 0;

  return {
    period: `${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`,
    totalRentCollected,
    newLeases,
    endedLeases,
    occupancyRate,
  };
}

/**
 * Configuration for report cadences
 * This centralizes all report scheduling configuration
 */
const REPORT_CONFIG = {
  cadences: ["biweekly", "monthly"] as const,
  schedules: {
    biweekly: "every 2 weeks",
    monthly: "1 of month 00:00",
    quarterly: "1 of jan,apr,jul,oct 00:00",
  },
} as const;

type ReportCadence = typeof REPORT_CONFIG.cadences[number];

/**
 * Helper function to create a scheduled report function
 * @param {string} cadence - The report cadence to create
 * @return {functions.CloudFunction<functions.EventContext>} A configured Cloud Function for the specified cadence
 */
function createScheduledReport(cadence: ReportCadence) {
  return functions.pubsub
    .schedule(REPORT_CONFIG.schedules[cadence])
    .onRun(async () => {
      try {
        const {start, end} = getPeriodDates(cadence);
        const db = admin.firestore();
        const landlordsSnap = await db.collection("landlords").get();
        const template = emailReportTemplates.find((t) => t.id === "summary-report") as EmailTemplate;
        if (!template) {
          console.error("Template not found for summary-report");
          return null;
        }
        for (const landlordDoc of landlordsSnap.docs) {
          const landlordId = landlordDoc.id;
          const reportData = await getSummaryReportData(landlordId, start, end);
          const parsedData = validateTemplateData(template, reportData, {
            event: `summaryReport${cadence.charAt(0).toUpperCase() + cadence.slice(1)}`,
          });
          if (!parsedData) continue;
          const recipients = await getRecipientsForTemplate(landlordId, template.id);
          if (!recipients.length) continue;
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
            .filter((result): result is PromiseRejectedResult => result.status === "rejected")
            .map((result) => result.reason);

          if (failedEmails.length > 0) {
            console.error(`Failed to send ${failedEmails.length} emails for ${template.id}:`, failedEmails);
          }
        }
        return null;
      } catch (error) {
        console.error(`Error in summaryReport${cadence.charAt(0).toUpperCase() + cadence.slice(1)}:`, error);
        return null;
      }
    });
}

// Create and export all configured report functions
const reportFunctions = REPORT_CONFIG.cadences.reduce((acc, cadence) => {
  const functionName = `summaryReport${cadence.charAt(0).toUpperCase() + cadence.slice(1)}`;
  return {
    ...acc,
    [functionName]: createScheduledReport(cadence),
  };
}, {} as Record<string, functions.CloudFunction<functions.EventContext>>);

export const {summaryReportBiweekly, summaryReportMonthly} = reportFunctions;

/*
TODO: Future Enhancements [DO NOT DELETE]
1. Add quarterly reports by adding 'quarterly' to REPORT_CONFIG.cadences
2. Add more report types beyond summary reports
3. Add support for custom report periods
4. Add support for report customization per landlord
5. Add support for report scheduling per landlord
*/

// Example usage (inside your scheduled function):
// const emailContent = summaryReportTemplate.generate({
//   period: '2024-07-01 to 2024-07-15',
//   totalRentCollected: 50000,
//   newLeases: 3,
//   endedLeases: 1,
//   occupancyRate: 95,
// } as SummaryReportTemplateData);
// await sendEmail({ to, subject: emailContent.subject, html: emailContent.html });
