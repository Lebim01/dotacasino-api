import { WalletService } from '@domain/wallet/wallet.service';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class CasinoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

}
