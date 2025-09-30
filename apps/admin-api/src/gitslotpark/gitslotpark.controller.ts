import { Controller, Headers, Post, Body, Logger } from '@nestjs/common';

@Controller('gitslotpark')
export class GitslotparkController {
  private readonly logger = new Logger(GitslotparkController.name, {
    timestamp: true,
  });

  @Post('webhook')
  webhook(@Headers() headers: Record<string, string>, @Body() body: any) {
    this.logger.log(headers);
    this.logger.log(body);
    return 'OK';
  }
}
