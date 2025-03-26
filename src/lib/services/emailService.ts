import { db } from '../firebase/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import logger from '../logger';

interface EmailData {
  type: string;
  data: any;
  recipientEmail: string;
}

interface AdminRecipient {
  id?: string;
  name: string;
  email: string;
}

export const addAdminRecipient = async (recipient: AdminRecipient) => {
  try {
    const docRef = await addDoc(collection(db, 'adminRecipients'), {
      name: recipient.name,
      email: recipient.email,
      createdAt: new Date().toISOString()
    });
    
    logger.info('Added new admin recipient', {
      service: 'EmailService',
      recipientEmail: recipient.email.replace(/(?<=.).(?=.*@)/g, '*')
    });
    
    return { id: docRef.id, ...recipient };
  } catch (error) {
    logger.error('Error adding admin recipient', {
      service: 'EmailService',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

export const getAdminRecipients = async (): Promise<AdminRecipient[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'adminRecipients'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AdminRecipient[];
  } catch (error) {
    logger.error('Error getting admin recipients', {
      service: 'EmailService',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

export const removeAdminRecipient = async (recipientId: string) => {
  try {
    await deleteDoc(doc(db, 'adminRecipients', recipientId));
    logger.info('Removed admin recipient', {
      service: 'EmailService',
      recipientId
    });
  } catch (error) {
    logger.error('Error removing admin recipient', {
      service: 'EmailService',
      recipientId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

export const sendTransactionalEmail = async ({ type, data, recipientEmail }: EmailData) => {
  try {
    logger.info('Sending transactional email', {
      service: 'EmailService',
      type,
      recipientEmail: recipientEmail.replace(/(?<=.).(?=.*@)/g, '*')
    });

    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, data, recipientEmail }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    const result = await response.json();
    
    logger.info('Email sent successfully', {
      service: 'EmailService',
      type,
      recipientEmail: recipientEmail.replace(/(?<=.).(?=.*@)/g, '*')
    });

    return result;
  } catch (error) {
    logger.error('Error sending email', {
      service: 'EmailService',
      type,
      recipientEmail: recipientEmail.replace(/(?<=.).(?=.*@)/g, '*'),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

export const generateMonthlyReport = async () => {
  try {
    // Get all admin recipients
    const adminRecipients = await getAdminRecipients();
    
    if (adminRecipients.length === 0) {
      throw new Error('No admin recipients configured. Please add at least one recipient.');
    }
    
    const recipientEmails = adminRecipients.map(r => r.email);
    
    logger.info('Generating monthly report', {
      service: 'EmailService',
      recipientCount: recipientEmails.length
    });

    const response = await fetch(`/api/email?emails=${encodeURIComponent(recipientEmails.join(','))}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to generate report: ${response.statusText}`);
    }

    const result = await response.json();
    
    logger.info('Monthly report generated successfully', {
      service: 'EmailService',
      recipientCount: recipientEmails.length
    });

    return result;
  } catch (error) {
    logger.error('Error generating monthly report', {
      service: 'EmailService',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}; 