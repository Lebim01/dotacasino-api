import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { RegisterDto } from '../dto/register.dto';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitize(user: {
    id: string;
    email: string;
    country: string;
    createdAt: Date;
  }) {
    return user;
  }

  async register(dto: RegisterDto) {
    if (!dto.acceptTerms) {
      throw new ConflictException('Debes aceptar los términos y condiciones');
    }

    const email = dto.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(dto.password);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email, country: dto.country, passwordHash },
          select: { id: true, email: true, country: true, createdAt: true },
        });

        await tx.wallet.create({
          data: { userId: user.id, currency: 'USDT', balance: 0 },
        });

        return user;
      });

      return this.sanitize(created);
    } catch (err: any) {
      if (err?.code === 'P2002' && err?.meta?.target?.includes('email')) {
        throw new ConflictException('El email ya está registrado');
      }
      throw new InternalServerErrorException(
        'No se pudo completar el registro',
      );
    }
  }
}
