import { UserCommonService } from '@domain/users/users.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { Controller, Post, Body } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import Decimal from 'decimal.js';
import dayjs from 'dayjs';
import { md5 } from './utils';

const generateHash = (session: string, dateTime: string, credit: number) => {
  return md5(session + dateTime + session + credit);
};

@Controller('bet')
export class BetController {
  constructor(
    private readonly walletService: WalletService,
    private readonly userService: UserCommonService,
    private readonly prismaService: PrismaService,
  ) { }

  @Post('')
  async webhook(@Body() body: any) {
    return 'Hello'
  }
}
