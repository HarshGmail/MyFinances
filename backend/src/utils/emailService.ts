import { Resend } from 'resend';
import config from '../config';
import logger from './logger';

const resend = new Resend(config.RESEND_API_KEY);

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: 'security@my-finances.site',
      to,
      subject: 'Reset your ourFinance password',
      html: `<p>Hi ${name},</p>
             <p>Click the link below to reset your password. This link expires in 15 minutes.</p>
             <p><a href="${resetUrl}">Reset Password</a></p>
             <p>If you didn't request this, ignore this email.</p>`,
    });
    logger.info({ email: to }, 'Password reset email sent successfully');
  } catch (error) {
    logger.error({ err: error, email: to }, 'Failed to send password reset email');
    throw error;
  }
}
