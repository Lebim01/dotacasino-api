import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaService } from 'libs/db/src/prisma.service';
import { WalletService } from '@domain/wallet/wallet.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        country: true,
        kycStatus: true,
        displayName: true,
        phone: true,
        language: true,
        avatarUrl: true,
        createdAt: true,
        refCodeL: true,
        refCodeR: true,
        firstName: true,
        lastName: true,
      },
    });
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        phone: dto.phone,
        language: dto.language,
        avatarUrl: dto.avatarUrl,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: {
        id: true,
        email: true,
        country: true,
        kycStatus: true,
        displayName: true,
        phone: true,
        language: true,
        avatarUrl: true,
        createdAt: true,
        firstName: true,
        lastName: true,
      },
    });
    return updated;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new UnauthorizedException();

    const ok = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!ok) throw new UnauthorizedException('Contraseña actual inválida');

    const newHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
    return { message: 'Contraseña actualizada' };
  }

  async getStats(userId: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId },
    });

    if (wallet) {
      const referral_bonus = await this.prisma.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: { kind: 'REFERRAL_BONUS', walletId: wallet.id },
      });
      const referral_count = await this.prisma.user.aggregate({
        _count: true,
        where: { sponsorId: userId },
      });
      const balance = await this.walletService.getBalance(userId);
      return {
        referral_bonus: referral_bonus._sum,
        referral_count: referral_count._count,
        balance,
      };
    }

    return { referral_bonus: 0, referral_count: 0, balance: 0 };
  }
}
