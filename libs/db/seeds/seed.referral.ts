// prisma/seed.ts
import { PrismaClient, $Enums } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PASSWORD = 'Password123!';
const COUNTRY = 'MX';
const CURRENCY = 'USD' as const;

async function ensureWalletUSD(userId: string) {
  await prisma.wallet.upsert({
    where: { userId_currency: { userId, currency: CURRENCY } },
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
    create: { id: userId, userId, parentId, level },
    update: { parentId, level },
  });
}

async function main() {
  const passwordHash = await argon2.hash(PASSWORD);
  const root = {
    id: '6760c8a3-c8f1-4710-98b2-3689321d988f',
  };

  await ensureWalletUSD(root.id);
  await ensureReferral(root.id, null, 0);

  let prevLevelIds: string[] = [root.id];

  // Crear 5 niveles con 5 usuarios en cada nivel
  for (let level = 1; level <= 5; level++) {
    const currentLevelIds: string[] = [];

    for (let i = 1; i <= 5; i++) {
      const email = `l${level}_${i}@casino.local`;
      const refCode = `REFL${level}${i.toString().padStart(2, '0')}`;

      // Padre: para simplificar, colgamos todos del primer usuario del nivel anterior
      const parentId = prevLevelIds[0];

      const user = await prisma.user.upsert({
        where: { email },
        create: {
          email,
          passwordHash,
          country: COUNTRY,
          roles: ['user'],
          displayName: `Level ${level} - User ${i}`,
          kycStatus: $Enums.KycStatus.PENDING,
          refCodeL: refCode + 'L',
          refCodeR: refCode + 'R',
        },
        update: {
          displayName: `Level ${level} - User ${i}`,
          refCodeL: refCode + 'L',
          refCodeR: refCode + 'R',
        },
        select: { id: true },
      });

      await ensureWalletUSD(user.id);
      await ensureReferral(user.id, parentId, level);

      currentLevelIds.push(user.id);
    }

    prevLevelIds = currentLevelIds;
  }

  console.log('✅ Seed completado con 5 usuarios por nivel');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
