import { Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class ReportsService {
  constructor(private readonly mailer: MailerService) {}

  async newreport(text: string, url: string) {
    await this.mailer.send(
      'victoralvarezsaucedo@gmail.com',
      'Reporte de error',
      `<p>${text}</p> <br /> <p>url: ${url}</p>`,
    );
  }
}
