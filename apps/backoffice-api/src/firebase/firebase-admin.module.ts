// src/firebase/firebase-admin.module.ts
import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: async () => {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });
        }
        return admin;
      },
    },
    {
      provide: 'FIRESTORE',
      useFactory: (fb: typeof admin) => fb.firestore(),
      inject: ['FIREBASE_ADMIN'],
    },
  ],
  exports: ['FIREBASE_ADMIN', 'FIRESTORE'],
})
export class FirebaseAdminModule {}
