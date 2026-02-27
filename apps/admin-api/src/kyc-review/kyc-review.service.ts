import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class KycReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async list(status: 'SUBMITTED' | 'UNDER_REVIEW', page = 1, pageSize = 25) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.kycSubmission.findMany({
        where: {
          decision: status === 'SUBMITTED' ? 'UNDER_REVIEW' : 'UNDER_REVIEW',
        }, // puedes ajustar tu lógica
        orderBy: { submittedAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          submittedAt: true,
          decision: true,
          decisionNote: true,
        },
      }),
      this.prisma.kycSubmission.count({
        where: { decision: 'UNDER_REVIEW' },
      }),
    ]);
    return { page, pageSize, total, items };
  }

  async detail(submissionId: string) {
    const sub = await this.prisma.kycSubmission.findUnique({
      where: { id: submissionId },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            country: true,
            kycStatus: true,
            createdAt: true,
          },
        },
      },
    });
    if (!sub) throw new NotFoundException();
    const docs = await this.prisma.kycDocument.findMany({
      where: { id: { in: sub.documentIds } },
    });
    return { submission: sub, documents: docs };
  }

  async takeUnderReview(submissionId: string, reviewerId: string) {
    const sub = await this.prisma.kycSubmission.update({
      where: { id: submissionId },
      data: { decision: 'UNDER_REVIEW', decidedBy: reviewerId },
    });
    await this.prisma.user.update({
      where: { id: sub.userId },
      data: { kycStatus: 'UNDER_REVIEW' },
    });
    return { ok: true };
  }

  async approve(submissionId: string, reviewerId: string, note?: string) {
    const sub = await this.prisma.kycSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!sub) throw new NotFoundException();

    await this.prisma.$transaction(async (tx) => {
      await tx.kycSubmission.update({
        where: { id: submissionId },
        data: {
          decision: 'APPROVED',
          decidedAt: new Date(),
          decidedBy: reviewerId,
          decisionNote: note ?? null,
        },
      });
      await tx.user.update({
        where: { id: sub.userId },
        data: { kycStatus: 'APPROVED' },
      });
      // marca docs como VERIFICADOS
      await tx.kycDocument.updateMany({
        where: { id: { in: sub.documentIds } },
        data: { status: 'VERIFIED', reviewerId, reviewNotes: note ?? null },
      });
    });
    return { ok: true };
  }

  async reject(submissionId: string, reviewerId: string, note?: string) {
    const sub = await this.prisma.kycSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!sub) throw new NotFoundException();

    await this.prisma.$transaction(async (tx) => {
      await tx.kycSubmission.update({
        where: { id: submissionId },
        data: {
          decision: 'REJECTED',
          decidedAt: new Date(),
          decidedBy: reviewerId,
          decisionNote: note ?? null,
        },
      });
      await tx.user.update({
        where: { id: sub.userId },
        data: { kycStatus: 'REJECTED' },
      });
      await tx.kycDocument.updateMany({
        where: { id: { in: sub.documentIds } },
        data: { status: 'REJECTED', reviewerId, reviewNotes: note ?? null },
      });
    });
    return { ok: true };
  }
}
