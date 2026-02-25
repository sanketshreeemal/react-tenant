/**
 * functions/src/index.ts
 *
 * Purpose
 * - Define a single, disciplined Cloud Function that sends a simple monthly summary report email
 *   for a specific landlord. This keeps scope tight and focused on your current need.
 * - Leverages small helper modules for email and data aggregation, and a typed template for rendering.
 *
 * Operational notes
 * - Configure credentials and recipients via Firebase Functions config:
 *   - gmail.user, gmail.pass: Gmail app credentials used by Nodemailer
 *   - reports.to: Recipient email address for monthly report
 *   - reports.landlord: Landlord document ID to generate the report for
 * - Schedule: Runs on the 1st of each month at 08:00 UTC and reports on the previous calendar month
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { z } from "zod";
import { generateMonthlyReport, MonthlyReportData } from "./templates/monthlyReportTemplate";
import { sendEmail, logSentEmail } from "./services/emailService";

// Initialize Firebase Admin exactly once (Cloud Functions cold start)
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Helper: Compute the start/end of the previous month.
 * We intentionally report the previous calendar month when we run on the 1st.
 *
 * @param now Optional reference date (defaults to current date)
 * @return Object containing UTC start date, end date, and a human-readable label
 */
function getPreviousMonthRange(now: Date = new Date()): { start: Date; end: Date; label: string } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  // Previous month in UTC
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const start = new Date(Date.UTC(prevYear, prevMonth, 1));
  const end = new Date(Date.UTC(prevYear, prevMonth + 1, 0));
  const label = `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`;
  return { start, end, label };
}

/**
 * Minimal inline helpers (kept here to reduce fragmentation and build issues)
 */
const summaryReportSchema = z.object({
  period: z.string(),
  rentPeriodMonth: z.string(),
  totalRentCollected: z.number(),
  occupancyRate: z.number(),
});

type SummaryReportData = z.infer<typeof summaryReportSchema>;

// Template ID constant for logging
const SUMMARY_REPORT_TEMPLATE_ID = "summary-report";

async function getSummaryReportData(
  landlordId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<SummaryReportData> {
  const db = admin.firestore();
  const [leasesSnap, paymentsSnap, inventorySnap] = await Promise.all([
    db.collection(`landlords/${landlordId}/leases`).get(),
    db.collection(`landlords/${landlordId}/rent-collection`).get(),
    db.collection(`landlords/${landlordId}/rental-inventory`).get(),
  ]);
  const leases = leasesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
  const payments = paymentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
  const inventory = inventorySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

  // Calculate rentalPeriodKey for rent collection (arrears model)
  // If report period is March (periodStart = March 1), we want February rent (rentalPeriod = "2025-02")
  // which was paid in March. So rentalPeriodKey is the previous month of periodStart.
  const periodYear = periodStart.getUTCFullYear();
  const periodMonth = periodStart.getUTCMonth(); // 0-indexed (0 = January, 11 = December)
  const rentalPeriodMonth = periodMonth === 0 ? 11 : periodMonth - 1;
  const rentalPeriodYear = periodMonth === 0 ? periodYear - 1 : periodYear;
  const rentalPeriodKey = `${rentalPeriodYear}-${String(rentalPeriodMonth + 1).padStart(2, "0")}`;

  // Calculate rent period month name for display (arrears model explanation)
  const rentPeriodDate = new Date(Date.UTC(rentalPeriodYear, rentalPeriodMonth, 1));
  const rentPeriodMonthName = rentPeriodDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  // Total Rent Collected: Use rentalPeriod (not paymentDate) and filter by Rent Payment type
  // This aligns with arrears model where rent for Month Y is paid in Month Y+1
  const totalRentCollected = payments
    .filter((p) => {
      const isRentPayment = (p.paymentType || "Rent Payment") === "Rent Payment";
      const matchesRentalPeriod = p.rentalPeriod === rentalPeriodKey;
      return isRentPayment && matchesRentalPeriod;
    })
    .reduce((sum, p) => sum + (Number(p.actualRentPaid) || 0), 0);

  // Occupancy Rate: Use isActive === true (strict) and do NOT check leaseEndDate
  // Many properties have expired leases (end date in past) but tenants still pay rent and should be counted as occupied
  const activeLeases = leases.filter((l) => l.isActive === true);
  const totalUnits = inventory.length;
  const occupancyRate = totalUnits > 0 ? Math.round((activeLeases.length / totalUnits) * 100) : 0;
  return {
    period: `${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`,
    rentPeriodMonth: rentPeriodMonthName,
    totalRentCollected,
    occupancyRate,
  };
}

/**
 * Build enriched monthly report sections and CSV attachment.
 */
async function buildMonthlyReport(
  landlordId: string,
  periodStart: Date,
  periodEnd: Date,
  periodLabel: string
) {
  const db = admin.firestore();
  const [leasesSnap, paymentsSnap, inventorySnap] = await Promise.all([
    db.collection(`landlords/${landlordId}/leases`).get(),
    db.collection(`landlords/${landlordId}/rent-collection`).get(),
    db.collection(`landlords/${landlordId}/rental-inventory`).get(),
  ]);

  const leases = leasesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
  const payments = paymentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
  const inventory = inventorySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
  // propertyGroups were previously used for grouping; currently derived from inventory

  const groupNameOf = (unitId: string | undefined): string => {
    if (!unitId) return "Default";
    const inv = inventory.find((i) => i.id === unitId);
    return inv?.groupName || "Default";
  };
  const unitNumberOf = (unitId: string | undefined): string => {
    if (!unitId) return "";
    const inv = inventory.find((i) => i.id === unitId);
    return inv?.unitNumber || "";
  };

  // Period checks below use either rentalPeriod keys or explicit comparisons; shared helper available above if needed

  // Active leases: Use isActive === true (strict) and do NOT check leaseEndDate
  // Many properties have expired leases (end date in past) but tenants still pay rent and should be counted as occupied
  const activeAtEnd = leases.filter((l) => l.isActive === true);

  // Calculate rentalPeriodKey for rent collection (arrears model)
  // If report period is March (periodStart = March 1), we want February rent (rentalPeriod = "2025-02")
  // which was paid in March. So rentalPeriodKey is the previous month of periodStart.
  const periodYear = periodStart.getUTCFullYear();
  const periodMonth = periodStart.getUTCMonth(); // 0-indexed (0 = January, 11 = December)
  const rentalPeriodMonth = periodMonth === 0 ? 11 : periodMonth - 1;
  const rentalPeriodYear = periodMonth === 0 ? periodYear - 1 : periodYear;
  const rentalPeriodKey = `${rentalPeriodYear}-${String(rentalPeriodMonth + 1).padStart(2, "0")}`;

  const monthPayments = payments.filter(
    (p) => p.rentalPeriod === rentalPeriodKey && ((p.paymentType || "Rent Payment") === "Rent Payment")
  );

  // Rent collected by property (groupName)
  const rentCollectedByGroup: Record<string, number> = {};
  for (const p of monthPayments) {
    const group = groupNameOf(p.unitId);
    rentCollectedByGroup[group] = (rentCollectedByGroup[group] || 0) + (Number(p.actualRentPaid) || 0);
  }

  // Period delinquencies: active at end missing payment for this month
  const paidUnitIds = new Set(monthPayments.map((p) => p.unitId));
  const periodDelinquencies = activeAtEnd
    .filter((l) => !paidUnitIds.has(l.unitId))
    .map((l) => ({ unitNumber: unitNumberOf(l.unitId), tenantName: l.tenantName, expectedRent: Number(l.rentAmount) || 0 }));

  // Historical delinquencies section removed per requirements

  // Expired and expiring soon (30 days) — based on all leases still marked active
  const today = new Date();
  // Use isActive === true (strict) to match occupancy calculation
  const activeNow = leases.filter((l) => l.isActive === true);
  const expirations = activeNow.map((l) => {
    const endDate = l.leaseEndDate ? (l.leaseEndDate.toDate?.() ?? new Date(l.leaseEndDate)) : null;
    const daysLeft = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 99999;
    return { unitNumber: unitNumberOf(l.unitId), tenantName: l.tenantName, rentAmount: Number(l.rentAmount) || 0, endDate, daysLeft };
  });
  const expiredLeases = expirations.filter((e) => e.daysLeft < 0).sort((a, b) => a.daysLeft - b.daysLeft);
  const expiringSoon = expirations.filter((e) => e.daysLeft >= 0 && e.daysLeft <= 30).sort((a, b) => a.daysLeft - b.daysLeft);

  // Vacancies aligned with dashboard: units without a currently active lease (isActive === true)
  const activeUnitIdSet = new Set(activeNow.map((l) => l.unitId));
  const vacantUnits = inventory.filter((inv) => !activeUnitIdSet.has(inv.id));
  const paymentsByUnitDesc = new Map<string, Array<{ paymentDate?: any; actualRentPaid?: number }>>();
  for (const p of payments) {
    const key = p.unitId as string | undefined;
    if (!key) continue;
    const current = paymentsByUnitDesc.get(key) || [];
    current.push({ paymentDate: p.paymentDate, actualRentPaid: p.actualRentPaid });
    paymentsByUnitDesc.set(key, current);
  }
  for (const list of paymentsByUnitDesc.values()) {
    list.sort((a, b) => {
      const ad = a.paymentDate ? (a.paymentDate.toDate?.() ?? new Date(a.paymentDate)) : new Date(0);
      const bd = b.paymentDate ? (b.paymentDate.toDate?.() ?? new Date(b.paymentDate)) : new Date(0);
      return bd.getTime() - ad.getTime();
    });
  }
  const vacancyRows = vacantUnits.map((inv) => {
    const list = paymentsByUnitDesc.get(inv.id) || [];
    const lastPay = list.length > 0 ? list[0] : undefined;
    const lastRent = lastPay && lastPay.actualRentPaid != null ? Number(lastPay.actualRentPaid) || 0 : undefined;
    return { unitNumber: inv.unitNumber, groupName: inv.groupName || "Default", lastRent };
  });

  // CSV attachment for payments in the month; include units without payment (actual empty)
  const csvHeaders = ["Unit Number", "Tenant Name", "Expected Rent", "Actual Rent", "Rental Period", "Comments"];
  const monthPaysByUnit = new Map<string, { sum: number; comments: string[] }>();
  for (const p of monthPayments) {
    const entry = monthPaysByUnit.get(p.unitId) || { sum: 0, comments: [] };
    entry.sum += Number(p.actualRentPaid) || 0;
    if (p.comments) entry.comments.push(String(p.comments));
    monthPaysByUnit.set(p.unitId, entry);
  }
  const csvRows: string[] = [csvHeaders.join(",")];
  for (const l of activeAtEnd) {
    const m = monthPaysByUnit.get(l.unitId);
    const unitNo = unitNumberOf(l.unitId);
    const tenant = l.tenantName || "";
    const expected = Number(l.rentAmount) || 0;
    const actual = m ? m.sum : "";
    const comments = m ? m.comments.join(" | ").replace(/\n/g, " ") : "";
    const row = [unitNo, tenant, String(expected), String(actual), rentalPeriodKey, `"${comments.replace(/"/g, "\"\"")}"`];
    csvRows.push(row.join(","));
  }
  const csvContent = csvRows.join("\n");

  return {
    rentCollectedByGroup,
    periodDelinquencies,
    expiredLeases,
    expiringSoon,
    vacancyRows,
    csv: { filename: `payments-${rentalPeriodKey}.csv`, content: csvContent },
  };
}

/**
 * Scheduled function: summaryReportMonthly
 * - Cron: 1st of every month at 08:00 UTC
 * - Scope: One specific landlord ID from config (reports.landlord)
 * - Recipient: One specific email from config (reports.to)
 */
export const summaryReportMonthly = functions.pubsub
  .schedule("0 8 1 * *")
  .timeZone("Etc/UTC")
  .onRun(async () => {
    // Read and validate configuration
    const to = functions.config().reports?.to as string | undefined;
    const landlordId = functions.config().reports?.landlord as string | undefined;

    if (!to || !landlordId) {
      functions.logger.error("Missing required config. Set both reports.to and reports.landlord.");
      return null;
    }

    // Identify the previous month range
    const { start, end, label } = getPreviousMonthRange(new Date());

    // Calculate period month name for header (e.g., "January 2026")
    const periodMonthName = start.toLocaleString("en-US", { month: "long", year: "numeric" });

    try {
      // Aggregate landlord report data (base KPIs)
      const rawData = await getSummaryReportData(landlordId, start, end);
      const data = summaryReportSchema.parse({ ...rawData, period: label });

      // Enriched sections and CSV
      const details = await buildMonthlyReport(landlordId, start, end, label);

      // Prepare data for monthly report template
      const monthlyReportData: MonthlyReportData = {
        period: data.period,
        periodLabel: label,
        periodMonthName: periodMonthName,
        rentPeriodMonth: data.rentPeriodMonth,
        totalRentCollected: data.totalRentCollected,
        occupancyRate: data.occupancyRate,
        rentCollectedByGroup: details.rentCollectedByGroup,
        periodDelinquencies: details.periodDelinquencies,
        expiredLeases: details.expiredLeases,
        expiringSoon: details.expiringSoon,
        vacancyRows: details.vacancyRows,
      };

      // Generate email using template
      const { subject, html } = generateMonthlyReport(monthlyReportData);

      // Parse recipients and send individually (comma or semicolon separated)
      const recipients = to
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter((s) => !!s);

      if (recipients.length === 0) {
        functions.logger.warn("reports.to contained no valid recipients after parsing");
        return null;
      }

      const results = await Promise.allSettled(
        recipients.map(async (recipient) => {
          await sendEmail({
            to: recipient,
            subject,
            html,
            attachments: [{ filename: details.csv.filename, content: details.csv.content }],
          });
          await logSentEmail(landlordId, {
            recipients: [recipient],
            subject,
            content: html,
            sentAt: new Date(),
            status: "sent",
            templateId: SUMMARY_REPORT_TEMPLATE_ID,
          });
          return recipient;
        })
      );

      const failed = results
        .filter((r) => r.status === "rejected")
        .map((r: any) => r.reason?.message || String(r));
      if (failed.length) {
        functions.logger.error("Some recipients failed to receive the report", { failed });
      } else {
        functions.logger.info("Monthly summary report sent successfully to all recipients", {
          landlordId,
          recipients,
          period: label,
        });
      }
    } catch (error: any) {
      functions.logger.error("Failed to send monthly summary report", {
        landlordId,
        to,
        error: error?.message || String(error),
      });
      // Log failure as well (single summary failure)
      try {
        await logSentEmail(landlordId, {
          recipients: to.split(/[;,]/).map((s) => s.trim()).filter(Boolean),
          subject: `Summary Report: ${label}`,
          content: "Failed to render or send email. See logs for details.",
          sentAt: new Date(),
          status: "failed",
          templateId: SUMMARY_REPORT_TEMPLATE_ID,
          error: error?.message || String(error),
        });
      } catch (logErr: any) {
        functions.logger.error("Failed to log email failure", { error: logErr?.message || String(logErr) });
      }
    }

    return null;
  });

