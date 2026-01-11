import { GameCategory, PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

type ResponseJson = {
  gameList: Array<{
    "ID": string,
    "System": string,
    "PageCode": string,
    "MobilePageCode": string,
    "MobileAndroidPageCode": string,
    "MobileWindowsPageCode": string,
    "Trans": {
      "en": string
    },
    "Description": {},
    "ImageURL": string,
    "Branded": string,
    "BrandedGG": string,
    "HasDemo": string,
    "Freeround": string,
    "GSort": string,
    "GSubSort": string,
    "Status": string,
    "GameStatus": string,
    "Categories": string[],
    "SortPerCategory": {
      [key: string]: number
    },
    "TableID": string,
    "ExternalCode": string,
    "MobileExternalCode": string,
    "AR": string,
    "MerchantName": string,
    "Volatility": string,
    "IsVirtual": string,
    "WorkingHours": string,
    "IDCountryRestriction": string,
    "ImageFullPath": string,
    "CustomSort": [],
    "BonusBuy": number,
    "Megaways": number,
    "Freespins": number,
    "FreeBonus": number
  }>;
  gameTitles: string[];
};

async function main() {
  const raw = fs.readFileSync('soft-games.response.json', 'utf-8');
  const data: ResponseJson = JSON.parse(raw);

  // Agrupar juegos por proveedor (campo title)
  const grouped: Record<string, typeof data.gameList> = {};
  for (const game of data.gameList) {
    if (!grouped[game.MerchantName]) grouped[game.MerchantName] = [];
    grouped[game.MerchantName].push(game);
  }

  /*for (const [providerName, games] of Object.entries(grouped)) {
    const code = providerName.toUpperCase().replace(/\s+/g, '_');

    const categories = new Set();
    games.map((g) => categories.add(g.categories));
    //console.log(categories);

    // Crear provider
    const provider = await prisma.gameProvider.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: providerName,
        platformTypes: [code],
        games: {
          create: games.map((g, index) => ({
            slug: `${providerName}-${g.id}`.toLowerCase().replace(/\s+/g, '-'),
            title: g.name,
            devices: g.device === '2' ? ['DESKTOP', 'MOBILE'] : ['DESKTOP'],
            tags: g.system_name2?.includes('new') ? ['nuevo'] : [],
            thumbnailUrl: g.img,
            order: index,
            category: (g.categories || null) as GameCategory,
            betId: g.id,
            allowDemo: g.demo == '1',
            width: g.width,
          })),
        },
      },
    });

    console.log(
      `✔ Seeded provider ${provider.name} con ${games.length} juegos`,
    );
  }*/
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
