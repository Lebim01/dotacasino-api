import { Injectable } from '@nestjs/common';
import { QueryLedgerDto } from './dto/query-ledger.dto';
import { PrismaService } from 'libs/db/src/prisma.service';
import { resolveCurrencyByCountry } from 'libs/shared/src/currency';

@Injectable()
export class ClientWalletService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveUserCurrency(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { country: true },
    });

    return resolveCurrencyByCountry(user?.country ?? null);
  }

  private async getOrCreateWallet(userId: string) {
    const currency = await this.resolveUserCurrency(userId);

    let wallet = await this.prisma.wallet.findFirst({
      where: { userId, currency },
      select: { id: true, balance: true, currency: true },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId, currency, balance: 0 },
        select: { id: true, balance: true, currency: true },
      });
    }

    return wallet;
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return { currency: wallet.currency, balance: Number(wallet.balance) };
  }

  async getLedger(userId: string, q: QueryLedgerDto) {
    const wallet = await this.getOrCreateWallet(userId);

    const where: any = { walletId: wallet.id };
    if (q.kind) where.kind = q.kind;

    const skip = (q.page - 1) * q.pageSize;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: q.pageSize,
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      currency: r.currency,
      kind: r.kind,
      amount: Number(r.amount),
      balanceAfter: r.balanceAfter ? Number(r.balanceAfter) : null,
      meta: r.meta,
      createdAt: r.createdAt,
    }));

    return { page: q.page, pageSize: q.pageSize, total, items };
  }
}
