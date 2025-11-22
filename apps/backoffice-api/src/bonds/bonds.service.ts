import { Injectable } from '@nestjs/common';
import { db } from '../firebase/admin';
import { UsersService } from '../users/users.service';
import { firestore } from 'firebase-admin';
import { Bonds, messages, direct_percent, levels_percent } from './bonds';
import { Ranks, ranks_object } from '../ranks/ranks_object';
import { WalletService } from '@domain/wallet/wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { ReportsCasinoService } from '../reports-casino/reports-casino.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BondsService {
  constructor(
    private readonly userService: UsersService,
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
    private readonly casinoReport: ReportsCasinoService,
  ) {}

  async addBond(
    user_id: string, // usuario que recibe el bono
    type: Bonds,
    amount: number,
    user_origin_bond: string | null, // usuario que detonó el bono
    add_to_balance = false,
    extras?: Record<string, any>,
  ) {
    const userRef = db.collection('users').doc(user_id);

    const _amount = Math.round(amount * 100) / 100;

    if (_amount <= 0) return;

    let credited = 0; // cuánto SÍ se le va a dar al usuario
    let lost = 0; // cuánto se pierde (por límite o inactividad)
    let benefitedUserName: string | null = null;

    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        // si no existe el usuario, todo se considera perdido
        lost = _amount;
        return;
      }

      const isActive = this.userService.isActiveUserByDoc(userSnap);

      // Si el usuario NO está activo, todo el bono se va a perdidos
      if (!isActive) {
        lost = _amount;
        return;
      }

      const capLimit = userSnap.get('membership_cap_limit') ?? 0;
      const capCurrent = userSnap.get('membership_cap_current') ?? 0;
      let membershipStatus = userSnap.get('membership_status') ?? null;

      benefitedUserName = userSnap.get('name') ?? null;

      // Si no hay límite configurado, nos comportamos como antes (sin cap)
      if (!capLimit || capLimit <= 0) {
        return;
      }

      // Hay límite de membresía: calculamos espacio disponible
      const available = Math.max(capLimit - capCurrent, 0);

      // Si ya no hay espacio disponible, todo se considera perdido
      if (available <= 0) {
        lost = _amount;

        if (capCurrent >= capLimit && membershipStatus !== 'expired') {
          tx.update(userRef, {
            membership_status: 'expired',
            membership_expires_at: firestore.FieldValue.serverTimestamp(),
          });
        }

        return;
      }

      // Puede recibir solo hasta "available"
      credited = Math.min(_amount, available);

      // Si el bono excede el límite, la diferencia se pierde
      if (_amount > available) {
        lost = _amount - credited;
      }

      const newCapCurrent = capCurrent + credited;

      const update: any = {
        [type]: firestore.FieldValue.increment(credited),
        profits: firestore.FieldValue.increment(credited),
        membership_cap_current: firestore.FieldValue.increment(credited),
      };

      if (add_to_balance) {
        update[`balance_${type}`] = firestore.FieldValue.increment(credited);
      }

      // Si llegamos (o sobrepasamos por precisión) el límite, marcamos la membresía como completed
      if (newCapCurrent >= capLimit && membershipStatus !== 'expired') {
        update.membership_status = 'expired';
        update.membership_expires_at = firestore.FieldValue.serverTimestamp();
      }

      tx.update(userRef, update);
    });

    // ─────────────────────────────────────────────
    // Acciones posteriores a la transacción
    // ─────────────────────────────────────────────

    // Si hubo monto acreditado, generamos detalle y crédito en wallet
    if (credited > 0) {
      await this.addProfitDetail(user_id, type, credited, user_origin_bond, {
        ...extras,
        benefited_user_name: benefitedUserName,
      });

      await this.walletService.credit({
        amount: credited,
        reason: 'REFERRAL_BONUS',
        userId: user_id,
        meta: {
          ...extras,
          user_origin_bond,
        },
      });
    }

    // Si hubo monto perdido (por límite o inactividad), lo registramos
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
    console.log('execUserDirectBond', { registerUserId }, { membership_price });
    const user = await db.collection('users').doc(registerUserId).get();

    const sponsor_id = user.get('sponsor_id');
    if (sponsor_id) {
      const sponsorRef = db.collection('users').doc(sponsor_id);
      const sponsor = await sponsorRef.get().then((r) => r.data());

      // primer nivel
      if (sponsor) {
        const isProActive = await this.userService.isActiveUser(sponsor_id);
        const amount =
          Math.round(membership_price * direct_percent * 100) / 100;

        /* Aqui */
        if (isProActive) {
          await this.addBond(
            sponsor_id,
            Bonds.DIRECT,
            amount,
            registerUserId,
            true,
            extras,
          );
        } else {
          await this.addLostProfit(
            sponsorRef.id,
            Bonds.DIRECT,
            amount,
            user.id,
          );
        }
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
    const profit: any = {
      description: messages[type],
      amount,
      created_at: new Date(),
      type,
    };

    if (registerUserId) {
      const userRef = await db.collection('users').doc(registerUserId).get();
      const user_name = userRef.get('name');
      profit.user_name = user_name;
      profit.id_user = registerUserId;
    }

    await db
      .collection('users')
      .doc(id_user)
      .collection('profits_details')
      .add({ ...profit, ...extras });
  }

  async addLostProfit(
    id_user: string,
    type: Bonds,
    amount: number,
    registerUserId: string | null,
  ) {
    let user_name = '';
    if (registerUserId) {
      const userRef = await db.collection('users').doc(registerUserId).get();
      user_name = userRef.get('name');
    }
    await db.collection('users').doc(id_user).collection('lost_profits').add({
      description: 'Has perdido un bono por membresia inactiva',
      id_user: registerUserId,
      user_name,
      amount,
      created_at: new Date(),
      type,
    });
  }

  async getSponsor(user_id: string) {
    const user = await db.collection('users').doc(user_id).get();
    const sponsor_id = user.get('sponsor_id');
    const sponsor = await db.collection('users').doc(sponsor_id).get();

    return {
      id: sponsor_id,
      ref: sponsor.ref,
      data: sponsor,
    };
  }

  async bondResidual(user_id: string, amount: number) {
    const user = await db.collection('users').doc(user_id).get();

    let currentUser = user.get('sponsor_id');

    for (let i = 0; i < 12; i++) {
      const percent = levels_percent[i];
      const _amount = amount * percent;
      await this.addBond(currentUser, Bonds.RESIDUAL, _amount, null, true, {
        level: i + 1,
        percent,
      });

      const user = await db.collection('users').doc(currentUser).get();
      currentUser = user.get('sponsor_id');
      if (!currentUser) {
        break;
      }
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
        fromCDMX: res.period.fromCDMX,
        toCDMX: res.period.toCDMX,
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
          detallePorUsuario:
            entry.detallePorUsuario as unknown as Prisma.JsonValue,
        });
      }
    }

    if (rows.length > 0) {
      await this.prisma.casinoWeeklyUserDetail.createMany({
        data: rows,
      });
    }

    return res;
  }
}
