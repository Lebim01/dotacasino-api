import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('libs', 'db', 'schema.prisma'),
  migrations: {
    path: path.join('libs', 'db', 'migrations'),
    seed: 'ts-node libs/db/seeds/seed.games.ts',
  },
  views: {
    path: path.join('libs', 'db', 'views'),
  },
  typedSql: {
    path: path.join('libs', 'db', 'queries'),
  },
});
