import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

type GameJson = {
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
}
type ResponseJson = Array<GameJson>;

async function main() {
  // seed categories
  const raw_categories = fs.readFileSync('categories.response.json', 'utf-8');
  const categories: Record<string, string> = JSON.parse(raw_categories);

  const categories_map: Record<string, string> = {}

  for (const catId of Object.keys(categories)) {
    const cat = await prisma.category.upsert({
      create: {
        name: categories[catId],
        externalId: catId
      },
      update: {},
      where: {
        externalId: catId
      }
    })

    categories_map[cat.externalId as string] = cat.id
  }

  const raw_games = fs.readFileSync('soft-games.response.json', 'utf-8');
  const games: ResponseJson = JSON.parse(raw_games);

  // Agrupar juegos por proveedor (campo title)
  const grouped: Record<string, GameJson[]> = {};
  for (const game of games) {
    const providerName = game.MerchantName.trim().toUpperCase()
    if (!grouped[providerName]) grouped[providerName] = [];
    grouped[providerName].push(game);
  }

  for (const [providerName, games] of Object.entries(grouped)) {
    const code = providerName.toUpperCase().replace(/\s+/g, '_');

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
            slug: `${providerName}-${g.ID}`.toLowerCase().replace(/\s+/g, '-'),
            title: g.Trans.en,
            devices: ['DESKTOP', 'MOBILE'],
            tags: [],
            thumbnailUrl: g.ImageFullPath,
            order: index,
            categories: {
              connect: g.Categories.map((id) => categories_map[id])
                .filter(Boolean)
                .map((id) => ({ id })),
            },
            betId: g.ID,
            allowDemo: g.HasDemo == '1',
            hall: 'soft-gaming',
            width: '1',
          })),
        },
      },
    });

    console.log(
      `✔ Seeded provider ${provider.name} con ${games.length} juegos`,
    );
  }
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
