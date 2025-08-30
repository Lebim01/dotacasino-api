import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateKycDocumentDto } from './dto/create-doc.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { $Enums } from '@prisma/client';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true },
    });
    const last = await this.prisma.kycSubmission.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        submittedAt: true,
        decision: true,
        decidedAt: true,
        decisionNote: true,
      },
    });
    return { kycStatus: user?.kycStatus, lastSubmission: last ?? null };
  }

  // Mínimos requeridos (puedes parametrizar por país)
  async getRequirements(country?: string) {
    const base: $Enums.KycDocType[] = [
      $Enums.KycDocType.SELFIE,
      $Enums.KycDocType.ID_CARD, // o PASSPORT
    ];
    const address = [$Enums.KycDocType.ADDRESS_PROOF];
    const required = country === 'MX' ? [...base, ...address] : base;
    return { country: country ?? 'N/A', required };
  }

  async listDocuments(userId: string) {
    return this.prisma.kycDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDocument(userId: string, dto: CreateKycDocumentDto) {
    return this.prisma.kycDocument.create({
      data: {
        userId,
        type: dto.type,
        storageKey: dto.storageKey,
        mimeType: dto.mimeType,
        country: dto.country,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        checksum: dto.checksum,
      },
    });
  }

  async deleteDocument(userId: string, docId: string) {
    const doc = await this.prisma.kycDocument.findUnique({
      where: { id: docId },
    });
    if (!doc || doc.userId !== userId) throw new ForbiddenException();
    if (doc.status !== $Enums.KycDocStatus.UPLOADED) {
      throw new BadRequestException(
        'Sólo se pueden borrar documentos en estado UPLOADED',
      );
    }
    await this.prisma.kycDocument.delete({ where: { id: docId } });
    return { ok: true };
  }

  async submit(userId: string, body: SubmitKycDto) {
    // Verifica que todos los documentos pertenezcan al usuario
    const docs = await this.prisma.kycDocument.findMany({
      where: { id: { in: body.documentIds } },
      select: { id: true, userId: true },
    });
    if (
      docs.length !== body.documentIds.length ||
      docs.some((d) => d.userId !== userId)
    ) {
      throw new BadRequestException('Documentos inválidos');
    }

    // Crea Submission y marca estado del usuario
    const sub = await this.prisma.$transaction(async (tx) => {
      const created = await tx.kycSubmission.create({
        data: {
          userId,
          documentIds: body.documentIds,
          submittedAt: new Date(),
          decision: 'UNDER_REVIEW',
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { kycStatus: 'SUBMITTED' },
      });
      return created;
    });

    return { submissionId: sub.id, status: 'SUBMITTED' };
  }
}
