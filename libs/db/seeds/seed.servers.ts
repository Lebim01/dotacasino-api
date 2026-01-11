import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.server.create({
    data: {
      name: 'AurumPlay',
      primaryColor: '#FFD700',
      secondaryColor: '#0D0D0D',
      url: 'http://localhost:3000/',
      enabled: true,
      thumbnailUrl: 'https://storage.googleapis.com/casino-dota-dd5dd/aurum',
      country: 'MX'
    },
  });

  await prisma.server.create({
    data: {
      name: 'LynxBet',
      primaryColor: '#0077FF',
      secondaryColor: '#C0C0C0',
      url: 'http://localhost:3000/',
      enabled: true,
      thumbnailUrl:
        'https://storage.googleapis.com/casino-dota-dd5dd/lynxbet.png',
      country: 'MX'
    },
  });

  await prisma.server.create({
    data: {
      name: 'Vortex Casino',
      primaryColor: '#6A0DAD',
      secondaryColor: '#FFFFFF',
      url: 'http://localhost:3000/',
      enabled: true,
      thumbnailUrl:
        'https://storage.googleapis.com/casino-dota-dd5dd/vortex.png',
      country: 'MX'
    },
  });

  await prisma.server.create({
    data: {
      name: 'Crimson Ace',
      primaryColor: '#DC143C',
      secondaryColor: '#FFB52E',
      url: 'http://localhost:3000/',
      enabled: true,
      thumbnailUrl:
        'https://storage.googleapis.com/casino-dota-dd5dd/crimson%20ace.png',
      country: 'MX'
    },
  });

  await prisma.server.create({
    data: {
      name: 'NeonSpin',
      primaryColor: '#39FF14',
      secondaryColor: '#121212',
      url: 'http://localhost:3000/',
      enabled: true,
      thumbnailUrl:
        'https://storage.googleapis.com/casino-dota-dd5dd/neon%20spin.png',
      country: 'MX'
    },
  });

  console.log(`✔ Seeded servers`);
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
