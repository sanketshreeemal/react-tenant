import { NextResponse } from 'next/server';
import { getWhatsAppMessageStatus } from '@/lib/whatsapp/messageUtils';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const messageId = url.searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    const result = await getWhatsAppMessageStatus(messageId);

    return NextResponse.json({
      success: result.success,
      status: result.status,
      error: result.error
    });
  } catch (error: any) {
    logger.error(`Error in WhatsApp status API route: ${error.message}`);
    
    return NextResponse.json(
      { error: 'Failed to check WhatsApp message status' },
      { status: 500 }
    );
  }
} 