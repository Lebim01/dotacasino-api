import admin from 'firebase-admin';
import adminCredentials from './firebaseConfigAdmin';

const databaseName = process.env.DATABASE_NAME;

admin.initializeApp({
  credential: admin.credential.cert(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    adminCredentials,
  ),
});

export const db = admin.firestore();

db.settings({
  databaseId: databaseName,
});
