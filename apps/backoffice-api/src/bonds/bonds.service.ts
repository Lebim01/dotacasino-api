import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { Bonds, messages, direct_percent, levels_percent } from './bonds';
import { Ranks, ranks_object } from '../ranks/ranks_object';
import { WalletService } from '@domain/wallet/wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { ReportsCasinoService } from '../reports-casino/reports-casino.service';
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';

const bondFieldMap: Record<string, string> = {
  bond_direct: 'bondDirect',
  bond_binary: 'bondBinary',
  bond_rewards: 'bondRewards',
  bond_rank: 'bondRank',
  bond_residual: 'bondResidual',
  bond_casino: 'bondCasino',
};

@Injectable()
export class BondsService {
  constructor(
    private readonly userService: UsersService,
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
    private readonly casinoReport: ReportsCasinoService,
  ) {}

  async addBond(
    user_id: string,
    type: Bonds,
    amount: number,
    user_origin_bond: string | null,
    add_to_balance = false,
    extras?: Record<string, any>,
  ) {
    const _amount = Math.round(amount * 100) / 100;
    if (_amount <= 0) return;

    let credited = 0;
    let lost = 0;
    let benefitedUserName: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: user_id },
      });

      if (!user) {
        lost = _amount;
        return;
      }

      const isActive = user.roles.includes('admin') || user.membershipStatus !== 'expired';
      if (!isActive) {
        lost = _amount;
        return;
      }

      const capLimit = Number(user.membershipCapLimit) || 0;
      const capCurrent = Number(user.membershipCapCurrent) || 0;
      let membershipStatus = user.membershipStatus;

      benefitedUserName = user.displayName || null;

      if (!capLimit || capLimit <= 0) {
        // Comportamiento por defecto si no hay cap (aunque el cap suele ser mandatorio en dota)
        credited = _amount;
      } else {
        const available = Math.max(capLimit - capCurrent, 0);
        if (available <= 0) {
          lost = _amount;
          if (membershipStatus !== 'expired') {
            await tx.user.update({
              where: { id: user_id },
              data: {
                membershipStatus: 'expired',
                membershipExpiresAt: new Date(),
              },
            });
          }
          return;
        }

        credited = Math.min(_amount, available);
        if (_amount > available) {
          lost = _amount - credited;
        }
      }

      const field = bondFieldMap[type];
      const dataUpdate: any = {
        [field]: { increment: credited },
        profits: { increment: credited },
        membershipCapCurrent: { increment: credited },
      };

      if (credited + capCurrent >= capLimit && capLimit > 0 && membershipStatus !== 'expired') {
        dataUpdate.membershipStatus = 'expired';
        dataUpdate.membershipExpiresAt = new Date();
      }

      await tx.user.update({
        where: { id: user_id },
        data: dataUpdate,
      });
    });

    if (credited > 0) {
      await this.addProfitDetail(user_id, type, credited, user_origin_bond, {
        ...extras,
        benefited_user_name: benefitedUserName,
      });

      await this.walletService.credit({
        amount: credited,
        reason: 'REFERRAL_BONUS',
        userId: user_id,
        meta: { ...extras, user_origin_bond },
      });
    }

    if (lost > 0) {
      await this.addLostProfit(user_id, type, lost, user_origin_bond);
    }
  }



  /**
   * solo se reparte este bono a los usuarios activos
   */
  async execUserDirectBond(
    registerUserId: string,
    membership_price: number,
    extras?: Record<string, any>,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: registerUserId },
    });

    if (user && user.sponsorId) {
      const isProActive = await this.userService.isActiveUser(user.sponsorId);
      const amount = Math.round(membership_price * direct_percent * 100) / 100;

      if (isProActive) {
        await this.addBond(
          user.sponsorId,
          Bonds.DIRECT,
          amount,
          registerUserId,
          true,
          extras,
        );
      } else {
        await this.addLostProfit(
          user.sponsorId,
          Bonds.DIRECT,
          amount,
          registerUserId,
        );
      }
    }
  }

  async execBinary(
    id_user: string,
    amount: number,
    extras?: Record<string, any>,
  ) {
    await this.addBond(id_user, Bonds.BINARY, amount, null, true, extras);
  }

  async execRank(id_user: string, rank: Ranks) {
    await this.addBond(
      id_user,
      Bonds.RANK,
      ranks_object[rank].bonus,
      null,
      true,
      {
        rank,
      },
    );
  }

  async execReward(
    id_user: string,
    amount: number,
    extras?: Record<string, any>,
  ) {
    await this.addBond(id_user, Bonds.REWARD, amount, null, true, extras);
  }

  async addProfitDetail(
    id_user: string,
    type: Bonds,
    amount: number,
    registerUserId: string | null,
    extras?: Record<string, any>,
  ) {
    let user_name: string | null = null;
    if (registerUserId) {
      const originUser = await this.prisma.user.findUnique({
        where: { id: registerUserId },
      });
      user_name = originUser?.displayName || null;
    }

    await this.prisma.profitDetail.create({
      data: {
        userId: id_user,
        type,
        amount,
        description: messages[type],
        userName: user_name,
        originUserId: registerUserId,
        // extras se podrían guardar en un campo Json si fuera necesario
      },
    });
  }

  async addLostProfit(
    id_user: string,
    type: Bonds,
    amount: number,
    registerUserId: string | null,
  ) {
    let user_name = '';
    if (registerUserId) {
      const originUser = await this.prisma.user.findUnique({
        where: { id: registerUserId },
      });
      user_name = originUser?.displayName || '';
    }
    await this.prisma.lostProfit.create({
      data: {
        userId: id_user,
        type,
        amount,
        description: 'Has perdido un bono por membresia inactiva',
        userName: user_name,
        originUserId: registerUserId,
      },
    });
  }

  async getSponsor(user_id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
    });
    if (!user || !user.sponsorId) return null;
    const sponsor = await this.prisma.user.findUnique({
      where: { id: user.sponsorId },
    });

    return {
      id: user.sponsorId,
      data: sponsor,
    };
  }

  async bondResidual(user_id: string, amount: number) {
    let currentUser = user_id;

    for (let i = 0; i < 12; i++) {
      const user = await this.prisma.user.findUnique({
        where: { id: currentUser },
      });
      if (!user || !user.sponsorId) break;
      
      currentUser = user.sponsorId;
      const percent = levels_percent[i];
      const _amount = amount * percent;
      
      await this.addBond(currentUser, Bonds.RESIDUAL, _amount, null, true, {
        level: i + 1,
        percent,
      });
    }
  }

  async payCasino() {
    const res = await this.casinoReport.getCasinoWeeklyPnl({});

    // Porcentajes por nivel (nivel 1 a 4)
    const levels = [
      { level: 1, percent: 0.2 },
      { level: 2, percent: 0.07 },
      { level: 3, percent: 0.07 },
      { level: 4, percent: 0.07 },
    ];

    // 1) Crear registro del corte semanal
    const report = await this.prisma.casinoWeeklyReport.create({
      data: {
        timezone: res.timezone,
        fromCDMX: dayjs(res.period.fromCDMX!).toISOString(),
        toCDMX: dayjs(res.period.toCDMX!).toISOString(),
      },
    });

    type DetalleUsuario = {
      login: string;
      apuestas: number;
      ganancias: number;
      neto: number;
      spins: number;
    };

    type AccEntry = {
      level: number;
      percent: number;
      totalNeto: number;
      totalBonus: number;
      detallePorUsuario: DetalleUsuario[];
    };

    // Mapa: sponsorId -> (nivel -> acumulador)
    const acc = new Map<string, Map<number, AccEntry>>();

    for (const u of res.detallePorUsuario) {
      if (u.neto < 0) {
        const neto_pagar = u.neto * -1; // convertir a positivo
        let currentUserId = u.login;

        for (const lvl of levels) {
          // Buscar el sponsor del usuario actual en la cadena
          const sponsor = await this.prisma.user.findFirst({
            where: {
              id: currentUserId,
            },
            select: {
              email: true,
              sponsorId: true,
            },
          });

          const sponsorId = sponsor?.sponsorId;

          // Si no hay sponsor en este nivel, dejamos de subir niveles
          if (!sponsorId) break;

          const amountForLevel = neto_pagar * lvl.percent;

          await this.addBond(
            sponsorId,
            Bonds.CASINO,
            amountForLevel,
            u.login,
            true,
            {
              timezone: res.timezone,
              period: {
                fromCDMX: res.period.fromCDMX,
                toCDMX: res.period.toCDMX,
              },
              percent: lvl.percent,
              level: lvl.level,
              origin_user_login: u.login,
              source: 'CASINO_WEEKLY_PNL',
            },
          );

          // 3) Acumular el detalle para el reporte semanal
          let levelsMap = acc.get(sponsorId);
          if (!levelsMap) {
            levelsMap = new Map<number, AccEntry>();
            acc.set(sponsorId, levelsMap);
          }

          let entry = levelsMap.get(lvl.level);
          if (!entry) {
            entry = {
              level: lvl.level,
              percent: lvl.percent,
              totalNeto: 0,
              totalBonus: 0,
              detallePorUsuario: [],
            };
            levelsMap.set(lvl.level, entry);
          }

          entry.totalNeto += neto_pagar;
          entry.totalBonus += amountForLevel;

          entry.detallePorUsuario.push({
            login: u.login,
            apuestas: u.apuestas,
            ganancias: u.ganancias,
            neto: u.neto,
            spins: u.spins,
          });

          // Para el siguiente nivel, subimos un nivel en la red
          currentUserId = sponsorId;
        }
      }
    }

    // 4) Guardar en Prisma el detalle por usuario y nivel
    const rows: Prisma.CasinoWeeklyUserDetailCreateManyInput[] = [];

    for (const [sponsorId, levelsMap] of acc.entries()) {
      for (const [level, entry] of levelsMap.entries()) {
        rows.push({
          reportId: report.id,
          userId: sponsorId,
          level,
          percent: entry.percent,
          totalNeto: entry.totalNeto,
          totalBonus: entry.totalBonus,
          detallePorUsuario: entry.detallePorUsuario,
        });
      }
    }

    if (rows.length > 0) {
      await this.prisma.casinoWeeklyUserDetail.createMany({
        data: rows,
      });
    }

    return acc;
  }
}
