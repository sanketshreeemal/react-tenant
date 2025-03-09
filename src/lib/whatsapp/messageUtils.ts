/**
 * This is a simplified mock implementation of WhatsApp messaging integration
 * In a production environment, you would use the actual WhatsApp Business API
 */

import logger from '@/lib/logger';

// Get WhatsApp API configuration from environment variables
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v17.0';

interface WhatsAppMessage {
  to: string;
  message: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  message?: WhatsAppMessage;
}

// Check if WhatsApp API is properly configured
const isWhatsAppConfigured = (): boolean => {
  const isConfigured = !!(
    WHATSAPP_API_KEY &&
    WHATSAPP_PHONE_NUMBER_ID &&
    WHATSAPP_BUSINESS_ACCOUNT_ID
  );

  if (!isConfigured) {
    logger.warn('WhatsApp Business API is not properly configured. Check your environment variables.');
  }

  return isConfigured;
};

/**
 * Sends a WhatsApp message to a single recipient
 * @param phoneNumber The recipient's phone number in international format
 * @param message The message content
 * @returns Response with success status and message details
 */
export const sendWhatsAppMessage = async (
  phoneNumber: string,
  message: string
): Promise<SendMessageResponse> => {
  try {
    // Log the API request (with masked phone number for privacy)
    logger.info(`WhatsApp API Request: Sending message to ${phoneNumber.replace(/\d(?=\d{4})/g, '*')}`);

    // Check if WhatsApp API is configured
    if (!isWhatsAppConfigured()) {
      logger.warn('Using mock implementation for WhatsApp sendWhatsAppMessage');
      return mockSendWhatsAppMessage(phoneNumber, message);
    }

    // Validate phone number
    if (!phoneNumber || !/^\+?[0-9]{10,15}$/.test(phoneNumber)) {
      const error = 'Invalid phone number format. Please use international format (e.g., +1234567890).';
      logger.error(`WhatsApp validation error: ${error}`);
      
      return {
        success: false,
        error
      };
    }
    
    // Validate message
    if (!message || message.trim().length === 0) {
      const error = 'Message cannot be empty.';
      logger.error(`WhatsApp validation error: ${error}`);
      
      return {
        success: false,
        error
      };
    }

    // Ensure phone number is in correct format for WhatsApp API
    const formattedPhoneNumber = phoneNumber.startsWith('+') 
      ? phoneNumber.substring(1) 
      : phoneNumber;

    // Prepare API request to WhatsApp Cloud API
    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhoneNumber,
          type: 'text',
          text: {
            preview_url: false,
            body: message
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error(`WhatsApp API error: ${JSON.stringify(data)}`);
      return {
        success: false,
        error: data.error?.message || 'Failed to send WhatsApp message'
      };
    }

    // Handle successful response
    logger.info(`WhatsApp message sent successfully to ${phoneNumber.replace(/\d(?=\d{4})/g, '*')}`);
    
    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      message: {
        to: phoneNumber,
        message,
        timestamp: new Date().toISOString(),
        status: 'sent'
      }
    };
  } catch (error: any) {
    logger.error(`WhatsApp API error: ${error.message}`);

    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
};

/**
 * Sends a WhatsApp message to multiple recipients
 * @param phoneNumbers Array of recipient phone numbers in international format
 * @param message The message content
 * @returns Aggregated results of all send operations
 */
export const sendBulkWhatsAppMessages = async (
  phoneNumbers: string[],
  message: string
): Promise<{
  success: boolean;
  totalSent: number;
  totalFailed: number;
  results: SendMessageResponse[];
  error?: string;
}> => {
  try {
    logger.info(`WhatsApp API Request: Sending bulk messages to ${phoneNumbers.length} recipients`);

    // Validate input
    if (!phoneNumbers || phoneNumbers.length === 0) {
      logger.error('WhatsApp validation error: No recipients specified');
      
      return {
        success: false,
        totalSent: 0,
        totalFailed: 0,
        results: [],
        error: 'No recipients specified'
      };
    }

    // Send messages in parallel
    const results = await Promise.all(
      phoneNumbers.map(phoneNumber => sendWhatsAppMessage(phoneNumber, message))
    );

    // Count successful sends
    const totalSent = results.filter(result => result.success).length;
    const totalFailed = results.length - totalSent;
    
    logger.info(`WhatsApp bulk message results: ${totalSent} sent, ${totalFailed} failed`);

    return {
      success: totalSent > 0,
      totalSent,
      totalFailed,
      results,
      error: undefined
    };
  } catch (error: any) {
    logger.error(`WhatsApp API error during bulk send: ${error.message}`);

    return {
      success: false,
      totalSent: 0,
      totalFailed: phoneNumbers.length,
      results: [],
      error: error.message
    };
  }
};

/**
 * Checks the delivery status of a WhatsApp message
 * @param messageId The ID of the message to check
 * @returns Current status of the message
 */
export const getWhatsAppMessageStatus = async (
  messageId: string
): Promise<{
  success: boolean;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  error?: string;
}> => {
  try {
    logger.info(`WhatsApp API Request: Checking status for message ${messageId}`);
    
    // Check if WhatsApp API is configured
    if (!isWhatsAppConfigured()) {
      logger.warn('Using mock implementation for WhatsApp getWhatsAppMessageStatus');
      return mockGetWhatsAppMessageStatus(messageId);
    }

    // Validate message ID
    if (!messageId) {
      const error = 'Invalid message ID.';
      logger.error(`WhatsApp validation error: ${error}`);
      
      return {
        success: false,
        error
      };
    }

    // Make API request to check message status
    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${messageId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error(`WhatsApp API error: ${JSON.stringify(data)}`);
      return {
        success: false,
        error: data.error?.message || 'Failed to check message status'
      };
    }

    // Map status from WhatsApp API to our status format
    let status: 'sent' | 'delivered' | 'read' | 'failed' = 'sent';
    
    if (data.status) {
      switch (data.status) {
        case 'sent':
          status = 'sent';
          break;
        case 'delivered':
          status = 'delivered';
          break;
        case 'read':
          status = 'read';
          break;
        case 'failed':
          status = 'failed';
          break;
        default:
          status = 'sent';
      }
    }

    logger.info(`WhatsApp message status for ${messageId}: ${status}`);
    
    return {
      success: true,
      status
    };
  } catch (error: any) {
    logger.error(`WhatsApp API error: ${error.message}`);
    
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
};

/**
 * Mock implementation for sending WhatsApp messages when testing
 * @param phoneNumber The recipient's phone number
 * @param message The message content
 * @returns Simulated response
 */
const mockSendWhatsAppMessage = async (
  phoneNumber: string,
  message: string
): Promise<SendMessageResponse> => {
  // Generate a mock message ID
  const messageId = `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Create a mock message with random status (mostly successful)
  const mockMessage: WhatsAppMessage = {
    to: phoneNumber,
    message,
    timestamp: new Date().toISOString(),
    status: Math.random() > 0.2 ? 'sent' : 'failed'
  };
  
  // Log mock implementation usage
  logger.debug(`Using mock implementation for WhatsApp sendWhatsAppMessage`);
  
  // Return success or failure
  if (mockMessage.status === 'sent') {
    return {
      success: true,
      messageId,
      message: mockMessage
    };
  } else {
    return {
      success: false,
      error: 'Mock implementation simulated failure',
      messageId
    };
  }
};

/**
 * Mock implementation for checking WhatsApp message status when testing
 * @param messageId The ID of the message to check
 * @returns Simulated status
 */
const mockGetWhatsAppMessageStatus = async (
  messageId: string
): Promise<{
  success: boolean;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  error?: string;
}> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Randomly assign a status
  const randomValue = Math.random();
  let randomStatus: 'sent' | 'delivered' | 'read' | 'failed';
  
  if (randomValue < 0.1) {
    randomStatus = 'failed';
  } else if (randomValue < 0.4) {
    randomStatus = 'sent';
  } else if (randomValue < 0.7) {
    randomStatus = 'delivered';
  } else {
    randomStatus = 'read';
  }
  
  // Log mock implementation usage
  logger.debug(`Using mock implementation for WhatsApp getWhatsAppMessageStatus`);
  
  return {
    success: randomStatus !== 'failed',
    status: randomStatus
  };
}; 