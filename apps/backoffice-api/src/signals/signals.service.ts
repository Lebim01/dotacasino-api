import { Injectable } from '@nestjs/common';
import { db } from '../firebase/admin';
import { dateToString } from '../utils/firebase';

@Injectable()
export class SignalsService {
  async getAll(page: number, limit: number) {
    const query =
      page > 1
        ? db
            .collection('signals')
            .orderBy('created_at', 'desc')
            .offset(page * limit)
            .limit(limit)
        : db.collection('signals').orderBy('created_at', 'desc').limit(limit);

    const snap = await query.get();

    const totalRecords = await db.collection('signals').count().get();

    return {
      totalRecords: totalRecords.data().count,
      data: snap.docs.map((r) => ({
        id: r.id,
        ...r.data(),
        created_at: dateToString(r.get('created_at')),
      })),
    };
  }

  async getOne(id: string) {
    const r = await db.collection('signals').doc(id).get();

    return {
      id: r.id,
      ...r.data(),
      created_at: dateToString(r.get('created_at')),
    };
  }
}
