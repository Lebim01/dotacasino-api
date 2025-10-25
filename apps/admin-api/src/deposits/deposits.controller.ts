import { StdMexWebhookDto } from '@domain/stdmex/dto/webhook.dto';
import { StdMexService } from '@domain/stdmex/stdmex.service';
import { Controller, Headers, Post, Body, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Admin • DEPOSITS')
@Controller('deposits')
export class DepositsController {
  private readonly logger = new Logger(DepositsController.name, {
    timestamp: true,
  });

  constructor(private readonly stdmex: StdMexService) {}

  @Post('webhook')
  webhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: StdMexWebhookDto,
  ) {
    return this.stdmex.handleWebhook(authorization, body);
  }
}
