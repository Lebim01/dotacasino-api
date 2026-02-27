import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Sponsor, Subscription } from './templates/subscription';
import { emailTransporter, EMAIL_SENDER } from '../constants';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class EmailService {
  transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  constructor(private readonly prisma: PrismaService) {
    this.transporter = nodemailer.createTransport(emailTransporter);
  }

  async sendEmailNewUser(id_user: string, test = false) {
    const user = await this.prisma.user.findUnique({
      where: { id: id_user }
    });
    if (!user) return;

    const sponsor = user.sponsorId ? await this.prisma.user.findUnique({
      where: { id: user.sponsorId }
    }) : null;

    // Adaptamos el objeto user para el template si es necesario (ej: mapear display_name -> name)
    const userForTemplate = {
        ...user,
        name: user.displayName,
    };

    const template1 = Subscription(userForTemplate as any);
    const template2 = Sponsor(userForTemplate as any, sponsor as any);

    const mailOptions = {
      from: EMAIL_SENDER,
      to: test ? 'victoralvarezsaucedo@gmail.com' : user.email,
      subject: 'Suscripción activada',
      html: template1,
    };

    const mailOptionsSponsor = {
      from: EMAIL_SENDER,
      to: test ? 'victoralvarezsaucedo@gmail.com' : sponsor?.email,
      subject: 'Suscripción activada',
      html: template2,
    };
    
    try {
      await this.transporter.sendMail(mailOptions);
      if (sponsor) {
        await this.transporter.sendMail(mailOptionsSponsor as any);
      }
    } catch (error) {
      console.error('Error sending email: ', error);
    }
  }
}
