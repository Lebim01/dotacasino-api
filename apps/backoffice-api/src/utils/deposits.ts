import { db } from '../firebase/admin';
import { Memberships } from '../types';

export const getLimitDeposit = (type: Memberships) => {
  const max = 10;
  if (type == 'p-100') return 100 * max;
  if (type == 'p-500') return 500 * max;
  if (type == 'p-1000') return 1000 * max;
  return 0;
};

export const getLimitMembership = (type: Memberships) => {
  const max = 10;
  if (type == 'p-100') return 100 * max;
  if (type == 'p-500') return 500 * max;
  if (type == 'p-1000') return 1000 * max;
  return 0;
};

export const getCapCurrentDeposits = (
  membership_cap_current: number,
  deposit_limit: number,
) => {
  return membership_cap_current >= deposit_limit
    ? deposit_limit
    : membership_cap_current;
};

export const currentMultiplier = async (user_id: string) => {
  const user = await db.collection('users').doc(user_id).get();
  const limit = getLimitMembership(user.get('membership'));
  const deposit_limit = user.get('deposit_cap_limit');

  return {
    membership: {
      current:
        user.get('membership_cap_current') >= deposit_limit
          ? user.get('membership_cap_current') - deposit_limit
          : 0,
      limit,
    },
    deposit: {
      current: getCapCurrentDeposits(
        user.get('membership_cap_current'),
        deposit_limit,
      ),
      limit: deposit_limit,
    },
  };
};
