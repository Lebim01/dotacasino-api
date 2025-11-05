import { Controller, Post } from '@nestjs/common';
import { AuthAcademyService } from './auth-academy.service';
import { PayloadAssignBinaryPosition } from 'apps/backoffice-api/src/subscriptions/types';
import { db } from 'apps/backoffice-api/src/firebase/admin';

@Controller('auth-binary')
export class AuthAcademyController {
  constructor(private readonly auth: AuthAcademyService) {}

  @Post('assignBinaryPosition')
  assignBinaryPosition(payload: PayloadAssignBinaryPosition) {
    return this.auth.assignBinaryPosition(payload);
  }

  @Post('set-binary')
  async setbinary() {
    const users = await db
      .collection('users')
      .orderBy('created_at', 'asc')
      .get();

    /*const batch = db.batch();
    for (const u of users.docs) {
      const payload: any = {};
      if (u.get('sponsor_id') == 'y99Xc1XzMM2c0kF49TVS') {
        payload.position = 'left';
      }
      batch.update(u.ref, {
        parent_binary_user_id: null,
        left_binary_user_id: null,
        right_binary_user_id: null,
        count_direct_people_this_cycle: 0,
        count_underline_people: 0,
        ...payload,
      });

      const right = await u.ref.collection('right-people').get();
      const left = await u.ref.collection('left-people').get();
      const batch2 = db.batch();
      for (const r of right.docs) {
        batch2.delete(r.ref);
      }
      for (const l of left.docs) {
        batch2.delete(l.ref);
      }
      await batch2.commit();
    }
    await batch.commit();*/

    for (const u of users.docs) {
      if (u.get('email') == 'codigo1@dota.click') continue;
      if (u.get('parent_binary_user_id')) continue;

      await this.auth.assignBinaryPosition({
        id_user: u.id,
        points: 0,
        txn_id: null,
      });
    }
  }
}
