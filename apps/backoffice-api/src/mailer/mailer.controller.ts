import { Controller, Post } from '@nestjs/common';
import { MailerService } from './mailer.service';

@Controller('mailer')
export class MailerController {
  constructor(private readonly mailerService: MailerService) {}

  @Post('test')
  async test() {
    return this.mailerService.sendOTPEmail(
      'victoralvarezsaucedo@gmail.com',
      '123',
    );
  }
}
