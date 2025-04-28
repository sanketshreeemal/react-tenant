"use strict";
// Email Templates for Event-Driven (Cloud Function) Emails
// Only templates triggered by Firestore or user actions (not scheduled reports)
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailEventTemplates = exports.leaseExpiryReminderTemplate = exports.leaseExpiryReminderSchema = exports.rentPaymentTemplate = exports.rentPaymentSchema = exports.newLeaseTemplate = exports.newLeaseSchema = void 0;
const zod_1 = require("zod");
exports.newLeaseSchema = zod_1.z.object({
    tenantName: zod_1.z.string(),
    unitNumber: zod_1.z.string(),
    leaseStartDate: zod_1.z.string(),
    leaseEndDate: zod_1.z.string(),
    rentAmount: zod_1.z.number(),
});
exports.newLeaseTemplate = {
    id: 'new-lease',
    name: 'New Lease Added',
    description: 'Notifies relevant users when a new lease is added.',
    schema: exports.newLeaseSchema,
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
exports.rentPaymentSchema = zod_1.z.object({
    tenantName: zod_1.z.string(),
    unitNumber: zod_1.z.string(),
    amountPaid: zod_1.z.number(),
    paymentDate: zod_1.z.string(),
});
exports.rentPaymentTemplate = {
    id: 'rent-payment',
    name: 'Rent Payment Recorded',
    description: 'Notifies relevant users when a rent payment is recorded.',
    schema: exports.rentPaymentSchema,
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
exports.leaseExpiryReminderSchema = zod_1.z.object({
    tenantName: zod_1.z.string(),
    unitNumber: zod_1.z.string(),
    leaseEndDate: zod_1.z.string(),
});
exports.leaseExpiryReminderTemplate = {
    id: 'lease-expiry-reminder',
    name: 'Lease Expiry Reminder',
    description: 'Reminds tenants and landlords about upcoming lease expirations.',
    schema: exports.leaseExpiryReminderSchema,
    generate: (data) => ({
        subject: `Lease Expiry Reminder for Unit ${data.unitNumber}`,
        html: `<p>Hello,</p>
      <p>This is a reminder that the lease for tenant <strong>${data.tenantName}</strong> in unit <strong>${data.unitNumber}</strong> will expire on <strong>${data.leaseEndDate}</strong>.</p>
      <p>Please take necessary action.</p>`
    })
};
exports.emailEventTemplates = [
    exports.newLeaseTemplate,
    exports.rentPaymentTemplate,
    exports.leaseExpiryReminderTemplate,
];
//# sourceMappingURL=indexEvent.js.map