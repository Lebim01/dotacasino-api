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
import { MembershipsModule } from './memberships/memberships.module';
import { RanksModule } from './ranks/ranks.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { CountriesModule } from './countries/countries.module';
import { AcademyModule } from './academy/academy.module';
import { SignalsModule } from './signals/signals.module';
import { SeedModule } from './seed/seed.module';
import { DisruptiveModule } from '@domain/disruptive/disruptive.module';
import { CasinoModule } from '@domain/casino/casino.module';
import { DisruptiveController } from '@domain/disruptive/disruptive.controller';
import { NodePaymentsModule } from '@domain/node-payments/node-payments.module';
import { NodePaymentsService } from '@domain/node-payments/node-payments.service';
import { CasinoService } from '@domain/casino/casino.service';
import { WalletModule } from '@domain/wallet/wallet.module';
import { PrismaService } from 'libs/db/src/prisma.service';
import { CasinoDashboardModule } from './casino-dashboard/casino-dashboard.module';
import { GamesModule } from './games/games.module';
import { ReportsCasinoModule } from './reports-casino/reports-casino.module';
import { AuthAcademyModule } from '@domain/auth-academy/auth-academy.module';
import { BondsModule } from './bonds/bonds.module';
import { GameProvidersModule } from '@domain/game-providers/game-providers.module';
import { AdminSupportModule } from './support/support.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SeedModule,
    BinaryModule,
    AuthModule,
    MailerModule,
    UsersModule,
    SubscriptionsModule,
    EmailModule,
    MembershipsModule,
    RanksModule,
    AdminModule,
    ReportsModule,
    CountriesModule,
    AcademyModule,
    SignalsModule,
    NodePaymentsModule,
    CasinoModule,
    WalletModule,
    CasinoDashboardModule,
    GamesModule,
    ReportsCasinoModule,
    AuthAcademyModule,
    BondsModule,
    GameProvidersModule,
    AdminSupportModule,
  ],
  controllers: [AppController],
  providers: [AppService, NodePaymentsService, PrismaService, CasinoService],
})
export class AppModule {}
