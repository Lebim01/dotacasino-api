import { UserCommonService } from '@domain/users/users.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { Controller, Post, Body, Get, Options, Res } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import Decimal from 'decimal.js';
import dayjs from 'dayjs';
import { md5, generateHmacResponse } from './utils';
import { ConfigService } from '@nestjs/config';

const generateHash = (session: string, dateTime: string, credit: number) => {
  return md5(session + dateTime + session + credit);
};

@Controller('bet')
export class BetController {
  constructor(
    private readonly configService: ConfigService,
  ) { }

  @Options()
  preflight(@Res() res: Response) {
    return ''
  }

  @Get('')
  async hello() {
    return 'Hello GET';
  }

  @Post('')
  async webhook(@Body() body: any) {
    if (body.type === 'ping') {
      const responseBody = {
        status: 'OK',
      };
      const secretKey = this.configService.getOrThrow<string>('SOFTGAMING_HMACSECRET');
      return {
        ...responseBody,
        hmac: generateHmacResponse(responseBody, secretKey),
      };
    }
  }
}
