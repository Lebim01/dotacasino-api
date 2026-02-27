// firestore-wipe.module.ts
// NOTE: FirebaseAdminModule dependency removed. Firestore fully migrated to Prisma.
import { Module } from '@nestjs/common';
import { FirestoreWipeService } from './firestore-wipe.service';
import { FirestoreWipeController } from './firestore-wipe.controller';

@Module({
  providers: [FirestoreWipeService],
  exports: [FirestoreWipeService],
  controllers: [FirestoreWipeController],
})
export class FirestoreWipeModule {}
