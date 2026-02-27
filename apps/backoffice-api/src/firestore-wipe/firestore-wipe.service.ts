// firestore-wipe.service.ts
// NOTE: Firestore has been fully migrated to Prisma/PostgreSQL.
// This service is kept as a stub for backward compatibility.
// The Firestore wipe functionality is no longer needed in production.
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FirestoreWipeService {
  private readonly logger = new Logger(FirestoreWipeService.name);

  async wipeAll(opts?: {
    dryRun?: boolean;
    batchSize?: number;
    concurrency?: number;
    keep?: string[];
  }) {
    this.logger.warn(
      'FirestoreWipeService.wipeAll called but Firestore has been fully migrated to Prisma. ' +
      'This service is a no-op. Remove this module once confirmed no longer needed.',
    );
    return { ok: true, message: 'Firestore migration completed. No wipe needed.' };
  }
}
