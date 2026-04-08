import { Resend } from 'resend';
import config from '../config';
import logger from './logger';

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<void> {
  // Validate API key
  if (!config.RESEND_API_KEY) {
    const msg = 'RESEND_API_KEY is not configured';
    logger.error({ email: to }, msg);
    throw new Error(msg);
  }

  const resend = new Resend(config.RESEND_API_KEY);

  try {
    const response = await resend.emails.send({
      from: 'security@my-finances.site',
      to,
      subject: 'Reset your ourFinance password',
      html: `<p>Hi ${name},</p>
             <p>Click the link below to reset your password. This link expires in 15 minutes.</p>
             <p><a href="${resetUrl}">Reset Password</a></p>
             <p>If you didn't request this, ignore this email.</p>`,
    });

    if (response.error) {
      logger.error({ error: response.error, email: to }, 'Resend API returned an error');
      throw new Error(`Resend error: ${JSON.stringify(response.error)}`);
    }

    logger.info(
      { email: to, resendId: response.data?.id },
      'Password reset email sent successfully'
    );
  } catch (error) {
    logger.error({ err: error, email: to }, 'Failed to send password reset email');
    throw error;
  }
}
