import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

type ResponseJson = {
  gameList: Array<{
    id: string;
    name: string;
    label: string; // ej: "hacksaw_op"
    title: string; // ej: "hacksaw"
    categories: string;
    device: string; // "2" = desktop+mobile
    img: string;
    system_name2?: string;
  }>;
  gameTitles: string[];
};

async function main() {
  const raw = fs.readFileSync('games.response.json', 'utf-8');
  const data: ResponseJson = JSON.parse(raw);

  // Agrupar juegos por proveedor (campo title)
  const grouped: Record<string, typeof data.gameList> = {};
  for (const game of data.gameList) {
    if (!grouped[game.title]) grouped[game.title] = [];
    grouped[game.title].push(game);
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
        platformTypes: [code], // aquí puedes mapear tipos reales si aplica
        games: {
          create: games.map((g, index) => ({
            slug: `${providerName}-${g.id}`.toLowerCase().replace(/\s+/g, '-'),
            title: g.name,
            category: g.categories as any, // asegúrate de que coincida con tu enum GameCategory
            platformType: code,
            gameType: g.system_name2
              ? (g.system_name2.split('/').pop() ?? null)
              : null,
            providerGameId: g.id,
            devices: g.device === '2' ? ['DESKTOP', 'MOBILE'] : ['DESKTOP'],
            tags: g.system_name2?.includes('new') ? ['nuevo'] : [],
            thumbnailUrl: g.img,
            order: index,
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
