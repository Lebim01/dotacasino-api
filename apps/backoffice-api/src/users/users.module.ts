import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { MailerModule } from '../mailer/mailer.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { CasinoService } from '@domain/casino/casino.service';
import { JwtStrategy } from '@security/jwt.strategy';
import { UserCommonService } from '@domain/users/users.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '2d' },
    }),
    MailerModule,
  ],
  controllers: [UsersController],
  providers: [
    PrismaService,
    UsersService,
    AuthService,
    JwtStrategy,
    DisruptiveService,
    UserCommonService,
    CasinoService,
    AuthAcademyService,
  ],
})
export class UsersModule {}
