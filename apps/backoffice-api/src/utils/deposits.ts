import { PrismaClient } from '@prisma/client';
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
  if (type == 'free') return 1000;
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

export const currentMultiplier = async (user_id: string, prisma: PrismaClient) => {
  const user = await prisma.user.findUnique({
    where: { id: user_id },
  });
  if (!user) return null;

  const limit = getLimitMembership(user.membership as Memberships);
  const deposit_limit = Number(user.membershipCapLimit || 0);
  const currentCap = Number(user.membershipCapCurrent || 0);

  return {
    membership: {
      current:
        currentCap >= deposit_limit
          ? currentCap - deposit_limit
          : 0,
      limit,
    },
    deposit: {
      current: getCapCurrentDeposits(
        currentCap,
        deposit_limit,
      ),
      limit: deposit_limit,
    },
  };
};
