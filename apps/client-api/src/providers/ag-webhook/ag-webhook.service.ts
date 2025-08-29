import { Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import { PostTransferRecord } from './xml.types';
import Decimal from 'decimal.js';
import { CURRENCY } from 'libs/shared/src/currency';
import { WalletService } from '@domain/wallet/wallet.service';

type TransferResult = { code: string; balance: string };

@Injectable()
export class AgWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  // Calcula delta a aplicar en wallet (según tipo de transacción)
  // Regla Live Game: payoff = netAmount + validBetAmount (para WIN/LOSE/DRAW) :contentReference[oaicite:11]{index=11}
  private computeDelta(rec: PostTransferRecord): Decimal {
    const t = rec.transactionType?.toUpperCase();

    if (t === 'BET') {
      const v = new Decimal(rec.value ?? '0');
      return v.neg(); // apostó => debitamos
    }

    const net = new Decimal(rec.netAmount ?? '0');
    const vba = new Decimal(rec.validBetAmount ?? '0');

    // Para WIN/LOSE/DRAW se usa payoff = net + validBetAmount.
    // - WIN típico: net>0 => creditamos (vuelve stake + ganancia)
    // - LOSE típico: net<0 y |net|=stake => payoff 0 (no cambia saldo)
    // - Dragon Tiger draw: net negativo = -stake/2 => payoff = stake/2 devuelto :contentReference[oaicite:12]{index=12}
    return net.plus(vba);
  }

  // Idempotencia por (provider|transactionID|billNo) — mismo response siempre :contentReference[oaicite:13]{index=13}
  private uniqueKey(rec: PostTransferRecord) {
    const bill = rec.billNo ?? '-';
    return `AG|${rec.transactionID}|${bill}`;
  }

  async handle(rec: PostTransferRecord): Promise<TransferResult> {
    if (rec.currency !== CURRENCY) {
      return { code: 'INVALID_DATA', balance: '0' }; // o el balance actual si prefieres
    }

    const uk = this.uniqueKey(rec);

    // ¿ya lo procesamos?
    const prev = await this.prisma.providerPostTransfer.findUnique({
      where: { uniqueKey: uk },
    });
    if (prev) {
      return { code: prev.responseCode, balance: prev.balanceAfter.toString() };
    }

    // Buscar al usuario por playname (suele venir "PRODUCTID + username", ej. B17user) :contentReference[oaicite:14]{index=14}
    const user = await this.prisma.user.findFirst({
      where: {
        // Ajusta según cómo guardes el vínculo con el proveedor:
        // p.ej., profile.agPlayname == rec.playname  ó accounts(provider='AG', externalUsername=playname)
        id: rec.playname,
      },
      select: { id: true, country: true },
    });
    if (!user) {
      // 404 INVALID_TRANSACTION según tabla de respuestas :contentReference[oaicite:15]{index=15}
      await this.prisma.providerPostTransfer.create({
        data: {
          provider: 'AG',
          uniqueKey: uk,
          transactionID: rec.transactionID,
          billNo: rec.billNo,
          transactionType: rec.transactionType,
          playname: rec.playname,
          currency: rec.currency,
          responseCode: 'INVALID_TRANSACTION',
          balanceAfter: new Decimal(0),
        },
      });
      return { code: 'INVALID_TRANSACTION', balance: '0' };
    }

    // Seleccionar wallet por moneda (asumimos 1 wallet por currency)
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId: user.id, currency: rec.currency },
      select: { id: true, balance: true },
    });
    if (!wallet) {
      // opcional: crea wallet on-the-fly o responde INVALID_TRANSACTION
      return { code: 'INVALID_TRANSACTION', balance: '0' };
    }

    const delta = this.computeDelta(rec);

    // Reglas de fondos
    if (rec.transactionType?.toUpperCase() === 'BET') {
      // insuficiente => 409 INSUFFICIENT_FUNDS :contentReference[oaicite:16]{index=16}
      if (new Decimal(wallet.balance).lt(delta.abs())) {
        return {
          code: 'INSUFFICIENT_FUNDS',
          balance: wallet.balance.toString(),
        };
      }
    }

    // Transacción atómica: aplica delta (si != 0) y registra en ledger
    const result = await this.prisma.$transaction(async (tx) => {
      const newBal = delta.isZero()
        ? new Decimal(wallet.balance)
        : new Decimal(wallet.balance).plus(delta);

      if (!delta.isZero()) {
        await this.wallet.credit({
          userId: user.id,
          amount: delta,
          reason: 'BET_WIN', // o 'REFUND'
          idempotencyKey: `AG|${rec.transactionID}|${rec.billNo ?? '-'}`,
          meta: {
            provider: 'AG',
            transactionID: rec.transactionID,
            billNo: rec.billNo ?? null,
            gametype: rec.gametype ?? null,
            finish: rec.finish === 'true',
          },
        });
      }

      await tx.providerPostTransfer.create({
        data: {
          provider: 'AG',
          uniqueKey: uk,
          transactionID: rec.transactionID,
          billNo: rec.billNo,
          transactionType: rec.transactionType,
          ticketStatus: rec.ticketStatus,
          playname: rec.playname,
          currency: rec.currency,
          netAmount: rec.netAmount ? new Decimal(rec.netAmount) : null,
          validBetAmount: rec.validBetAmount
            ? new Decimal(rec.validBetAmount)
            : null,
          value: rec.value ? new Decimal(rec.value) : null,
          balanceAfter: newBal,
          responseCode: 'OK',
          finish: rec.finish === 'true',
        },
      });

      return newBal;
    });

    return { code: 'OK', balance: result.toString() };
  }

  private mapKind(rec: PostTransferRecord) {
    const t = rec.transactionType?.toUpperCase();
    if (t === 'BET') return 'BET_PLACE';
    if (t === 'WIN') return 'BET_WIN';
    if (t === 'LOSE') return 'BET_LOSE';
    if (t === 'REFUND') return 'REFUND';
    return 'UNKNOWN';
  }
}
