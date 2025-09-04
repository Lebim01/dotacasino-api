// prisma/seed.ts
import { PrismaClient, $Enums } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PASSWORD = 'Password123!'; // demo
const COUNTRY = 'MX';
const CURRENCY = 'USD' as const;

type SeedUser = {
  email: string;
  displayName: string;
  roles?: string[];
  refCode: string;
  kyc?: $Enums.KycStatus;
};

const usersChain: SeedUser[] = [
  {
    email: 'root@casino.local',
    displayName: 'Root User',
    roles: ['admin'],
    refCode: 'ROOT001',
    kyc: $Enums.KycStatus.APPROVED,
  },
  {
    email: 'l1@casino.local',
    displayName: 'Level 1',
    roles: ['user'],
    refCode: 'REFL001',
    kyc: $Enums.KycStatus.PENDING,
  },
  {
    email: 'l2@casino.local',
    displayName: 'Level 2',
    roles: ['user'],
    refCode: 'REFL002',
    kyc: $Enums.KycStatus.PENDING,
  },
  {
    email: 'l3@casino.local',
    displayName: 'Level 3',
    roles: ['user'],
    refCode: 'REFL003',
    kyc: $Enums.KycStatus.PENDING,
  },
  {
    email: 'l4@casino.local',
    displayName: 'Level 4',
    roles: ['user'],
    refCode: 'REFL004',
    kyc: $Enums.KycStatus.PENDING,
  },
  {
    email: 'l5@casino.local',
    displayName: 'Level 5',
    roles: ['user'],
    refCode: 'REFL005',
    kyc: $Enums.KycStatus.PENDING,
  },
];

async function ensureWalletUSD(userId: string) {
  await prisma.wallet.upsert({
    where: { userId_currency: { userId, currency: CURRENCY } }, // requiere @@unique([userId, currency])
    create: { userId, currency: CURRENCY, balance: 0 },
    update: {},
  });
}

async function ensureReferral(
  userId: string,
  parentId: string | null,
  level: number,
) {
  await prisma.referral.upsert({
    where: { id: userId },
    create: { userId, parentId, level, id: userId },
    update: { parentId, level },
  });
}

async function main() {
  const passwordHash = await argon2.hash(PASSWORD);

  // 1) Crear/actualizar usuarios con refCode único
  const createdIds: string[] = [];
  for (const u of usersChain) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        passwordHash,
        country: COUNTRY,
        roles: u.roles ?? ['user'],
        displayName: u.displayName,
        kycStatus: u.kyc ?? $Enums.KycStatus.PENDING,
        refCode: u.refCode, // único y corto
      },
      update: {
        displayName: u.displayName,
        roles: u.roles ?? ['user'],
        kycStatus: u.kyc ?? $Enums.KycStatus.PENDING,
        refCode: u.refCode,
      },
      select: { id: true },
    });

    createdIds.push(user.id);
    await ensureWalletUSD(user.id);
  }

  // 2) Relación de referidos (cadena root -> l1 -> l2 -> l3 -> l4 -> l5)
  const rootId = createdIds[0];

  // root como nivel 0 (opcional, pero útil para consultas)
  await ensureReferral(rootId, null, 0);

  // niveles 1..5
  for (let i = 1; i < createdIds.length; i++) {
    const userId = createdIds[i];
    const parentId = createdIds[i - 1];
    const level = i; // hijo directo de root => 1; ... hasta 5
    await ensureReferral(userId, parentId, level);
  }

  console.log('✅ Seed completado: usuarios y referidos creados.');
  console.table(
    usersChain.map((u, idx) => ({
      email: u.email,
      refCode: u.refCode,
      level: idx,
    })),
  );
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
