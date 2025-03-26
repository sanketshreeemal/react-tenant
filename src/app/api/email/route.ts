import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase/firebase';
import { collection, getDocs, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import logger from '@/lib/logger';
import { newTenantEmail, newRentPaymentEmail, monthlyReportEmail, customEmail } from '@/lib/utils/emailTemplates';

// Get email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@tenantmanagement.com';

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

// Create nodemailer transporter
const createTransporter = () => {
  if (!isEmailConfigured()) {
    throw new Error('Email service is not properly configured');
  }

  logger.info('Creating email transporter', {
    service: 'Email',
    additionalInfo: {
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      user: EMAIL_USER ? EMAIL_USER.replace(/(?<=.).(?=.*@)/g, '*') : undefined
    }
  });

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });
};

// Send transactional email
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data, recipientEmail } = body;
    
    logger.apiRequest('Email', 'sendTransactionalEmail', {
      type,
      recipientEmail: recipientEmail.replace(/(?<=.).(?=.*@)/g, '*'),
      dataKeys: Object.keys(data || {})
    });

    if (!recipientEmail) {
      throw new Error('Recipient email is required');
    }

    const transporter = createTransporter();
    let emailContent;
    
    // Configure email based on type
    switch (type) {
      case 'new_tenant':
        emailContent = newTenantEmail(data);
        break;
        
      case 'new_rent_payment':
        emailContent = newRentPaymentEmail(data);
        break;
        
      case 'custom_email':
        emailContent = customEmail(data);
        break;
        
      default:
        logger.error(`Invalid email type: ${type}`, {
          service: 'Email',
          endpoint: 'sendTransactionalEmail'
        });
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }
    
    // Send email
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });
    
    logger.apiSuccess('Email', 'sendTransactionalEmail', {
      type,
      recipientEmail: recipientEmail.replace(/(?<=.).(?=.*@)/g, '*')
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.apiError(error, 'Email', 'sendTransactionalEmail', {
      errorMessage: error.message
    });
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}

interface Lease {
  id: string;
  isActive: boolean;
  leaseEndDate: string;
  tenantStillOccupying: boolean;
  unitNumber: string;
  tenantName: string;
  rentAmount: number;
}

// Generate and send monthly report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recipientEmails = searchParams.get('emails')?.split(',') || [];
    
    logger.apiRequest('Email', 'generateMonthlyReport', {
      recipientEmails: recipientEmails.map(email => email.replace(/(?<=.).(?=.*@)/g, '*'))
    });
    
    if (recipientEmails.length === 0) {
      throw new Error('At least one recipient email is required');
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
    const leases = leasesSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data(),
    })) as Lease[];
    
    // Separate active and expired leases
    const activeLeases = leases.filter(lease => lease.isActive);
    const expiredLeases = leases.filter(lease => 
      !lease.isActive && new Date(lease.leaseEndDate) < currentDate && lease.tenantStillOccupying
    );
    
    // Calculate expected rent and occupied units
    const totalExpectedRent = activeLeases.reduce((sum, lease) => sum + Number(lease.rentAmount), 0);
    const occupiedUnits = new Set([...activeLeases, ...expiredLeases].map(lease => lease.unitNumber)).size;
    
    const transporter = createTransporter();
    const emailContent = monthlyReportEmail({
      activeLeases,
      expiredLeases,
      formattedDate,
      totalExpectedRent,
      occupiedUnits
    });
    
    // Send email to all recipients
    await Promise.all(recipientEmails.map(email => 
      transporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
      })
    ));
    
    logger.apiSuccess('Email', 'generateMonthlyReport', {
      recipientEmails: recipientEmails.map(email => email.replace(/(?<=.).(?=.*@)/g, '*')),
      reportDate: formattedDate
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.apiError(error, 'Email', 'generateMonthlyReport', {
      errorMessage: error.message
    });
    return NextResponse.json({ error: error.message || 'Failed to generate monthly report' }, { status: 500 });
  }
} 