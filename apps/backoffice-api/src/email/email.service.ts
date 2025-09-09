import { Injectable } from '@nestjs/common';
import { db } from '../firebase/admin';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Sponsor, Subscription } from './templates/subscription';
import { emailTransporter, EMAIL_SENDER } from '../constants';

@Injectable()
export class EmailService {
  transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  constructor() {
    this.transporter = nodemailer.createTransport(emailTransporter);
  }

  async sendEmailNewUser(id_user: string, test = false) {
    const userDoc = await db.collection('users').doc(id_user).get();
    const user = userDoc.data();
    const sponsorDoc = await db.collection('users').doc(user?.sponsor_id).get();
    const sponsor = sponsorDoc.exists ? sponsorDoc.data() : null;
    const template1 = Subscription(user);
    const template2 = Sponsor(user, sponsor);

    const mailOptions = {
      from: EMAIL_SENDER,
      to: test ? 'victoralvarezsaucedo@gmail.com' : user!.email,
      subject: 'Suscripción activada',
      html: template1,
    };

    const mailOptionsSponsor = {
      from: EMAIL_SENDER,
      to: test ? 'victoralvarezsaucedo@gmail.com' : sponsor!.email,
      subject: 'Suscripción activada',
      html: template2,
    };
    try {
      await this.transporter.sendMail(mailOptions);
      if (sponsor) {
        await this.transporter.sendMail(mailOptionsSponsor);
      }
    } catch (error) {
      console.error('Error sending email: ', error);
    }
  }
}
