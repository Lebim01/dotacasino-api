import { Controller, Headers, Post, Body, Logger } from '@nestjs/common';

@Controller('tbs2api')
export class Tbs2apiController {
  private readonly logger = new Logger(Tbs2apiController.name, {
    timestamp: true,
  });

  @Post('')
  webhook(@Headers() headers: Record<string, string>, @Body() body: any) {
    this.logger.log(headers);
    this.logger.log(body);
    return 'OK';
  }
}
