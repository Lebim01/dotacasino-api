// src/firestore-wipe/firestore-wipe.module.ts
import { Module } from '@nestjs/common';
import { FirestoreWipeService } from './firestore-wipe.service';
import { FirebaseAdminModule } from '../firebase/firebase-admin.module';
import { FirestoreWipeController } from './firestore-wipe.controller';

@Module({
  imports: [FirebaseAdminModule],
  providers: [FirestoreWipeService],
  exports: [FirestoreWipeService],
  controllers: [FirestoreWipeController],
})
export class FirestoreWipeModule {}
