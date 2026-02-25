/**
 * Monthly Report Email Template
 *
 * Generates a professional monthly property management report email.
 * Uses the base template for structure and email styles for consistent formatting.
 */

import { generateBaseTemplate } from "./baseTemplate";
import { emailStyles, getInlineStyles } from "./emailStyles";

/**
 * Data structure for monthly report
 */
export interface MonthlyReportData {
  period: string;
  periodLabel: string;
  periodMonthName: string; // Month name for the report period (e.g., "January 2026")
  rentPeriodMonth: string; // Month name for which rent was collected (arrears model)
  totalRentCollected: number;
  occupancyRate: number;
  rentCollectedByGroup: Record<string, number>;
  periodDelinquencies: Array<{
    unitNumber: string;
    tenantName: string;
    expectedRent: number;
  }>;
  expiredLeases: Array<{
    unitNumber: string;
    tenantName: string;
    rentAmount: number;
    daysLeft: number;
  }>;
  expiringSoon: Array<{
    unitNumber: string;
    tenantName: string;
    rentAmount: number;
    daysLeft: number;
  }>;
  vacancyRows: Array<{
    unitNumber: string;
    groupName: string;
    lastRent?: number;
  }>;
}

/**
 * Formats currency in Indian Rupee format
 */
function formatCurrency(amount: number | undefined): string {
  if (typeof amount !== "number" || isNaN(amount)) {
    return "-";
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Generates a table row for data arrays
 */
function generateTableRows<T>(
  data: T[],
  columns: Array<{ header: string; render: (item: T, index: number) => string }>,
  emptyMessage: string
): string {
  if (data.length === 0) {
    const colspan = columns.length;
    return `<tr>
      <td colspan="${colspan}" style="${getInlineStyles.tableCell()} text-align: center; color: ${emailStyles.colors.textSecondary};">
        ${emptyMessage}
      </td>
    </tr>`;
  }

  return data
    .map((item, index) => {
      const cells = columns.map((col) => {
        const cellContent = col.render(item, index);
        return `<td style="${getInlineStyles.tableCell()}">${cellContent}</td>`;
      });
      return `<tr style="background-color: ${index % 2 === 0 ? emailStyles.colors.background : emailStyles.colors.tableRowEven};">${cells.join("")}</tr>`;
    })
    .join("");
}

/**
 * Generates the Portfolio Snapshot section
 */
function generatePortfolioSnapshot(data: MonthlyReportData): string {
  return `
    <div style="background-color: ${emailStyles.colors.background}; border: 1px solid ${emailStyles.colors.border}; border-radius: ${emailStyles.card.borderRadius}; padding: ${emailStyles.spacing.lg}; margin-bottom: ${emailStyles.spacing.xl};">
      <h2 style="${getInlineStyles.heading2()}">Portfolio Snapshot</h2>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: ${emailStyles.spacing.md};">
        <tr>
          <td style="padding: ${emailStyles.spacing.md} 0; border-bottom: 1px solid ${emailStyles.colors.border};">
            <p style="${getInlineStyles.paragraph()} margin: 0;">
              <strong style="color: ${emailStyles.colors.text};">Total Rent Collected:</strong>
              <span style="color: ${emailStyles.colors.primary}; font-weight: ${emailStyles.typography.fontWeight.semibold}; margin-left: ${emailStyles.spacing.sm};">
                ${formatCurrency(data.totalRentCollected)}
              </span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: ${emailStyles.spacing.md} 0;">
            <p style="${getInlineStyles.paragraph()} margin: 0;">
              <strong style="color: ${emailStyles.colors.text};">Occupancy Rate:</strong>
              <span style="color: ${emailStyles.colors.primary}; font-weight: ${emailStyles.typography.fontWeight.semibold}; margin-left: ${emailStyles.spacing.sm};">
                ${data.occupancyRate}%
              </span>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Generates the Rent Collection by Property table
 */
function generateRentCollectionByProperty(data: MonthlyReportData): string {
  const sortedGroups = Object.entries(data.rentCollectedByGroup).sort((a, b) => b[1] - a[1]);

  const rows = generateTableRows(
    sortedGroups,
    [
      {
        header: "Property",
        render: ([groupName]) => `<strong>${groupName}</strong>`,
      },
      {
        header: "Collected",
        render: ([, amount]) => formatCurrency(amount),
      },
    ],
    "No payments this period"
  );

  return `
    <div style="margin-bottom: ${emailStyles.spacing.xl};">
      <h3 style="${getInlineStyles.heading3()}">Rent Collection by Property</h3>
      <table role="presentation" style="${getInlineStyles.table()}">
        <thead>
          <tr>
            <th style="${getInlineStyles.tableHeader()}">Property</th>
            <th style="${getInlineStyles.tableHeader()}">Collected</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generates the Delinquencies section
 */
function generateDelinquencies(data: MonthlyReportData): string {
  const rows = generateTableRows(
    data.periodDelinquencies,
    [
      {
        header: "Unit",
        render: (item) => item.unitNumber,
      },
      {
        header: "Tenant",
        render: (item) => item.tenantName || "N/A",
      },
      {
        header: "Expected Rent",
        render: (item) => formatCurrency(item.expectedRent),
      },
    ],
    "No delinquencies this month"
  );

  return `
    <div style="margin-bottom: ${emailStyles.spacing.xl};">
      <h3 style="${getInlineStyles.heading3()}">Missed Rent</h3>
      <table role="presentation" style="${getInlineStyles.table()}">
        <thead>
          <tr>
            <th style="${getInlineStyles.tableHeader()}">Unit</th>
            <th style="${getInlineStyles.tableHeader()}">Tenant</th>
            <th style="${getInlineStyles.tableHeader()}">Expected Rent</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generates the Leases section (Expired and Expiring Soon)
 */
function generateLeases(data: MonthlyReportData): string {
  const expiredRows = generateTableRows(
    data.expiredLeases,
    [
      {
        header: "Unit",
        render: (item) => item.unitNumber,
      },
      {
        header: "Tenant",
        render: (item) => item.tenantName || "N/A",
      },
      {
        header: "Rent",
        render: (item) => formatCurrency(item.rentAmount),
      },
      {
        header: "Days Since Expiry",
        render: (item) => `<span style="color: ${emailStyles.colors.error}; font-weight: ${emailStyles.typography.fontWeight.semibold};">
          ${Math.abs(item.daysLeft)}
        </span>`,
      },
    ],
    "None"
  );

  const expiringRows = generateTableRows(
    data.expiringSoon,
    [
      {
        header: "Unit",
        render: (item) => item.unitNumber,
      },
      {
        header: "Tenant",
        render: (item) => item.tenantName || "N/A",
      },
      {
        header: "Rent",
        render: (item) => formatCurrency(item.rentAmount),
      },
      {
        header: "Days Left",
        render: (item) => {
          const color = item.daysLeft <= 7 ? emailStyles.colors.error : item.daysLeft <= 15 ? emailStyles.colors.warning : emailStyles.colors.text;
          return `<span style="color: ${color}; font-weight: ${emailStyles.typography.fontWeight.semibold};">
            ${item.daysLeft}
          </span>`;
        },
      },
    ],
    "None"
  );

  return `
    <div style="margin-bottom: ${emailStyles.spacing.xl};">
      <h3 style="${getInlineStyles.heading3()}">Leases</h3>
      
      <h4 style="${getInlineStyles.heading4()}">Expired</h4>
      <table role="presentation" style="${getInlineStyles.table()} margin-bottom: ${emailStyles.spacing.lg};">
        <thead>
          <tr>
            <th style="${getInlineStyles.tableHeader()}">Unit</th>
            <th style="${getInlineStyles.tableHeader()}">Tenant</th>
            <th style="${getInlineStyles.tableHeader()}">Rent</th>
            <th style="${getInlineStyles.tableHeader()}">Days Since Expiry</th>
          </tr>
        </thead>
        <tbody>
          ${expiredRows}
        </tbody>
      </table>

      <h4 style="${getInlineStyles.heading4()}">Expiring in Next 30 Days</h4>
      <table role="presentation" style="${getInlineStyles.table()}">
        <thead>
          <tr>
            <th style="${getInlineStyles.tableHeader()}">Unit</th>
            <th style="${getInlineStyles.tableHeader()}">Tenant</th>
            <th style="${getInlineStyles.tableHeader()}">Rent</th>
            <th style="${getInlineStyles.tableHeader()}">Days Left</th>
          </tr>
        </thead>
        <tbody>
          ${expiringRows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generates the Vacancies section
 */
function generateVacancies(data: MonthlyReportData): string {
  const rows = generateTableRows(
    data.vacancyRows,
    [
      {
        header: "Unit",
        render: (item) => item.unitNumber,
      },
      {
        header: "Property",
        render: (item) => item.groupName,
      },
      {
        header: "Last recorded Rent",
        render: (item) => item.lastRent !== undefined ? formatCurrency(item.lastRent) : "No rent data",
      },
    ],
    "None"
  );

  return `
    <div style="margin-bottom: ${emailStyles.spacing.xl};">
      <h3 style="${getInlineStyles.heading3()}">Vacancies</h3>
      <table role="presentation" style="${getInlineStyles.table()}">
        <thead>
          <tr>
            <th style="${getInlineStyles.tableHeader()}">Unit</th>
            <th style="${getInlineStyles.tableHeader()}">Property</th>
            <th style="${getInlineStyles.tableHeader()}">Last recorded Rent</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p style="${getInlineStyles.paragraphSmall()} margin-top: ${emailStyles.spacing.sm}; color: ${emailStyles.colors.textSecondary};">
        Note: "Last recorded Rent" reflects the unit's rent before it went vacant.
      </p>
    </div>
  `;
}

/**
 * Generates the complete monthly report email
 *
 * @param data - Monthly report data including KPIs and detailed sections
 * @returns Object with subject and HTML content
 */
export function generateMonthlyReport(data: MonthlyReportData): { subject: string; html: string } {
  const subject = `Monthly Report: ${data.periodLabel}`;

  // Build all content sections
  const content = `
    <p style="${getInlineStyles.paragraph()} color: ${emailStyles.colors.error}; font-weight: ${emailStyles.typography.fontWeight.normal};">
      Note: Due to our rent collection model, the rent amounts shown below are for rent paid during ${data.periodLabel} for the month of ${data.rentPeriodMonth}.
    </p>
    
    ${generatePortfolioSnapshot(data)}
    ${generateRentCollectionByProperty(data)}
    ${generateDelinquencies(data)}
    ${generateLeases(data)}
    ${generateVacancies(data)}
    
    <div style="margin-top: ${emailStyles.spacing.xl}; text-align: center;">
      <a href="https://www.urbanleases.ca" style="display: inline-block; padding: ${emailStyles.spacing.md} ${emailStyles.spacing.xl}; background-color: ${emailStyles.colors.primary}; color: ${emailStyles.colors.background}; text-decoration: none; border-radius: ${emailStyles.card.borderRadius}; font-weight: ${emailStyles.typography.fontWeight.semibold};">
        View Dashboard
      </a>
    </div>
  `;

  // Generate the complete email using base template
  const html = generateBaseTemplate(content, {
    previewText: `Monthly property management report for ${data.periodLabel}. Total rent collected: ${formatCurrency(data.totalRentCollected)}.`,
    headerText: `Monthly Property Report - ${data.periodMonthName}`,
    footerText: "",
  });

  return { subject, html };
}
