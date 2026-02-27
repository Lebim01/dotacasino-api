// firebase-admin.module.ts
// NOTE: This module is now a no-op stub kept for backward compatibility.
// Firebase Admin SDK has been fully removed. All data access uses Prisma.
import { Module, Global } from '@nestjs/common';

@Global()
@Module({
  providers: [],
  exports: [],
})
export class FirebaseAdminModule {}
