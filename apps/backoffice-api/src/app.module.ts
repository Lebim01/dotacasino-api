import 'dotenv/config';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BinaryModule } from './binary/binary.module';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from './mailer/mailer.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { EmailModule } from './email/email.module';
import { DepositsModule } from './deposits/deposits.module';
import { CoinpaymentsModule } from './coinpayments/coinpayments.module';
import { MembershipsModule } from './memberships/memberships.module';
import { RanksModule } from './ranks/ranks.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { CountriesModule } from './countries/countries.module';
import { AcademyModule } from './academy/academy.module';
import { SignalsModule } from './signals/signals.module';
import { DisruptiveController } from './disruptive/disruptive.controller';
import { DisruptiveService } from './disruptive/disruptive.service';
import { DisruptiveModule } from './disruptive/disruptive.module';
import { CasinoModule } from './casino/casino.module';
import { CasinoService } from './casino/casino.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BinaryModule,
    AuthModule,
    MailerModule,
    UsersModule,
    SubscriptionsModule,
    EmailModule,
    DepositsModule,
    CoinpaymentsModule,
    MembershipsModule,
    RanksModule,
    AdminModule,
    ReportsModule,
    CountriesModule,
    AcademyModule,
    SignalsModule,
    DisruptiveModule,
    CasinoModule,
  ],
  controllers: [AppController, DisruptiveController],
  providers: [AppService, DisruptiveService, CasinoService],
})
export class AppModule {}
