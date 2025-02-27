import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/firebase';
import { collection, getDocs, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import logger from '@/lib/logger';

// Get email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@tenantmanagement.com';
const EMAIL_TO = process.env.EMAIL_TO;

// For TypeScript, we'll create a mock implementation since we can't install nodemailer
// In a real project, you would use the actual nodemailer package
interface MailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

interface Transporter {
  sendMail: (options: MailOptions) => Promise<any>;
}

// Check if email is properly configured
const isEmailConfigured = (): boolean => {
  const isConfigured = !!(
    EMAIL_HOST &&
    EMAIL_PORT &&
    EMAIL_USER &&
    EMAIL_PASSWORD
  );

  if (!isConfigured) {
    logger.warn('Email service is not properly configured. Check your environment variables.', {
      service: 'Email',
      additionalInfo: {
        missingVariables: [
          !EMAIL_HOST && 'EMAIL_HOST',
          !EMAIL_PORT && 'EMAIL_PORT',
          !EMAIL_USER && 'EMAIL_USER',
          !EMAIL_PASSWORD && 'EMAIL_PASSWORD'
        ].filter(Boolean)
      }
    });
  }

  return isConfigured;
};

// Mock transporter for development
const createTransporter = (): Transporter => {
  if (isEmailConfigured()) {
    logger.info('Using real email transporter configuration', {
      service: 'Email',
      additionalInfo: {
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        user: EMAIL_USER ? EMAIL_USER.replace(/(?<=.).(?=.*@)/g, '*') : undefined
      }
    });
    
    // In a real implementation, you would use:
    // return nodemailer.createTransport({
    //   host: EMAIL_HOST,
    //   port: EMAIL_PORT,
    //   secure: EMAIL_PORT === 465,
    //   auth: {
    //     user: EMAIL_USER,
    //     pass: EMAIL_PASSWORD,
    //   },
    // });
  }
  
  logger.info('Using mock email transporter', { service: 'Email' });
  
  // Mock transporter for development
  return {
    sendMail: async (options: MailOptions) => {
      logger.debug('Mock email would be sent:', {
        service: 'Email Mock',
        additionalInfo: {
          to: options.to,
          subject: options.subject,
          htmlLength: options.html.length
        }
      });
      return { messageId: 'mock-message-id' };
    }
  };
};

const transporter = createTransporter();

// Send transactional email
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data, recipientEmail } = body;
    
    logger.apiRequest('Email', 'sendTransactionalEmail', {
      type,
      recipientEmail: recipientEmail.replace(/(?<=.).(?=.*@)/g, '*'), // Mask email for privacy
      dataKeys: Object.keys(data || {})
    });
    
    let subject = '';
    let html = '';
    
    // Configure email based on type
    switch (type) {
      case 'new_tenant':
        subject = 'New Tenant Added';
        html = `
          <h1>New Tenant Added</h1>
          <p>A new tenant has been added to your property management system:</p>
          <ul>
            <li><strong>Name:</strong> ${data.firstName} ${data.lastName}</li>
            <li><strong>Unit:</strong> ${data.unitNumber}</li>
            <li><strong>Email:</strong> ${data.email}</li>
            <li><strong>Phone:</strong> ${data.phoneNumber}</li>
          </ul>
        `;
        break;
        
      case 'new_rent_payment':
        subject = 'New Rent Payment Recorded';
        html = `
          <h1>New Rent Payment Recorded</h1>
          <p>A new rent payment has been recorded:</p>
          <ul>
            <li><strong>Unit:</strong> ${data.unitNumber}</li>
            <li><strong>Tenant:</strong> ${data.tenantName}</li>
            <li><strong>Amount:</strong> ₹${data.actualRentPaid}</li>
            <li><strong>Period:</strong> ${data.rentalPeriod}</li>
          </ul>
        `;
        break;
        
      default:
        logger.error(`Invalid email type: ${type}`, {
          service: 'Email',
          endpoint: 'sendTransactionalEmail'
        });
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }
    
    // Use the recipient email from the request or fall back to the environment variable
    const to = recipientEmail || EMAIL_TO;
    
    if (!to) {
      logger.error('No recipient email specified', {
        service: 'Email',
        endpoint: 'sendTransactionalEmail'
      });
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }
    
    // Send email
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
    
    logger.apiSuccess('Email', 'sendTransactionalEmail', {
      type,
      recipientEmail: to.replace(/(?<=.).(?=.*@)/g, '*') // Mask email for privacy
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.apiError(error, 'Email', 'sendTransactionalEmail', {
      errorMessage: error.message
    });
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

// Generate and send monthly report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recipientEmail = searchParams.get('email');
    
    logger.apiRequest('Email', 'generateMonthlyReport', {
      recipientEmail: recipientEmail ? recipientEmail.replace(/(?<=.).(?=.*@)/g, '*') : null // Mask email for privacy
    });
    
    // Use the recipient email from the request or fall back to the environment variable
    const to = recipientEmail || EMAIL_TO;
    
    if (!to) {
      logger.error('No recipient email specified', {
        service: 'Email',
        endpoint: 'generateMonthlyReport'
      });
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }
    
    // Get current date
    const currentDate = new Date();
    const formattedDate = format(currentDate, 'MMMM yyyy');
    
    // Fetch active leases
    logger.debug('Fetching leases from Firestore', {
      service: 'Email',
      endpoint: 'generateMonthlyReport'
    });
    
    const leasesSnapshot = await getDocs(collection(db, 'leases'));
    const leases = leasesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    logger.debug(`Fetched ${leases.length} leases from Firestore`, {
      service: 'Email',
      endpoint: 'generateMonthlyReport'
    });
    
    interface Lease {
      id: string;
      isActive: boolean;
      leaseEndDate: string;
      tenantStillOccupying: boolean;
      unitNumber: string;
      tenantName: string;
      rentAmount: number;
    }
    
    // Separate active and expired leases
    const activeLeases = leases.filter((lease: Lease) => lease.isActive);
    const expiredLeases = leases.filter((lease: Lease) => 
      !lease.isActive && new Date(lease.leaseEndDate) < currentDate && lease.tenantStillOccupying
    );
    
    // Calculate expected rent
    const totalExpectedRent = activeLeases.reduce((sum: number, lease: Lease) => sum + Number(lease.rentAmount), 0);
    
    // Count occupied vs vacant units
    const occupiedUnits = new Set([...activeLeases, ...expiredLeases].map((lease: Lease) => lease.unitNumber)).size;
    
    logger.debug('Generated monthly report data', {
      service: 'Email',
      endpoint: 'generateMonthlyReport',
      additionalInfo: {
        activeLeaseCount: activeLeases.length,
        expiredLeaseCount: expiredLeases.length,
        occupiedUnits,
        totalExpectedRent
      }
    });
    
    // Generate HTML content
    const html = `
      <h1>Monthly Property Report - ${formattedDate}</h1>
      
      <h2>Lease Summary</h2>
      <ul>
        <li><strong>Active Leases:</strong> ${activeLeases.length}</li>
        <li><strong>Expired Leases (tenant still occupying):</strong> ${expiredLeases.length}</li>
        <li><strong>Occupied Units:</strong> ${occupiedUnits}</li>
      </ul>
      
      <h2>Financial Summary</h2>
      <ul>
        <li><strong>Expected Rent Income:</strong> ₹${totalExpectedRent.toFixed(2)}</li>
      </ul>
      
      ${expiredLeases.length > 0 ? `
        <h2>⚠️ Attention Required: Expired Leases</h2>
        <p>The following leases have expired but tenants are still occupying the units. Please consider renewing these leases:</p>
        <ul>
          ${expiredLeases.map((lease: Lease) => `
            <li>
              <strong>Unit ${lease.unitNumber}:</strong> ${lease.tenantName} 
              (Expired on ${format(new Date(lease.leaseEndDate), 'dd MMM yyyy')})
            </li>
          `).join('')}
        </ul>
      ` : ''}
    `;
    
    // Send email
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject: `Monthly Property Report - ${formattedDate}`,
      html,
    });
    
    logger.apiSuccess('Email', 'generateMonthlyReport', {
      recipientEmail: to.replace(/(?<=.).(?=.*@)/g, '*'), // Mask email for privacy
      reportDate: formattedDate
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.apiError(error, 'Email', 'generateMonthlyReport', {
      errorMessage: error.message
    });
    return NextResponse.json({ error: 'Failed to generate monthly report' }, { status: 500 });
  }
} 