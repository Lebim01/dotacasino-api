import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: {
      country: 'MX',
      email: 'victor@admin.com',
      passwordHash: '',
      displayName: 'VIC',
      firstName: 'VICTOR',
      lastName: 'ALVAREZ',
      id: '6760c8a3-c8f1-4710-98b2-3689321d988f',
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
