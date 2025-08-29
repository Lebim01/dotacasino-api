import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from 'libs/db/src/prisma.service';
import { JwtService } from '@nestjs/jwt';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { WalletService } from '@domain/wallet/wallet.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
  ) {}

  private sanitize(user: {
    id: string;
    email: string;
    country: string;
    createdAt: Date;
  }) {
    return user;
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    // 1) Busca usuario
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        country: true,
        createdAt: true,
        passwordHash: true,
        roles: true,
      },
    });

    // Respuesta genérica para no revelar si existe o no
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    // 2) Verifica contraseña
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    // 3) Genera tokens
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles ?? ['user'],
    };

    const access_token = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: '15m',
    });

    const refresh_token = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: '7d',
    });

    // 4) Retorna user sanitizado + tokens
    const { passwordHash, ...safeUser } = user;
    return {
      user: this.sanitize(safeUser as any),
      access_token,
      refresh_token,
    };
  }

  async register(dto: RegisterDto) {
    if (!dto.acceptTerms) {
      throw new ConflictException('Debes aceptar los términos y condiciones');
    }

    const email = dto.email.trim().toLowerCase();

    try {
      const created = await this.prisma.$transaction(async () => {
        const user = await this.usersService.createUser(
          email,
          dto.password,
          dto.country,
        );

        await this.walletService.createWallet(user.id);
        return user;
      });

      return this.sanitize(created);
    } catch (error) {
      throw new InternalServerErrorException(
        'No se pudo completar el registro',
      );
    }
  }
}
