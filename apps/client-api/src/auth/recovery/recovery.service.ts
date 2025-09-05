import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

import { MailerService } from '../../mailer/mailer.service';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import * as argon from 'argon2';
import { PrismaService } from 'libs/db/src/prisma.service';

const TTL_MINUTES = Number(process.env.RECOVERY_TTL_MIN ?? 30);

function buildLink(base: string, rid: string, rt: string) {
  const url = new URL('/reset-password', base); // tu ruta frontend
  url.searchParams.set('rid', rid);
  url.searchParams.set('rt', rt);
  return url.toString();
}

function strongEnough(pass: string) {
  // Reglas mínimas; ajusta a tu política
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasNum = /[0-9]/.test(pass);
  return pass.length >= 8 && hasUpper && hasLower && hasNum;
}

@Injectable()
export class RecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  /** Paso 1: solicitar recuperación (respuesta 200 siempre para evitar user-enum) */
  async init(emailRaw: string, ip?: string, userAgent?: string) {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    // Siempre responder OK (no revelar existencia)
    if (!user) return { ok: true };

    // Generar token aleatorio
    const rt = randomBytes(32).toString('base64url'); // 43-44 chars
    const tokenHash = await argon2.hash(rt);
    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

    const rec = await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
      select: { id: true },
    });

    const link = buildLink(
      process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000',
      rec.id,
      rt,
    );

    await this.mailer.send(
      user.email,
      'Recupera tu contraseña',
      `<p>Para restablecer tu contraseña, haz clic en el enlace (vigente ${TTL_MINUTES} minutos):</p>
       <p><a href="${link}">${link}</a></p>
       <p>Si tú no solicitaste este cambio, ignora este correo.</p>`,
    );

    return { ok: true };
  }

  /** Paso 2: verificación (opcional para UI) */
  async verify(rid: string, rt: string) {
    const rec = await this.prisma.passwordReset.findUnique({
      where: { id: rid },
      select: { tokenHash: true, expiresAt: true, usedAt: true, userId: true },
    });
    if (!rec) throw new UnauthorizedException('Token inválido');
    if (rec.usedAt) throw new UnauthorizedException('Token ya usado');
    if (rec.expiresAt <= new Date())
      throw new UnauthorizedException('Token expirado');

    const ok = await argon.verify(rec.tokenHash, rt);
    if (!ok) throw new UnauthorizedException('Token inválido');

    return { ok: true };
  }

  /** Paso 3: completar (cambia password, invalida refresh tokens) */
  async complete(rid: string, rt: string, newPassword: string) {
    if (!strongEnough(newPassword)) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres, mayúsculas, minúsculas y números.',
      );
    }

    const rec = await this.prisma.passwordReset.findUnique({
      where: { id: rid },
      select: { tokenHash: true, expiresAt: true, usedAt: true, userId: true },
    });
    if (!rec) throw new UnauthorizedException('Token inválido');
    if (rec.usedAt) throw new UnauthorizedException('Token ya usado');
    if (rec.expiresAt <= new Date())
      throw new UnauthorizedException('Token expirado');

    const ok = await argon.verify(rec.tokenHash, rt);
    if (!ok) throw new UnauthorizedException('Token inválido');

    // Cambiar password + marcar usado + revocar RTs en una transacción
    await this.prisma.$transaction(async (tx) => {
      const passwordHash = await argon2.hash(newPassword);
      await tx.user.update({
        where: { id: rec.userId },
        data: { passwordHash },
      });

      // Marca el reset como usado
      await tx.passwordReset.update({
        where: { id: rid },
        data: { usedAt: new Date() },
      });

      // Revocar todos los refresh tokens activos del usuario (si tienes la tabla)
      await tx.refreshToken.updateMany({
        where: { userId: rec.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return { ok: true };
  }
}
