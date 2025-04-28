"use strict";
// Email Templates for Time-Driven (Scheduler) Reports
// Only templates triggered by scheduled jobs (e.g., biweekly/monthly reports)
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailReportTemplates = exports.summaryReportTemplate = exports.summaryReportSchema = void 0;
const zod_1 = require("zod");
exports.summaryReportSchema = zod_1.z.object({
    period: zod_1.z.string(),
    totalRentCollected: zod_1.z.number(),
    newLeases: zod_1.z.number(),
    endedLeases: zod_1.z.number(),
    occupancyRate: zod_1.z.number(),
});
exports.summaryReportTemplate = {
    id: 'summary-report',
    name: 'Summary Report',
    description: 'Sends a summary report of key statistics for the period.',
    schema: exports.summaryReportSchema,
    generate: (data) => ({
        subject: `Summary Report: ${data.period}`,
        html: `<p>Hello,</p>
      <p>Here is your summary report for <strong>${data.period}</strong>:</p>
      <ul>
        <li>Total Rent Collected: ₹${data.totalRentCollected}</li>
        <li>New Leases: ${data.newLeases}</li>
        <li>Ended Leases: ${data.endedLeases}</li>
        <li>Occupancy Rate: ${data.occupancyRate}%</li>
      </ul>
      <p>See your dashboard for more details.</p>`
    })
};
exports.emailReportTemplates = [
    exports.summaryReportTemplate,
];
//# sourceMappingURL=indexReport.js.map