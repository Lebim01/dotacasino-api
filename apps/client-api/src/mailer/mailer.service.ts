import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly log = new Logger(MailerService.name);
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  async send(to: string, subject: string, html: string) {
    if (process.env.MAIL_DISABLED === 'true') {
      this.log.warn(`[DEV] Mail deshabilitado. To=${to} Subject=${subject}`);
      return;
    }
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM ?? 'no-reply@example.com',
      to,
      subject,
      html,
    });
  }
}
