import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { AdjustChipsDto, AdjustDirection } from './dto/adjust-chips.dto';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class ChipsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ajusta fichas de una wallet (CREDIT/DEBIT) con transacción e idempotencia.
   * - Bloquea la fila de la wallet con SELECT ... FOR UPDATE.
   * - Evita saldos negativos salvo allowNegative.
   * - Registra LedgerEntry con balanceAfter e idempotencyKey.
   */
  async adjust(dto: AdjustChipsDto) {
    const {
      walletId,
      amount,
      direction,
      reason,
      idempotencyKey,
      allowNegative = false,
    } = dto;

    if (amount <= 0) throw new BadRequestException('El monto debe ser > 0');

    // delta: positivo para CREDIT, negativo para DEBIT
    const delta = new Decimal(amount).mul(
      direction === AdjustDirection.CREDIT ? 1 : -1,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1) Idempotencia: si ya existe un ledger con la misma key, devolverlo
      if (idempotencyKey) {
        const existing = await tx.ledgerEntry.findFirst({
          where: { idempotencyKey },
          include: { wallet: true },
        });
        if (existing) {
          return {
            wallet: existing.wallet,
            ledger: existing,
            idempotent: true,
          };
        }
      }

      // 2) Bloquear wallet (SELECT ... FOR UPDATE) para evitar carreras
      const lockedWallet = await tx.$queryRaw<
        Array<{ id: string; balance: string; currency: string }>
      >`SELECT id, balance::text, currency::text
        FROM "Wallet"
        WHERE id = ${walletId}
        FOR UPDATE`;

      if (!lockedWallet.length) {
        throw new NotFoundException('Wallet no encontrada');
      }

      const walletRow = lockedWallet[0];
      const currentBalance = new Decimal(walletRow.balance);
      const newBalance = currentBalance.add(delta);

      if (!allowNegative && newBalance.isNegative()) {
        throw new BadRequestException(
          'El ajuste dejaría saldo negativo (bloqueado por política).',
        );
      }

      // 3) Actualizar saldo
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: newBalance }, // Prisma maneja Decimal
      });

      // 4) Crear ledger (con kind ADMIN_ADJUST y balanceAfter)
      try {
        const ledger = await tx.ledgerEntry.create({
          data: {
            walletId,
            kind: 'ADMIN_ADJUST',
            amount: delta, // positivo o negativo
            balanceAfter: newBalance,
            idempotencyKey: idempotencyKey || null,
            meta: {
              reason: reason || null,
              direction,
              previousBalance: currentBalance.toString(),
              delta: delta.toString(),
              allowNegative,
              source: 'chips.service.adjust',
            },
          },
        });

        const updatedWallet = await tx.wallet.findUnique({
          where: { id: walletId },
        });

        return {
          wallet: updatedWallet,
          ledger,
          idempotent: false,
        };
      } catch (e: any) {
        // Unique violation en idempotencyKey
        if (e?.code === 'P2002' || /unique/i.test(String(e?.message))) {
          throw new ConflictException('idempotencyKey ya fue usado');
        }
        throw e;
      }
    });
  }
}
