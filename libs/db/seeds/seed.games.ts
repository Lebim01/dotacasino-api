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
  "FreeBonus": number,
  "SubSystem"?: string,
  "LowRtpUrl"?: string | null,
  "LowRtpMobileUrl"?: string | null,
  "LowRtpUrlExternal"?: string | null,
  "LowRtpMobileUrlExternal"?: string | null
}
type ResponseJson = Array<GameJson>;

async function main() {
  // 1) Seed categories
  const raw_categories = fs.readFileSync('categories.response.json', 'utf-8');
  const categories: {
    ID: string;
    Trans: Record<string, string>;
    Name: Record<string, string>;
    Slug: string;
  }[] = JSON.parse(raw_categories);

  const categories_map: Record<string, string> = {};

  for (const category of categories) {
    const cat = await prisma.category.upsert({
      create: {
        name: category.Name.en,
        externalId: category.ID,
      },
      update: {},
      where: {
        externalId: category.ID,
      },
    });
    categories_map[cat.externalId as string] = cat.id;
  }

  // 2) Seed merchants (providers)
  const raw_merchants = fs.readFileSync('merchants-response.json', 'utf-8');
  const merchants: Record<
    string,
    { ID: string; Name: string; Alias: string; Image: string }
  > = JSON.parse(raw_merchants);

  const providers_map: Record<string, string> = {};

  for (const merchant of Object.values(merchants)) {
    const code = merchant.Alias.toUpperCase().replace(/\s+/g, '_');
    const provider = await prisma.gameProvider.upsert({
      where: { externalId: merchant.ID },
      update: {
        name: merchant.Alias,
        imageUrl: `https://theverybestcasino.com${merchant.Image}`,
        code,
      },
      create: {
        externalId: merchant.ID,
        name: merchant.Alias,
        imageUrl: `https://theverybestcasino.com${merchant.Image}`,
        code,
        platformTypes: [code],
      },
    });
    providers_map[merchant.ID] = provider.id;
  }

  // 3) Seed games
  const raw_games = fs.readFileSync('soft-games.response.json', 'utf-8');
  const games: ResponseJson = JSON.parse(raw_games);

  for (const g of games) {
    const providerId = g.SubSystem || g.System;
    const prismaProviderId = providers_map[providerId];

    if (!prismaProviderId) {
      console.warn(
        `⚠️ Provider with externalId ${providerId} not found in merchants-response.json`,
      );
      continue;
    }

    const provider = await prisma.gameProvider.findUnique({
      where: { id: prismaProviderId },
    });
    const providerName = provider?.name || 'UNKNOWN';

    await prisma.game.upsert({
      where: { hall_betId: { hall: 'soft-gaming', betId: g.ID } },
      update: {
        title: g.Trans.en,
        thumbnailUrl: g.ImageFullPath,
        gameProviderId: prismaProviderId,
        categories: {
          set: [], // Clear previous
          connect: g.Categories.map((catExtId) => ({ externalId: catExtId })).filter(
            (c) => categories_map[c.externalId!],
          ),
        },
        PageCode: g.PageCode,
        LowRtpUrl: g.LowRtpUrl,
        LowRtpMobileUrl: g.LowRtpMobileUrl,
        LowRtpUrlExternal: g.LowRtpUrlExternal,
        LowRtpMobileUrlExternal: g.LowRtpMobileUrlExternal,
      },
      create: {
        slug: `${providerName}-${g.ID}`.toLowerCase().replace(/\s+/g, '-'),
        title: g.Trans.en,
        devices: ['DESKTOP', 'MOBILE'],
        tags: [],
        thumbnailUrl: g.ImageFullPath,
        order: 0,
        categories: {
          connect: g.Categories.map((catExtId) => ({ externalId: catExtId })).filter(
            (c) => categories_map[c.externalId!],
          ),
        },
        betId: g.ID,
        allowDemo: g.HasDemo == '1',
        hall: 'soft-gaming',
        width: '1',
        gameProviderId: prismaProviderId,
        System: g.System,
        PageCode: g.PageCode,
        LowRtpUrl: g.LowRtpUrl,
        LowRtpMobileUrl: g.LowRtpMobileUrl,
        LowRtpUrlExternal: g.LowRtpUrlExternal,
        LowRtpMobileUrlExternal: g.LowRtpMobileUrlExternal,
      },
    });

    console.log(`✔ Seeded game ${g.Trans.en} for provider ${providerName}`);
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
