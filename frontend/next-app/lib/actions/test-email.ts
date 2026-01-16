'use server';

import { auth } from '@/auth';
import { sendEmail } from '@/lib/mail';

export async function sendTestEmail() {
    const session = await auth();
    if (!session?.user?.email) {
        return { success: false, error: 'User not authenticated or missing email' };
    }

    const email = session.user.email;
    const name = session.user.name || 'User';

    const subject = 'Test Email from HR-IMS';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🧪 Test Email</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <p>This is a test email from the HR-IMS Asset Management System.</p>
          <p>If you see this, your email configuration is working correctly! 🎉</p>
          
          <p>Current Time: ${new Date().toLocaleString('th-TH')}</p>
        </div>
      </div>
    </body>
    </html>
  `;

    try {
        const result = await sendEmail({ to: email, subject, html });
        return result;
    } catch (error) {
        console.error('Test email failed:', error);
        return { success: false, error: 'Failed to send test email' };
    }
}
