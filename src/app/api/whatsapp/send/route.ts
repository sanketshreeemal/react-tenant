import { NextResponse } from 'next/server';
import { sendWhatsAppMessage, sendBulkWhatsAppMessages } from '@/lib/whatsapp/messageUtils';
import logger from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, message } = body;

    // Validate input
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (!recipients || (Array.isArray(recipients) && recipients.length === 0)) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    // Handle both single recipient and multiple recipients
    let result;
    if (Array.isArray(recipients)) {
      // Handle multiple recipients
      result = await sendBulkWhatsAppMessages(recipients, message);
      
      return NextResponse.json({
        success: result.success,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
        results: result.results
      });
    } else {
      // Handle single recipient
      result = await sendWhatsAppMessage(recipients, message);
      
      return NextResponse.json({
        success: result.success,
        messageId: result.messageId,
        error: result.error
      });
    }
  } catch (error: any) {
    logger.error(`Error in WhatsApp API route: ${error.message}`);
    
    return NextResponse.json(
      { error: 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
} 