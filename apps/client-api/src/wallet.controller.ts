import { Controller, Get, Req } from '@nestjs/common';

@Controller('wallet')
export class WalletController {
  @Get()
  getWallet(@Req() _req: any) {
    // Placeholder: retorna saldo 0
    return { currency: 'USDT', balance: 0 };
  }
}
