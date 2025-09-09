import { Controller, Get } from '@nestjs/common';
import { EmailService } from './email.service';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}
  @Get('send')
  async sendMail() {
    try {
      await this.emailService.sendEmailNewUser(
        'YiBLWtBKH4M358ui2SjbhPnbiA02',
        true,
      );
    } catch (error) {
      console.error('ocurrio un error al enviar el email', error);
    }
    return 'listo';
  }
}
