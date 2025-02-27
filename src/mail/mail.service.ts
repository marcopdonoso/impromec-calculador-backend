import { Injectable } from '@nestjs/common';
import { render } from '@react-email/render';
import PasswordResetRequestEmail from 'emails/password-reset-request';
import PasswordResetSuccessEmail from 'emails/password-reset-success';
import { Resend } from 'resend';
import ConfirmAccountEmail from '../../emails/confirm-account';

@Injectable()
export class MailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    verificationToken: string,
  ) {
    const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;

    const html = await render(ConfirmAccountEmail({ name, verificationLink }));

    return this.resend.emails.send({
      from: 'Impromec Calculador <noreplay@impromec.com>',
      to,
      subject: 'Confirme su dirección de correo electrónico',
      html,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, resetToken: string) {
    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    const html = await render(PasswordResetRequestEmail({ name, resetLink }));

    return this.resend.emails.send({
      from: 'Impromec Calculador <noreplay@impromec.com>',
      to,
      subject: 'Restablecer contraseña en tu cuenta Impromec Calculador',
      html,
    });
  }

  async sendPasswordResetSuccessEmail(to: string, name: string) {
    const loginLink = `${process.env.FRONTEND_URL}/auth/login`;

    const html = await render(PasswordResetSuccessEmail({ name, loginLink }));

    return this.resend.emails.send({
      from: 'Impromec Calculador <noreplay@impromec.com>',
      to,
      subject:
        'La contraseña de tu cuenta Impromec Calculador se ha actualizado',
      html,
    });
  }
}
