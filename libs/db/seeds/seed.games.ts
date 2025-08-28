import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ag = await prisma.gameProvider.upsert({
    where: { code: 'AG' },
    update: {},
    create: {
      code: 'AG',
      name: 'Asia Gaming',
      platformTypes: ['AGIN', 'AGQ', 'AGNW', 'SLOT'],
    },
  });

  await prisma.game.upsert({
    where: { slug: 'ag-baccarat-agin' },
    update: {},
    create: {
      slug: 'ag-baccarat-agin',
      title: 'Baccarat (AGIN)',
      providerId: ag.id,
      category: 'LIVE',
      platformType: 'AGIN',
      gameType: 'BAC',
      devices: ['DESKTOP', 'MOBILE'],
      tags: ['popular'],
      order: 10,
      thumbnailUrl: 'https://cdn.example.com/ag/bac-agin.jpg',
    },
  });

  await prisma.game.upsert({
    where: { slug: 'ag-dragon-tiger-agq' },
    update: {},
    create: {
      slug: 'ag-dragon-tiger-agq',
      title: 'Dragon Tiger (AGQ)',
      providerId: ag.id,
      category: 'LIVE',
      platformType: 'AGQ',
      gameType: 'DT',
      devices: ['DESKTOP', 'MOBILE'],
      tags: [],
      order: 20,
      thumbnailUrl: 'https://cdn.example.com/ag/dt-agq.jpg',
    },
  });

  await prisma.game.upsert({
    where: { slug: 'ag-slot-sb49' },
    update: {},
    create: {
      slug: 'ag-slot-sb49',
      title: 'Space Odyssey (SB49)',
      providerId: ag.id,
      category: 'EGAME',
      platformType: 'SLOT',
      providerGameId: 'SB49', // EGames gameId (ver doc)
      devices: ['DESKTOP', 'MOBILE'],
      tags: ['slot'],
      order: 30,
      thumbnailUrl: 'https://cdn.example.com/ag/slot-sb49.jpg',
    },
  });
}

main().then(() => prisma.$disconnect());
