interface EmailTemplate {
  subject: string;
  html: string;
}

interface TenantData {
  firstName: string;
  lastName: string;
  unitNumber: string;
  email: string;
  phoneNumber: string;
}

interface PaymentData {
  unitNumber: string;
  tenantName: string;
  paymentType?: string;
  actualRentPaid: number;
  rentalPeriod: string;
  comments?: string;
}

interface ReportData {
  activeLeases: any[];
  expiredLeases: any[];
  formattedDate: string;
  totalExpectedRent: number;
  occupiedUnits: number;
}

interface CustomEmailData {
  subject: string;
  message: string;
}

export const newTenantEmail = (data: TenantData): EmailTemplate => ({
  subject: 'New Tenant Added',
  html: `
    <h1>New Tenant Added</h1>
    <p>A new tenant has been added to your property management system:</p>
    <ul>
      <li><strong>Name:</strong> ${data.firstName} ${data.lastName}</li>
      <li><strong>Unit:</strong> ${data.unitNumber}</li>
      <li><strong>Email:</strong> ${data.email}</li>
      <li><strong>Phone:</strong> ${data.phoneNumber}</li>
    </ul>
  `
});

export const newRentPaymentEmail = (data: PaymentData): EmailTemplate => ({
  subject: 'New Payment Recorded',
  html: `
    <h1>New Payment Recorded</h1>
    <p>A new payment has been recorded:</p>
    <ul>
      <li><strong>Unit:</strong> ${data.unitNumber}</li>
      <li><strong>Tenant:</strong> ${data.tenantName}</li>
      <li><strong>Payment Type:</strong> ${data.paymentType || 'Rent Payment'}</li>
      <li><strong>Amount:</strong> ₹${data.actualRentPaid}</li>
      <li><strong>Period:</strong> ${data.rentalPeriod}</li>
      ${data.comments ? `<li><strong>Comments:</strong> ${data.comments}</li>` : ''}
    </ul>
  `
});

export const monthlyReportEmail = (data: ReportData): EmailTemplate => ({
  subject: `Monthly Property Report - ${data.formattedDate}`,
  html: `
    <h1>Monthly Property Report - ${data.formattedDate}</h1>
    
    <h2>Lease Summary</h2>
    <ul>
      <li><strong>Active Leases:</strong> ${data.activeLeases.length}</li>
      <li><strong>Expired Leases (tenant still occupying):</strong> ${data.expiredLeases.length}</li>
      <li><strong>Occupied Units:</strong> ${data.occupiedUnits}</li>
    </ul>
    
    <h2>Financial Summary</h2>
    <ul>
      <li><strong>Expected Rent Income:</strong> ₹${data.totalExpectedRent.toFixed(2)}</li>
    </ul>
    
    ${data.expiredLeases.length > 0 ? `
      <h2>⚠️ Attention Required: Expired Leases</h2>
      <p>The following leases have expired but tenants are still occupying the units. Please consider renewing these leases:</p>
      <ul>
        ${data.expiredLeases.map((lease: any) => `
          <li>
            <strong>Unit ${lease.unitNumber}:</strong> ${lease.tenantName} 
            (Expired on ${lease.leaseEndDate})
          </li>
        `).join('')}
      </ul>
    ` : ''}
  `
});

export const customEmail = (data: CustomEmailData): EmailTemplate => ({
  subject: data.subject,
  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      ${data.message.split('\n').map(line => `<p>${line}</p>`).join('')}
    </div>
  `
}); 