import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash('11111111');

  await prisma.user.create({
    data: {
      country: 'MX',
      email: 'victor@admin.com',
      passwordHash,
      displayName: 'VIC',
      firstName: 'VICTOR',
      lastName: 'ALVAREZ',
      id: '6760c8a3-c8f1-4710-98b2-3689321d988f',
      roles: ['admin'],
    },
  });

  await prisma.user.create({
    data: {
      country: 'MX',
      email: 'marcoslevagomez@gmail.com',
      passwordHash,
      displayName: 'MARCOS',
      firstName: 'MARCOS',
      lastName: 'LEVA',
      id: '6760c8a3-c8f1-4710-98b2-3689321d988d',
      roles: ['admin'],
    },
  });

  console.log(`✔ Seeded users`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
