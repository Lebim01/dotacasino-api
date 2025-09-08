import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Adjunta un padre (referrer) al usuario usando refCode.
   * Reglas:
   * - no puede referirse a sí mismo
   * - no puede tener ya padre
   * - evita ciclos (si A desciente de B, B no puede colgar de A)
   */
  async attachByCode(userId: string, refCode: string) {
    // 1) Buscar padre por refCode
    const parent = await this.prisma.user.findUnique({
      where: { refCode: refCode.toUpperCase() },
      select: { id: true },
    });
    if (!parent) throw new NotFoundException('Código de referido inválido');
    if (parent.id === userId)
      throw new BadRequestException('No puedes referirte a ti mismo');

    // 2) Verificar que el user no tenga ya padre
    const exists = await this.prisma.referral.findFirst({
      where: { userId: userId },
    });
    if (exists)
      throw new BadRequestException('El usuario ya tiene referidor asignado');

    // 3) Evitar ciclos: comprobar si parent es descendiente de user
    const cyclic = await this.isDescendant(parent.id, userId);
    if (cyclic)
      throw new BadRequestException('Relación inválida (ciclo de referidos)');

    // 4) Determinar nivel = (nivel del padre + 1) o 1 si padre es raíz
    const parentRef = await this.prisma.referral.findFirst({
      where: { userId: parent.id },
    });
    const level = parentRef ? parentRef.level + 1 : 1;

    await this.prisma.referral.create({
      data: { userId, parentId: parent.id, level },
    });

    return { ok: true, parentId: parent.id, level };
  }

  private async isDescendant(
    maybeAncestor: string,
    maybeDescendant: string,
  ): Promise<boolean> {
    // ¿maybeAncestor aparece en la cadena de padres de maybeDescendant?
    let cur = await this.prisma.referral.findFirst({
      where: { userId: maybeAncestor },
      select: { parentId: true },
    });
    // subir hacia arriba desde 'maybeAncestor' y ver si topamos con 'maybeDescendant'
    while (cur?.parentId) {
      if (cur.parentId === maybeDescendant) return true;
      cur = await this.prisma.referral.findFirst({
        where: { userId: cur.parentId },
        select: { parentId: true },
      });
    }
    return false;
  }

  async listDirectReferrals(userId: string, page = 1, pageSize = 25) {
    const where = { parentId: userId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.referral.findMany({
        where,
        orderBy: { level: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: rows.map((r) => ({
        userId: r.userId,
        email: r.user.email,
        displayName: r.user.displayName,
        level: r.level,
        joinedAt: r.user.createdAt,
      })),
    };
  }

  async tree(userId: string, maxDepth = 7) {
    // CTE recursivo para obtener árbol hasta maxDepth
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `
      WITH RECURSIVE tree AS (
        SELECT
          u.id::uuid          AS user_id,
          NULL::uuid          AS parent_id,
          0                   AS depth,
          ARRAY[u.id::uuid]   AS path,
          u."displayName"     AS display_name
        FROM "User" u
        WHERE u.id::uuid = $1::uuid

        UNION ALL

        SELECT cu.id::uuid, r."parentId"::uuid, t.depth + 1, t.path || ARRAY[cu.id::uuid], cu."displayName"
        FROM "Referral" r
        JOIN "User" cu ON cu.id::uuid = r."userId"::uuid
        JOIN tree t    ON r."parentId"::uuid = t.user_id::uuid
        WHERE t.depth < 7 
      )
      SELECT * FROM tree;
    `,
      userId,
      Math.max(1, Math.min(maxDepth, 7)),
    );

    // stats por nivel
    const stats: Record<number, number> = {};
    for (const r of rows) stats[r.depth] = (stats[r.depth] ?? 0) + 1;

    return { items: rows, stats };
  }

  async myCode(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { refCode: true },
    });
    if (!u?.refCode) throw new NotFoundException('No hay código de referido');
    const base = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    return { refCode: u.refCode, link: `${base}/r/${u.refCode}` };
  }
}
