/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { PayloadAssignBinaryPosition } from './types';
import { google } from '@google-cloud/tasks/build/protos/protos';
import * as googleTaskService from '../googletask/utils';
import { BondsService } from '../bonds/bonds.service';
import { getLimitDeposit, getLimitMembership } from '../utils/deposits';
import { MEMBERSHIP_PRICES, memberships_object } from '../constants';
import { Memberships } from '../types';
import { PrismaService } from 'libs/db/src/prisma.service';
import Decimal from 'decimal.js';
import { Currency } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly bondService: BondsService,
    private readonly prisma: PrismaService,
  ) { }

  async isActiveUser(id_user: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id_user },
    });
    if (!user) return false;

    const is_admin = user.roles.includes('admin');
    return is_admin || user.membershipStatus != 'expired';
  }

  calculateExpirationDate(): Date {
    return dayjs().add(10, 'years').toDate();
  }

  async assingMembership(
    id_user: string,
    type: Memberships,
    txn_id: string | null,
    volumen: boolean,
    is_new: boolean,
  ) {
    const expiresAt = is_new
      ? dayjs().add(2, 'days').toDate()
      : this.calculateExpirationDate();
    
    const user = await this.prisma.user.findUnique({
      where: { id: id_user },
    });
    if (!user) return;

    const is_upgrade = user.membershipStatus == 'paid';

    await this.prisma.user.update({
      where: { id: id_user },
      data: {
        membership: type,
        membershipStartedAt: new Date(),
        membershipStatus: 'paid',
        membershipExpiresAt: expiresAt,
        membershipLimitDeposits: getLimitDeposit(type),
        membershipCapLimit: getLimitMembership(type),
        membershipCapCurrent: 0,
        membership_link_disruptive: null,
        isNew: false,
        activation: volumen ? 'with-volumen' : 'without-volumen',
      },
    });

    await this.prisma.userCycle.create({
      data: {
        userId: id_user,
        type,
        startAt: new Date(),
        endsAt: expiresAt,
        txnId: txn_id || null,
        isUpgrade: is_upgrade,
        volumen,
      },
    });
  }

  async isNewMember(id_user: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id_user },
    });
    return user?.isNew ?? false;
  }

  async onPaymentMembership(
    id_user: string,
    type: Memberships,
    txn_id: string | null,
    volumen: boolean,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: id_user },
    });
    if (!user) return;

    const isNew = user.isNew;
    let is_upgrade = false;
    let membership_price = MEMBERSHIP_PRICES[type];

    if (txn_id) {
      const transaction = await this.prisma.nodePayment.findUnique({
        where: { id: txn_id },
      });
      if (transaction) {
        // En el schema NodePayment no tiene isUpgrade directamente, 
        // pero podemos usar meta o simplemente asumir false si no está.
        is_upgrade = (transaction as any).isUpgrade || false;
        if (is_upgrade) {
          membership_price = Number(transaction.amount);
        }
      }
    }

    /**
     * Se activa la membresia
     */
    await this.assingMembership(id_user, type, txn_id, true, false);

    if (isNew) {
      await this.prisma.user.update({
        where: { id: id_user },
        data: {
          firstCycleStartedAt: new Date(),
        },
      });
    }

    if (user.sponsorId) {
      const sponsor = await this.prisma.user.findUnique({
        where: { id: user.sponsorId },
      });

      if (sponsor) {
        /**
         * Binario activo sponsor
         */
        if (!sponsor.isBinaryActive) {
          const is_active = await this.isBinaryActive(user.sponsorId);
          await this.prisma.user.update({
            where: { id: user.sponsorId },
            data: { isBinaryActive: is_active },
          });
        }

        /**
         * aumentar contador de gente directa
         */
        if (isNew) {
          await this.prisma.user.update({
            where: { id: user.sponsorId },
            data: {
              countDirectPeople: { increment: 1 },
            },
          });
        }
      }
    }

    if (volumen) {
      await this.bondService.execUserDirectBond(id_user, membership_price, {
        concept:
          `Membresia ${memberships_object[type].display} ` +
          (is_upgrade ? ' (Upgrade)' : ''),
      });
    }

    if (volumen) {
      const userWallet = await this.prisma.wallet.findFirst({
        where: { userId: id_user, currency: Currency.USD },
      });

      await this.prisma.ledgerEntry.create({
        data: {
          amount: new Decimal(membership_price),
          currency: Currency.USD,
          kind: 'membership',
          meta: {
            txn_id,
            is_upgrade,
            type,
          },
          idempotencyKey: txn_id || undefined,
          balanceAfter: null,
          walletId: userWallet?.id || '',
        },
      });
    }

    await this.addQueueBinaryPosition({
      id_user,
      txn_id,
      points: volumen ? membership_price : 0,
    });
  }

  async isBinaryActive(user_id: string) {
    const left_direct = await this.prisma.user.findFirst({
      where: {
        sponsorId: user_id,
        position: 'left',
        isNew: false,
        membershipStatus: 'paid',
      },
    });

    const right_direct = await this.prisma.user.findFirst({
      where: {
        sponsorId: user_id,
        position: 'right',
        isNew: false,
        membershipStatus: 'paid',
      },
    });

    return !!left_direct && !!right_direct;
  }

  async addQueueBinaryPosition(body: PayloadAssignBinaryPosition) {
    type Method = 'POST';
    const task: google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: 'POST' as Method,
        url: `https://backoffice-api-1039762081728.us-central1.run.app/v1/auth-binary/assignBinaryPosition`,
        body: Buffer.from(JSON.stringify(body)),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    };

    await googleTaskService.addToQueue(
      task,
      googleTaskService.getPathQueue('assign-binary-position'),
    );
  }
}
