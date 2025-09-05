import { Module } from '@nestjs/common';
import { RecoveryService } from './recovery.service';
import { RecoveryController } from './recovery.controller';
import { MailerModule } from '../../mailer/mailer.module';

@Module({
  imports: [MailerModule],
  providers: [RecoveryService],
  controllers: [RecoveryController],
})
export class RecoveryModule {}
