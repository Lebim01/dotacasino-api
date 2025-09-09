import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { MailerModule } from '../mailer/mailer.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JWTStrategy } from '../auth/jwt/jwt.strategy';
import { DisruptiveService } from '../disruptive/disruptive.service';
import { CasinoService } from '../casino/casino.service';

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
    UsersService,
    AuthService,
    JWTStrategy,
    DisruptiveService,
    CasinoService,
  ],
})
export class UsersModule {}
