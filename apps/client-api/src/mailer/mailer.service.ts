import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly log = new Logger(MailerService.name);
  private transporter = nodemailer.createTransport({
    host: process.env.MAILER_HOST!,
    port: Number(process.env.MAILER_PORT ?? 587),
    secure: false,
    service: 'gmail',
    auth: process.env.MAILER_USER
      ? { user: process.env.MAILER_USER, pass: process.env.MAILER_PASSWORD }
      : undefined,
  });

  async send(to: string, subject: string, html: string) {
    if (process.env.MAILER_DISABLED === 'true') {
      this.log.warn(`[DEV] Mail deshabilitado. To=${to} Subject=${subject}`);
      return;
    }
    await this.transporter.sendMail({
      from: process.env.MAILER_FROM ?? 'no-reply@example.com',
      to,
      subject,
      html,
    });
  }
}
