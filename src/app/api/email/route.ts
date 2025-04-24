import { NextRequest, NextResponse } from 'next/server';
import { emailService, type EmailOptions } from '@/lib/email/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.to || !body.subject || !body.html) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const emailOptions: EmailOptions = {
      to: body.to,
      subject: body.subject,
      html: body.html,
      from: body.from, // Optional
    };

    const result = await emailService.sendEmail(emailOptions);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 