import { HttpException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { USER_ROLES } from './auth.constants';
import { LoginAuthDto } from './dto/login-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '../mailer/mailer.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) { }

  async isExistingUser(email: string) {
    const user = await this.getUserByEmail(email);
    return !!user;
  }

  async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async verifyPassword(password: string, hashedPassword: string) {
    const isPasswordValid = await argon2.verify(hashedPassword, password);
    if (!isPasswordValid) throw new HttpException('INVALID_PASSWORD', 403);
  }

  async verifyUsername(username: string, user_id?: string) {
    if (user_id) {
      const user = await this.prisma.user.findFirst({
        where: {
          displayName: username,
          NOT: { id: user_id },
        },
      });
      return !user;
    } else {
      const user = await this.prisma.user.findFirst({
        where: { displayName: username },
      });
      return !user;
    }
  }

  async loginUser(userObjectLogin: LoginAuthDto) {
    const { email, password } = userObjectLogin;
    const user = await this.getUserByEmail(email.toLowerCase());

    if (user) {
      if (!user.passwordHash) throw new HttpException('USER_BROKEN', 400);

      const payload = {
        sub: user.id,
        email: user.email,
        roles: user.roles ?? ['user'],
      };

      const access_token = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET!,
        expiresIn: '15m',
      });

      return access_token;
    } else {
      throw new HttpException('USER_BROKEN', 400);
    }
  }

  async giveAdminRole(email: string) {
    if (!email) throw new HttpException('EMAIL_REQUIRED', 400);
    const user = await this.getUserByEmail(email);
    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          roles: {
            set: [USER_ROLES.USER, USER_ROLES.ADMIN],
          },
        },
      });

      return 'OK';
    }
    return 'FAIL';
  }

  async revokeAdminRole(email: string) {
    if (!email) throw new HttpException('EMAIL_REQUIRED', 400);
    const user = await this.getUserByEmail(email);

    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          roles: {
            set: [USER_ROLES.USER],
          },
        },
      });

      return 'OK';
    }
    return 'FAIL';
  }

  generateOTP() {
    return Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, '0');
  }

  async createOTPNode(email: string, otp_code: string) {
    const user = await this.getUserByEmail(email);

    if (user) {
      await this.prisma.oTP.upsert({
        where: { id: user.id },
        update: {
          otp: otp_code,
          createdAt: new Date(),
        },
        create: {
          id: user.id,
          otp: otp_code,
          createdAt: new Date(),
        },
      });

      return { success: true };
    }
    return { success: false };
  }

  async verifyOTP(email: string, otp_code?: string) {
    const user = await this.getUserByEmail(email);

    if (user) {
      const otp_doc = await this.prisma.oTP.findUnique({
        where: { id: user.id },
      });

      if (otp_doc && otp_doc.otp == otp_code) {
        return { success: true };
      }
    }

    return { success: false };
  }

  async sendOTP(email: string, otp: string) {
    const isSended = await this.mailerService.sendOTPEmail(
      email.toLowerCase(),
      otp,
    );
    if (!isSended) throw new HttpException('MAILER_ERROR', 500);
    return isSended;
  }
}
