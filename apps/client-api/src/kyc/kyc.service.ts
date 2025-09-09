import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateKycDocumentDto } from './dto/create-doc.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { $Enums } from '@prisma/client';
import { PrismaService } from 'libs/db/src/prisma.service';
import { KYC_REQUIREMENTS } from './requirements';
import { StorageService } from 'libs/storage/src/storage.service';

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

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

  async getRequirements(country?: string) {
    return { country: country ?? null, ...KYC_REQUIREMENTS };
  }

  async listDocuments(userId: string) {
    return this.prisma.kycDocument.findMany({
      select: {
        id: true,
        type: true,
        mimeType: true,
        createdAt: true,
        status: true,
      },
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDocument(userId: string, dto: CreateKycDocumentDto) {
    // Extraer extensión del tipo MIME o del base64
    const mimeType = dto.file.split(';')[0].split(':')[1];
    const extension = mimeType.split('/')[1];

    // Subir archivo a GCS
    const { storageKey, checksum } = await this.storage.uploadBase64File(
      dto.file,
      'kyc-documents',
      extension,
    );

    // Crear documento en BD
    return this.prisma.kycDocument.create({
      select: {
        mimeType: true,
        type: true,
        id: true,
        status: true,
        createdAt: true,
      },
      data: {
        userId,
        type: dto.type,
        storageKey,
        mimeType,
        country: dto.country,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        checksum,
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
      where: { id: { in: body.documentIds }, userId },
      select: {
        id: true,
        type: true,
        expiresAt: true,
        createdAt: true /* issuedAt?: Date */,
      },
    });
    if (docs.length !== body.documentIds.length) {
      throw new BadRequestException('Documentos inválidos');
    }

    // 1) Cubre sets: al menos una primaria + un address_proof
    const hasPrimary = docs.some(
      (d) =>
        d.type === $Enums.KycDocType.PASSPORT ||
        d.type === $Enums.KycDocType.ID_CARD ||
        d.type === $Enums.KycDocType.DRIVER_LICENSE,
    );
    const hasAddress = docs.some(
      (d) => d.type === $Enums.KycDocType.ADDRESS_PROOF,
    );
    if (!hasPrimary) {
      throw new BadRequestException(
        'Faltan documentos requeridos: (PASSPORT/ID_CARD/DRIVER_LICENSE) + ADDRESS_PROOF',
      );
    }
    const hasSelfie = docs.some((d) => d.type === $Enums.KycDocType.SELFIE);
    if (!hasSelfie) throw new BadRequestException('Se requiere SELFIE');

    // 2) Reglas por tipo (mínimas)
    const now = new Date();
    for (const d of docs) {
      // Identidad: no vencido; pasaporte con 30 días de vigencia mínima
      if (
        d.type === $Enums.KycDocType.PASSPORT ||
        d.type === $Enums.KycDocType.ID_CARD ||
        d.type === $Enums.KycDocType.DRIVER_LICENSE
      ) {
        if (!d.expiresAt || d.expiresAt <= now) {
          throw new BadRequestException(
            'Documento de identidad vencido o sin fecha de expiración',
          );
        }
        if (d.type === $Enums.KycDocType.PASSPORT) {
          const daysLeft = Math.floor(
            (d.expiresAt.getTime() - now.getTime()) / 86400000,
          );
          if (daysLeft < 30)
            throw new BadRequestException(
              'Pasaporte con menos de 30 días de vigencia',
            );
        }
      }

      // Utility bill: emitido <= 90 días (usa issuedAt si lo almacenas; si no, createdAt)
      if (d.type === $Enums.KycDocType.ADDRESS_PROOF) {
        const refDate =
          (d as any).issuedAt instanceof Date
            ? ((d as any).issuedAt as Date)
            : d.createdAt;
        const ageDays = Math.floor(
          (now.getTime() - refDate.getTime()) / 86400000,
        );
        if (ageDays > 90)
          throw new BadRequestException(
            'Utility bill debe ser de los últimos 90 días',
          );
      }
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
