/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpException, Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { USER_ROLES } from './auth.constants';
import { LoginAuthDto } from './dto/login-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '../mailer/mailer.service';
import { db } from '../firebase/admin';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async isExistingUser(email: string) {
    const user = await this.getUserByEmail(email);
    return !!user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const snap = await db
        .collection('users')
        .where('email', '==', email.toLowerCase())
        .get();
      if (snap.empty) throw new Error('not exists');
      const user = snap.docs[0];
      return { uid: user.id, ...user.data() } as any;
    } catch (err) {
      return null;
    }
  }

  async verifyPassword(password: string, hashedPassword: string) {
    const isPasswordValid = await compare(password, hashedPassword);
    if (!isPasswordValid) throw new HttpException('INVALID_PASSWORD', 403);
  }

  async verifyUsername(username: string, user_id?: string) {
    const usernames = await db
      .collection('users')
      .where('username', '==', username)
      .get();

    if (user_id) {
      return usernames.docs.filter((d: any) => d.id !== user_id).length == 0;
    } else {
      return usernames.empty;
    }
  }

  async loginUser(userObjectLogin: LoginAuthDto) {
    const { email, password } = userObjectLogin;
    const user = await this.getUserByEmail(email.toLowerCase());

    if (user) {
      if (!user.password) throw new HttpException('USER_BROKEN', 400);

      if (!user.uid) throw new HttpException('INVALID_USER', 400);

      // 3) Genera tokens
      const payload = {
        sub: user.uid,
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
    const _auth = await this.getUserByEmail(email);
    if (_auth) {
      await db
        .collection('users')
        .doc(_auth.uid)
        .update({
          is_admin: true,
          roles: [USER_ROLES.USER, USER_ROLES.ADMIN],
        });

      return 'OK';
    }
    return 'FAIL';
  }

  async revokeAdminRole(email: string) {
    if (!email) throw new HttpException('EMAIL_REQUIRED', 400);
    const _auth = await this.getUserByEmail(email);

    if (_auth) {
      await db
        .collection('users')
        .doc(_auth.uid)
        .update({
          is_admin: false,
          roles: [USER_ROLES.USER],
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
      await db.collection('otp').doc(user.uid).set({
        email: email.toLowerCase(),
        otp: otp_code,
        now: new Date(),
      });

      return { success: true };
    }
    return { success: false };
  }

  async verifyOTP(email: string, otp_code?: string) {
    const user = await this.getUserByEmail(email);

    if (user) {
      const otp_doc = await db.collection('otp').doc(user.uid).get();

      if (otp_doc.get('otp') == otp_code) {
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
