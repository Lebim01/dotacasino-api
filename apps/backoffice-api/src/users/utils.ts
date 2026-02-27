import { PrismaClient } from '@prisma/client';

export const parseUserData = (
  doc: any, // Adaptado para Prisma Client User type or any
  complete = false,
) => {
  if (complete) {
    return {
      id: doc.id,
      name: doc.displayName,
      email: doc.email,
      avatar: doc.avatarUrl,
      left: doc.leftBinaryUserId,
      right: doc.rightBinaryUserId,
      sponsor_id: doc.sponsorId,
      country: doc.country,
      state: doc.state, // Note: Ensure state exists in Prisma if needed
      city: doc.city,
      whatsapp: doc.phone,
      roles: doc.roles,
    };
  }
  return {
    id: doc.id,
    name: doc.displayName,
    email: doc.email,
    avatar: doc.avatarUrl,
    rank: doc.rank,
    membership: doc.membership,
    is_active: doc.membershipStatus == 'paid',
    sponsor_id: doc.sponsorId,
    position: doc.position,
    created_at: doc.createdAt?.toISOString(),
  };
};

const getUsers = async (uid: string, prisma: PrismaClient) => {
  const users = await prisma.user.findMany({
    where: {
      sponsorId: uid,
      membership: { not: null },
    },
  });
  return users.map((d) => ({
    ...parseUserData(d),
    sponsor_id: d.sponsorId,
  }));
};

export const getDirectTree = async (user_id: string, deep: number, prisma: PrismaClient) => {
  const data = [await getUsers(user_id, prisma)];

  for (let i = 1; i < deep; i++) {
    const prevIndex = Number(i) - 1;
    if (data[prevIndex]) {
      for (const u of data[prevIndex]) {
        const docs = await getUsers(u.id, prisma);
        if (!data[i]) data[i] = [];
        data[i] = data[i].concat(docs);
      }
    }
  }

  return data;
};
