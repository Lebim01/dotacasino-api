import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
    });
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // evita cambios a campos sensibles aquí (email, country, kycStatus)
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        phone: dto.phone,
        language: dto.language,
        avatarUrl: dto.avatarUrl,
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
}
