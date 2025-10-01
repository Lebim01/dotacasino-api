import { Injectable } from '@nestjs/common';
import { db } from 'apps/backoffice-api/src/firebase/admin';
import { dateToString } from 'apps/backoffice-api/src/utils/firebase';
import axios from 'axios';
import { PrismaService } from 'libs/db/src/prisma.service';

const DOMAIN = `https://admin.dota.click`;
const CURRENCY = 'USD';

const login: any = {
  DalePlay2: '6808162',
  Cargaya2: '6808178',
  Apuestashoy2: '6808183',
  Fichitas2: '6808190',
  Juegolandia2: '6808196',
  Tucasino2: '6808209',
  Facilbet2: '6808212',
  Zino3: 'Zino3-sub',
  Winzo2: 'Winzo2-sub',
  Roleta2: 'Roleta2-sub',
};

@Injectable()
export class CasinoService {
  constructor(private readonly prisma: PrismaService) {}

  async removeCredits(userid: string, amount: number) {
    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findFirst({
        where: {
          userId: {
            equals: userid,
          },
          currency: {
            equals: 'USD',
          },
        },
      });

      if (wallet && Number(wallet.balance) >= amount) {
        const newBal = Number(wallet?.balance || 0) - amount;
        tx.wallet.update({
          where: {
            id: wallet.id,
          },
          data: {
            balance: wallet.balance,
          },
        });
        return newBal;
      }

      return -1;
    });
  }

  async getBalance(token: string) {}

  async getTransactions(userid: string) {
    const transactions = await db
      .collection('casino-transactions')
      .where('userid', '==', userid)
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();

    return transactions.docs.map((r) => ({
      created_at: dateToString(r.get('created_at')),
      amount: r.get('amount'),
      status: r.get('status'),
      type: r.get('type'),
      address: r.get('address'),
    }));
  }
}
