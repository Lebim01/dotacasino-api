import { HttpException, Injectable } from '@nestjs/common';
import { Concept, UserDTO } from './dto/users.dto';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { MailerService } from '../mailer/mailer.service';
import { ChangeProfileDTO } from './dto/recover-pass.dto';
import { currentMultiplier as _currentMultiplier } from '../utils/deposits';
import { User } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { parsePrismaUser } from './prisma-utils';

@Injectable()
export class UsersService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly authService: AuthService,
    private readonly authAcademyService: AuthAcademyService,
    private readonly prismaService: PrismaService,
  ) {}

  async getUsers(page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prismaService.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.user.count(),
    ]);

    return {
      totalRecords: total,
      data: data.map((u) => ({
        id: u.id,
        name: u.displayName,
        email: u.email,
        membership_status: u.membershipStatus,
        whatsapp: u.phone,
        country: u.country,
      })),
    };
  }

  async formatAdminUser(user: UserDTO) {
    const { password: plainPass } = user;
    const plainToHash = await argon2.hash(plainPass);
    const id = randomUUID();

    return {
      ...user,
      email: user.email.toLowerCase(),
      id,
      password: plainToHash,
    };
  }

  async isExistingUser(email: string) {
    const user = await this.authService.getUserByEmail(email);
    return !!user;
  }

  async getUserById(id: string, complete = false) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) throw new HttpException('USER_NOT_FOUND', 404);

    return parsePrismaUser(user, complete);
  }

  async changePassword(email: string, newPassword: string) {
    const hashedPassword = await argon2.hash(newPassword);

    const user = await this.prismaService.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) throw new HttpException('USER_NOT_FOUND', 404);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    return { success: true, message: 'PASSWORD_CHANGED_SUCCESSFULLY' };
  }

  async changePasswordById(user_id: string, newPassword: string) {
    const hashedPassword = await argon2.hash(newPassword);
    const user = await this.prismaService.user.findUnique({
      where: { id: user_id },
    });

    if (!user) throw new HttpException('USER_NOT_FOUND', 404);

    await this.prismaService.user.update({
      where: { id: user_id },
      data: { passwordHash: hashedPassword },
    });

    return { success: true, message: 'PASSWORD_CHANGED_SUCCESSFULLY' };
  }

  async sendRecoverPassEmail(email: string, otp: string) {
    const isSended = await this.mailerService.sendRecoverPassEmail(
      email.toLowerCase(),
      otp,
    );
    if (!isSended) throw new HttpException('MAILER_ERROR', 500);
    return isSended;
  }

  async sendOTP(email: string, otp: string) {
    const isSended = await this.mailerService.sendOTP(email.toLowerCase(), otp);
    if (!isSended) throw new HttpException('MAILER_ERROR', 500);
    return isSended;
  }

  async verifyOTP(id_user: string, otp_code: string) {
    const otp_doc = await this.prismaService.oTP.findUnique({
      where: { id: id_user },
    });

    if (otp_doc && otp_doc.otp == otp_code) {
      return true;
    }

    return false;
  }

  async updateUserIMG(userID: string, imgURL: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userID },
    });

    if (!user) throw new HttpException('USER_NOT_FOUND', 404);

    await this.prismaService.user.update({
      where: { id: userID },
      data: { avatarUrl: imgURL },
    });

    return { success: true, message: 'IMG_UPDATED_SUCCESSFULLY', imgURL };
  }

  async isActiveUser(id_user: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: id_user },
    });
    if (!user) return false;
    return this.isActiveUserByDoc(user);
  }

  isActiveUserByDoc(user: User) {
    const is_admin = user.roles.includes('admin');
    return is_admin || user.membershipStatus != 'expired';
  }

  async getDirectTree(id_user: string) {
    return this._getDirectTree(id_user, 5);
  }

  private async _getDirectTree(userId: string, maxDepth: number, currentDepth = 1): Promise<any> {
    if (currentDepth > maxDepth) return [];

    const directs = await this.prismaService.user.findMany({
      where: { sponsorId: userId },
      orderBy: { createdAt: 'desc' },
    });

    const tree: any[] = [];
    for (const u of directs) {
      const parsed = parsePrismaUser(u);
      const children = await this._getDirectTree(u.id, maxDepth, currentDepth + 1);
      tree.push({
        ...parsed,
        children,
      });
    }
    return tree;
  }

  async updateUserProfile(id_user: string, body: ChangeProfileDTO) {
    await this.prismaService.user.update({
      where: { id: id_user },
      data: {
        displayName: body.name,
        phone: body.whatsapp,
        country: body.country,
        // Añadir otros mapeos si ChangeProfileDTO tiene más campos
      },
    });
  }

  async getQRDeposit(id_user: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: id_user },
      select: { deposit_link_disruptive: true },
    });

    return {
      qr: user?.deposit_link_disruptive || null,
    };
  }

  async deleteQRMembership(userId: string) {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { membership_link_disruptive: null },
    });
  }

  async deleteQRDeposit(userId: string) {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { deposit_link_disruptive: null },
    });
  }

  async cancelTxn(txn_id: string) {
    await this.prismaService.nodePayment.update({
      where: { id: txn_id },
      data: {
        paymentStatus: 'cancelled',
        processStatus: 'cancelled',
      },
    });
  }

  async referenceLink(user_id: string, position: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: user_id },
    });
    if (!user) throw new Error('not_fount');
    if (user.refCodeL != position && user.refCodeR != position)
      throw new Error('error_side');

    return {
      name: user.displayName,
    };
  }

  async currentDeposit(user_id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: user_id },
    });
    if (!user) return { deposits: 0, limit: 0 };
    return {
      deposits: 0, // Necesitaríamos sumar los montos de la tabla Deposit
      limit: Number(user.membershipLimitDeposits) || 0,
    };
  }

  async currentMultiplier(user_id: string) {
    return _currentMultiplier(user_id, this.prismaService as any);
  }

  async deposits(user_id: string) {
    const snap = await this.prismaService.deposit.findMany({
      where: { userId: user_id },
    });

    return snap.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      created_at: r.createdAt.toISOString(),
      rewards_balance: Number(r.rewardsBalance) || 0,
      rewards_pending: Number(r.rewardsPending) || 0,
      rewards_generated: Number(r.rewardsGenerated) || 0,
      rewards_withdrawed: Number(r.rewardsWithdrawed) || 0,
      next_reward: r.nextReward ? r.nextReward.toISOString() : null,
    }));
  }

  async directs(user_id: string) {
    const registers = await this.prismaService.user.findMany({
      where: { sponsorId: user_id, membershipStatus: null }, // Heurística simple para "is_new"
      orderBy: { createdAt: 'asc' },
    });

    const subscribeds = await this.prismaService.user.findMany({
      where: { sponsorId: user_id, NOT: { membershipStatus: null } },
      orderBy: { createdAt: 'asc' },
    });

    return {
      regiters: registers.map((r) => parsePrismaUser(r)),
      subscribeds: subscribeds.map((r) => parsePrismaUser(r)),
    };
  }

  async getProfitsStats(user_id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: user_id },
    });
    if (!user) return { rank: 0, direct: 0, binary: 0, rewards: 0 };
    return {
      rank: Number(user.bondRank) || 0,
      direct: Number(user.bondDirect) || 0,
      binary: Number(user.bondBinary) || 0,
      rewards: Number(user.bondRewards) || 0,
    };
  }

  async getListProfits(user_id: string, page: number, limit: number) {
    const snap = await this.prismaService.profitDetail.findMany({
      where: { userId: user_id },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return snap.map((r) => ({
      amount: Number(r.amount),
      created_at: r.createdAt.toISOString(),
      description: r.description,
      type: r.type,
      user_name: r.userName,
    }));
  }

  async createwithdraw(
    id_user: string,
    amount: number,
    type: Concept,
    deposit_id?: string,
  ) {
    const user = await this.prismaService.user.findUnique({
      where: { id: id_user },
    });

    if (!user) throw new HttpException('USER_NOT_FOUND', 404);
    if (!user.walletUsdt)
      throw new HttpException('Wallet usdt required', 401);

    if (['direct', 'binary', 'rank'].includes(type)) {
      // Necesitaríamos lógica para verificar balances si los tenemos en campos específicos
      // asumimos que bondDirect, bondBinary, bondRank son los balances disponibles.
      const field = type === 'direct' ? 'bondDirect' : type === 'binary' ? 'bondBinary' : 'bondRank';
      const balance = Number(user[field]) || 0;
      
      if (balance >= amount) {
        await this.prismaService.$transaction([
          this.prismaService.withdrawalRequest.create({
            data: {
              userId: id_user,
              userName: user.displayName || 'N/A',
              amount,
              fee: amount * 0.03,
              total: amount - amount * 0.03,
              status: 'pending',
              walletUsdt: user.walletUsdt,
              type,
            },
          }),
          this.prismaService.user.update({
            where: { id: id_user },
            data: {
              [field]: { decrement: amount }
            }
          })
        ]);

        return 'OK';
      }
    }

    if (['deposit'].includes(type)) {
      if (!deposit_id) throw new HttpException('deposit required', 401);
      const deposit = await this.prismaService.deposit.findUnique({
        where: { id: deposit_id }
      });

      if (!deposit) throw new HttpException('Deposit not found', 404);

      const balance = Number(deposit.rewardsBalance);

      if (balance >= amount) {
        await this.prismaService.$transaction([
          this.prismaService.withdrawalRequest.create({
            data: {
              userId: id_user,
              userName: user.displayName || 'N/A',
              amount,
              fee: 0, // Ajustar según lógica
              total: amount,
              status: 'pending',
              walletUsdt: user.walletUsdt,
              type,
              depositId: deposit_id,
            },
          }),
          this.prismaService.deposit.update({
            where: { id: deposit_id },
            data: {
              rewardsBalance: { decrement: amount },
              rewardsPending: { increment: amount }
            }
          })
        ]);

        return 'OK';
      }
    }

    throw new HttpException('Not Enough Balance', 401);
  }

  async withdrawhistory(id_user: string) {
    const snap = await this.prismaService.withdrawalRequest.findMany({
      where: { userId: id_user },
      orderBy: { createdAt: 'desc' },
    });

    return snap.map((r) => ({
      ...r,
      amount: Number(r.amount),
      fee: Number(r.fee),
      total: Number(r.total),
      created_at: r.createdAt.toISOString(),
    }));
  }

  async changepassword(
    id_user: string,
    previous_password: string,
    new_password: string,
  ) {
    if (previous_password == new_password) {
      throw new HttpException('Password should be different', 401);
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: id_user },
    });

    if (!user) throw new HttpException('USER_NOT_FOUND', 404);

    const isMatch = await argon2.verify(user.passwordHash, previous_password);

    if (!isMatch) {
      throw new HttpException('Password wrong', 401);
    }

    await this.prismaService.user.update({
      where: { id: id_user },
      data: {
        passwordHash: await argon2.hash(new_password),
      },
    });
  }

  async getNft(id_user: string) {
    // El campo NFT no se migró a SQL aún.
    return null;
  }

  async reclaimNft(id_user: string) {
    // El campo NFT no se migró a SQL aún.
  }

  async search(email: string) {
    return this.prismaService.user.findMany({
      where: {
        email: {
          contains: email,
        },
      },
      include: {
        Wallet: true,
      },
    });
  }
}
