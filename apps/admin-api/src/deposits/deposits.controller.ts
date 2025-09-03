import { Controller, Headers, Post, Body, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Admin • DEPOSITS')
@Controller('deposits')
export class DepositsController {
  private readonly logger = new Logger(DepositsController.name, {
    timestamp: true,
  });

  @Post('webhook')
  webhook(@Headers() headers: Record<string, string>, @Body() body: any) {
    this.logger.log(headers);
    this.logger.log(body);
    return 'OK';
  }
}
