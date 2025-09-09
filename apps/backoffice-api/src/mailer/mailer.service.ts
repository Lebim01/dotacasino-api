import { HttpException, Injectable } from '@nestjs/common';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailerService {
  constructor(private mailerService: NestMailerService) {}

  async sendOTPEmail(email: string, otp: string) {
    await this.mailerService
      .sendMail({
        to: email.toLowerCase(),
        subject: 'Código de verificación Dota',
        //template: './authentication',
        html: `
          <h1 style='font-size: 24px; margin-bottom: 10px;'>¡Hola!</h1>
          <p style='font-size: 16px; margin-bottom: 10px;'>Recibimos una solicitud para
            verificar tu cuenta.</p>
          <p style='font-size: 16px; margin-bottom: 10px;'>Si no realizaste esta
            solicitud, ignora este mensaje.</p>
          <p style='font-size: 16px; margin-bottom: 10px;'>Si fuiste tú, por favor ingresa
            el siguiente código en la aplicación:</p>

          <p style='font-size: 16px; margin-bottom: 5px;'>Tu código de verificación es:</p>
          <h2 style='font-size: 28px; margin-bottom: 10px;'>${otp}</h2>
          <p style='font-size: 16px;'>Enviado por DOTA</p>
        `,
        context: {
          otp,
        },
      })
      .catch((error) => {
        console.error(error);
        throw new HttpException('MAILER_ERROR', 500);
      });

    return { message: 'OTP_SENDED_SUCCESSFULLY', success: true };
  }

  async sendRecoverPassEmail(email: string, otp: string) {
    await this.mailerService
      .sendMail({
        to: email.toLowerCase(),
        subject: 'Recuperación de contraseña Dota',
        //template: './recover-pass',
        html: `
          <h1 style='font-size: 24px; margin-bottom: 10px;'>¡Hola!</h1>
          <p style='font-size: 16px; margin-bottom: 10px;'>Recibimos una solicitud para
            cambiar tu contraseña.</p>
          <p style='font-size: 16px; margin-bottom: 10px;'>Si no realizaste esta
            solicitud, ignora este mensaje.</p>
          <p style='font-size: 16px; margin-bottom: 10px;'>Si fuiste tú, por favor ingresa
            el siguiente código en la aplicación:</p>

          <p style='font-size: 16px; margin-bottom: 5px;'>Tu código de verificación es:</p>
          <h2 style='font-size: 28px; margin-bottom: 10px;'>${otp}</h2>
          <p style='font-size: 16px;'>Enviado por DOTA</p>
        `,
        context: {
          otp,
        },
      })
      .catch((error) => {
        console.error(error);
        throw new HttpException('MAILER_ERROR', 500);
      });

    return { message: 'RECOVER_PASS_EMAIL_SENDED_SUCCESSFULLY', success: true };
  }

  async sendOTP(email: string, otp: string) {
    await this.mailerService
      .sendMail({
        to: email.toLowerCase(),
        subject: 'Código de verficación Dota',
        //template: './recover-pass',
        html: `
          <h1 style='font-size: 24px; margin-bottom: 10px;'>¡Hola!</h1>
          <p style='font-size: 16px; margin-bottom: 10px;'>Recibimos una solicitud que requiere verificación.</p>
          <p style='font-size: 16px; margin-bottom: 10px;'>Si no realizaste esta
            solicitud, ignora este mensaje.</p>
          <p style='font-size: 16px; margin-bottom: 10px;'>Si fuiste tú, por favor ingresa
            el siguiente código en la aplicación:</p>

          <p style='font-size: 16px; margin-bottom: 5px;'>Tu código de verificación es:</p>
          <h2 style='font-size: 28px; margin-bottom: 10px;'>${otp}</h2>
          <p style='font-size: 16px;'>Enviado por DOTA</p>
        `,
        context: {
          otp,
        },
      })
      .catch((error) => {
        console.error(error);
        throw new HttpException('MAILER_ERROR', 500);
      });

    return { message: 'RECOVER_PASS_EMAIL_SENDED_SUCCESSFULLY', success: true };
  }
}
