// Email Templates for Time-Driven (Scheduler) Reports
// Only templates triggered by scheduled jobs (e.g., biweekly/monthly reports)

import { z } from 'zod';

export interface EmailTemplate<T extends z.ZodTypeAny> {
  id: string;
  name: string;
  description: string;
  schema: T;
  generate: (data: z.infer<T>) => { subject: string; html: string };
}

export const summaryReportSchema = z.object({
  period: z.string(),
  totalRentCollected: z.number(),
  newLeases: z.number(),
  endedLeases: z.number(),
  occupancyRate: z.number(),
});

export const summaryReportTemplate: EmailTemplate<typeof summaryReportSchema> = {
  id: 'summary-report',
  name: 'Summary Report',
  description: 'Sends a summary report of key statistics for the period.',
  schema: summaryReportSchema,
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

export const emailReportTemplates = [
  summaryReportTemplate,
]; 