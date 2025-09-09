import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JWTStrategy } from './jwt/jwt.strategy';
import { MailerModule } from '../mailer/mailer.module';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { BinaryService } from '../binary/binary.service';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';
import { CoinpaymentsService } from '../coinpayments/coinpayments.service';
import { DisruptiveService } from '../disruptive/disruptive.service';
import { CasinoService } from '../casino/casino.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '30d' },
    }),
    MailerModule,
  ],
  providers: [
    AuthService,
    JWTStrategy,
    SubscriptionsService,
    BinaryService,
    BondsService,
    UsersService,
    CoinpaymentsService,
    DisruptiveService,
    CasinoService,
    AuthAcademyService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
