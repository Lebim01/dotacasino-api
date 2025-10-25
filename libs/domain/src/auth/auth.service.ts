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
import { WalletService } from '@domain/wallet/wallet.service';
import { JwtPayload } from '@security/jwt.strategy';
import { randomUUID } from 'crypto';
import { UserCommonService } from '@domain/users/users.service';
import { ReferralService } from 'apps/client-api/src/referral/referral.service';

const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '7d';

@Injectable()
export class AuthCommonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly usersService: UserCommonService,
    private readonly walletService: WalletService,
    private readonly referralService: ReferralService,
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
        displayName: true,
        language: true,
        phone: true,
        firstName: true,
        lastName: true,
        firebaseId: true,
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
      expiresIn: '2d',
    });

    const jti = randomUUID(); // identificador único del RT
    const familyId = randomUUID(); // familia nueva para esta sesión

    const refresh_token = await this.jwt.signAsync(
      { ...payload, typ: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET!,
        expiresIn: '7d',
        jwtid: jti,
      },
    );

    // Guarda hash y metadatos en DB
    const tokenHash = await argon2.hash(refresh_token);
    const { exp } = this.jwt.decode(refresh_token) as { exp: number };
    const expiresAt = new Date(exp * 1000);

    await this.prisma.refreshToken.create({
      data: {
        id: jti, // usamos el jti como PK
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt,
      },
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
      const code = dto.referralCode || 'JWATXHKT';
      const sponsor = await this.referralService.getByCode(code);
      const created = await this.prisma.$transaction(async () => {
        const user = await this.usersService.createUser(
          email,
          dto.password,
          dto.country,
          sponsor!.id,
          sponsor!.refCodeL == code ? 'left' : 'right',
        );

        await this.referralService.attachByCode(user.id, code);
        await this.walletService.createWallet(user.id);
        return user;
      });

      return this.sanitize(created);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'No se pudo completar el registro',
      );
    }
  }

  private async issueAccessToken(payload: JwtPayload) {
    return this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: ACCESS_TTL,
    });
  }

  private async issueRefreshToken(userId: string, familyId?: string) {
    const jti = randomUUID();
    const fam = familyId ?? randomUUID();

    const token = await this.jwt.signAsync(
      { sub: userId, typ: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET!,
        expiresIn: REFRESH_TTL,
        jwtid: jti, // << jti
      },
    );

    const tokenHash = await argon2.hash(token);
    // exp en segundos desde epoch:
    const { exp } = this.jwt.decode(token) as { exp: number };
    const expiresAt = new Date(exp * 1000);

    await this.prisma.refreshToken.create({
      data: { id: jti, userId, tokenHash, familyId: fam, expiresAt },
    });

    return { token, jti, familyId: fam, expiresAt };
  }

  private async revokeToken(jti: string) {
    await this.prisma.refreshToken.updateMany({
      where: { id: jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Llamar en tu login actual tras validar user/pass:
  async issueLoginTokens(user: {
    id: string;
    email: string;
    roles?: string[];
    firebaseId: string;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles ?? ['user'],
      firebaseId: user.firebaseId,
    };
    const access_token = await this.issueAccessToken(payload);
    const { token: refresh_token, familyId } = await this.issueRefreshToken(
      user.id,
    );
    return { access_token, refresh_token, familyId };
  }

  // ---------- /auth/refresh ----------
  async refresh(refreshTokenRaw: string) {
    let decoded: any;
    try {
      decoded = await this.jwt.verifyAsync(refreshTokenRaw, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });
    } catch {
      throw new UnauthorizedException('RT inválido o expirado');
    }
    if (decoded.typ !== 'refresh') {
      throw new UnauthorizedException('Token no es refresh');
    }
    const userId: string = decoded.sub;
    const jti: string = decoded.jti;

    // Busca el RT por jti
    const row = await this.prisma.refreshToken.findUnique({
      where: { id: jti },
    });
    if (!row || row.userId !== userId) {
      // Reuse detection: si llega un jti inexistente → revoca familia por seguridad si puedes identificarla
      throw new UnauthorizedException('RT no encontrado');
    }
    if (row.revokedAt) {
      // Reuse detection: revoca toda la familia
      await this.revokeFamily(row.familyId);
      throw new UnauthorizedException('RT reutilizado (revocado)');
    }
    if (row.expiresAt <= new Date()) {
      throw new UnauthorizedException('RT expirado');
    }

    // Verifica hash = RT válido
    const ok = await argon2.verify(row.tokenHash, refreshTokenRaw);
    if (!ok) {
      // hash no coincide → posible reuse/clonado
      await this.revokeFamily(row.familyId);
      throw new UnauthorizedException('RT inválido');
    }

    // Rotar: revocar el actual y emitir uno nuevo en la misma familia
    await this.revokeToken(row.id);

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    const payload: JwtPayload = {
      sub: userId,
      email: user!.email,
      firebaseId: user!.firebaseId,
    }; // puedes añadir email/roles si quieres
    const access_token = await this.issueAccessToken(payload);
    const { token: refresh_token } = await this.issueRefreshToken(
      userId,
      row.familyId,
    );

    return { access_token, refresh_token };
  }

  // ---------- /auth/logout ----------
  async logout(refreshTokenRaw?: string, jtiFromCookie?: string) {
    // Si recibimos RT plano → lo verificamos y revocamos ese jti
    if (refreshTokenRaw) {
      try {
        const decoded = await this.jwt.verifyAsync(refreshTokenRaw, {
          secret: process.env.JWT_REFRESH_SECRET!,
        });
        await this.revokeToken(decoded.jti);
        return { ok: true };
      } catch {
        // si no verifica, intenta por jti directo (cookie separada)
      }
    }
    if (jtiFromCookie) {
      await this.revokeToken(jtiFromCookie);
      return { ok: true };
    }
    // Si no mandan nada, no podemos identificar cuál revocar
    return { ok: true };
  }
}
