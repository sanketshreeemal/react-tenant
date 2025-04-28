// Email Templates for Event-Driven (Cloud Function) Emails
// Only templates triggered by Firestore or user actions (not scheduled reports)

import { z } from 'zod';

export interface EmailTemplate<T extends z.ZodTypeAny> {
  id: string;
  name: string;
  description: string;
  schema: T;
  generate: (data: z.infer<T>) => { subject: string; html: string };
}

export const newLeaseSchema = z.object({
  tenantName: z.string(),
  unitNumber: z.string(),
  leaseStartDate: z.string(),
  leaseEndDate: z.string(),
  rentAmount: z.number(),
});

export const newLeaseTemplate: EmailTemplate<typeof newLeaseSchema> = {
  id: 'new-lease',
  name: 'New Lease Added',
  description: 'Notifies relevant users when a new lease is added.',
  schema: newLeaseSchema,
  generate: (data) => ({
    subject: `New Lease for Unit ${data.unitNumber}`,
    html: `<p>Hello,</p>
      <p>A new lease has been added for tenant <strong>${data.tenantName}</strong> in unit <strong>${data.unitNumber}</strong>.</p>
      <ul>
        <li>Lease Start: ${data.leaseStartDate}</li>
        <li>Lease End: ${data.leaseEndDate}</li>
        <li>Rent Amount: ₹${data.rentAmount}</li>
      </ul>
      <p>Please review the details in your dashboard.</p>`
  })
};

export const rentPaymentSchema = z.object({
  tenantName: z.string(),
  unitNumber: z.string(),
  amountPaid: z.number(),
  paymentDate: z.string(),
});

export const rentPaymentTemplate: EmailTemplate<typeof rentPaymentSchema> = {
  id: 'rent-payment',
  name: 'Rent Payment Recorded',
  description: 'Notifies relevant users when a rent payment is recorded.',
  schema: rentPaymentSchema,
  generate: (data) => ({
    subject: `Rent Payment Received for Unit ${data.unitNumber}`,
    html: `<p>Hello,</p>
      <p>A rent payment has been recorded for tenant <strong>${data.tenantName}</strong> in unit <strong>${data.unitNumber}</strong>.</p>
      <ul>
        <li>Amount Paid: ₹${data.amountPaid}</li>
        <li>Payment Date: ${data.paymentDate}</li>
      </ul>
      <p>Thank you.</p>`
  })
};

export const leaseExpiryReminderSchema = z.object({
  tenantName: z.string(),
  unitNumber: z.string(),
  leaseEndDate: z.string(),
});

export const leaseExpiryReminderTemplate: EmailTemplate<typeof leaseExpiryReminderSchema> = {
  id: 'lease-expiry-reminder',
  name: 'Lease Expiry Reminder',
  description: 'Reminds tenants and landlords about upcoming lease expirations.',
  schema: leaseExpiryReminderSchema,
  generate: (data) => ({
    subject: `Lease Expiry Reminder for Unit ${data.unitNumber}`,
    html: `<p>Hello,</p>
      <p>This is a reminder that the lease for tenant <strong>${data.tenantName}</strong> in unit <strong>${data.unitNumber}</strong> will expire on <strong>${data.leaseEndDate}</strong>.</p>
      <p>Please take necessary action.</p>`
  })
};

export const emailEventTemplates = [
  newLeaseTemplate,
  rentPaymentTemplate,
  leaseExpiryReminderTemplate,
]; 