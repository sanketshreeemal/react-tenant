import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private defaultFromAddress: string;

  constructor() {
    if (!process.env.GMAIL_APP_PASSWORD) {
      throw new Error('GMAIL_APP_PASSWORD environment variable is not set');
    }

    this.defaultFromAddress = 'ecityhsr.re@gmail.com';
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.defaultFromAddress,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const mailOptions = {
        from: options.from || `Property Management Team <${this.defaultFromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService();

// Export types for use in other files
export type { EmailOptions }; 