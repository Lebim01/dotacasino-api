import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { StdMexService } from './stdmex.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { StdMexWebhookDto } from './dto/webhook.dto';

/**
 * Rutas sugeridas:
 * - GET    /stdmex/clabe/:userId       → obtiene/crea CLABE (una por usuario)
 * - POST   /stdmex/orders/:userId      → crea orden de depósito (MXN)
 * - POST   /webhooks/stdmex            → webhook de confirmación (APPROVED) → acredita wallet
 * - POST   /stdmex/clabe/:clabe/block  → bloquear CLABE (opcional)
 * - POST   /stdmex/clabe/:clabe/unblock→ desbloquear CLABE (opcional)
 */
@Controller()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class StdMexController {
  constructor(private readonly stdmex: StdMexService) {}

  @Get('stdmex/clabe/:userId')
  async getOrCreateClabe(@Param('userId') userId: string) {
    return this.stdmex.getOrCreateClabeForUser(userId);
  }

  @Post('stdmex/orders/:userId')
  async createOrder(
    @Param('userId') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.stdmex.createDepositOrder(userId, dto);
  }

  @Post('stdmex/clabe/:clabe/block')
  async block(@Param('clabe') clabe: string) {
    return this.stdmex.blockClabe(clabe);
  }

  @Post('stdmex/clabe/:clabe/unblock')
  async unblock(@Param('clabe') clabe: string) {
    return this.stdmex.unblockClabe(clabe);
  }

  /**
   * Webhook que STDMEX invocará (con Authorization: Bearer <token>).
   * Debe responder {"respuesta":"aceptado"} para confirmar recepción.
   */
  @Post('webhooks/stdmex')
  async webhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: StdMexWebhookDto,
  ) {
    return this.stdmex.handleWebhook(authorization, body);
  }
}
