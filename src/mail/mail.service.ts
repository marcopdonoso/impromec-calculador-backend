import { Injectable } from '@nestjs/common';
import { render } from '@react-email/render';
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
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const html = await render(ConfirmAccountEmail({ name, verificationLink }));

    return this.resend.emails.send({
      from: 'Impromec Calculador <noreplay@impromec.com>',
      to,
      subject: 'Confirme su dirección de correo  electrónico',
      html,
    });
  }
}
