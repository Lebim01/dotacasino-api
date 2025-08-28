import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  DATABASE_URL: z.string().min(16),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16),
  USDT_CHAIN: z.enum(['TRON', 'ETH', 'BSC']).default('TRON'),
  PORT_CLIENT: z.coerce.number().default(3001),
  PORT_ADMIN: z.coerce.number().default(3002),
  PORT_WORKERS: z.coerce.number().default(3003),
});

export type AppConfig = z.infer<typeof schema>;

export const loadConfig = registerAs('app', (): AppConfig => {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) throw new Error(`Invalid env: ${parsed.error.message}`);
  return parsed.data;
});
